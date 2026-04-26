import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { TransferConversationDto } from './dto/transfer-conversation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';

class AddNoteDto {
  @IsString() content: string;
  @IsOptional() isPrivate?: boolean;
}

@ApiTags('conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private service: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conversas' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: any,
  ) {
    const { page, limit, ...filters } = query;
    return this.service.findAll(orgId, filters, +(page || 1), +(limit || 20));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter conversa por ID' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar conversa' })
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateConversationDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar conversa' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Atribuir conversa a agente' })
  assign(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.service.assign(id, orgId, dto);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transferir conversa' })
  transfer(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TransferConversationDto,
  ) {
    return this.service.transfer(id, orgId, dto, userId);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolver conversa' })
  resolve(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.resolve(id, orgId, userId);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar conversa' })
  close(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.close(id, orgId, userId);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reabrir conversa' })
  reopen(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.reopen(id, orgId);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Adicionar nota interna' })
  addNote(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.service.addNote(id, orgId, dto.content, userId, dto.isPrivate ?? true);
  }
}
