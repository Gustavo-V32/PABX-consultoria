import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TelephonyService } from './telephony.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class OriginateCallDto {
  @IsString() from: string;
  @IsString() to: string;
  @IsOptional() @IsString() context?: string;
}

class CreateExtensionDto {
  @IsString() number: string;
  @IsString() name: string;
  @IsString() secret: string;
  @IsOptional() @IsString() callerId?: string;
}

class CreateTrunkDto {
  @IsString() name: string;
  @IsString() provider: string;
  @IsString() host: string;
  @IsOptional() @IsInt() port?: number;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() secret?: string;
}

@ApiTags('telephony')
@Controller('telephony')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelephonyController {
  constructor(
    private telephony: TelephonyService,
    private prisma: PrismaService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Status do sistema de telefonia' })
  getStatus() {
    return { connected: this.telephony.isConnected() };
  }

  @Get('active-calls')
  @ApiOperation({ summary: 'Chamadas ativas no momento' })
  getActiveCalls(@CurrentUser('organizationId') orgId: string) {
    return this.telephony.getActiveCalls(orgId);
  }

  @Post('originate')
  @ApiOperation({ summary: 'Originar chamada (click-to-call)' })
  originate(@Body() dto: OriginateCallDto) {
    return this.telephony.originateCall(dto.from, dto.to, dto.context);
  }

  @Post('hangup/:channel')
  @ApiOperation({ summary: 'Desligar chamada' })
  hangup(@Param('channel') channel: string) {
    return this.telephony.hangupCall(decodeURIComponent(channel));
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transferir chamada' })
  transfer(@Body() dto: { channel: string; extension: string; context?: string }) {
    return this.telephony.transferCall(dto.channel, dto.extension, dto.context);
  }

  // Extensions CRUD
  @Get('extensions')
  @ApiOperation({ summary: 'Listar ramais' })
  getExtensions(@CurrentUser('organizationId') orgId: string) {
    return this.prisma.extension.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        number: true,
        name: true,
        context: true,
        callerId: true,
        maxContacts: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, status: true } },
      },
      orderBy: { number: 'asc' },
    });
  }

  @Post('extensions')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar ramal' })
  createExtension(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateExtensionDto) {
    return this.prisma.extension.create({
      data: { organizationId: orgId, ...dto },
      select: {
        id: true,
        number: true,
        name: true,
        context: true,
        callerId: true,
        maxContacts: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // Trunks CRUD
  @Get('trunks')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar troncos SIP' })
  getTrunks(@CurrentUser('organizationId') orgId: string) {
    return this.prisma.sipTrunk.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true, provider: true, host: true,
        port: true, username: true, isActive: true, createdAt: true,
      },
    });
  }

  @Post('trunks')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar tronco SIP' })
  createTrunk(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateTrunkDto) {
    return this.prisma.sipTrunk.create({
      data: { organizationId: orgId, ...dto },
      select: {
        id: true,
        name: true,
        provider: true,
        host: true,
        port: true,
        username: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // Calls history
  @Get('calls')
  @ApiOperation({ summary: 'Histórico de chamadas' })
  getCalls(
    @CurrentUser('organizationId') orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (direction) where.direction = direction;

    return this.prisma.call.findMany({
      where,
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { startTime: 'desc' },
      skip: +skip,
      take: +limit,
    });
  }

  // Queue management via AMI
  @Post('queues/:name/add-member')
  @ApiOperation({ summary: 'Adicionar membro à fila Asterisk' })
  addQueueMember(
    @Param('name') queue: string,
    @Body() dto: { extension: string; penalty?: number },
  ) {
    return this.telephony.addToQueue(queue, dto.extension, dto.penalty);
  }

  @Post('queues/:name/remove-member')
  @ApiOperation({ summary: 'Remover membro da fila Asterisk' })
  removeQueueMember(@Param('name') queue: string, @Body() dto: { extension: string }) {
    return this.telephony.removeFromQueue(queue, dto.extension);
  }

  @Post('queues/:name/pause')
  @ApiOperation({ summary: 'Pausar agente na fila' })
  pauseMember(
    @Param('name') queue: string,
    @Body() dto: { extension: string; reason?: string },
  ) {
    return this.telephony.pauseQueueMember(queue, dto.extension, dto.reason);
  }

  @Post('queues/:name/unpause')
  @ApiOperation({ summary: 'Despausar agente na fila' })
  unpauseMember(@Param('name') queue: string, @Body() dto: { extension: string }) {
    return this.telephony.unpauseQueueMember(queue, dto.extension);
  }
}
