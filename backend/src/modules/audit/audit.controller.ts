import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar logs de auditoria' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: any,
  ) {
    const { page, limit, ...filters } = query;
    return this.service.findAll(orgId, filters, +(page || 1), +(limit || 50));
  }
}
