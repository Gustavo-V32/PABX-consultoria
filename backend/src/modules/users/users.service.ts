import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  maxChats?: number;
  extensionId?: string;
}

export class UpdateUserDto {
  name?: string;
  role?: UserRole;
  maxChats?: number;
  extensionId?: string;
  isActive?: boolean;
  avatar?: string;
  settings?: any;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, page = 1, limit = 50, role?: UserRole) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId };
    if (role) where.role = role;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true,
          status: true, avatar: true, maxChats: true, isActive: true,
          lastSeenAt: true,
          extension: { select: { number: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip, take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        avatar: true, maxChats: true, isActive: true, settings: true,
        extension: { select: { id: true, number: true, name: true, context: true, callerId: true, isActive: true } },
        queueMemberships: { include: { queue: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { organizationId, email: dto.email },
    });
    if (existing) throw new ConflictException('Email já cadastrado');

    const password = await bcrypt.hash(dto.password, 12);
    const { password: _, ...data } = dto;

    return this.prisma.user.create({
      data: { organizationId, ...data, password },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateUserDto) {
    await this.findOne(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  }

  async updateStatus(id: string, status: string) {
    const current = await this.prisma.user.findUnique({
      where: { id },
      select: { status: true, organizationId: true },
    });

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: status as any, lastSeenAt: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastSeenAt: true,
      },
    });

    if (current) {
      await this.prisma.agentStatusLog.create({
        data: {
          organizationId: current.organizationId,
          userId: id,
          fromStatus: current.status,
          toStatus: status as any,
        },
      });
    }

    return updated;
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
