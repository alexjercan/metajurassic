// Difficulty simulation for the playtest pass (tasks/20260729-092435).
//
// Plays every target in the REAL content graph (`src/jurassic/index.json`) with
// several player policies and reports the guess distribution, the loss rate at
// MAX_GUESSES, and what a hint is worth against its HINT_COST.
//
// The game rules come from `src/` - `computeLCA`, `lineage`, `GameState` and
// `findNextHintCladeId` are imported, never re-implemented. A hand-copied
// mirror would rot against the original and measure a game nobody plays
// (LESSONS.md `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`).
// Only the player POLICIES and the PRNG are new here, because `src/` has no
// notion of either.
//
// IMPORTANT: both narrowing policies keep a perfectly consistent candidate set,
// which assumes the player knows every species' clade membership by heart. The
// numbers are a SKILL CEILING - a floor on what a human needs, not a typical
// player. See tasks/20260729-092435/DECISION.md.
//
// Run: npm run playtest:difficulty

import * as fs from "fs";
import * as path from "path";

import { buildGameData, RawGameData } from "../../src/jsonLoader";
import { GameData } from "../../src/gameData";
import { GameState } from "../../src/gameState";
import { findNextHintCladeId } from "../../src/treeBuilder";
import { MAX_GUESSES, HINT_COST } from "../../src/constants";
import type { Species } from "../../src/types";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PAYLOAD = path.join(REPO_ROOT, "src", "jurassic", "index.json");

function loadRealGameData(): GameData {
    const raw = JSON.parse(fs.readFileSync(PAYLOAD, "utf8")) as RawGameData;
    return buildGameData(raw);
}

// Small deterministic PRNG so a re-run reproduces the same report. Not game
// logic - `src/` keeps its own mulberry32 private for the daily shuffle, and
// borrowing it here would couple the report to the puzzle schedule.
function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// ---------------------------------------------------------------------------
// What the screen tells the player
// ---------------------------------------------------------------------------

// A guess against a target yields exactly one observable: the deepest clade the
// two share (rendered as the join point in the tree). `null` means the two
// lineages never meet, which the tree draws as separate roots.
function feedback(data: GameData, guessId: string, targetId: string): string {
    return data.computeLCA(guessId, targetId) ?? "__disjoint__";
}

// Everything still consistent with one observation. This is the deduction a
// player is being asked to perform: the target sits inside the join clade, and
// outside the branch of it the guess came from.
function narrowByGuess(
    data: GameData,
    candidates: Species[],
    guessId: string,
    observed: string
): Species[] {
    return candidates.filter(
        (s) => s.id !== guessId && feedback(data, guessId, s.id) === observed
    );
}

// A hint names one more clade in the target's lineage, so everything outside
// that clade is eliminated.
function narrowByClade(
    data: GameData,
    candidates: Species[],
    cladeId: string
): Species[] {
    return candidates.filter((s) => data.lineage(s.clade).includes(cladeId));
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

type Policy = (
    data: GameData,
    candidates: Species[],
    all: Species[],
    guessed: Set<string>,
    rand: () => number
) => Species;

// Floor: ignores the tree entirely and guesses an unplayed species at random.
// This is what the feedback loop has to beat to be worth reading.
const blind: Policy = (_data, _candidates, all, guessed, rand) => {
    const left = all.filter((s) => !guessed.has(s.id));
    return left[Math.floor(rand() * left.length)];
};

// A logical but unoptimising player: guess anything still possible.
const consistent: Policy = (_data, candidates, _all, _guessed, rand) =>
    candidates[Math.floor(rand() * candidates.length)];

// Ceiling: guess the candidate whose worst-case partition is smallest, i.e. the
// one that splits the remaining possibilities most evenly. Probes are drawn
// from the candidate set only, so a winning guess is never passed over in
// favour of a better splitter.
const optimal: Policy = (data, candidates, _all, _guessed) => {
    if (candidates.length <= 2) return candidates[0];

    let best = candidates[0];
    let bestWorst = Infinity;

    for (const probe of candidates) {
        const buckets = new Map<string, number>();
        for (const s of candidates) {
            if (s.id === probe.id) continue;
            const key = feedback(data, probe.id, s.id);
            buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }
        let worst = 0;
        for (const n of buckets.values()) worst = Math.max(worst, n);
        if (worst < bestWorst) {
            bestWorst = worst;
            best = probe;
        }
    }

    return best;
};

const POLICIES: { name: string; play: Policy }[] = [
    { name: "blind", play: blind },
    { name: "tree-reader", play: consistent }, // narrowing swapped per-round, below
    { name: "consistent", play: consistent },
    { name: "optimal", play: optimal },
];

// How the simulated player narrows the field.
//
// "deduce" is full logic: the target is inside the join clade AND outside the
// branch the guess came from. It needs the player to hold every species'
// position in the tree.
//
// "read-tree" is what the SCREEN shows: the tree draws the deepest revealed
// clade with a "?" under it, so a player who only reads the picture knows the
// target is inside that clade and nothing more. It is the weaker, more human
// model - and the gap between the two is the cost of the deduction the game
// never spells out.
type Narrowing = "deduce" | "read-tree";

// ---------------------------------------------------------------------------
// A single round
// ---------------------------------------------------------------------------

interface RoundResult {
    targetId: string;
    won: boolean;
    // Guesses spent plus HINT_COST per hint - the same number the game shows as
    // "Guesses Left" counting down, via GameState.numberOfGuesses().
    cost: number;
    guesses: number;
    hints: number;
    // Candidate-set size after each guess, for the "is the next guess
    // inferable" question.
    remaining: number[];
}

interface RoundOptions {
    narrowing: Narrowing;
    // Hints bought before the first guess. The game still chooses WHICH clade
    // each one reveals.
    hintsUpFront: number;
    // Buy one hint immediately AFTER this many guesses (null = never). This is
    // the case a stuck player is actually in, and it is NOT the same as buying
    // up front: `findNextHintCladeId` reveals one level below the DEEPEST
    // currently revealed clade, so guesses made first make the hint that
    // follows strictly more specific - and therefore worth more.
    hintAfterGuess: number | null;
}

const DEFAULT_OPTS: RoundOptions = {
    narrowing: "deduce",
    hintsUpFront: 0,
    hintAfterGuess: null,
};

function playRound(
    data: GameData,
    targetId: string,
    policy: Policy,
    rand: () => number,
    opts: RoundOptions = DEFAULT_OPTS
): RoundResult {
    const state = new GameState(data, targetId);
    let candidates = data.species.slice();
    const remaining: number[] = [];

    // Hints are bought against the rules the button enforces: the game picks
    // the clade, and refuses when it cannot afford one or has nothing more
    // specific left to say.
    for (let i = 0; i < opts.hintsUpFront; i++) {
        if (!state.canAffordHint()) break;
        const cladeId = findNextHintCladeId(state);
        if (!cladeId) break;
        state.useHint(cladeId);
        candidates = narrowByClade(data, candidates, cladeId);
    }

    while (state.numberOfGuesses() < MAX_GUESSES && candidates.length > 0) {
        const guess = policy(
            data,
            candidates,
            data.species,
            state.guesses,
            rand
        );
        const result = state.makeGuess(guess.species);

        if (result.isCorrect) {
            remaining.push(0);
            break;
        }

        const observed = result.lca ?? "__disjoint__";
        if (opts.narrowing === "deduce") {
            candidates = narrowByGuess(data, candidates, guess.id, observed);
        } else {
            // Read the picture: the join clade is now the deepest revealed one,
            // so everything inside it is still fair game - including branches a
            // sharper player would already have ruled out.
            const inside = narrowByClade(data, data.species, observed).filter(
                (s) => !state.guesses.has(s.id)
            );
            // Never widen: the tree only ever gets more specific.
            candidates =
                inside.length && inside.length <= candidates.length
                    ? inside
                    : candidates.filter((s) => !state.guesses.has(s.id));
        }
        remaining.push(candidates.length);

        // The stuck-player case: guesses have already pushed the revealed
        // frontier down, so this hint starts from there rather than from the
        // root.
        if (
            opts.hintAfterGuess !== null &&
            state.guesses.size === opts.hintAfterGuess &&
            state.canAffordHint()
        ) {
            const cladeId = findNextHintCladeId(state);
            if (cladeId) {
                state.useHint(cladeId);
                candidates = narrowByClade(data, candidates, cladeId);
            }
        }
    }

    return {
        targetId,
        won: state.isWin(),
        cost: state.numberOfGuesses(),
        guesses: state.guesses.size,
        hints: state.hintClades.size,
        remaining,
    };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function quantile(sorted: number[], q: number): number {
    if (sorted.length === 0) return NaN;
    const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
    return sorted[idx];
}

function mean(xs: number[]): number {
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

// NOTE: mean/median/p90/max are computed over WON rounds only - a lost round
// has no solve cost to average, it just cost the whole budget. Read them
// alongside `loss=`, not instead of it: for a policy that loses most rounds the
// median describes the minority that got there.
function summarise(label: string, rounds: RoundResult[]): string {
    const wins = rounds.filter((r) => r.won);
    const costs = wins.map((r) => r.cost).sort((a, b) => a - b);
    const lossRate = ((rounds.length - wins.length) / rounds.length) * 100;

    return [
        label.padEnd(28),
        `n=${rounds.length}`.padEnd(8),
        `loss=${lossRate.toFixed(1)}%`.padEnd(12),
        `mean=${mean(costs).toFixed(1)}`.padEnd(11),
        `median=${quantile(costs, 0.5)}`.padEnd(11),
        `p90=${quantile(costs, 0.9)}`.padEnd(8),
        `max=${costs.length ? costs[costs.length - 1] : "-"}`,
    ].join(" ");
}

function histogram(rounds: RoundResult[]): string {
    const buckets = [
        [1, 5],
        [6, 10],
        [11, 15],
        [16, 20],
        [21, 25],
    ];
    const lines = buckets.map(([lo, hi]) => {
        const n = rounds.filter(
            (r) => r.won && r.cost >= lo && r.cost <= hi
        ).length;
        const pct = (n / rounds.length) * 100;
        return `    ${String(lo).padStart(2)}-${String(hi).padStart(2)} guesses  ${String(n).padStart(3)}  ${pct.toFixed(0).padStart(3)}%  ${"#".repeat(Math.round(pct / 2))}`;
    });
    const lost = rounds.filter((r) => !r.won).length;
    lines.push(
        `    lost         ${String(lost).padStart(3)}  ${((lost / rounds.length) * 100).toFixed(0).padStart(3)}%  ${"#".repeat(Math.round((lost / rounds.length) * 50))}`
    );
    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const TRIALS = 20; // repeats per target for the randomised policies

function main(): void {
    const data = loadRealGameData();
    const targets = data.species.map((s) => s.id);

    console.log(`Metajurassic difficulty simulation`);
    console.log(
        `payload: ${path.relative(REPO_ROOT, PAYLOAD)}  species: ${data.species.length}  clades: ${Object.keys(data.clades).length}`
    );
    console.log(
        `rules:   MAX_GUESSES=${MAX_GUESSES}  HINT_COST=${HINT_COST}  trials/target=${TRIALS} (1 for the deterministic "optimal" policy)`
    );
    console.log(
        `note:    mean/median/p90/max are over WON rounds only; read them next to loss=.\n`
    );

    // --- 1. Content shape -------------------------------------------------
    const depths = data.species
        .map((s) => data.lineage(s.clade).length)
        .sort((a, b) => a - b);
    const cladeSize = new Map<string, number>();
    for (const s of data.species) {
        cladeSize.set(s.clade, (cladeSize.get(s.clade) ?? 0) + 1);
    }
    const sizes = Array.from(cladeSize.values()).sort((a, b) => a - b);
    const singletons = sizes.filter((n) => n === 1).length;

    console.log(`## Content shape`);
    console.log(
        `  lineage depth: min=${depths[0]} median=${quantile(depths, 0.5)} max=${depths[depths.length - 1]}`
    );
    console.log(
        `  leaf clades:   ${sizes.length}  median members=${quantile(sizes, 0.5)}  max=${sizes[sizes.length - 1]}  singletons=${singletons}`
    );
    console.log(
        `  a singleton leaf clade is a free win once its clade is revealed: ${((singletons / data.species.length) * 100).toFixed(0)}% of targets\n`
    );

    // --- 2. Policy comparison, no hints -----------------------------------
    console.log(`## Solve cost by policy (no hints)`);
    const byPolicy = new Map<string, RoundResult[]>();
    for (const { name, play } of POLICIES) {
        const rounds: RoundResult[] = [];
        const trials = name === "optimal" ? 1 : TRIALS; // optimal is deterministic
        const narrowing: Narrowing =
            name === "tree-reader" ? "read-tree" : "deduce";
        for (let i = 0; i < targets.length; i++) {
            for (let t = 0; t < trials; t++) {
                const rand = rng(i * 7919 + t);
                rounds.push(
                    playRound(data, targets[i], play, rand, {
                        narrowing,
                        hintsUpFront: 0,
                        hintAfterGuess: null,
                    })
                );
            }
        }
        byPolicy.set(name, rounds);
        console.log("  " + summarise(name, rounds));
    }
    console.log(
        `  blind = ignores the tree; tree-reader = only "target is inside the revealed clade";`
    );
    console.log(
        `  consistent = full LCA deduction; optimal = best splitting guess every turn.\n`
    );

    const cons = byPolicy.get("consistent") ?? [];

    console.log(`## Distribution, "consistent" policy (the honest middle)`);
    console.log(histogram(cons));
    console.log();

    // --- 3. How fast the candidate set collapses --------------------------
    console.log(`## Candidates still possible after guess N ("consistent")`);
    for (const n of [1, 2, 3, 5, 8]) {
        const vals = cons
            .map((r) => r.remaining[n - 1])
            .filter((v): v is number => v !== undefined)
            .sort((a, b) => a - b);
        if (!vals.length) continue;
        console.log(
            `  after ${n}: median=${quantile(vals, 0.5)}  p90=${quantile(vals, 0.9)}  (of ${data.species.length})`
        );
    }
    console.log();

    // --- 4. Is a hint worth HINT_COST? ------------------------------------
    // A hint pays for itself only if it removes more than HINT_COST guesses
    // from the rest of the round. Buying k of them UP FRONT is one test; it is
    // the weakest case for the hint, because with only the root revealed the
    // game has nothing specific to offer yet.
    console.log(
        `## Is a hint worth its ${HINT_COST} guesses? (k bought up front, then play on)`
    );
    for (const narrowing of ["deduce", "read-tree"] as Narrowing[]) {
        const label = narrowing === "deduce" ? "consistent" : "tree-reader";
        for (const k of [0, 1, 2, 3]) {
            const rounds: RoundResult[] = [];
            for (let i = 0; i < targets.length; i++) {
                for (let t = 0; t < TRIALS; t++) {
                    const rand = rng(i * 7919 + t);
                    rounds.push(
                        playRound(data, targets[i], consistent, rand, {
                            narrowing,
                            hintsUpFront: k,
                            hintAfterGuess: null,
                        })
                    );
                }
            }
            const avgGuesses = mean(rounds.map((r) => r.guesses));
            console.log(
                "  " +
                    summarise(`${label}, ${k} hint(s)`, rounds) +
                    `  guessesOnly=${avgGuesses.toFixed(1)}`
            );
        }
    }

    // The stuck-player case, and the hint's BEST case: guess normally for a
    // while, then buy one. By then the revealed frontier has moved down, so the
    // hint the game offers is more specific than the up-front one. If the hint
    // is ever worth 3 guesses, it is worth them here.
    console.log(
        `\n## Is a hint worth it MID-ROUND? (play n guesses, then buy exactly one)`
    );
    for (const narrowing of ["deduce", "read-tree"] as Narrowing[]) {
        const label = narrowing === "deduce" ? "consistent" : "tree-reader";
        for (const after of [null, 1, 2, 4, 6] as (number | null)[]) {
            const rounds: RoundResult[] = [];
            for (let i = 0; i < targets.length; i++) {
                for (let t = 0; t < TRIALS; t++) {
                    const rand = rng(i * 7919 + t);
                    rounds.push(
                        playRound(data, targets[i], consistent, rand, {
                            narrowing,
                            hintsUpFront: 0,
                            hintAfterGuess: after,
                        })
                    );
                }
            }
            const bought = rounds.filter((r) => r.hints > 0).length;
            const tag =
                after === null
                    ? `${label}, no hint`
                    : `${label}, hint after ${after}`;
            console.log(
                "  " +
                    summarise(tag, rounds) +
                    `  boughtIn=${((bought / rounds.length) * 100).toFixed(0)}%`
            );
        }
    }

    // What each successive hint actually eliminates, before any guess muddies
    // it. `findNextHintCladeId` walks the target's lineage DOWNWARD from the
    // root, so the first hint offered on a fresh board is the second-least
    // specific clade there is (the root is already on screen) - and it costs
    // the same as the last.
    console.log(`\n## Field left after k hints and no guesses`);
    for (const k of [1, 2, 3, 4]) {
        const left: number[] = [];
        for (const targetId of targets) {
            const state = new GameState(data, targetId);
            let candidates = data.species.slice();
            for (let i = 0; i < k; i++) {
                const cladeId = findNextHintCladeId(state);
                if (!cladeId) break;
                state.useHint(cladeId);
                candidates = narrowByClade(data, candidates, cladeId);
            }
            left.push(candidates.length);
        }
        left.sort((a, b) => a - b);
        console.log(
            `  ${k} hint(s) (${k * HINT_COST} guesses spent): median=${quantile(left, 0.5)} candidates left of ${data.species.length}, p90=${quantile(left, 0.9)}, best=${left[0]}`
        );
    }

    // Because hints descend one level at a time, reaching the target's own leaf
    // clade costs HINT_COST per level of lineage. For a deep lineage that bill
    // exceeds the whole budget, so the hint button can NEVER get there.
    console.log(`\n## Cost to hint all the way down to the target's own clade`);
    const hintBills = data.species
        .map((s) => {
            const levels = Math.max(0, data.lineage(s.clade).length - 1);
            return { name: s.species, levels, bill: levels * HINT_COST };
        })
        .sort((a, b) => a.bill - b.bill);
    const affordable = hintBills.filter((h) => h.bill <= MAX_GUESSES).length;
    console.log(
        `  reachable within the ${MAX_GUESSES}-guess budget: ${affordable}/${data.species.length} targets (${((affordable / data.species.length) * 100).toFixed(0)}%)`
    );
    console.log(
        `  median bill: ${quantile(
            hintBills.map((h) => h.bill),
            0.5
        )} guesses   worst: ${hintBills[hintBills.length - 1].bill} (${hintBills[hintBills.length - 1].name})`
    );
    console.log();

    // --- 5. The hardest targets -------------------------------------------
    console.log(`## Hardest targets ("consistent", mean cost)`);
    const perTarget = new Map<string, number[]>();
    for (const r of cons) {
        const arr = perTarget.get(r.targetId) ?? [];
        arr.push(r.won ? r.cost : MAX_GUESSES);
        perTarget.set(r.targetId, arr);
    }
    const ranked = Array.from(perTarget.entries())
        .map(([id, costs]) => ({
            id,
            avg: mean(costs),
            name: data.findSpeciesById(id)?.species ?? id,
            siblings: cladeSize.get(data.findSpeciesById(id)?.clade ?? "") ?? 0,
        }))
        .sort((a, b) => b.avg - a.avg);
    for (const r of ranked.slice(0, 8)) {
        console.log(
            `  ${r.name.padEnd(22)} mean=${r.avg.toFixed(1)}  leaf-clade members=${r.siblings}`
        );
    }
    console.log(`  ...`);
    for (const r of ranked.slice(-3)) {
        console.log(
            `  ${r.name.padEnd(22)} mean=${r.avg.toFixed(1)}  leaf-clade members=${r.siblings}`
        );
    }
}

main();
