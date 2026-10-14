import { TransferDto, TransferPageDto } from '../model/transfer.dto.js';
import { Transfer, TransferPage } from '../model/transfer.js';

export function toTransferDto(transfer: Transfer): TransferDto {
    const dto = new TransferDto();
    dto.id = transfer.id;
    dto.fromAccountId = transfer.fromAccountId;
    dto.toAccountId = transfer.toAccountId;
    dto.amount = transfer.amount;
    dto.title = transfer.title;
    dto.date = transfer.date.toISOString();
    dto.createdAt = transfer.createdAt.toISOString();
    return dto;
}

export function toTransferPageDto(page: TransferPage): TransferPageDto {
    const dto = new TransferPageDto();
    dto.items = page.items.map(toTransferDto);
    dto.total = page.total;
    dto.page = page.page;
    dto.pageSize = page.pageSize;
    return dto;
}
