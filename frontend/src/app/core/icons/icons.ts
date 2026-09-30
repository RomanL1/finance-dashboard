import {
    EnvironmentProviders,
    inject,
    provideAppInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import add from '@material-symbols/svg-400/outlined/add-fill.svg';
import arrowBack from '@material-symbols/svg-400/outlined/arrow_back-fill.svg';
import archive from '@material-symbols/svg-400/outlined/archive-fill.svg';
import barChart from '@material-symbols/svg-400/outlined/bar_chart-fill.svg';
import brightnessAuto from '@material-symbols/svg-400/outlined/brightness_auto-fill.svg';
import check from '@material-symbols/svg-400/outlined/check-fill.svg';
import chevronLeft from '@material-symbols/svg-400/outlined/chevron_left-fill.svg';
import chevronRight from '@material-symbols/svg-400/outlined/chevron_right-fill.svg';
import close from '@material-symbols/svg-400/outlined/close-fill.svg';
import contentCopy from '@material-symbols/svg-400/outlined/content_copy-fill.svg';
import darkMode from '@material-symbols/svg-400/outlined/dark_mode-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import edit from '@material-symbols/svg-400/outlined/edit-fill.svg';
import eventRepeat from '@material-symbols/svg-400/outlined/event_repeat-fill.svg';
import home from '@material-symbols/svg-400/outlined/home-fill.svg';
import label from '@material-symbols/svg-400/outlined/label-fill.svg';
import lightMode from '@material-symbols/svg-400/outlined/light_mode-fill.svg';
import moreVert from '@material-symbols/svg-400/outlined/more_vert-fill.svg';
import group from '@material-symbols/svg-400/outlined/group-fill.svg';
import pause from '@material-symbols/svg-400/outlined/pause-fill.svg';
import personRemove from '@material-symbols/svg-400/outlined/person_remove-fill.svg';
import playArrow from '@material-symbols/svg-400/outlined/play_arrow-fill.svg';
import receiptLong from '@material-symbols/svg-400/outlined/receipt_long-fill.svg';
import repeat from '@material-symbols/svg-400/outlined/repeat-fill.svg';
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
    arrow_back: arrowBack,
    bar_chart: barChart,
    brightness_auto: brightnessAuto,
    check,
    chevron_left: chevronLeft,
    chevron_right: chevronRight,
    close,
    content_copy: contentCopy,
    dark_mode: darkMode,
    delete: deleteIcon,
    edit,
    event_repeat: eventRepeat,
    group,
    home,
    label,
    light_mode: lightMode,
    more_vert: moreVert,
    pause,
    person_remove: personRemove,
    play_arrow: playArrow,
    receipt_long: receiptLong,
    repeat,
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
