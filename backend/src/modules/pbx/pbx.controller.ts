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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PbxService } from './pbx.service';

@ApiTags('pbx')
@Controller('pbx')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PbxController {
  constructor(private service: PbxService) {}

  @Get('ivrs')
  listIvrs(@CurrentUser('organizationId') orgId: string) {
    return this.service.listIvrs(orgId);
  }

  @Post('ivrs')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  createIvr(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.createIvr(orgId, dto);
  }

  @Patch('ivrs/:id')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  updateIvr(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.updateIvr(id, orgId, dto);
  }

  @Delete('ivrs/:id')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteIvr(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.deleteIvr(id, orgId);
  }

  @Post('ivrs/:id/options')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  addIvrOption(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.addIvrOption(id, orgId, dto);
  }

  @Patch('ivrs/:id/options/:optionId')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  updateIvrOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.updateIvrOption(id, optionId, orgId, dto);
  }

  @Delete('ivrs/:id/options/:optionId')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteIvrOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.deleteIvrOption(id, optionId, orgId);
  }

  @Get('routes')
  @ApiOperation({ summary: 'Listar rotas de entrada e saida' })
  listRoutes(@CurrentUser('organizationId') orgId: string, @Query('direction') direction?: any) {
    return this.service.listRoutes(orgId, direction);
  }

  @Post('routes')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  createRoute(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.createRoute(orgId, dto);
  }

  @Patch('routes/:id')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  updateRoute(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.updateRoute(id, orgId, dto);
  }

  @Delete('routes/:id')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRoute(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.deleteRoute(id, orgId);
  }

  @Get('ring-groups')
  listRingGroups(@CurrentUser('organizationId') orgId: string) {
    return this.service.listRingGroups(orgId);
  }

  @Post('ring-groups')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  createRingGroup(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.createRingGroup(orgId, dto);
  }

  @Patch('ring-groups/:id')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  updateRingGroup(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.updateRingGroup(id, orgId, dto);
  }

  @Post('ring-groups/:id/members')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  addRingGroupMember(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.addRingGroupMember(id, orgId, dto);
  }

  @Delete('ring-groups/:id/members/:extensionId')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRingGroupMember(
    @Param('id') id: string,
    @Param('extensionId') extensionId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.removeRingGroupMember(id, extensionId, orgId);
  }

  @Delete('ring-groups/:id')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRingGroup(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.deleteRingGroup(id, orgId);
  }

  @Get('recordings')
  listRecordings(@CurrentUser('organizationId') orgId: string, @Query() query: any) {
    return this.service.listRecordings(orgId, query);
  }

  @Post('recordings')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  createRecording(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.service.createRecording(orgId, dto);
  }

  @Get('softphone/sessions')
  listSoftphoneSessions(@CurrentUser('organizationId') orgId: string) {
    return this.service.listSoftphoneSessions(orgId);
  }

  @Post('softphone/sessions')
  registerSoftphoneSession(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: any,
  ) {
    return this.service.registerSoftphoneSession(orgId, userId, dto);
  }

  @Patch('softphone/sessions/:sessionId/heartbeat')
  heartbeatSoftphoneSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.heartbeatSoftphoneSession(sessionId, orgId, dto);
  }

  @Post('softphone/sessions/:sessionId/unregister')
  unregisterSoftphoneSession(@Param('sessionId') sessionId: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.unregisterSoftphoneSession(sessionId, orgId);
  }
}
