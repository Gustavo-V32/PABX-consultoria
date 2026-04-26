import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CannedResponsesService } from './cannedResponses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('canned-responses')
@Controller('canned-responses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CannedResponsesController {
  constructor(private service: CannedResponsesService) {}

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string, @Query('search') search?: string) {
    return this.service.findAll(orgId, search);
  }

  @Post()
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.update(id, orgId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }
}
