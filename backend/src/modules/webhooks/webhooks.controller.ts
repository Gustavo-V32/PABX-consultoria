import { Controller, Get, Post, Body, Query, Res, HttpCode, Param, Logger, Headers } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Response } from 'express';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private whatsapp: WhatsappService,
    private integrations: IntegrationsService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  // WhatsApp webhook verification
  @Public()
  @Get('whatsapp/:numberId')
  verifyWebhook(
    @Param('numberId') numberId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
    @Res() res: Response,
  ) {
    const configToken = this.config.get<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && verifyToken === configToken) {
      this.logger.log(`WhatsApp webhook verified for number ${numberId}`);
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // WhatsApp webhook - incoming messages
  @Public()
  @Post('whatsapp/:numberId')
  @HttpCode(200)
  async receiveWhatsApp(@Param('numberId') numberId: string, @Body() body: any) {
    try {
      // Find number by phoneNumberId
      const number = await this.prisma.whatsappNumber.findUnique({
        where: { phoneNumberId: numberId },
      });

      if (number) {
        await this.whatsapp.processIncomingWebhook(body, number.organizationId);
      }
    } catch (err) {
      this.logger.error(`WhatsApp webhook error: ${err.message}`);
    }
    return { status: 'ok' };
  }

  // Generic HTTP integration webhook
  @Public()
  @Post('integration/:integrationId')
  @HttpCode(200)
  async receiveIntegration(
    @Param('integrationId') id: string,
    @Body() body: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    this.logger.log(`Integration webhook received: ${id}`);
    const integration = await this.integrations.findPublicIntegration(id);
    if (integration.type === 'TELEGRAM') {
      return this.integrations.processTelegramWebhook(id, body, headers);
    }
    return this.integrations.recordWebhook(integration, body, body?.event || body?.type);
  }

  @Public()
  @Post('telegram/:integrationId')
  @HttpCode(200)
  async receiveTelegram(
    @Param('integrationId') id: string,
    @Body() body: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.integrations.processTelegramWebhook(id, body, headers);
  }
}
