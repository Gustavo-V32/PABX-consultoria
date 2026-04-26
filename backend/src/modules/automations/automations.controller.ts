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
import { AutomationsService, CreateAutomationDto, UpdateAutomationDto } from './automations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('automations')
@Controller('automations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationsController {
  constructor(private service: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar automacoes' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(orgId, includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar automacao' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar automacao' })
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateAutomationDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar automacao' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Post(':id/run')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Registrar execucao manual da automacao' })
  run(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.registerRun(id, orgId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativar automacao' })
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }
}
