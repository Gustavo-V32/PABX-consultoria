import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private service: MessagesService) {}

  @Get('conversation/:conversationId')
  findByConversation(@Param('conversationId') id: string, @Query('page') p = 1, @Query('limit') l = 50) {
    return this.service.findByConversation(id, +p, +l);
  }

  @Post('conversation/:conversationId')
  create(
    @Param('conversationId') convId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: { content: string; type?: string },
  ) {
    return this.service.create(convId, userId, dto.content, dto.type);
  }

  @Post('conversation/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Param('conversationId') id: string) {
    return this.service.markAsRead(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/attachments')
  addAttachment(@Param('id') id: string, @Body() dto: any) {
    return this.service.addAttachment(id, dto);
  }

  @Delete('attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAttachment(@Param('id') id: string) {
    return this.service.deleteAttachment(id);
  }
}
