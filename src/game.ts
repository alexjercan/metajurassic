export interface Species {
    id: string;
    name: string;
    clade: string[];
    description: string;
}

export interface Clade {
    name: string;
    parent?: string;
    description: string;
}

export interface GuessResult {
    isCorrect: boolean;
    clade: string | null;
}

/**
 * Compute the Lowest Common Ancestor (LCA) of two clade lists.
 * Iterates through clade1 from most specific to most general (reverse order)
 * and returns the first clade found in clade2.
 */
export function computeLCA(clade1: string[], clade2: string[]): string | null {
    // Start from the most specific clade (end of array) and work backwards
    for (let i = clade1.length - 1; i >= 0; i--) {
        if (clade2.includes(clade1[i])) {
            return clade1[i];
        }
    }
    return null;
}

/**
 * Get a random species from the list using a seeded random function.
 * Uses the current day of year as the seed to ensure the same species
 * is selected for all players on the same day.
 */
export function getRandomSpecies(species: Species[], date: Date = new Date()): Species {
    if (species.length === 0) {
        throw new Error("Cannot get random species from empty list");
    }

    const randomIndex = getRandomIndexForDate(species.length, date);
    return species[randomIndex];
}

/**
 * Generate a seeded random index for daily puzzles.
 * Uses the current day of year to ensure consistency throughout the day.
 */
export function getRandomIndexForDate(arrayLength: number, date: Date = new Date()): number {
    if (arrayLength <= 0) {
        throw new Error("Array length must be positive");
    }

    const dayOfYear = getDayOfYear(date);
    return dayOfYear % arrayLength;
}

/**
 * Generate a random index between 0 and length-1.
 */
export function getRandomIndex(length: number): number {
    if (length <= 0) {
        throw new Error("Length must be positive");
    }
    return Math.floor(Math.random() * length);
}

/**
 * Get the day of year (1-365/366) for a given date.
 * Useful for seeding daily puzzles.
 */
export function getDayOfYear(date: Date = new Date()): number {
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Format a day number as a zero-padded puzzle ID.
 * Example: 5 -> "Animal #005", 365 -> "Animal #365"
 */
export function formatPuzzleId(dayOfYear: number): string {
    return `Animal #${String(dayOfYear).padStart(3, '0')}`;
}

/**
 * Validate if a species name exists in the species list (case-insensitive).
 */
export function findSpeciesByName(name: string, species: Species[]): Species | null {
    const normalizedName = name.trim().toLowerCase();
    return species.find(s => s.name.toLowerCase() === normalizedName) || null;
}

/**
 * Check if a guess is correct and compute feedback.
 */
export function checkGuess(
    guess: Species,
    target: Species
): GuessResult {
    if (guess.id === target.id) {
        return { isCorrect: true, clade: null };
    }

    const lca = computeLCA(target.clade, guess.clade);
    if (!lca) {
        throw new Error("No common clade found between target and guess");
    }

    return { isCorrect: false, clade: lca };
}

/**
 * Validate that a species hasn't already been guessed.
 */
export function isAlreadyGuessed(speciesName: string, guessedSpecies: Set<string>): boolean {
    return guessedSpecies.has(speciesName.toLowerCase());
}
