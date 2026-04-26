import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateCategory, TemplateStatus } from '@prisma/client';

export class CreateTemplateDto {
  name: string;
  language?: string;
  category: TemplateCategory;
  status?: TemplateStatus;
  whatsappNumberId?: string;
  components: any;
  variables?: string[];
}

export class UpdateTemplateDto {
  name?: string;
  language?: string;
  category?: TemplateCategory;
  status?: TemplateStatus;
  whatsappNumberId?: string | null;
  components?: any;
  variables?: string[];
  rejectedReason?: string | null;
}

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string, filters: { status?: TemplateStatus; category?: TemplateCategory } = {}) {
    return this.prisma.template.findMany({
      where: {
        organizationId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      },
      include: {
        whatsappNumber: {
          select: { id: true, name: true, phoneNumber: true, status: true },
        },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
      include: {
        whatsappNumber: {
          select: { id: true, name: true, phoneNumber: true, status: true },
        },
        messages: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!template) throw new NotFoundException('Template nao encontrado');
    return template;
  }

  create(organizationId: string, dto: CreateTemplateDto) {
    return this.prisma.template.create({
      data: {
        organizationId,
        language: dto.language || 'pt_BR',
        category: dto.category,
        status: dto.status || 'PENDING',
        whatsappNumberId: dto.whatsappNumberId,
        name: dto.name,
        components: dto.components,
        variables: dto.variables || [],
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateTemplateDto) {
    await this.findOne(id, organizationId);
    return this.prisma.template.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.template.delete({ where: { id } });
  }
}
