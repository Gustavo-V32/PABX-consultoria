import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SectorsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string, includeInactive = false) {
    return this.prisma.sector.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        supervisors: { select: { id: true, name: true, email: true, status: true } },
        _count: { select: { queues: true, conversations: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const sector = await this.prisma.sector.findFirst({
      where: { id, organizationId },
      include: {
        supervisors: { select: { id: true, name: true, email: true, status: true } },
        queues: { where: { isActive: true }, select: { id: true, name: true, strategy: true } },
      },
    });

    if (!sector) throw new NotFoundException('Setor nao encontrado');
    return sector;
  }

  create(
    organizationId: string,
    dto: { name: string; color?: string; description?: string; supervisorIds?: string[] },
  ) {
    const { supervisorIds, ...data } = dto;
    return this.prisma.sector.create({
      data: {
        organizationId,
        ...data,
        ...(supervisorIds?.length
          ? { supervisors: { connect: supervisorIds.map((id) => ({ id })) } }
          : {}),
      },
      include: { supervisors: { select: { id: true, name: true } } },
    });
  }

  async update(
    id: string,
    organizationId: string,
    dto: {
      name?: string;
      color?: string;
      description?: string;
      isActive?: boolean;
      supervisorIds?: string[];
    },
  ) {
    await this.findOne(id, organizationId);
    const { supervisorIds, ...data } = dto;
    return this.prisma.sector.update({
      where: { id },
      data: {
        ...data,
        ...(supervisorIds
          ? { supervisors: { set: supervisorIds.map((supervisorId) => ({ id: supervisorId })) } }
          : {}),
      },
      include: { supervisors: { select: { id: true, name: true, email: true } } },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.sector.update({ where: { id }, data: { isActive: false } });
  }
}
