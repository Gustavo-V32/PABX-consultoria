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
import { SectorsService } from './sectors.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('sectors')
@Controller('sectors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SectorsController {
  constructor(private service: SectorsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar setores' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(orgId, includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar setor' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar setor' })
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar setor' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativar setor' })
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }
}
