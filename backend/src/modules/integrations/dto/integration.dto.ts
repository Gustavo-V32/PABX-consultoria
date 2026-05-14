import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { HttpMethod } from '@prisma/client';

export enum IntegrationType {
  HTTP = 'HTTP',
  IXC = 'IXC',
  TELEGRAM = 'TELEGRAM',
  WEBHOOK = 'WEBHOOK',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  WHATSAPP = 'WHATSAPP',
}

export class UpsertIntegrationDto {
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @IsString()
  name: string;

  @IsObject()
  config: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateIntegrationDto extends PartialType(UpsertIntegrationDto) {}

export class ExecuteIntegrationDto {
  @IsOptional()
  @IsEnum(HttpMethod)
  method?: HttpMethod;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, unknown>;

  @IsOptional()
  body?: unknown;

  @IsOptional()
  @IsObject()
  query?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeout?: number;
}

export class IxcCustomerSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  qtype?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class TelegramSendMessageDto {
  @IsOptional()
  @IsString()
  chatId?: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}
