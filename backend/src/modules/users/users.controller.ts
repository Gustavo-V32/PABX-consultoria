import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string, @Query('page') p = 1, @Query('limit') l = 50, @Query('role') role?: any) {
    return this.service.findAll(orgId, +p, +l, role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateUserDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, orgId, dto);
  }

  @Patch('me/status')
  updateStatus(@CurrentUser('sub') userId: string, @Body() dto: { status: string }) {
    return this.service.updateStatus(userId, dto.status);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }
}
