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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FlowsService } from './flows.service';

@ApiTags('flows')
@Controller('flows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlowsController {
  constructor(private service: FlowsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar fluxos de comunicacao' })
  findAll(@CurrentUser('organizationId') orgId: string, @Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(orgId, includeInactive === 'true');
  }

  @Post('preview')
  @ApiOperation({ summary: 'Previsualizar mensagem com variaveis dinamicas' })
  preview(@CurrentUser('organizationId') orgId: string, @CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.service.previewMessage(orgId, { ...dto, agentId: dto.agentId || userId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar fluxo com nos e conexoes' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar fluxo' })
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar fluxo' })
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativar fluxo' })
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }

  @Post(':id/nodes')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  addNode(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.addNode(id, orgId, dto);
  }

  @Patch(':id/nodes/:nodeId')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  updateNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.updateNode(id, nodeId, orgId, dto);
  }

  @Delete(':id/nodes/:nodeId')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNode(@Param('id') id: string, @Param('nodeId') nodeId: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.deleteNode(id, nodeId, orgId);
  }

  @Post(':id/connections')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  addConnection(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.addConnection(id, orgId, dto);
  }

  @Delete(':id/connections/:connectionId')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConnection(
    @Param('id') id: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.deleteConnection(id, connectionId, orgId);
  }

  @Post(':id/executions')
  @ApiOperation({ summary: 'Iniciar execucao de fluxo' })
  startExecution(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.startExecution(id, orgId, dto);
  }

  @Patch('executions/:executionId')
  @ApiOperation({ summary: 'Atualizar execucao de fluxo' })
  updateExecution(@Param('executionId') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.updateExecution(id, orgId, dto);
  }
}
