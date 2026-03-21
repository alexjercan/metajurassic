import { StorageProvider, defaultStorage } from "./storage";

/**
 * Migrates old game state keys to the new format.
 * Old format: gameState-animal-#000 or gameState-dinosaur-#000
 * New format: gameState-dinosaur-#00000
 */
export function migrateGameStates(
    storage: StorageProvider = defaultStorage()
): void {
    const keysToMigrate: { oldKey: string; newKey: string }[] = [];

    // Handle storage providers that don't implement length/key
    const storageLength =
        storage.length?.() ??
        (typeof localStorage !== "undefined" ? localStorage.length : 0);
    const getKey =
        storage.key ??
        ((i: number) =>
            typeof localStorage !== "undefined" ? localStorage.key(i) : null);

    // Find all keys that need migration
    for (let i = 0; i < storageLength; i++) {
        const key = getKey(i);
        if (!key) continue;

        // Match old formats: gameState-animal-#000 or gameState-dinosaur-#000
        const oldAnimalMatch = key.match(/^gameState-animal-#(\d{3})$/);
        const oldDinoMatch = key.match(/^gameState-dinosaur-#(\d{3})$/);

        if (oldAnimalMatch) {
            const oldNumber = oldAnimalMatch[1];
            const newKey = `gameState-dinosaur-#${oldNumber.padStart(5, "0")}`;
            keysToMigrate.push({ oldKey: key, newKey });
        } else if (oldDinoMatch) {
            const oldNumber = oldDinoMatch[1];
            const newKey = `gameState-dinosaur-#${oldNumber.padStart(5, "0")}`;
            keysToMigrate.push({ oldKey: key, newKey });
        }
    }

    // Perform the migration
    for (const { oldKey, newKey } of keysToMigrate) {
        const data = storage.getItem(oldKey);
        if (data) {
            storage.setItem(newKey, data);
            storage.removeItem(oldKey);
            console.log(`Migrated: ${oldKey} → ${newKey}`);
        }
    }

    if (keysToMigrate.length > 0) {
        console.log(
            `Migration complete: ${keysToMigrate.length} game states migrated`
        );
    }
}
