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
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar integracoes' })
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar integracao' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar ou atualizar integracao por tipo' })
  upsert(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.upsert(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar integracao' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Post(':id/sync')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Marcar integracao como sincronizada' })
  markSynced(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.markSynced(id, orgId);
  }

  @Get('logs/recent')
  @ApiOperation({ summary: 'Listar logs recentes de integracoes HTTP' })
  logs(
    @CurrentUser('organizationId') orgId: string,
    @Query('integrationId') integrationId?: string,
    @Query('limit') limit = 100,
  ) {
    return this.service.logs(orgId, integrationId, +limit);
  }

  @Post(':id/test')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Testar conexao HTTP da integracao' })
  testConnection(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.testConnection(orgId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativar integracao' })
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }
}
