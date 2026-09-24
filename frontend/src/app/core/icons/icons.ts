import {
    EnvironmentProviders,
    inject,
    provideAppInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import add from '@material-symbols/svg-400/outlined/add-fill.svg';
import archive from '@material-symbols/svg-400/outlined/archive-fill.svg';
import barChart from '@material-symbols/svg-400/outlined/bar_chart-fill.svg';
import brightnessAuto from '@material-symbols/svg-400/outlined/brightness_auto-fill.svg';
import chevronLeft from '@material-symbols/svg-400/outlined/chevron_left-fill.svg';
import chevronRight from '@material-symbols/svg-400/outlined/chevron_right-fill.svg';
import close from '@material-symbols/svg-400/outlined/close-fill.svg';
import darkMode from '@material-symbols/svg-400/outlined/dark_mode-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import edit from '@material-symbols/svg-400/outlined/edit-fill.svg';
import home from '@material-symbols/svg-400/outlined/home-fill.svg';
import label from '@material-symbols/svg-400/outlined/label-fill.svg';
import lightMode from '@material-symbols/svg-400/outlined/light_mode-fill.svg';
import moreVert from '@material-symbols/svg-400/outlined/more_vert-fill.svg';
import receiptLong from '@material-symbols/svg-400/outlined/receipt_long-fill.svg';
import settings from '@material-symbols/svg-400/outlined/settings-fill.svg';
import unarchive from '@material-symbols/svg-400/outlined/unarchive-fill.svg';
import visibility from '@material-symbols/svg-400/outlined/visibility-fill.svg';
import visibilityOff from '@material-symbols/svg-400/outlined/visibility_off-fill.svg';

/**
 * Every icon the app uses, by `svgIcon` name: `<mat-icon svgIcon="home" />`.
 * Material Symbols (filled, weight 400) imported as SVG text, so only these ship.
 * A new icon: add its import and entry here; an unknown name logs an error at runtime.
 */
export const APP_ICONS = {
    add,
    archive,
    bar_chart: barChart,
    brightness_auto: brightnessAuto,
    chevron_left: chevronLeft,
    chevron_right: chevronRight,
    close,
    dark_mode: darkMode,
    delete: deleteIcon,
    edit,
    home,
    label,
    light_mode: lightMode,
    more_vert: moreVert,
    receipt_long: receiptLong,
    settings,
    unarchive,
    visibility,
    visibility_off: visibilityOff,
} as const;

export type AppIcon = keyof typeof APP_ICONS;

/** Registers `APP_ICONS` with `MatIconRegistry` at startup. The SVGs are our own bundled files. */
export function provideAppIcons(): EnvironmentProviders {
    return provideAppInitializer(() => {
        const registry = inject(MatIconRegistry);
        const sanitizer = inject(DomSanitizer);
        for (const [name, svg] of Object.entries(APP_ICONS)) {
            registry.addSvgIconLiteral(
                name,
                sanitizer.bypassSecurityTrustHtml(svg),
            );
        }
    });
}
