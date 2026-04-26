import { IsString, IsEnum, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ConversationChannel } from '@prisma/client';

export class CreateConversationDto {
  @IsString() contactId: string;
  @IsEnum(ConversationChannel) channel: ConversationChannel;
  @IsOptional() @IsString() whatsappNumberId?: string;
  @IsOptional() @IsString() queueId?: string;
  @IsOptional() @IsString() sectorId?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsInt() priority?: number;
}
