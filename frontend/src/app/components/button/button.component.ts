import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import {
    MatButton,
    MatIconButton,
    type MatButtonAppearance,
} from '@angular/material/button';

@Component({
    selector: 'app-button',
    imports: [MatButton],
    template: `
        <button
            [type]="type()"
            [matButton]="variant()"
            [disabled]="disabled()"
            (click)="clicked.emit($event)"
            [attr.aria-label]="ariaLabel()"
        >
            <ng-content />
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
    readonly variant = input<MatButtonAppearance>('filled');
    readonly type = input<'button' | 'submit'>('button');
    readonly disabled = input<boolean>(false);
    readonly ariaLabel = input<string | null>(null);
    readonly clicked = output<MouseEvent>();
}

@Component({
    selector: 'app-icon-button',
    imports: [MatIconButton],
    template: `
        <button
            [type]="type()"
            matIconButton
            [disabled]="disabled()"
            (click)="clicked.emit($event)"
            [attr.aria-label]="ariaLabel()"
            [attr.aria-pressed]="ariaPressed()"
        >
            <ng-content />
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButtonComponent {
    readonly type = input<'button' | 'submit'>('button');
    readonly disabled = input<boolean>(false);
    readonly ariaLabel = input<string | null>(null);
    readonly ariaPressed = input<boolean | null>(null);
    readonly clicked = output<MouseEvent>();
}
