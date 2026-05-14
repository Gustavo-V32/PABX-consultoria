import { Module } from '@nestjs/common';
import { PbxController } from './pbx.controller';
import { PbxService } from './pbx.service';
import { TelephonyModule } from '../telephony/telephony.module';

@Module({
  imports: [TelephonyModule],
  controllers: [PbxController],
  providers: [PbxService],
  exports: [PbxService],
})
export class PbxModule {}
