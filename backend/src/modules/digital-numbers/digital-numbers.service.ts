import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DigitalNumbersService {
  constructor(private prisma: PrismaService) {}

  private readonly safeSelect = {
    id: true,
    organizationId: true,
    name: true,
    operator: true,
    sipServer: true,
    username: true,
    ip: true,
    domain: true,
    context: true,
    sipPort: true,
    udpPort: true,
    tlsPort: true,
    amiPort: true,
    rtpPortStart: true,
    rtpPortEnd: true,
    codecs: true,
    notes: true,
    status: true,
    registrationStatus: true,
    logs: true,
    lastTestAt: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  findAll(organizationId: string, includeInactive = false) {
    return this.prisma.digitalNumber.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: this.safeSelect,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const number = await this.prisma.digitalNumber.findFirst({
      where: { id, organizationId },
      select: this.safeSelect,
    });

    if (!number) throw new NotFoundException('Numero digital nao encontrado');
    return number;
  }

  create(organizationId: string, dto: any) {
    return this.prisma.digitalNumber.create({
      data: {
        organizationId,
        name: dto.name,
        operator: dto.operator,
        sipServer: dto.sipServer,
        username: dto.username,
        secret: dto.secret,
        ip: dto.ip,
        domain: dto.domain,
        context: dto.context || 'from-trunk',
        sipPort: dto.sipPort || 5060,
        udpPort: dto.udpPort || 5060,
        tlsPort: dto.tlsPort || 5061,
        amiPort: dto.amiPort || 5038,
        rtpPortStart: dto.rtpPortStart || 10000,
        rtpPortEnd: dto.rtpPortEnd || 10200,
        codecs: dto.codecs || ['alaw', 'ulaw'],
        notes: dto.notes,
        status: dto.status || 'UNREGISTERED',
        registrationStatus: dto.registrationStatus,
        logs: dto.logs || [],
      },
      select: this.safeSelect,
    });
  }

  async update(id: string, organizationId: string, dto: any) {
    await this.findOne(id, organizationId);
    return this.prisma.digitalNumber.update({
      where: { id },
      data: dto,
      select: this.safeSelect,
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.digitalNumber.update({
      where: { id },
      data: { isActive: false, status: 'DISABLED' },
      select: this.safeSelect,
    });
  }

  async registerTest(id: string, organizationId: string, result: any) {
    const number = await this.findOne(id, organizationId);
    const logs = Array.isArray(number.logs) ? number.logs : [];
    logs.unshift({
      at: new Date().toISOString(),
      status: result.status || 'TESTING',
      message: result.message || 'Teste registrado manualmente',
      details: result.details || {},
    });

    return this.prisma.digitalNumber.update({
      where: { id },
      data: {
        status: result.status || 'TESTING',
        registrationStatus: result.registrationStatus || result.message,
        lastTestAt: new Date(),
        logs: logs.slice(0, 100),
      },
      select: this.safeSelect,
    });
  }
}
