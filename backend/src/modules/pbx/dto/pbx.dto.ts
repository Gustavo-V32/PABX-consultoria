import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CallRouteDestinationType, CallRouteDirection, QueueStrategy, SoftphoneSessionStatus } from '@prisma/client';

export class IvrOptionDto {
  @IsString()
  @Matches(/^([0-9]|\*|#|timeout|invalid)$/)
  digit: string;

  @IsString()
  label: string;

  @IsEnum(CallRouteDestinationType)
  destinationType: CallRouteDestinationType;

  @IsOptional()
  @IsString()
  destinationValue?: string;

  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isFallback?: boolean;
}

export class CreateIvrDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  nodes?: unknown[];

  @IsOptional()
  @IsArray()
  edges?: unknown[];

  @IsOptional()
  @IsString()
  entryPoint?: string;

  @IsOptional()
  @IsString()
  audioFile?: string;

  @IsOptional()
  @IsString()
  ttsText?: string;

  @IsOptional()
  @IsString()
  afterHoursMessage?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IvrOptionDto)
  options?: IvrOptionDto[];
}

export class UpdateIvrDto extends PartialType(CreateIvrDto) {}

export class CreateCallRouteDto {
  @IsOptional()
  @IsString()
  trunkId?: string;

  @IsEnum(CallRouteDirection)
  direction: CallRouteDirection;

  @IsString()
  name: string;

  @IsString()
  pattern: string;

  @IsEnum(CallRouteDestinationType)
  destinationType: CallRouteDestinationType;

  @IsOptional()
  @IsString()
  destinationValue?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  priority?: number;

  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCallRouteDto extends PartialType(CreateCallRouteDto) {}

export class CreateRingGroupMemberDto {
  @IsString()
  extensionId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  order?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  penalty?: number;
}

export class CreateRingGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(QueueStrategy)
  strategy?: QueueStrategy;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  timeout?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRingGroupMemberDto)
  members?: CreateRingGroupMemberDto[];
}

export class UpdateRingGroupDto extends PartialType(CreateRingGroupDto) {}

export class CreateRecordingDto {
  @IsString()
  callId: string;

  @IsString()
  storagePath: string;

  @IsOptional()
  @IsString()
  publicUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @IsOptional()
  @IsString()
  checksum?: string;
}

export class RegisterSoftphoneSessionDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  extensionId?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsEnum(SoftphoneSessionStatus)
  status?: SoftphoneSessionStatus;
}

export class SoftphoneHeartbeatDto {
  @IsOptional()
  @IsEnum(SoftphoneSessionStatus)
  status?: SoftphoneSessionStatus;
}
