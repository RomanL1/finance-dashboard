import { Injectable } from '@angular/core';
import { appConfigGet } from '../../../core/api';

@Injectable({ providedIn: 'root' })
export class DemoLoginService {
    /** Whether the backend seeded the demo users. Hidden when the config cannot be loaded. */
    async available(): Promise<boolean> {
        try {
            const response = await appConfigGet();
            return response.data?.demoLogin ?? false;
        } catch {
            return false;
        }
    }
}
