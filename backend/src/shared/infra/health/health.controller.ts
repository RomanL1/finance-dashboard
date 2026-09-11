import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';

export class HealthDto {
    @ApiProperty({ example: 'ok' })
    status!: 'ok';
}

/** Liveness probe for container orchestration (compose healthcheck). No dependencies checked. */
@ApiTags('health')
@Controller('health')
export class HealthController {
    @Get()
    @Public()
    @ApiOkResponse({ type: HealthDto })
    health(): HealthDto {
        return { status: 'ok' };
    }
}
