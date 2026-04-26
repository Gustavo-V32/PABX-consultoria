import { Module } from '@nestjs/common';
import { DigitalNumbersController } from './digital-numbers.controller';
import { DigitalNumbersService } from './digital-numbers.service';

@Module({
  controllers: [DigitalNumbersController],
  providers: [DigitalNumbersService],
  exports: [DigitalNumbersService],
})
export class DigitalNumbersModule {}
