import { toCategoryBars } from './analytics.types';

describe('toCategoryBars', () => {
    it('labels uncategorized rows and drops zero rows', () => {
        expect(
            toCategoryBars(
                {
                    currency: 'CHF',
                    categories: [
                        {
                            categoryId: 'c1',
                            categoryName: 'Food',
                            expenses: 500,
                        },
                        { categoryId: null, categoryName: null, expenses: 200 },
                        { categoryId: 'c2', categoryName: 'Rent', expenses: 0 },
                    ],
                },
                'Uncategorized',
            ),
        ).toEqual([
            { categoryId: 'c1', label: 'Food', expenses: 500 },
            { categoryId: null, label: 'Uncategorized', expenses: 200 },
        ]);
    });
});
