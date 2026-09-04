import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import {
    ApplicationConfig,
    LOCALE_ID,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './config/routes.config';

/** Single app language for now; switch both `lang` and `LOCALE_ID` together once a language switcher exists. */
const LANG = 'en';
registerLocaleData(localeDe);

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
            lang: LANG,
        }),
        { provide: LOCALE_ID, useValue: LANG },
    ],
};
