import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly graphApiUrl: string;
  private readonly graphApiVersion: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private events: EventEmitter2,
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
  ) {
    this.graphApiUrl = config.get<string>('META_GRAPH_API_URL', 'https://graph.facebook.com');
    this.graphApiVersion = config.get<string>('META_GRAPH_API_VERSION', 'v19.0');
  }

  async sendTextMessage(phoneNumberId: string, to: string, text: string, accessToken: string) {
    const url = `${this.graphApiUrl}/${this.graphApiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: text, preview_url: false },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.response?.data?.error?.message}`);
      throw new BadRequestException(error.response?.data?.error?.message || 'Erro ao enviar mensagem');
    }
  }

  async sendTemplateMessage(
    phoneNumberId: string,
    to: string,
    templateName: string,
    languageCode: string,
    components: any[],
    accessToken: string,
  ) {
    const url = `${this.graphApiUrl}/${this.graphApiVersion}/${phoneNumberId}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data;
  }

  async sendMediaMessage(
    phoneNumberId: string,
    to: string,
    type: 'image' | 'video' | 'audio' | 'document',
    mediaUrl: string,
    caption: string | undefined,
    accessToken: string,
  ) {
    const url = `${this.graphApiUrl}/${this.graphApiVersion}/${phoneNumberId}/messages`;
    const mediaPayload: any = { link: mediaUrl };
    if (caption) mediaPayload.caption = caption;

    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type,
        [type]: mediaPayload,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data;
  }

  async syncTemplates(organizationId: string, whatsappNumberId: string) {
    const number = await this.prisma.whatsappNumber.findFirst({
      where: { id: whatsappNumberId, organizationId },
    });

    if (!number) throw new BadRequestException('Número não encontrado');

    const url = `${this.graphApiUrl}/${this.graphApiVersion}/${number.wabaId}/message_templates`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${number.accessToken}` },
      params: { limit: 100 },
    });

    const metaTemplates = response.data.data || [];
    let synced = 0;

    for (const mt of metaTemplates) {
      await this.prisma.template.upsert({
        where: {
          organizationId_name_language: {
            organizationId,
            name: mt.name,
            language: mt.language,
          },
        },
        update: {
          status: mt.status?.toUpperCase() || 'PENDING',
          components: mt.components,
          metaTemplateId: mt.id,
          lastSyncAt: new Date(),
        },
        create: {
          organizationId,
          whatsappNumberId,
          name: mt.name,
          language: mt.language,
          category: mt.category?.toUpperCase() || 'UTILITY',
          status: mt.status?.toUpperCase() || 'PENDING',
          components: mt.components,
          metaTemplateId: mt.id,
          lastSyncAt: new Date(),
        },
      });
      synced++;
    }

    await this.prisma.whatsappNumber.update({
      where: { id: whatsappNumberId },
      data: { lastConnectedAt: new Date() },
    });

    this.logger.log(`Synced ${synced} templates for number ${number.phoneNumber}`);
    return { synced };
  }

  async processIncomingWebhook(body: any, organizationId: string) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (!changes) return;

    const phoneNumberId = changes.metadata?.phone_number_id;

    if (changes.messages) {
      for (const message of changes.messages) {
        await this.processIncomingMessage(message, changes, phoneNumberId, organizationId);
      }
    }

    if (changes.statuses) {
      for (const status of changes.statuses) {
        await this.processMessageStatus(status);
      }
    }
  }

  private async processIncomingMessage(
    message: any,
    changes: any,
    phoneNumberId: string,
    organizationId: string,
  ) {
    const contact = changes.contacts?.[0];
    const phoneNumber = await this.prisma.whatsappNumber.findUnique({
      where: { phoneNumberId },
    });

    if (!phoneNumber) return;

    // Upsert contact
    const dbContact = await this.prisma.contact.upsert({
      where: {
        organizationId_whatsappId: {
          organizationId: phoneNumber.organizationId,
          whatsappId: message.from,
        },
      },
      update: { name: contact?.profile?.name || `+${message.from}` },
      create: {
        organizationId: phoneNumber.organizationId,
        name: contact?.profile?.name || `+${message.from}`,
        phone: `+${message.from}`,
        whatsappId: message.from,
      },
    });

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId: phoneNumber.organizationId,
        contactId: dbContact.id,
        whatsappNumberId: phoneNumber.id,
        status: { in: ['WAITING', 'IN_PROGRESS', 'PENDING'] },
        channel: 'WHATSAPP',
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId: phoneNumber.organizationId,
          contactId: dbContact.id,
          whatsappNumberId: phoneNumber.id,
          channel: 'WHATSAPP',
          status: 'WAITING',
          waitingSince: new Date(),
          lastMessageAt: new Date(),
        },
      });

      this.events.emit('conversation.created', { conversation });
    }

    // Store message
    const msgContent = this.extractMessageContent(message);
    const dbMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalId: message.id,
        type: this.getMessageType(message.type),
        direction: 'INBOUND',
        status: 'DELIVERED',
        content: msgContent.text,
        mediaUrl: msgContent.mediaUrl,
        mediaType: msgContent.mimeType,
        mediaCaption: msgContent.caption,
        metadata: message,
        sentAt: new Date(parseInt(message.timestamp) * 1000),
        deliveredAt: new Date(),
      },
    });

    // Update conversation last message
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    this.events.emit('message.received', {
      message: dbMessage,
      conversation,
      contact: dbContact,
    });

    this.logger.log(`Message received from ${message.from}`);
  }

  private async processMessageStatus(status: any) {
    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    const dbStatus = statusMap[status.status];
    if (!dbStatus) return;

    await this.prisma.message.updateMany({
      where: { externalId: status.id },
      data: {
        status: dbStatus as any,
        ...(dbStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        ...(dbStatus === 'READ' ? { readAt: new Date() } : {}),
        ...(dbStatus === 'FAILED' ? { errorMessage: status.errors?.[0]?.message } : {}),
      },
    });
  }

  private extractMessageContent(message: any) {
    switch (message.type) {
      case 'text':
        return { text: message.text?.body };
      case 'image':
        return { mediaUrl: message.image?.id, mimeType: message.image?.mime_type, caption: message.image?.caption };
      case 'video':
        return { mediaUrl: message.video?.id, mimeType: message.video?.mime_type, caption: message.video?.caption };
      case 'audio':
        return { mediaUrl: message.audio?.id, mimeType: message.audio?.mime_type };
      case 'document':
        return { mediaUrl: message.document?.id, mimeType: message.document?.mime_type, caption: message.document?.filename };
      case 'sticker':
        return { mediaUrl: message.sticker?.id, mimeType: message.sticker?.mime_type };
      case 'location':
        return { text: `Localização: ${message.location?.latitude}, ${message.location?.longitude}` };
      default:
        return { text: `[${message.type}]` };
    }
  }

  private getMessageType(type: string): any {
    const typeMap: Record<string, string> = {
      text: 'TEXT',
      image: 'IMAGE',
      audio: 'AUDIO',
      video: 'VIDEO',
      document: 'DOCUMENT',
      sticker: 'STICKER',
      location: 'LOCATION',
      contacts: 'CONTACT',
    };
    return typeMap[type] || 'TEXT';
  }
}
