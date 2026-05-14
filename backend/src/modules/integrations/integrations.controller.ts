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
import {
  ExecuteIntegrationDto,
  IxcCustomerSearchDto,
  TelegramSendMessageDto,
  UpdateIntegrationDto,
  UpsertIntegrationDto,
} from './dto/integration.dto';

@ApiTags('integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Listar conectores disponiveis e campos de configuracao' })
  catalog() {
    return this.service.catalog();
  }

  @Get()
  @ApiOperation({ summary: 'Listar integracoes' })
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
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

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar integracao' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar ou atualizar integracao por tipo' })
  upsert(@CurrentUser('organizationId') orgId: string, @Body() dto: UpsertIntegrationDto) {
    return this.service.upsert(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar integracao' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateIntegrationDto,
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

  @Post(':id/execute')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Executar request HTTP com variaveis, token ou usuario e senha' })
  execute(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: ExecuteIntegrationDto,
  ) {
    return this.service.execute(orgId, id, dto);
  }

  @Post(':id/ixc/customers/search')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Buscar clientes no IXC Provedor' })
  searchIxcCustomers(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: IxcCustomerSearchDto,
  ) {
    return this.service.searchIxcCustomers(orgId, id, dto);
  }

  @Post(':id/telegram/send-message')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Enviar mensagem pelo bot Telegram configurado' })
  sendTelegramMessage(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: TelegramSendMessageDto,
  ) {
    return this.service.sendTelegramMessage(orgId, id, dto);
  }

  @Post(':id/test')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Testar conexao HTTP da integracao' })
  testConnection(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: ExecuteIntegrationDto,
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
