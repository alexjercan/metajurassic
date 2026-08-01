import { GameState } from "../src/gameState";
import { buildGuessTree } from "../src/treeBuilder";
import { findNextHintCladeId, findBestHintCladeId } from "../src/hintRule";
import { makeGameData, makeState } from "./treeFixtures";

describe("findNextHintCladeId", () => {
    test("no guesses: returns the clade one step below root in target lineage", () => {
        // Species1 lineage: CladeB -> CladeA
        // Root = CladeA (revealed). Next hint = CladeB.
        const state = makeState("species1");
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("cladeb");
    });

    test("target with deeper lineage: returns clade just below root", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Root = CladeA (revealed). Next hint = CladeB (one step down from root).
        const state = makeState("species2");
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("cladeb");
    });

    test("after a guess that reveals an intermediate clade, skips it", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Guess Species1 => LCA(Species2, Species1) = CladeB (revealed)
        // Now revealed: CladeA, CladeB. Next hint = CladeD.
        const state = makeState("species2", ["species1"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("claded");
    });

    test("returns null when all clades in target lineage are revealed", () => {
        // Species1 lineage: CladeB -> CladeA
        // If CladeB is revealed (by a guess), all clades are revealed.
        const state = makeState("species1", ["species2"]);
        // LCA(Species1, Species2) = CladeB => both CladeA and CladeB revealed
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBeNull();
    });

    test("after one hint, returns the next clade down", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hint reveals CladeB. Next should be CladeD.
        const state = makeState("species2", [], ["cladeb"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("claded");
    });

    test("after all hints used, returns null", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hints: CladeB, CladeD => all revealed.
        const state = makeState("species2", [], ["cladeb", "claded"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBeNull();
    });

    test("returns null when a guess already reveals the target's immediate clade", () => {
        // Species1 lineage: CladeB -> CladeA
        // Guess Species2 => LCA(Species1, Species2) = CladeB
        // CladeB is the deepest clade in Species1's lineage, so there are
        // no more specific clades to hint. Should return null, not a
        // less-specific clade.
        const state = makeState("species1", ["species2"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBeNull();
    });

    test("returns null when a guess reveals a deep clade, skipping intermediates", () => {
        // Species3 lineage: CladeE -> CladeC -> CladeA
        // Guess Species4 => LCA(Species3, Species4) = CladeE
        // CladeE is the immediate clade of Species3, so no further hint is useful.
        // CladeC is unrevealed but *less* specific than CladeE — must NOT be returned.
        const state = makeState("species3", ["species4"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBeNull();
    });

    test("returns the next deeper clade when an intermediate is revealed but deeper ones remain", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hint reveals CladeB (intermediate). CladeD is still unrevealed
        // and is deeper, so it should be returned.
        const state = makeState("species2", [], ["cladeb"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("claded");
    });
});

describe("findBestHintCladeId", () => {
    test("returns null when no placeholder exists (game is won)", () => {
        // When the target is guessed, there's no placeholder
        const state = makeState("species1", ["species1"]);
        const roots = buildGuessTree(state);
        const bestHint = findBestHintCladeId(roots);
        expect(bestHint).toBeNull();
    });

    test("returns root clade when no guesses or hints", () => {
        // Species1 lineage: CladeB -> CladeA
        // No guesses/hints => placeholder is directly under CladeA
        const state = makeState("species1");
        const roots = buildGuessTree(state);
        const bestHint = findBestHintCladeId(roots);
        expect(bestHint).toBe("cladea");
    });

    test("returns the deepest revealed clade containing the placeholder", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Guess Species1 => LCA = CladeB (revealed)
        // Placeholder should be under CladeB
        const state = makeState("species2", ["species1"]);
        const roots = buildGuessTree(state);
        const bestHint = findBestHintCladeId(roots);
        expect(bestHint).toBe("cladeb");
    });

    test("returns the hint clade when hints are used", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hint: CladeB => placeholder under CladeB
        const state = makeState("species2", [], ["cladeb"]);
        const roots = buildGuessTree(state);
        const bestHint = findBestHintCladeId(roots);
        expect(bestHint).toBe("cladeb");
    });

    test("returns the deepest clade when multiple hints are used", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hints: CladeB, CladeD => placeholder under CladeD
        const state = makeState("species2", [], ["cladeb", "claded"]);
        const roots = buildGuessTree(state);
        const bestHint = findBestHintCladeId(roots);
        expect(bestHint).toBe("claded");
    });

    test("returns null for empty roots array", () => {
        const bestHint = findBestHintCladeId([]);
        expect(bestHint).toBeNull();
    });

    test("searches through multiple root clades", () => {
        // Build a tree with the placeholder
        const state = makeState("species1");
        const roots = buildGuessTree(state);

        // Test that it finds the placeholder even if we wrap it in an array
        const bestHint = findBestHintCladeId(roots);
        expect(bestHint).toBe("cladea");
    });
});

describe("findNextHintCladeId edge cases", () => {
    test("returns null when target species not found", () => {
        const gameData = makeGameData();
        const state = new GameState(
            gameData,
            "nonexistent",
            new Set(),
            undefined,
            new Set()
        );
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBeNull();
    });
});
