import { describe, expect, it } from 'vitest';
import type { Transaction } from '../model/transaction.js';
import {
    TransactionDto,
    TransactionPageDto,
} from '../model/transaction.dto.js';
import {
    toTransactionDto,
    toTransactionPageDto,
} from './transaction.mapper.js';

const transaction: Transaction = {
    id: 'tx-1',
    accountId: 'acc-1',
    categoryId: null,
    type: 'expense',
    amount: 1250,
    title: null,
    description: 'Weekly shop',
    date: new Date('2026-09-15T08:30:00.000Z'),
    createdAt: new Date('2026-09-15T09:00:00.000Z'),
};

describe('transaction mappers', () => {
    it('copies every field, keeps nulls and serializes dates', () => {
        const dto = toTransactionDto(transaction);
        expect(dto).toBeInstanceOf(TransactionDto);
        expect({ ...dto }).toEqual({
            id: 'tx-1',
            accountId: 'acc-1',
            categoryId: null,
            type: 'expense',
            amount: 1250,
            title: null,
            description: 'Weekly shop',
            date: '2026-09-15T08:30:00.000Z',
            createdAt: '2026-09-15T09:00:00.000Z',
        });
    });

    it('maps a page with its paging info', () => {
        const dto = toTransactionPageDto({
            items: [transaction],
            total: 51,
            page: 2,
            pageSize: 50,
        });
        expect(dto).toBeInstanceOf(TransactionPageDto);
        expect(dto.items).toHaveLength(1);
        expect(dto.items[0]).toBeInstanceOf(TransactionDto);
        expect(dto).toMatchObject({ total: 51, page: 2, pageSize: 50 });
    });
});
