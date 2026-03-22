export interface StorageProvider {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;

    length(): number;
    key(index: number): string | null;
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

    length(): number {
        if (typeof localStorage === "undefined") return 0;
        return localStorage.length;
    }

    key(index: number): string | null {
        if (typeof localStorage === "undefined") return null;
        return localStorage.key(index);
    }
}

export const defaultStorage = () => new BrowserStorage();
