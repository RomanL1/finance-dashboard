import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import {
    ApplicationConfig,
    LOCALE_ID,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
    provideRouter,
    withComponentInputBinding,
    withPreloading,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { DelayedPreloadingStrategy } from './config/delayed-preloading.strategy';
import { routes } from './config/routes.config';
import { provideAppIcons } from './core/icons/icons';
import { restoreLanguage } from './core/i18n/language.service';

/** `lang` and `LOCALE_ID` always move together; the settings language switcher reloads the app to change them. */
const LANG = restoreLanguage();
document.documentElement.lang = LANG;
registerLocaleData(localeDe);

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        /** Fetch lazy chunks shortly after boot so tab switches do not wait on the network. */
        provideRouter(
            routes,
            withPreloading(DelayedPreloadingStrategy),
            withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideAppIcons(),
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
