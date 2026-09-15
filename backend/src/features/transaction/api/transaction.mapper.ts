import {
    TransactionDto,
    TransactionPageDto,
} from '../model/transaction.dto.js';
import { Transaction, TransactionPage } from '../model/transaction.js';

export function toTransactionDto(transaction: Transaction): TransactionDto {
    const dto = new TransactionDto();
    dto.id = transaction.id;
    dto.accountId = transaction.accountId;
    dto.categoryId = transaction.categoryId;
    dto.type = transaction.type;
    dto.amount = transaction.amount;
    dto.title = transaction.title;
    dto.description = transaction.description;
    dto.date = transaction.date.toISOString();
    dto.createdAt = transaction.createdAt.toISOString();
    return dto;
}

export function toTransactionsDto(
    transactions: Transaction[],
): TransactionDto[] {
    return transactions.map(toTransactionDto);
}

export function toTransactionPageDto(
    page: TransactionPage,
): TransactionPageDto {
    const dto = new TransactionPageDto();
    dto.items = toTransactionsDto(page.items);
    dto.total = page.total;
    dto.page = page.page;
    dto.pageSize = page.pageSize;
    return dto;
}
