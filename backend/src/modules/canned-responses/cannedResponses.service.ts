import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CannedResponsesService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string, search?: string) {
    return this.prisma.cannedResponse.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { shortcut: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { title: 'asc' },
    });
  }

  create(organizationId: string, data: any) {
    return this.prisma.cannedResponse.create({ data: { organizationId, ...data } });
  }

  async update(id: string, organizationId: string, data: any) {
    const existing = await this.prisma.cannedResponse.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Resposta pronta nao encontrada');
    return this.prisma.cannedResponse.update({ where: { id }, data });
  }

  async delete(id: string, organizationId: string) {
    const existing = await this.prisma.cannedResponse.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Resposta pronta nao encontrada');
    return this.prisma.cannedResponse.update({ where: { id }, data: { isActive: false } });
  }
}
