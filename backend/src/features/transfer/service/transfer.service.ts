import { Inject, Injectable } from '@nestjs/common';
import { TransferRepository } from '../repository/transfer.repository.js';
import {
    buildTransfer,
    CreateTransfer,
    CreateTransferInput,
    isActiveAt,
    PAGE_SIZE,
    Transfer,
    TransferFilter,
    TransferPage,
} from '../model/transfer.js';
import {
    Id,
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';

@Injectable()
export class TransferService {
    constructor(@Inject() private readonly transfers: TransferRepository) {}

    /** A page past the end is empty, not an error. */
    async getPage(
        householdId: Id,
        filter: TransferFilter,
        page: number,
        pageSize = PAGE_SIZE,
    ): Promise<TransferPage> {
        const [items, total] = await Promise.all([
            this.transfers.listByHouseholdId(
                householdId,
                filter,
                pageSize,
                (page - 1) * pageSize,
            ),
            this.transfers.countByHouseholdId(householdId, filter),
        ]);
        return { items, total, page, pageSize };
    }

    async create(
        householdId: Id,
        input: CreateTransferInput,
    ): Promise<Transfer> {
        const entity = buildTransfer(input);
        await this.assertAccounts(householdId, entity);
        return this.transfers.createTransfer(entity);
    }

    /** Full replace: every field comes from the input, only the id survives. */
    async update(
        householdId: Id,
        id: Id,
        input: CreateTransferInput,
    ): Promise<Transfer> {
        const entity = { ...buildTransfer(input), id };
        await this.assertAccounts(householdId, entity);
        const updated = await this.transfers.updateTransfer(
            householdId,
            entity,
        );
        if (!updated) throw new NotFoundError('Transfer', id);
        return updated;
    }

    async delete(householdId: Id, id: Id): Promise<void> {
        if (!(await this.transfers.deleteTransfer(householdId, id))) {
            throw new NotFoundError('Transfer', id);
        }
    }

    /** Both accounts in the household and still active at the transfer's date. */
    private async assertAccounts(
        householdId: Id,
        entity: CreateTransfer,
    ): Promise<void> {
        const accounts = await this.transfers.findAccounts(householdId, [
            entity.fromAccountId,
            entity.toAccountId,
        ]);
        for (const id of [entity.fromAccountId, entity.toAccountId]) {
            const account = accounts.find((a) => a.id === id);
            if (!account) throw new NotFoundError('Account', id);
            if (!isActiveAt(account, entity.date)) {
                throw new ValidationError(
                    `Account ${id} is archived at the transfer date`,
                );
            }
        }
    }
}
