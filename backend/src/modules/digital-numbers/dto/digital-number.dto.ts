import { PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { DigitalNumberStatus } from '@prisma/client';

export class CreateDigitalNumberDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  sipServer?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  sipPort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  udpPort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  tlsPort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  amiPort?: number;

  @IsOptional()
  @IsInt()
  @Min(10000)
  @Max(65535)
  rtpPortStart?: number;

  @IsOptional()
  @IsInt()
  @Min(10000)
  @Max(65535)
  rtpPortEnd?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codecs?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(DigitalNumberStatus)
  status?: DigitalNumberStatus;

  @IsOptional()
  @IsString()
  registrationStatus?: string;

  @IsOptional()
  @IsArray()
  logs?: unknown[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDigitalNumberDto extends PartialType(CreateDigitalNumberDto) {}

export class RegisterDigitalNumberTestDto {
  @IsOptional()
  @IsEnum(DigitalNumberStatus)
  status?: DigitalNumberStatus;

  @IsOptional()
  @IsString()
  registrationStatus?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}
