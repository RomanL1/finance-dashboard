import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { prefetchShellTab } from './app/config/routes.config';

prefetchShellTab(location.pathname);
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
