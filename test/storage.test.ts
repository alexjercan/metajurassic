import { BrowserStorage, defaultStorage } from "../src/storage";

// Mock localStorage
class MockLocalStorage {
    private store: Map<string, string> = new Map();

    getItem(key: string): string | null {
        return this.store.get(key) || null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    get length(): number {
        return this.store.size;
    }

    key(index: number): string | null {
        const keys = Array.from(this.store.keys());
        return keys[index] || null;
    }

    clear(): void {
        this.store.clear();
    }
}

describe("BrowserStorage", () => {
    let mockLocalStorage: MockLocalStorage;
    let originalLocalStorage: Storage | undefined;

    beforeEach(() => {
        mockLocalStorage = new MockLocalStorage();
        originalLocalStorage = global.localStorage;
        // @ts-ignore - mocking localStorage
        global.localStorage = mockLocalStorage;
    });

    afterEach(() => {
        // @ts-ignore - restore localStorage
        global.localStorage = originalLocalStorage;
    });

    test("getItem returns stored value", () => {
        const storage = new BrowserStorage();
        mockLocalStorage.setItem("testKey", "testValue");

        expect(storage.getItem("testKey")).toBe("testValue");
    });

    test("getItem returns null for non-existent key", () => {
        const storage = new BrowserStorage();

        expect(storage.getItem("nonExistent")).toBeNull();
    });

    test("setItem stores a value", () => {
        const storage = new BrowserStorage();

        storage.setItem("newKey", "newValue");

        expect(mockLocalStorage.getItem("newKey")).toBe("newValue");
    });

    test("setItem overwrites existing value", () => {
        const storage = new BrowserStorage();
        storage.setItem("key", "oldValue");

        storage.setItem("key", "newValue");

        expect(storage.getItem("key")).toBe("newValue");
    });

    test("removeItem deletes a key", () => {
        const storage = new BrowserStorage();
        storage.setItem("toDelete", "value");

        storage.removeItem("toDelete");

        expect(storage.getItem("toDelete")).toBeNull();
    });

    test("removeItem on non-existent key does nothing", () => {
        const storage = new BrowserStorage();

        expect(() => storage.removeItem("nonExistent")).not.toThrow();
    });

    test("length returns number of stored items", () => {
        const storage = new BrowserStorage();
        storage.setItem("key1", "value1");
        storage.setItem("key2", "value2");
        storage.setItem("key3", "value3");

        expect(storage.length()).toBe(3);
    });

    test("length returns 0 for empty storage", () => {
        const storage = new BrowserStorage();

        expect(storage.length()).toBe(0);
    });

    test("key returns nth key", () => {
        const storage = new BrowserStorage();
        storage.setItem("keyA", "valueA");
        storage.setItem("keyB", "valueB");
        storage.setItem("keyC", "valueC");

        const keys = [storage.key(0), storage.key(1), storage.key(2)].sort();

        expect(keys).toEqual(["keyA", "keyB", "keyC"]);
    });

    test("key returns null for out-of-bounds index", () => {
        const storage = new BrowserStorage();
        storage.setItem("key", "value");

        expect(storage.key(5)).toBeNull();
        expect(storage.key(-1)).toBeNull();
    });

    test("handles undefined localStorage gracefully", () => {
        // @ts-ignore - simulating undefined localStorage
        global.localStorage = undefined;
        const storage = new BrowserStorage();

        expect(storage.getItem("key")).toBeNull();
        expect(() => storage.setItem("key", "value")).not.toThrow();
        expect(() => storage.removeItem("key")).not.toThrow();
        expect(storage.length()).toBe(0);
        expect(storage.key(0)).toBeNull();
    });
});

describe("defaultStorage", () => {
    test("returns a BrowserStorage instance", () => {
        const storage = defaultStorage();

        expect(storage).toBeInstanceOf(BrowserStorage);
    });

    test("returns a new instance each time", () => {
        const storage1 = defaultStorage();
        const storage2 = defaultStorage();

        // Should be different instances (not singleton)
        expect(storage1).not.toBe(storage2);
    });
});
