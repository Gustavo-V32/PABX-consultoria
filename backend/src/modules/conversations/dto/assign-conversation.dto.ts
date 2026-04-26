import { IsString } from 'class-validator';
export class AssignConversationDto {
  @IsString() agentId: string;
}
