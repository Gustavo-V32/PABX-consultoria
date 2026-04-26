import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AutomationTrigger } from '@prisma/client';

export class CreateAutomationDto {
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  triggerConfig?: any;
  conditions?: any;
  actions: any;
  isActive?: boolean;
}

export class UpdateAutomationDto {
  name?: string;
  description?: string | null;
  trigger?: AutomationTrigger;
  triggerConfig?: any;
  conditions?: any;
  actions?: any;
  isActive?: boolean;
}

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string, includeInactive = false) {
    return this.prisma.automation.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId },
    });

    if (!automation) throw new NotFoundException('Automacao nao encontrada');
    return automation;
  }

  create(organizationId: string, dto: CreateAutomationDto) {
    return this.prisma.automation.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        triggerConfig: dto.triggerConfig || {},
        conditions: dto.conditions || [],
        actions: dto.actions,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateAutomationDto) {
    await this.findOne(id, organizationId);
    return this.prisma.automation.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.automation.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async registerRun(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.automation.update({
      where: { id },
      data: {
        runCount: { increment: 1 },
        lastRunAt: new Date(),
      },
    });
  }
}
