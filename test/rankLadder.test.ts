import { buildRankLadder } from "../src/rankLadder";
import { buildGuessTree } from "../src/treeBuilder";
import { guessTier } from "../src/closeness";
import { makeGameData, makeState } from "./treeFixtures";

// The synthetic tree is documented in treeFixtures.ts. Species2 is the target
// throughout, so the target's chain is cladea -> cladeb -> claded and cladec /
// cladee hang OFF it - which is what makes this fixture able to distinguish a
// chain row from an off-chain pairwise LCA at all.

function ladderFor(
    targetId: string,
    guessIds: string[] = [],
    hintCladeIds: string[] = [],
    lastGuessId?: string
) {
    const state = makeState(targetId, guessIds, hintCladeIds);
    state.lastGuessId = lastGuessId ?? guessIds[guessIds.length - 1];
    return buildRankLadder(state, buildGuessTree(state, state.isGameOver()));
}

describe("buildRankLadder", () => {
    it("orders rows root-first down the target's revealed chain", () => {
        const ladder = ladderFor("species2", ["species1", "species3"], [
            "claded",
        ]);

        expect(ladder.rows.map((row) => row.cladeId)).toEqual([
            "cladea",
            "cladeb",
            "claded",
        ]);
        expect(ladder.rows.map((row) => row.name)).toEqual([
            "CladeA",
            "CladeB",
            "CladeD",
        ]);
    });

    it("buckets each guess under the chain clade it joined the target at", () => {
        const ladder = ladderFor("species2", ["species1", "species3"], [
            "claded",
        ]);

        const bucketed = ladder.rows.map((row) => [
            row.cladeId,
            row.guesses.map((guess) => guess.speciesId),
        ]);
        expect(bucketed).toEqual([
            ["cladea", ["species3"]],
            ["cladeb", ["species1"]],
            ["claded", []],
        ]);
    });

    it("labels each row's provenance", () => {
        const ladder = ladderFor("species2", ["species1", "species3"], [
            "claded",
        ]);

        expect(ladder.rows.map((row) => row.provenance)).toEqual([
            "root",
            "guesses",
            "hint",
        ]);
    });

    it("counts the guesses spent and the hints bought", () => {
        const ladder = ladderFor("species2", ["species1", "species3"], [
            "claded",
        ]);

        expect(ladder.guessCount).toBe(2);
        expect(ladder.hintCount).toBe(1);
    });

    it("carries each guess's closeness tier through untouched", () => {
        const data = makeGameData();
        const ladder = ladderFor("species2", ["species1", "species3"]);

        const tiers = new Map(
            ladder.rows.flatMap((row) =>
                row.guesses.map(
                    (guess) => [guess.speciesId, guess.closenessTier] as const
                )
            )
        );
        expect(tiers.get("species1")).toBe(
            guessTier(data, "species1", "species2")
        );
        expect(tiers.get("species3")).toBe(
            guessTier(data, "species3", "species2")
        );
    });

    it("marks the newest guess", () => {
        const ladder = ladderFor("species2", ["species1", "species3"]);

        const newest = ladder.rows
            .flatMap((row) => row.guesses)
            .filter((guess) => guess.isLastGuess);
        expect(newest.map((guess) => guess.speciesId)).toEqual(["species3"]);
    });

    // Species3 and Species4 both join the target only at the root, so the tree
    // groups them under their PAIRWISE LCA, cladee - a clade that hangs off the
    // target's chain. It gets no row; both guesses roll up to cladea, the chain
    // clade that is their actual join with the target.
    it("rolls an off-chain pairwise-LCA bucket up to its nearest chain clade", () => {
        const ladder = ladderFor("species2", ["species3", "species4"]);

        expect(ladder.rows.map((row) => row.cladeId)).toEqual(["cladea"]);
        expect(ladder.rows[0].guesses.map((guess) => guess.speciesId)).toEqual([
            "species3",
            "species4",
        ]);
    });

    // The invariant the whole surface exists under: the ladder may restate the
    // board and may not extend it. See tasks/20260729-182320/DECISION.md.
    it("never shows a clade outside the revealed chain, and never an unrevealed one", () => {
        const cases: Array<[string[], string[]]> = [
            [[], []],
            [["species3", "species4"], []],
            [["species1"], []],
            [["species1", "species3"], ["claded"]],
            [["species1", "species2", "species3", "species4"], ["claded"]],
        ];

        for (const [guesses, hints] of cases) {
            const state = makeState("species2", guesses, hints);
            const roots = buildGuessTree(state, state.isGameOver());
            const ladder = buildRankLadder(state, roots);

            // Every row is a clade in the target's own lineage...
            const chain = makeGameData().lineage("claded");
            for (const row of ladder.rows) {
                expect(chain).toContain(row.cladeId);
            }

            // ...and one the board has already revealed. cladee is revealed in
            // the pairwise case but is not on the chain; claded is on the chain
            // but unrevealed unless hinted.
            const revealed = new Set(["cladea", ...hints]);
            for (const guessId of guesses) {
                const lca = makeGameData().computeLCA(guessId, "species2");
                if (lca) revealed.add(lca);
            }
            for (const row of ladder.rows) {
                expect([...revealed]).toContain(row.cladeId);
            }

            // And nothing anywhere names the answer's remaining depth.
            expect(JSON.stringify(ladder)).not.toContain("???");
        }
    });

    it("shows only the root before the first guess", () => {
        const ladder = ladderFor("species2");

        expect(ladder.rows).toEqual([
            {
                cladeId: "cladea",
                name: "CladeA",
                provenance: "root",
                guesses: [],
            },
        ]);
        expect(ladder.guessCount).toBe(0);
        expect(ladder.hintCount).toBe(0);
    });

    // A won round: the target was guessed, so it is a guess like any other and
    // must be counted once. Its tier stays undefined - the answer is not a
    // temperature (SpeciesNode.closenessTier).
    it("lists a winning guess under the deepest revealed clade", () => {
        const ladder = ladderFor("species2", ["species1", "species2"], [
            "claded",
        ]);

        const deepest = ladder.rows[ladder.rows.length - 1];
        expect(deepest.cladeId).toBe("claded");
        expect(deepest.guesses.map((guess) => guess.speciesId)).toEqual([
            "species2",
        ]);
        expect(deepest.guesses[0].closenessTier).toBeUndefined();
        expect(deepest.guesses[0].name).toBe("Species2");
    });

    // A lost round reveals the target's node, but the player never guessed it,
    // so it is not one of their guesses and gets no entry.
    it("does not list the target it did not guess", () => {
        const state = makeState("species2", ["species1"]);
        const ladder = buildRankLadder(state, buildGuessTree(state, true));

        const listed = ladder.rows.flatMap((row) =>
            row.guesses.map((guess) => guess.speciesId)
        );
        expect(listed).toEqual(["species1"]);
    });

    it("returns an empty ladder when there is no tree to read", () => {
        const state = makeState("species2");
        expect(buildRankLadder(state, [])).toEqual({
            guessCount: 0,
            hintCount: 0,
            rows: [],
        });
    });
});
