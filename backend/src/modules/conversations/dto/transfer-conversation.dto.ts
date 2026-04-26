import { IsString, IsOptional } from 'class-validator';
export class TransferConversationDto {
  @IsOptional() @IsString() toAgentId?: string;
  @IsOptional() @IsString() toQueueId?: string;
  @IsOptional() @IsString() reason?: string;
}
