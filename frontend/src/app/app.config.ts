import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './config/routes.config';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes),
        provideHttpClient(),
        provideTranslateService({
            loader: provideTranslateHttpLoader({
                prefix: '/assets/i18n/',
                suffix: '.json',
            }),
            fallbackLang: 'en',
            lang: 'en',
        }),
    ],
};
