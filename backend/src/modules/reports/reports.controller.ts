import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo gerencial por periodo' })
  summary(
    @CurrentUser('organizationId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.summary(orgId, from, to);
  }

  @Get('conversations-by-day')
  @ApiOperation({ summary: 'Atendimentos por dia' })
  conversationsByDay(
    @CurrentUser('organizationId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.conversationsByDay(orgId, from, to);
  }

  @Get('calls-by-day')
  @ApiOperation({ summary: 'Ligacoes por dia' })
  callsByDay(
    @CurrentUser('organizationId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.callsByDay(orgId, from, to);
  }

  @Get('agent-performance')
  @ApiOperation({ summary: 'Produtividade por agente' })
  agentPerformance(
    @CurrentUser('organizationId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.agentPerformance(orgId, from, to);
  }

  @Get('queue-performance')
  @ApiOperation({ summary: 'Performance por fila' })
  queuePerformance(
    @CurrentUser('organizationId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.queuePerformance(orgId, from, to);
  }
}
