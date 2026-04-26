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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DriveService } from './drive.service';

@ApiTags('drive')
@Controller('drive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriveController {
  constructor(private service: DriveService) {}

  @Get('oauth-url')
  @ApiOperation({ summary: 'Gerar URL OAuth do Google Drive' })
  oauthUrl(@Query('state') state?: string) {
    return this.service.getOAuthUrl(state);
  }

  @Get('folder-plan')
  @ApiOperation({ summary: 'Gerar estrutura de pastas por cliente/atendimento' })
  folderPlan(@Query('contactName') contactName: string, @Query('conversationId') conversationId?: string) {
    return this.service.buildFolderPlan(contactName || 'sem nome', conversationId);
  }

  @Get('files')
  @ApiOperation({ summary: 'Listar arquivos vinculados do Google Drive' })
  findAll(@CurrentUser('organizationId') orgId: string, @Query() query: any) {
    return this.service.findAll(orgId, query);
  }

  @Get('files/:id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post('files')
  @ApiOperation({ summary: 'Registrar metadados de arquivo do Google Drive' })
  create(@CurrentUser('organizationId') orgId: string, @CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.service.createMetadata(orgId, userId, dto);
  }

  @Patch('files/:id')
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.updateMetadata(id, orgId, dto);
  }

  @Delete('files/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.deleteMetadata(id, orgId);
  }
}
