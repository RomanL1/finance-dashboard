import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { TransferService } from '../service/transfer.service.js';
import {
    CreateTransferDto,
    TransferDto,
    TransferListQueryDto,
    TransferPageDto,
} from '../model/transfer.dto.js';
import { toTransferDto, toTransferPageDto } from './transfer.mapper.js';
import { type Id } from '../../../shared/kernel/index.js';
import { type CreateTransferInput } from '../model/transfer.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';

@ApiTags('transfer')
@ApiCookieAuth()
@ApiParam({ name: 'householdId', description: 'Household id', type: String })
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/transfers')
export class TransferController {
    constructor(private readonly transfers: TransferService) {}

    @Get()
    @ApiOkResponse({ type: TransferPageDto })
    async getTransfers(
        @Param('householdId') householdId: Id,
        @Query() query: TransferListQueryDto,
    ): Promise<TransferPageDto> {
        return toTransferPageDto(
            await this.transfers.getPage(
                householdId,
                { accountId: query.accountId },
                query.page ?? 1,
                query.pageSize,
            ),
        );
    }

    @Post()
    @ApiOkResponse({ type: TransferDto })
    async createTransfer(
        @Param('householdId') householdId: Id,
        @Body() dto: CreateTransferDto,
    ): Promise<TransferDto> {
        return toTransferDto(
            await this.transfers.create(householdId, toInput(dto)),
        );
    }

    @Patch(':transferId')
    @ApiParam({ name: 'transferId', description: 'Transfer id', type: String })
    @ApiOkResponse({ type: TransferDto })
    async updateTransfer(
        @Param('householdId') householdId: Id,
        @Param('transferId') transferId: Id,
        @Body() dto: CreateTransferDto,
    ): Promise<TransferDto> {
        return toTransferDto(
            await this.transfers.update(householdId, transferId, toInput(dto)),
        );
    }

    @Delete(':transferId')
    @ApiParam({ name: 'transferId', description: 'Transfer id', type: String })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Transfer successfully deleted' })
    async deleteTransfer(
        @Param('householdId') householdId: Id,
        @Param('transferId') transferId: Id,
    ): Promise<void> {
        await this.transfers.delete(householdId, transferId);
    }
}

function toInput(dto: CreateTransferDto): CreateTransferInput {
    return {
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        amount: dto.amount,
        title: dto.title,
        date: new Date(dto.date),
    };
}
