import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { INVITATION_NOTE_MAX_LENGTH } from './invitation.js';

export class InvitationDto {
    @ApiProperty() id!: string;
    @ApiProperty({ type: String, nullable: true }) note!: string | null;
    @ApiProperty() createdAt!: string;
    @ApiProperty() expiresAt!: string;
}

export class CreatedInvitationDto extends InvitationDto {
    @ApiProperty({
        description:
            'Link token; returned only here, the server keeps just its hash',
    })
    token!: string;
}

export class InvitationPreviewDto {
    @ApiProperty() householdName!: string;
    @ApiProperty() ownerName!: string;
}

export class CreateInvitationDto {
    @ApiProperty({
        required: false,
        example: 'For Anna',
        maxLength: INVITATION_NOTE_MAX_LENGTH,
        description: 'Only the owner sees it',
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @MaxLength(INVITATION_NOTE_MAX_LENGTH)
    note?: string;
}
