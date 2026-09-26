import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import { env, isProduction } from './env.js';

export class AppConfigDto {
    @ApiProperty({
        description:
            'Demo and sample users exist, so the login page may offer them: seeded on boot (SEED_DEMO) or, in development, by `bun run db:seed`.',
    })
    demoLogin!: boolean;
}

/** Runtime settings the frontend needs before anyone is signed in. */
@ApiTags('config')
@Controller('config')
export class AppConfigController {
    @Get()
    @Public()
    @ApiOkResponse({ type: AppConfigDto })
    get(): AppConfigDto {
        return { demoLogin: env.seedDemo || !isProduction };
    }
}
