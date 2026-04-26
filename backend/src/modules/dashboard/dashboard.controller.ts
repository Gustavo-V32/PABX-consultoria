import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Resumo geral do dashboard' })
  getOverview(@CurrentUser('organizationId') orgId: string) {
    return this.dashboardService.getOverview(orgId);
  }

  @Get('conversations-trend')
  @ApiOperation({ summary: 'Tendência de conversas por dia' })
  getConversationsTrend(
    @CurrentUser('organizationId') orgId: string,
    @Query('days') days = 7,
  ) {
    return this.dashboardService.getConversationsTrend(orgId, +days);
  }

  @Get('calls-trend')
  @ApiOperation({ summary: 'Tendência de chamadas por dia' })
  getCallsTrend(
    @CurrentUser('organizationId') orgId: string,
    @Query('days') days = 7,
  ) {
    return this.dashboardService.getCallsTrend(orgId, +days);
  }

  @Get('agent-performance')
  @ApiOperation({ summary: 'Performance dos agentes' })
  getAgentPerformance(@CurrentUser('organizationId') orgId: string) {
    return this.dashboardService.getAgentPerformance(orgId);
  }

  @Get('queue-stats')
  @ApiOperation({ summary: 'Estatísticas das filas' })
  getQueueStats(@CurrentUser('organizationId') orgId: string) {
    return this.dashboardService.getQueueStats(orgId);
  }
}
