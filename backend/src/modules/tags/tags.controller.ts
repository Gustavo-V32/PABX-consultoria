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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('tags')
@Controller('tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TagsController {
  constructor(private service: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar etiquetas' })
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar etiqueta' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar etiqueta' })
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: { name: string; color?: string }) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar etiqueta' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: { name?: string; color?: string },
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover etiqueta' })
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }
}
