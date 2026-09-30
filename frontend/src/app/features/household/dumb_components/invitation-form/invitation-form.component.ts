import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';

export const INVITATION_NOTE_MAX_LENGTH = 50;

/** Optional note plus the button that creates a link. Emits the trimmed note, empty for none. */
@Component({
    selector: 'app-invitation-form',
    imports: [
        ButtonComponent,
        MatError,
        MatFormField,
        MatInput,
        MatLabel,
        ReactiveFormsModule,
        TranslatePipe,
    ],
    template: `
        <form class="flex flex-col gap-2" (submit)="submit($event)">
            <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{
                    'members.invitations.noteLabel' | translate
                }}</mat-label>
                <input
                    matInput
                    type="text"
                    [formControl]="note"
                    [maxlength]="maxLength"
                />
                @if (note.hasError('maxlength')) {
                    <mat-error>{{
                        'members.invitations.noteTooLong'
                            | translate: { max: maxLength }
                    }}</mat-error>
                }
            </mat-form-field>
            <p class="type-body-small text-on-surface-variant">
                {{ 'members.invitations.noteHint' | translate }}
            </p>
            @if (errorMessage(); as message) {
                <p role="alert" class="type-body-medium text-error">
                    {{ message }}
                </p>
            }
            <app-button
                type="submit"
                variant="tonal"
                [disabled]="busy() || note.invalid"
            >
                {{ 'members.invitations.create' | translate }}
            </app-button>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationFormComponent {
    readonly busy = input(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<string>();

    protected readonly maxLength = INVITATION_NOTE_MAX_LENGTH;
    protected readonly note = new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(INVITATION_NOTE_MAX_LENGTH)],
    });

    protected submit(event: Event): void {
        event.preventDefault();
        if (this.busy() || this.note.invalid) return;
        this.submitted.emit(this.note.value.trim());
        this.note.reset();
    }
}
