import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, filters: any = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    const c = await this.prisma.contact.findFirst({
      where: { id, organizationId },
      include: {
        tags: { include: { tag: true } },
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, status: true, channel: true, createdAt: true },
        },
        variables: true,
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Contato nao encontrado');
    return c;
  }

  create(organizationId: string, data: any) {
    return this.prisma.contact.create({ data: { organizationId, ...data } });
  }

  async update(id: string, organizationId: string, data: any) {
    await this.findOne(id, organizationId);
    return this.prisma.contact.update({ where: { id }, data });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.contact.delete({ where: { id } });
  }

  async importContacts(organizationId: string, contacts: any[]) {
    let created = 0;
    let updated = 0;
    for (const contact of contacts) {
      if (!contact.phone && !contact.email) continue;
      const existing = await this.prisma.contact.findFirst({
        where: { organizationId, phone: contact.phone },
      });
      if (existing) {
        await this.prisma.contact.update({ where: { id: existing.id }, data: contact });
        updated++;
      } else {
        await this.prisma.contact.create({ data: { organizationId, ...contact } });
        created++;
      }
    }
    return { created, updated };
  }

  async upsertVariable(organizationId: string, contactId: string, data: any) {
    await this.findOne(contactId, organizationId);
    return this.prisma.customerVariable.upsert({
      where: { contactId_key: { contactId, key: data.key } },
      update: { value: data.value, type: data.type || 'string', isSystem: data.isSystem ?? false },
      create: {
        organizationId,
        contactId,
        key: data.key,
        value: data.value,
        type: data.type || 'string',
        isSystem: data.isSystem ?? false,
      },
    });
  }

  async deleteVariable(organizationId: string, contactId: string, key: string) {
    await this.findOne(contactId, organizationId);
    return this.prisma.customerVariable.delete({
      where: { contactId_key: { contactId, key } },
    });
  }

  async addAttachment(organizationId: string, contactId: string, uploadedById: string, data: any) {
    await this.findOne(contactId, organizationId);
    return this.prisma.contactAttachment.create({
      data: {
        organizationId,
        contactId,
        uploadedById,
        name: data.name,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
        storageProvider: data.storageProvider || 'local',
        metadata: data.metadata || {},
      },
    });
  }

  async deleteAttachment(organizationId: string, contactId: string, attachmentId: string) {
    await this.findOne(contactId, organizationId);
    return this.prisma.contactAttachment.delete({
      where: { id: attachmentId },
    });
  }
}
