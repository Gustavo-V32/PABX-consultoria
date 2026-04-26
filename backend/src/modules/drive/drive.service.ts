import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriveService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  getOAuthUrl(state?: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ].join(' ');

    if (!clientId || !redirectUri) {
      return {
        configured: false,
        message: 'GOOGLE_CLIENT_ID e GOOGLE_REDIRECT_URI precisam estar configurados.',
      };
    }

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('scope', scopes);
    if (state) url.searchParams.set('state', state);

    return { configured: true, url: url.toString() };
  }

  findAll(organizationId: string, filters: any = {}) {
    return this.prisma.googleDriveFile.findMany({
      where: {
        organizationId,
        ...(filters.contactId ? { contactId: filters.contactId } : {}),
        ...(filters.conversationId ? { conversationId: filters.conversationId } : {}),
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        conversation: { select: { id: true, status: true, channel: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const file = await this.prisma.googleDriveFile.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        conversation: true,
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!file) throw new NotFoundException('Arquivo do Drive nao encontrado');
    return file;
  }

  createMetadata(organizationId: string, uploadedById: string, dto: any) {
    return this.prisma.googleDriveFile.create({
      data: {
        organizationId,
        uploadedById,
        contactId: dto.contactId,
        conversationId: dto.conversationId,
        integrationId: dto.integrationId,
        driveFileId: dto.driveFileId,
        name: dto.name,
        mimeType: dto.mimeType,
        size: dto.size,
        webViewLink: dto.webViewLink,
        webContentLink: dto.webContentLink,
        sharedLink: dto.sharedLink,
        folderPath: dto.folderPath,
        permissions: dto.permissions || {},
        metadata: dto.metadata || {},
      },
    });
  }

  async updateMetadata(id: string, organizationId: string, dto: any) {
    await this.findOne(id, organizationId);
    return this.prisma.googleDriveFile.update({
      where: { id },
      data: dto,
    });
  }

  async deleteMetadata(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.googleDriveFile.delete({ where: { id } });
  }

  buildFolderPlan(contactName: string, conversationId?: string) {
    const safeName = contactName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();

    return {
      customerFolder: `clientes/${safeName || 'sem-nome'}`,
      conversationFolder: conversationId ? `clientes/${safeName || 'sem-nome'}/atendimentos/${conversationId}` : null,
    };
  }
}
