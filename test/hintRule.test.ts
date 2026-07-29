// The hint reveal rule, exercised over the REAL content graph
// (`src/jurassic/index.json`) rather than a hand-written mock - a threshold rule
// is a claim about the SHAPE of the actual lineage ladder, and a four-species
// fixture cannot falsify it (LESSONS.md
// `mock-fixtures-hide-real-data-defects-test-the-real-payload`).
//
// Design record: tasks/20260729-141424/DECISION.md.

import { buildGameData } from "../src/jsonLoader";
import { GameState, consistentCandidates } from "../src/gameState";
import { findNextHintCladeId } from "../src/treeBuilder";
import { HINT_SPLIT_FRACTION } from "../src/constants";
import rawGameData from "../src/jurassic/index.json";
import type { Species } from "../src/types";

const data = buildGameData(rawGameData);

function inClade(species: Species, cladeId: string): boolean {
    return data.lineage(species.clade).includes(cladeId);
}

// The clades already on screen: the root, every hinted clade, and the join
// clade of every guess. Mirrors what the tree draws.
function revealedClades(state: GameState): Set<string> {
    const target = data.findSpeciesById(state.targetId);
    if (!target) throw new Error("bad target");
    const lineage = data.lineage(target.clade);
    const revealed = new Set<string>([lineage[lineage.length - 1]]);
    for (const c of state.hintClades) revealed.add(c);
    for (const guessId of state.guesses) {
        if (guessId === state.targetId) continue;
        const lca = data.computeLCA(state.targetId, guessId);
        if (lca) revealed.add(lca);
    }
    return revealed;
}

describe("findNextHintCladeId over the real payload", () => {
    test("the payload is the real one, not a fixture", () => {
        expect(data.species.length).toBeGreaterThan(100);
    });

    test("a hint takes the best available split, never a worse one", () => {
        // The contract, stated as the property that matters: whatever clade the
        // hint returns, no SHALLOWER unrevealed clade in the lineage could have
        // met the threshold. That covers both branches at once - when a
        // qualifying clade exists the rule must return one, and when none does
        // the fallback is allowed - without re-implementing the rule to assert
        // against it.
        //
        // Walks each target DOWN its hint ladder rather than only checking a
        // cold board: the fallback branch never fires on a fresh board (from 150
        // candidates something always cuts to 75), so a cold-board-only loop
        // would assert the fallback rule vacuously.
        let checkedQualifying = 0;
        let checkedFallback = 0;

        for (const target of data.species) {
            const state = new GameState(data, target.id);

            for (let step = 0; step < 30; step++) {
                const lineage = data.lineage(target.clade);
                const revealed = revealedClades(state);
                const candidates = consistentCandidates(state);
                const cutoff = Math.max(
                    1,
                    Math.floor(candidates.length * HINT_SPLIT_FRACTION)
                );

                const hint = findNextHintCladeId(state);
                if (hint === null) break;

                const size = (cladeId: string) =>
                    candidates.filter((s) => inClade(s, cladeId)).length;

                // Unrevealed lineage clades, shallowest first - the order the
                // rule considers them in.
                const deepestRevealedIdx = lineage.findIndex((c) =>
                    revealed.has(c)
                );
                const considered = lineage
                    .slice(0, deepestRevealedIdx)
                    .reverse()
                    .filter((c) => !revealed.has(c));

                expect(considered).toContain(hint);

                const qualifying = considered.filter((c) => size(c) <= cutoff);

                if (qualifying.length > 0) {
                    // Must return the SHALLOWEST qualifying clade: incremental,
                    // not the most specific one it could get away with.
                    expect(hint).toBe(qualifying[0]);
                    expect(size(hint)).toBeLessThanOrEqual(cutoff);
                    checkedQualifying++;
                } else {
                    // Fallback: the deepest unrevealed clade, and by
                    // construction it still holds MORE than the cutoff - it
                    // under-delivers, it never gives the answer away.
                    expect(hint).toBe(considered[considered.length - 1]);
                    expect(size(hint)).toBeGreaterThan(cutoff);
                    checkedFallback++;
                }

                state.hintClades.add(hint);
            }
        }

        // Both branches must actually be exercised, or the assertions above are
        // vacuous for one of them.
        expect(checkedQualifying).toBeGreaterThan(0);
        expect(checkedFallback).toBeGreaterThan(0);
    });

    test("the first hint on a cold board at least halves the field for most targets", () => {
        // The rescue property in miniature: this is what the old one-level walk
        // failed to do (it handed over clades holding ~66% of the field).
        let halved = 0;
        for (const target of data.species) {
            const state = new GameState(data, target.id);
            const hint = findNextHintCladeId(state);
            if (!hint) continue;
            const inside = data.species.filter((s) =>
                inClade(s, hint)
            ).length;
            if (inside <= data.species.length * HINT_SPLIT_FRACTION) halved++;
        }
        // Not all: the fallback branch exists precisely because some lineages
        // have no clade that cuts far enough.
        expect(halved).toBeGreaterThan(data.species.length * 0.75);
    });

    test("the old one-level-down behaviour is gone", () => {
        // Regression pin for the bug this task fixed. Tyrannosaurus used to be
        // offered `saurischia` (99 of 150 species) as its first hint; whatever
        // it is offered now must be a real cut.
        const trex = data.species.find((s) =>
            s.species.toLowerCase().includes("tyrannosaurus")
        );
        if (!trex) throw new Error("Tyrannosaurus not in the payload");

        const state = new GameState(data, trex.id);
        const hint = findNextHintCladeId(state);
        expect(hint).not.toBeNull();

        const inside = data.species.filter((s) => inClade(s, hint)).length;
        expect(inside).toBeLessThanOrEqual(
            data.species.length * HINT_SPLIT_FRACTION
        );
    });

    test("a hint never eliminates the target", () => {
        // A hint states something TRUE about the target. If this ever failed the
        // game would be unwinnable after pressing the button.
        for (const target of data.species) {
            const state = new GameState(data, target.id);
            const hint = findNextHintCladeId(state);
            if (!hint) continue;
            expect(inClade(target, hint)).toBe(true);
        }
    });

    test("hints keep narrowing when bought repeatedly, and terminate", () => {
        for (const target of data.species.slice(0, 40)) {
            const state = new GameState(data, target.id);
            let previous = consistentCandidates(state).length;
            let bought = 0;

            for (;;) {
                const hint = findNextHintCladeId(state);
                if (!hint) break;
                expect(state.hintClades.has(hint)).toBe(false);
                state.hintClades.add(hint);
                bought++;

                const now = consistentCandidates(state).length;
                expect(now).toBeLessThanOrEqual(previous);
                expect(now).toBeGreaterThan(0); // the target is always in there
                previous = now;

                expect(bought).toBeLessThan(30); // no infinite ladder
            }
        }
    });
});

describe("consistentCandidates", () => {
    test("keeps the target and drops species the board has ruled out", () => {
        const target = data.species[0];
        const other = data.species.find(
            (s) => data.computeLCA(s.id, target.id) !== target.clade
        );
        if (!other) throw new Error("payload has no distinguishable species");

        const state = new GameState(data, target.id, new Set([other.id]));
        const candidates = consistentCandidates(state);

        expect(candidates.map((s) => s.id)).toContain(target.id);
        expect(candidates.map((s) => s.id)).not.toContain(other.id);

        // Everything left must be indistinguishable from the target given the
        // guess that was made.
        const observed = data.computeLCA(other.id, target.id);
        for (const c of candidates) {
            expect(data.computeLCA(other.id, c.id)).toBe(observed);
        }
    });

    test("respects clades already revealed by a hint", () => {
        const target = data.species[0];
        const lineage = data.lineage(target.clade);
        const hinted = lineage[Math.max(0, lineage.length - 2)];

        const state = new GameState(
            data,
            target.id,
            new Set(),
            undefined,
            new Set([hinted])
        );

        const candidates = consistentCandidates(state);
        expect(candidates.length).toBeGreaterThan(0);
        for (const c of candidates) {
            expect(inClade(c, hinted)).toBe(true);
        }
    });
});
