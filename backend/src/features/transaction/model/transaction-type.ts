/** Own module: both the transaction and the recurring transaction tables use it, and those schemas import each other. */
export const TRANSACTION_TYPES = ['expense', 'income'] as const;
