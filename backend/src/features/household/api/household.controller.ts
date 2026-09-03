import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '../../../shared/infra/auth/auth.js';
import { CurrentUser } from '../../../shared/infra/auth/index.js';
import { HouseholdDto } from '../model/household.dto.js';
import { HouseholdService } from '../service/household.service.js';
import { toHouseholdDto } from './household.mapper.js';

@ApiTags('household')
@ApiCookieAuth()
@Controller('households')
export class HouseholdController {
    constructor(private readonly households: HouseholdService) {}

    @Get('me')
    @ApiOkResponse({ type: HouseholdDto })
    async mine(@CurrentUser() user: SessionUser): Promise<HouseholdDto> {
        return toHouseholdDto(await this.households.getForUser(user.id));
    }
}
