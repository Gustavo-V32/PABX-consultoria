import {
  Controller, Get, Post, Delete, Body, Param, Query, Patch,
  UseGuards, HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional } from 'class-validator';

class SendMessageDto {
  @IsString() to: string;
  @IsString() text: string;
  @IsString() whatsappNumberId: string;
}

class SendTemplateDto {
  @IsString() to: string;
  @IsString() templateId: string;
  @IsString() whatsappNumberId: string;
  @IsOptional() components?: any[];
}

class CreateNumberDto {
  @IsString() name: string;
  @IsString() phoneNumber: string;
  @IsString() phoneNumberId: string;
  @IsString() wabaId: string;
  @IsString() accessToken: string;
}

@ApiTags('whatsapp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WhatsappController {
  constructor(
    private service: WhatsappService,
    private prisma: PrismaService,
  ) {}

  @Get('numbers')
  @ApiOperation({ summary: 'Listar números WhatsApp' })
  async getNumbers(@CurrentUser('organizationId') orgId: string) {
    return this.prisma.whatsappNumber.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true, phoneNumber: true, phoneNumberId: true,
        status: true, qualityRating: true, lastConnectedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('numbers')
  @ApiOperation({ summary: 'Adicionar número WhatsApp' })
  async createNumber(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateNumberDto) {
    return this.prisma.whatsappNumber.create({
      data: { organizationId: orgId, ...dto },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        phoneNumberId: true,
        wabaId: true,
        status: true,
        qualityRating: true,
        lastConnectedAt: true,
        createdAt: true,
      },
    });
  }

  @Delete('numbers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover número WhatsApp' })
  async deleteNumber(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    await this.prisma.whatsappNumber.deleteMany({
      where: { id, organizationId: orgId },
    });
  }

  @Patch('numbers/:id')
  @ApiOperation({ summary: 'Atualizar numero WhatsApp' })
  async updateNumber(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: Partial<CreateNumberDto>) {
    return this.prisma.whatsappNumber.updateMany({
      where: { id, organizationId: orgId },
      data: dto,
    });
  }

  @Post('numbers/:id/sync-templates')
  @ApiOperation({ summary: 'Sincronizar templates da Meta' })
  syncTemplates(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.syncTemplates(orgId, id);
  }

  @Post('send-message')
  @ApiOperation({ summary: 'Enviar mensagem de texto' })
  async sendMessage(@CurrentUser('organizationId') orgId: string, @Body() dto: SendMessageDto) {
    const number = await this.prisma.whatsappNumber.findFirst({
      where: { id: dto.whatsappNumberId, organizationId: orgId },
    });
    if (!number) throw new NotFoundException('Numero nao encontrado');
    return this.service.sendTextMessage(number.phoneNumberId, dto.to, dto.text, number.accessToken);
  }

  @Post('send-template')
  @ApiOperation({ summary: 'Enviar template aprovado' })
  async sendTemplate(@CurrentUser('organizationId') orgId: string, @Body() dto: SendTemplateDto) {
    const [number, template] = await Promise.all([
      this.prisma.whatsappNumber.findFirst({
        where: { id: dto.whatsappNumberId, organizationId: orgId },
      }),
      this.prisma.template.findFirst({
        where: { id: dto.templateId, organizationId: orgId },
      }),
    ]);

    if (!number) throw new NotFoundException('Numero nao encontrado');
    if (!template) throw new NotFoundException('Template nao encontrado');

    return this.service.sendTemplateMessage(
      number.phoneNumberId,
      dto.to,
      template.name,
      template.language,
      dto.components || [],
      number.accessToken,
    );
  }

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates' })
  getTemplates(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: string,
  ) {
    return this.prisma.template.findMany({
      where: {
        organizationId: orgId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }
}
