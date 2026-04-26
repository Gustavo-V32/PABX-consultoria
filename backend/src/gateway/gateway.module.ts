import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OmniGateway } from './omni.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [OmniGateway],
  exports: [OmniGateway],
})
export class GatewayModule {}
