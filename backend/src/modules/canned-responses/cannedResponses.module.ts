import { Module } from '@nestjs/common';
import { CannedResponsesController } from './cannedResponses.controller';
import { CannedResponsesService } from './cannedResponses.service';

@Module({
  controllers: [CannedResponsesController],
  providers: [CannedResponsesService],
  exports: [CannedResponsesService],
})
export class CannedResponsesModule {}
