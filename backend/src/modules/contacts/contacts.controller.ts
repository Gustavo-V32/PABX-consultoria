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
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private service: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contatos' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: any,
  ) {
    const { page, limit, ...filters } = query;
    return this.service.findAll(orgId, filters, +(page || 1), +(limit || 50));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar contato' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar contato' })
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar contatos em lote' })
  importContacts(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: { contacts: any[] },
  ) {
    return this.service.importContacts(orgId, dto.contacts || []);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar contato' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover contato' })
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }

  @Post(':id/variables')
  @ApiOperation({ summary: 'Criar ou atualizar variavel personalizada do contato' })
  upsertVariable(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.upsertVariable(orgId, id, dto);
  }

  @Delete(':id/variables/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteVariable(
    @Param('id') id: string,
    @Param('key') key: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.deleteVariable(orgId, id, key);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Registrar anexo do contato' })
  addAttachment(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: any,
  ) {
    return this.service.addAttachment(orgId, id, userId, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.deleteAttachment(orgId, id, attachmentId);
  }
}
