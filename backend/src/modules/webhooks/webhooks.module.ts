import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [WhatsappModule, IntegrationsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
