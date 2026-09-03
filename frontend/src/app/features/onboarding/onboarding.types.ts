import type { DefaultCategoryDto } from '../../core/api';
import { CURRENCIES } from '../../core/constants/currencies';
import type { Currency } from '../../core/constants/currencies';

export type { DefaultCategoryDto, Currency };
export { CURRENCIES };

export interface CategorySelection {
    translateKeys: string[];
    customNames: string[];
}
