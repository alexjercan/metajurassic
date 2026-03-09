export interface StorageProvider {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem?(key: string): void;
}

export class BrowserStorage implements StorageProvider {
    getItem(key: string): string | null {
        if (typeof localStorage === "undefined") return null;
        return localStorage.getItem(key);
    }

    setItem(key: string, value: string): void {
        if (typeof localStorage === "undefined") return;
        localStorage.setItem(key, value);
    }

    removeItem(key: string): void {
        if (typeof localStorage === "undefined") return;
        localStorage.removeItem(key);
    }
}

export const defaultStorage = () => new BrowserStorage();
