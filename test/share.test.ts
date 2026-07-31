import { GameState } from "../src/gameState";
import { formatGameStateForSharing } from "../src/shareText";
import { buildGameData } from "../src/jsonLoader";
import { shareResult } from "../src/ui/share";
import { MAX_GUESSES } from "../src/constants";
import rawGameData from "../src/jurassic/index.json";

// The share message is the game's only growth loop, so these tests run against
// the REAL content graph (`src/jurassic/index.json`), not a hand-written mock:
// the closeness grid is a claim about the shipped taxonomy, and a fixture tree
// would only prove the arithmetic. See LESSONS.md
// `mock-fixtures-hide-real-data-defects-test-the-real-payload`.
const data = buildGameData(rawGameData);

const TARGET = "tyrannosaurus";

// A ladder of real species whose LCA with Tyrannosaurus sits at a known depth
// in its 14-clade lineage, one per tier. The comment on each line is the
// closeness value (lcaDepth / lineageDepth) that puts it in that bin.
const LADDER: [string, string][] = [
    ["Stegosaurus", "⬛"], // 0.071, meets only at dinosauria
    ["Brachiosaurus", "🟦"], // 0.214, eusaurischia
    ["Allosaurus", "🟨"], // 0.500, avetheropoda
    ["Guanlong", "🟧"], // 0.643, tyrannosauroidea
    ["Albertosaurus", "🟩"], // 0.857, tyrannosauridae
];

function idFor(name: string): string {
    const species = data.findSpeciesByName(name);
    if (!species) throw new Error(`test fixture species missing: ${name}`);
    return species.id;
}

function playedGame(guessNames: string[], hints: string[] = []): GameState {
    return new GameState(
        data,
        TARGET,
        new Set(guessNames.map(idFor)),
        undefined,
        new Set(hints)
    );
}

function gridOf(message: string): string {
    // The grid is the third line: header, sentence, grid.
    return message.split("\n")[2];
}

describe("share grid", () => {
    test("each closeness tier renders its own cell against the real taxonomy", () => {
        const message = formatGameStateForSharing(
            playedGame([...LADDER.map(([name]) => name), "Tyrannosaurus"]),
            { mode: "daily", seed: 1 }
        );

        expect(gridOf(message)).toBe(
            LADDER.map(([, cell]) => cell).join("") + "🦖"
        );
    });

    test("distinct games tell distinct stories", () => {
        const lucky = formatGameStateForSharing(
            playedGame(["Albertosaurus", "Tyrannosaurus"]),
            { mode: "daily", seed: 1 }
        );
        const slog = formatGameStateForSharing(
            playedGame(["Stegosaurus", "Brachiosaurus", "Tyrannosaurus"]),
            { mode: "daily", seed: 1 }
        );

        expect(gridOf(lucky)).toBe("🟩🦖");
        expect(gridOf(slog)).toBe("⬛🟦🦖");
        expect(gridOf(lucky)).not.toBe(gridOf(slog));
    });

    test("the winning guess is the dinosaur, wherever it lands", () => {
        const message = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"]),
            { mode: "daily", seed: 1 }
        );

        expect(gridOf(message)).toBe("🦖");
    });

    test("a hint adds one bulb after the guesses", () => {
        const message = formatGameStateForSharing(
            playedGame(["Stegosaurus", "Tyrannosaurus"], ["coelurosauria"]),
            { mode: "daily", seed: 1 }
        );

        expect(gridOf(message)).toBe("⬛🦖💡");
    });

    test("a loss grids every guess actually made, not a wall of blanks", () => {
        const guesses = data.species
            .filter((s) => s.id !== TARGET)
            .slice(0, MAX_GUESSES)
            .map((s) => s.species);
        const message = formatGameStateForSharing(playedGame(guesses), {
            mode: "daily",
            seed: 1,
        });

        const grid = gridOf(message);
        expect(Array.from(grid)).toHaveLength(MAX_GUESSES);
        expect(grid).not.toContain("🦖");
        // A random slice of the species list cannot be uniformly far away.
        expect(new Set(Array.from(grid)).size).toBeGreaterThan(1);
    });

    test("a guess outside the target's tree is coldest, never a crash", () => {
        const orphan = new GameState(
            data,
            TARGET,
            new Set(["not-a-real-species", TARGET])
        );
        const message = formatGameStateForSharing(orphan, {
            mode: "daily",
            seed: 1,
        });

        expect(gridOf(message)).toBe("⬛🦖");
    });
});

describe("share stats", () => {
    test("real streak and average are rendered when they exist", () => {
        const message = formatGameStateForSharing(
            playedGame(["Stegosaurus", "Tyrannosaurus"]),
            { mode: "daily", seed: 1 },
            { currentStreak: 4, averageGuesses: 7.14, wins: 9 }
        );

        expect(message).toContain("🔥 4 day streak | Avg. 7.1");
    });

    test("a one-day streak reads in the singular", () => {
        const message = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"]),
            { mode: "daily", seed: 1 },
            { currentStreak: 1, averageGuesses: 3, wins: 1 }
        );

        expect(message).toContain("🔥 1 day streak");
    });

    test("a first-ever share prints no zero placeholders", () => {
        const message = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"]),
            { mode: "daily", seed: 1 },
            { currentStreak: 0, averageGuesses: 0, wins: 0 }
        );

        expect(message).not.toContain("Avg.");
        expect(message).not.toContain("streak");
        expect(message).not.toContain("🔥");
        expect(message).not.toMatch(/\b0\b/);
    });

    test("a loss never claims the streak it just failed to extend", () => {
        // `calculateStreak` counts wins only, so after a loss today yesterday's
        // streak is still live in the stats - it must not reach the message.
        const lost = playedGame(
            data.species
                .filter((s) => s.id !== TARGET)
                .slice(0, MAX_GUESSES)
                .map((s) => s.species)
        );

        const message = formatGameStateForSharing(
            lost,
            { mode: "daily", seed: 1 },
            { currentStreak: 5, averageGuesses: 6, wins: 5 }
        );

        expect(message).toContain("💀");
        expect(message).not.toContain("🔥");
        expect(message).not.toContain("streak");
        // The lifetime average is still honest and still shown.
        expect(message).toContain("Avg. 6.0");
    });

    test("practice shares carry the average but no day streak", () => {
        const message = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"]),
            { mode: "practice", seed: 42 },
            { currentStreak: 6, averageGuesses: 5, wins: 12 }
        );

        expect(message).toContain("Avg. 5.0");
        expect(message).not.toContain("streak");
    });

    test("omitting stats omits the line entirely", () => {
        const message = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"]),
            { mode: "daily", seed: 1 }
        );

        expect(message).not.toContain("Avg.");
        expect(message).not.toContain("🔥");
    });

    test("no fabricated numbers survive anywhere in the message", () => {
        for (const stats of [
            undefined,
            { currentStreak: 2, averageGuesses: 8.25, wins: 5 },
        ]) {
            const message = formatGameStateForSharing(
                playedGame(["Stegosaurus", "Tyrannosaurus"]),
                { mode: "daily", seed: 1 },
                stats
            );
            expect(message).not.toContain("5.2");
            expect(message).not.toContain("Avg. Guesses");
        }
    });
});

describe("share message shape", () => {
    test("a win counts the guesses it took, pluralized", () => {
        const solo = formatGameStateForSharing(playedGame(["Tyrannosaurus"]), {
            mode: "daily",
            seed: 1,
        });
        const pair = formatGameStateForSharing(
            playedGame(["Stegosaurus", "Tyrannosaurus"]),
            { mode: "daily", seed: 1 }
        );

        expect(solo).toContain("in 1 guess!");
        expect(pair).toContain("in 2 guesses!");
    });

    test("a hint costs its guesses in the headline, and is named", () => {
        // The bulb is one cell but the hint costs HINT_COST guesses, so the
        // sentence says so rather than leaving a reader to count cells and
        // arrive at a different number.
        const one = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"], ["coelurosauria"]),
            { mode: "daily", seed: 1 }
        );
        const two = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"], ["coelurosauria", "theropoda"]),
            { mode: "daily", seed: 1 }
        );

        expect(one).toContain("in 4 guesses (1 hint)!");
        expect(two).toContain("in 7 guesses (2 hints)!");
    });

    test("a hintless win says nothing about hints", () => {
        const message = formatGameStateForSharing(
            playedGame(["Stegosaurus", "Tyrannosaurus"]),
            { mode: "daily", seed: 1 }
        );

        expect(message).toContain("in 2 guesses!");
        expect(message).not.toContain("hint");
    });

    test("practice is labelled and carries its seed id, not a daily number", () => {
        const message = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"]),
            { mode: "practice", seed: 42 }
        );

        expect(message).toContain("Practice Dinosaur");
        expect(message).toContain("dinosaur-#00043");
    });

    test("every message ends with the link and the tag", () => {
        const message = formatGameStateForSharing(
            playedGame(["Tyrannosaurus"]),
            { mode: "daily", seed: 1 }
        );

        expect(message).toContain(
            "https://alexjercan.github.io/metajurassic"
        );
        expect(message.endsWith("#metajurassic")).toBe(true);
    });
});

describe("shareResult", () => {
    test("uses the native share sheet when the platform has one", async () => {
        const share = jest.fn().mockResolvedValue(undefined);
        const copy = jest.fn().mockResolvedValue(undefined);

        await expect(shareResult("hello", { share, copy })).resolves.toBe(
            "shared"
        );
        expect(share).toHaveBeenCalledWith({ text: "hello" });
        expect(copy).not.toHaveBeenCalled();
    });

    test("a cancelled share is a no-op, not a silent clipboard write", async () => {
        const abort = Object.assign(new Error("cancelled"), {
            name: "AbortError",
        });
        const share = jest.fn().mockRejectedValue(abort);
        const copy = jest.fn().mockResolvedValue(undefined);

        await expect(shareResult("hello", { share, copy })).resolves.toBe(
            "cancelled"
        );
        expect(copy).not.toHaveBeenCalled();
    });

    test("a failed share falls back to the clipboard", async () => {
        const share = jest.fn().mockRejectedValue(new Error("no permission"));
        const copy = jest.fn().mockResolvedValue(undefined);

        await expect(shareResult("hello", { share, copy })).resolves.toBe(
            "copied"
        );
        expect(copy).toHaveBeenCalledWith("hello");
    });

    test("without a share sheet it copies", async () => {
        const copy = jest.fn().mockResolvedValue(undefined);

        await expect(shareResult("hello", { copy })).resolves.toBe("copied");
        expect(copy).toHaveBeenCalledWith("hello");
    });

    test("with neither path available it reports failure to the caller", async () => {
        await expect(shareResult("hello", {})).rejects.toThrow(
            "No share or clipboard"
        );
    });
});
