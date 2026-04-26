import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { QueuesModule } from './modules/queues/queues.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { GatewayModule } from './gateway/gateway.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { HealthModule } from './modules/health/health.module';
import { SectorsModule } from './modules/sectors/sectors.module';
import { TagsModule } from './modules/tags/tags.module';
import { AuditModule } from './modules/audit/audit.module';
import { CannedResponsesModule } from './modules/canned-responses/cannedResponses.module';
import { FlowsModule } from './modules/flows/flows.module';
import { DriveModule } from './modules/drive/drive.module';
import { DigitalNumbersModule } from './modules/digital-numbers/digital-numbers.module';
import { PbxModule } from './modules/pbx/pbx.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        }],
      }),
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'redis'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    WhatsappModule,
    TelephonyModule,
    QueuesModule,
    ReportsModule,
    DashboardModule,
    AutomationsModule,
    TemplatesModule,
    WebhooksModule,
    GatewayModule,
    NotificationsModule,
    IntegrationsModule,
    HealthModule,
    SectorsModule,
    TagsModule,
    AuditModule,
    CannedResponsesModule,
    FlowsModule,
    DriveModule,
    DigitalNumbersModule,
    PbxModule,
  ],
})
export class AppModule {}
