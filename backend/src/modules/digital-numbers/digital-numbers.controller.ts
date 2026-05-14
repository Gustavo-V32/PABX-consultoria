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
import { DigitalNumbersService } from './digital-numbers.service';
import {
  CreateDigitalNumberDto,
  RegisterDigitalNumberTestDto,
  UpdateDigitalNumberDto,
} from './dto/digital-number.dto';

@ApiTags('digital-numbers')
@Controller('digital-numbers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DigitalNumbersController {
  constructor(private service: DigitalNumbersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar numeros digitais SIP' })
  findAll(@CurrentUser('organizationId') orgId: string, @Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(orgId, includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Post()
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateDigitalNumberDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: UpdateDigitalNumberDto) {
    return this.service.update(id, orgId, dto);
  }

  @Post(':id/test')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Registrar teste de conexao do numero digital' })
  test(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: RegisterDigitalNumberTestDto) {
    return this.service.registerTest(id, orgId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'TELEPHONY_OPERATOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(id, orgId);
  }
}
