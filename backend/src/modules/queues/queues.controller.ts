import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateQueueDto, QueuesService, UpdateQueueDto } from './queues.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('queues')
@Controller('queues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QueuesController {
  constructor(private service: QueuesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar filas de atendimento' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(orgId, includeInactive === 'true');
  }

  @Get('stats')
  @ApiOperation({ summary: 'Status operacional das filas' })
  stats(@CurrentUser('organizationId') orgId: string) {
    return this.service.stats(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar fila' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar fila' })
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateQueueDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar fila' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateQueueDto,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativar fila' })
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Adicionar agente a fila' })
  addMember(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: { userId: string; penalty?: number },
  ) {
    return this.service.addMember(id, orgId, dto.userId, dto.penalty ?? 0);
  }

  @Patch(':id/members/:userId')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar membro da fila' })
  updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: { penalty?: number; isPaused?: boolean; pauseReason?: string | null },
  ) {
    return this.service.updateMember(id, orgId, userId, dto);
  }

  @Delete(':id/members/:userId')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover agente da fila' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.removeMember(id, orgId, userId);
  }
}
