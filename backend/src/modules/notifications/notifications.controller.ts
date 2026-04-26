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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificacoes do usuario' })
  findMine(
    @CurrentUser('sub') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.service.findForUser(userId, unreadOnly === 'true', +page, +limit);
  }

  @Post()
  @ApiOperation({ summary: 'Criar notificacao para o usuario atual' })
  create(@CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.service.create(userId, dto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificacao como lida' })
  markRead(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.markRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.service.markAllRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover notificacao' })
  delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.delete(id, userId);
  }
}
