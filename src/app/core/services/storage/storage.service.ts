import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
    private readonly platformId = inject(PLATFORM_ID);

    get<T>(key: string): T | null {
        if (!isPlatformBrowser(this.platformId)) return null;
        const value = localStorage.getItem(key);
        if (!value) return null;
        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    }

    set<T>(key: string, value: T): void {
        if (isPlatformBrowser(this.platformId)) localStorage.setItem(key, JSON.stringify(value));
    }

    remove(key: string): void {
        if (isPlatformBrowser(this.platformId)) localStorage.removeItem(key);
    }
}
