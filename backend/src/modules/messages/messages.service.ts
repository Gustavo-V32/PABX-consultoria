import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService, private events: EventEmitter2) {}

  async findByConversation(conversationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          attachments: true,
        },
        orderBy: { createdAt: 'asc' },
        skip, take: limit,
      }),
      this.prisma.message.count({ where: { conversationId, isDeleted: false } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async create(conversationId: string, senderId: string, content: string, type: any = 'TEXT') {
    const msg = await this.prisma.message.create({
      data: {
        conversationId, senderId,
        type, direction: 'OUTBOUND',
        status: 'SENT', content,
        sentAt: new Date(),
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    this.events.emit('message.sent', { message: msg, conversation });
    return msg;
  }

  async markAsRead(conversationId: string) {
    await this.prisma.message.updateMany({
      where: { conversationId, direction: 'INBOUND', readAt: null },
      data: { status: 'READ', readAt: new Date() },
    });
    return { success: true };
  }

  async delete(id: string) {
    return this.prisma.message.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async addAttachment(messageId: string, data: any) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Mensagem nao encontrada');

    return this.prisma.messageAttachment.create({
      data: {
        messageId,
        name: data.name,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
        storageProvider: data.storageProvider || 'local',
        metadata: data.metadata || {},
      },
    });
  }

  async deleteAttachment(id: string) {
    return this.prisma.messageAttachment.delete({ where: { id } });
  }
}
