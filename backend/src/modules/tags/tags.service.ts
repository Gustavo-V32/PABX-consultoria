import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.tag.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            contacts: true,
            conversations: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId },
      include: {
        _count: { select: { contacts: true, conversations: true } },
      },
    });

    if (!tag) throw new NotFoundException('Etiqueta nao encontrada');
    return tag;
  }

  create(organizationId: string, dto: { name: string; color?: string }) {
    return this.prisma.tag.create({
      data: { organizationId, ...dto },
    });
  }

  async update(id: string, organizationId: string, dto: { name?: string; color?: string }) {
    await this.findOne(id, organizationId);
    return this.prisma.tag.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.tag.delete({ where: { id } });
  }
}
