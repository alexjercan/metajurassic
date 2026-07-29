// Spike instrumentation (tasks/20260729-160500): what is a hint WORTH, in the
// same currency as a guess - and, in section 5, does it RESCUE the player it is
// aimed at?
//
// SHIPPED DESIGN (tasks/20260729-141424/DECISION.md, landed): threshold split at
// HINT_SPLIT_FRACTION = 1/2, HINT_COST unchanged at 3, MAX_HINTS = -1
// (uncapped). Sections 1-4 measure return on investment and pointed at 1/4 +
// cost 2; section 5 measures rescue, which is the bar that was accepted. Where
// they disagree, section 5 wins.
//
// Measures over the REAL content graph (`src/jurassic/index.json`):
//   1. the information a guess delivers (bits), i.e. the price a hint must beat
//   2. the information the CURRENT hint delivers, up front and mid-round
//   3. the same for candidate alternative hint-selection policies
//   4. the break-even HINT_COST each policy implies, and a full round
//      simulation at cost 1/2/3
//
// Game logic is imported from `src/`, never re-implemented (difficulty.ts rule).

import * as fs from "fs";
import * as path from "path";

import { buildGameData, RawGameData } from "../../src/jsonLoader";
import { GameData } from "../../src/gameData";
import { GameState } from "../../src/gameState";
import { findNextHintCladeId } from "../../src/treeBuilder";
import { MAX_GUESSES, HINT_SPLIT_FRACTION } from "../../src/constants";
import type { Species } from "../../src/types";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PAYLOAD = path.join(REPO_ROOT, "src", "jurassic", "index.json");

function loadRealGameData(): GameData {
    const raw = JSON.parse(fs.readFileSync(PAYLOAD, "utf8")) as RawGameData;
    return buildGameData(raw);
}

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function feedback(data: GameData, guessId: string, targetId: string): string {
    return data.computeLCA(guessId, targetId) ?? "__disjoint__";
}

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

function inClade(data: GameData, s: Species, cladeId: string): boolean {
    return data.lineage(s.clade).includes(cladeId);
}

function narrowByClade(
    data: GameData,
    candidates: Species[],
    cladeId: string
): Species[] {
    return candidates.filter((s) => inClade(data, s, cladeId));
}

function mean(xs: number[]): number {
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

function quantile(sorted: number[], q: number): number {
    if (!sorted.length) return NaN;
    return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

// ---------------------------------------------------------------------------
// Hint policies
// ---------------------------------------------------------------------------
//
// A hint policy picks ONE clade to reveal, given the state the game can see:
// the target, the guesses so far, the clades already revealed, and (derivable
// from the guess history) the set of species still consistent with the board.
// Every policy here reveals a TRUE clade of the target, so it is a drop-in
// replacement for `findNextHintCladeId`.

interface HintContext {
    data: GameData;
    state: GameState;
    // Species still consistent with everything the board shows.
    candidates: Species[];
    // Clades already on screen (root + LCAs + previous hints).
    revealed: Set<string>;
    // The target's lineage, [immediate clade ... root].
    lineage: string[];
}

type HintPolicy = (ctx: HintContext) => string | null;

// What the game did BEFORE 20260729-141424: the first unrevealed clade below
// the deepest revealed one, one level per hint. Kept as the baseline every
// alternative is measured against - it is why the hint was a trap.
const topDown: HintPolicy = ({ lineage, revealed }) => {
    let deepestRevealedIdx = -1;
    for (let i = 0; i < lineage.length; i++) {
        if (revealed.has(lineage[i])) {
            deepestRevealedIdx = i;
            break;
        }
    }
    if (deepestRevealedIdx < 0) return null;
    for (let i = deepestRevealedIdx - 1; i >= 0; i--) {
        if (!revealed.has(lineage[i])) return lineage[i];
    }
    return null;
};

// The other half of the fork in tasks/20260729-141424: reveal the most
// specific unrevealed clade, i.e. essentially name the target's own family.
const bottomUp: HintPolicy = ({ lineage, revealed }) => {
    for (let i = 0; i < lineage.length; i++) {
        if (!revealed.has(lineage[i])) return lineage[i];
    }
    return null;
};

// "Split the remaining candidates": among the unrevealed lineage clades that
// are strictly more specific than what is on screen, take the SHALLOWEST one
// that cuts the candidate set to at most `frac` of its size. Shallowest keeps
// the reveal incremental (the top-down feel the user asked to keep) while the
// threshold skips the levels that narrow nothing.
// Review finding (REVIEW.md, M1): the threshold rule has a fallback branch -
// when NO unrevealed clade meets the threshold it returns the deepest one, i.e.
// it degrades to bottom-up and can name the target's own family. This counter
// measures how often that branch actually fires, so the fallback is a measured
// choice rather than an unnoticed hole in the recommendation.
const fallbackHits = {
    fired: 0,
    total: 0,
    sizes: [] as number[],
    shares: [] as number[],
};

function splitThreshold(frac: number): HintPolicy {
    return ({ data, lineage, revealed, candidates }) => {
        let deepestRevealedIdx = -1;
        for (let i = 0; i < lineage.length; i++) {
            if (revealed.has(lineage[i])) {
                deepestRevealedIdx = i;
                break;
            }
        }
        if (deepestRevealedIdx < 0) return null;
        const target = Math.max(1, Math.floor(candidates.length * frac));
        let fallback: string | null = null;
        for (let i = deepestRevealedIdx - 1; i >= 0; i--) {
            const clade = lineage[i];
            if (revealed.has(clade)) continue;
            fallback = clade; // deepest seen so far, used if nothing hits target
            const left = narrowByClade(data, candidates, clade).length;
            if (left <= target) {
                fallbackHits.total++;
                return clade;
            }
        }
        fallbackHits.total++;
        if (fallback) {
            fallbackHits.fired++;
            // How big was the field when the rule fell through? If it is always
            // small, the fallback cannot be a solve button; if it is sometimes
            // large, the recommendation has a hole.
            fallbackHits.sizes.push(candidates.length);
            // And what share of the field does the clade it hands over still
            // hold? By construction this must exceed `frac` - the branch is only
            // reached when nothing met the threshold - so the fallback should be
            // the WEAK path, never a solve button. Measured, not assumed.
            fallbackHits.shares.push(
                narrowByClade(data, candidates, fallback).length /
                    candidates.length
            );
        }
        return fallback;
    };
}

// Closest to an even split, either side of half.
const splitHalfNearest: HintPolicy = ({
    data,
    lineage,
    revealed,
    candidates,
}) => {
    let deepestRevealedIdx = -1;
    for (let i = 0; i < lineage.length; i++) {
        if (revealed.has(lineage[i])) {
            deepestRevealedIdx = i;
            break;
        }
    }
    if (deepestRevealedIdx < 0) return null;
    const want = candidates.length / 2;
    let best: string | null = null;
    let bestDist = Infinity;
    for (let i = deepestRevealedIdx - 1; i >= 0; i--) {
        const clade = lineage[i];
        if (revealed.has(clade)) continue;
        const left = narrowByClade(data, candidates, clade).length;
        const dist = Math.abs(left - want);
        if (dist < bestDist) {
            bestDist = dist;
            best = clade;
        }
    }
    return best;
};

// The rule the game now ships (20260729-141424). Reproduced here so the
// policies can be compared like-for-like; `sanityCheck` verifies the
// reproduction against the real function on every run, so a change to `src/`
// shows up as a mismatch instead of a silently stale comparison.
const shipped: HintPolicy = splitThreshold(HINT_SPLIT_FRACTION);

const POLICIES: { name: string; play: HintPolicy }[] = [
    { name: "top-down (was)", play: topDown },
    { name: "bottom-up", play: bottomUp },
    { name: "split<=1/2 (SHIPPED)", play: shipped },
    { name: "split<=1/3", play: splitThreshold(1 / 3) },
    { name: "split<=1/4", play: splitThreshold(0.25) },
    { name: "split-nearest-half", play: splitHalfNearest },
];

// ---------------------------------------------------------------------------
// Board bookkeeping
// ---------------------------------------------------------------------------

function mustFindSpecies(data: GameData, id: string): Species {
    const s = data.findSpeciesById(id);
    if (!s) throw new Error(`unknown species id: ${id}`);
    return s;
}

function revealedClades(data: GameData, state: GameState): Set<string> {
    const target = mustFindSpecies(data, state.targetId);
    const lineage = data.lineage(target.clade);
    const revealed = new Set<string>();
    revealed.add(lineage[lineage.length - 1]);
    for (const c of state.hintClades) revealed.add(c);
    for (const guessId of state.guesses) {
        if (guessId === state.targetId) continue;
        const lca = data.computeLCA(state.targetId, guessId);
        if (lca) revealed.add(lca);
    }
    return revealed;
}

function contextFor(
    data: GameData,
    state: GameState,
    candidates: Species[]
): HintContext {
    const target = mustFindSpecies(data, state.targetId);
    return {
        data,
        state,
        candidates,
        revealed: revealedClades(data, state),
        lineage: data.lineage(target.clade),
    };
}

// ---------------------------------------------------------------------------
// 1. What is a guess worth, in bits?
// ---------------------------------------------------------------------------

const consistentPick = (candidates: Species[], rand: () => number): Species =>
    candidates[Math.floor(rand() * candidates.length)];

function bitsPerGuess(data: GameData, trials: number): void {
    const perGuessIndex: number[][] = [];
    const all: number[] = [];
    const rand = rng(12345);

    for (const target of data.species) {
        for (let t = 0; t < trials; t++) {
            let candidates = data.species.slice();
            const state = new GameState(data, target.id);
            let n = 0;
            while (
                candidates.length > 1 &&
                state.numberOfGuesses() < MAX_GUESSES
            ) {
                const guess = consistentPick(candidates, rand);
                const res = state.makeGuess(guess.species);
                const before = candidates.length;
                if (res.isCorrect) {
                    candidates = [];
                    // A winning guess ends the round; count it as resolving the
                    // whole remaining set.
                    const bits = Math.log2(before);
                    all.push(bits);
                    (perGuessIndex[n] ??= []).push(bits);
                    break;
                }
                candidates = narrowByGuess(
                    data,
                    candidates,
                    guess.id,
                    res.lca ?? "__disjoint__"
                );
                const bits = Math.log2(before / Math.max(1, candidates.length));
                all.push(bits);
                (perGuessIndex[n] ??= []).push(bits);
                n++;
            }
        }
    }

    console.log("## 1. What one GUESS is worth (consistent player)\n");
    console.log(
        `  mean bits per guess: ${mean(all).toFixed(2)}   (a hint costing C guesses must deliver >= C x this to pay for itself)`
    );
    perGuessIndex.slice(0, 6).forEach((xs, i) => {
        console.log(
            `    guess ${i + 1}: mean ${mean(xs).toFixed(2)} bits  (n=${xs.length})`
        );
    });
    console.log();
}

// ---------------------------------------------------------------------------
// 2 + 3. What is a HINT worth, per policy, at various board states?
// ---------------------------------------------------------------------------

function hintValue(data: GameData, afterGuesses: number[], trials: number) {
    console.log(
        "## 2. What one HINT is worth (bits), by policy and by when it is bought\n"
    );
    console.log(
        "  bits = log2(candidates before / candidates after). Higher is better; a hint is\n" +
            "  a TRUE statement about the target, so a narrow clade is worth MORE, not less.\n"
    );

    const header = ["  policy".padEnd(24)]
        .concat(afterGuesses.map((k) => `after ${k}`.padStart(9)))
        .join("");
    console.log(header);

    for (const { name, play } of POLICIES) {
        const cells: string[] = [];
        for (const k of afterGuesses) {
            const bits: number[] = [];
            const rand = rng(999 + k);
            for (const target of data.species) {
                for (let t = 0; t < trials; t++) {
                    const state = new GameState(data, target.id);
                    let candidates = data.species.slice();
                    let ok = true;
                    for (let g = 0; g < k; g++) {
                        if (candidates.length <= 1) {
                            ok = false;
                            break;
                        }
                        const guess = consistentPick(candidates, rand);
                        const res = state.makeGuess(guess.species);
                        if (res.isCorrect) {
                            ok = false;
                            break;
                        }
                        candidates = narrowByGuess(
                            data,
                            candidates,
                            guess.id,
                            res.lca ?? "__disjoint__"
                        );
                    }
                    if (!ok || candidates.length <= 1) continue;
                    const clade = play(contextFor(data, state, candidates));
                    if (!clade) continue;
                    const after = narrowByClade(data, candidates, clade).length;
                    bits.push(
                        Math.log2(candidates.length / Math.max(1, after))
                    );
                }
            }
            cells.push(mean(bits).toFixed(2).padStart(9));
        }
        console.log(`  ${name.padEnd(22)}${cells.join("")}`);
    }
    console.log();
}

// ---------------------------------------------------------------------------
// 4. Full-round simulation: does a hint lower TOTAL cost, at cost 1/2/3?
// ---------------------------------------------------------------------------

type Narrowing = "deduce" | "read-tree";

interface SimOpts {
    narrowing: Narrowing;
    hintCost: number;
    policy: HintPolicy;
    hintUpFront: boolean;
    hintAfterGuess: number | null;
}

interface SimResult {
    won: boolean;
    cost: number;
    boughtHint: boolean;
}

// The shipped GameState hardcodes HINT_COST, so cost bookkeeping is done here
// instead: guesses + hints * hintCost, with the same "cannot buy what you
// cannot afford" rule the button enforces.
function playRound(
    data: GameData,
    targetId: string,
    rand: () => number,
    opts: SimOpts
): SimResult {
    const state = new GameState(data, targetId);
    let candidates = data.species.slice();
    let hints = 0;
    let bought = false;
    const spent = () => state.guesses.size + hints * opts.hintCost;

    const buy = (): void => {
        if (spent() + opts.hintCost > MAX_GUESSES) return;
        const clade = opts.policy(contextFor(data, state, candidates));
        if (!clade) return;
        // NOT state.useHint(): that method enforces the shipped HINT_COST, and
        // the whole point here is to price the hint at 1, 2 and 3.
        state.hintClades.add(clade);
        hints++;
        bought = true;
        candidates = narrowByClade(data, candidates, clade);
    };

    if (opts.hintUpFront) buy();

    while (spent() < MAX_GUESSES && candidates.length > 0) {
        const guess = consistentPick(candidates, rand);
        const res = state.makeGuess(guess.species);
        if (res.isCorrect) break;

        const observed = res.lca ?? "__disjoint__";
        if (opts.narrowing === "deduce") {
            candidates = narrowByGuess(data, candidates, guess.id, observed);
        } else {
            const deepest =
                [...revealedClades(data, state)]
                    .map((c) => ({
                        c,
                        n: narrowByClade(data, data.species, c).length,
                    }))
                    .sort((a, b) => a.n - b.n)[0]?.c ?? observed;
            const inside = narrowByClade(data, data.species, deepest).filter(
                (s) => !state.guesses.has(s.id)
            );
            candidates =
                inside.length && inside.length <= candidates.length
                    ? inside
                    : candidates.filter((s) => !state.guesses.has(s.id));
        }

        if (
            opts.hintAfterGuess !== null &&
            state.guesses.size === opts.hintAfterGuess
        ) {
            buy();
        }
    }

    return { won: state.isWin(), cost: spent(), boughtHint: bought };
}

function simulate(data: GameData, trials: number): void {
    console.log(
        "## 3. Full-round total cost (consistent player, guesses + cost x hints)\n"
    );

    for (const narrowing of ["deduce", "read-tree"] as Narrowing[]) {
        // Baseline: no hint at all.
        const baseRand = rng(4242);
        const base = data.species.flatMap((s) =>
            Array.from({ length: trials }, () =>
                playRound(data, s.id, baseRand, {
                    narrowing,
                    hintCost: 3,
                    policy: topDown,
                    hintUpFront: false,
                    hintAfterGuess: null,
                })
            )
        );
        const baseWins = base.filter((r) => r.won).map((r) => r.cost);
        console.log(
            `  [${narrowing}] no hint: mean=${mean(baseWins).toFixed(1)} loss=${(
                ((base.length - baseWins.length) / base.length) *
                100
            ).toFixed(1)}%`
        );

        for (const { name, play } of POLICIES) {
            for (const hintCost of [1, 2, 3]) {
                const cells: string[] = [];
                const buyPoints: {
                    label: string;
                    up: boolean;
                    after: number | null;
                }[] = [
                    { label: "up front", up: true, after: null },
                    { label: "after 2", up: false, after: 2 },
                    { label: "after 4", up: false, after: 4 },
                ];
                for (const when of buyPoints) {
                    const rand = rng(4242);
                    const rounds = data.species.flatMap((s) =>
                        Array.from({ length: trials }, () =>
                            playRound(data, s.id, rand, {
                                narrowing,
                                hintCost,
                                policy: play,
                                hintUpFront: when.up,
                                hintAfterGuess: when.after,
                            })
                        )
                    );
                    // Net effect per hint ACTUALLY bought: rounds that ended
                    // before the buy point never paid for one, so averaging over
                    // everything hides the cost behind them.
                    const boughtRounds = rounds.filter((r) => r.boughtHint);
                    const share = boughtRounds.length / rounds.length;
                    const wins = rounds.filter((r) => r.won).map((r) => r.cost);
                    const loss =
                        ((rounds.length - wins.length) / rounds.length) * 100;
                    const delta = mean(wins) - mean(baseWins);
                    const perHint = share > 0 ? delta / share : NaN;
                    cells.push(
                        `${when.label}: ${mean(wins).toFixed(1)} (net/hint ${perHint >= 0 ? "+" : ""}${perHint.toFixed(1)}, loss ${loss.toFixed(1)}%)`.padEnd(
                            42
                        )
                    );
                }
                console.log(
                    `    ${name.padEnd(20)} cost=${hintCost}  ${cells.join("")}`
                );
            }
        }
        console.log();
    }
}

// ---------------------------------------------------------------------------
// 5. Sanity: the reproduced shipped policy matches the real function
// ---------------------------------------------------------------------------

function sanityCheck(data: GameData): void {
    let checked = 0;
    let mismatch = 0;
    const rand = rng(7);
    for (const target of data.species) {
        const state = new GameState(data, target.id);
        let candidates = data.species.slice();
        for (let g = 0; g < 4; g++) {
            const mine = shipped(contextFor(data, state, candidates));
            const real = findNextHintCladeId(state);
            checked++;
            if (mine !== real) mismatch++;
            if (candidates.length <= 1) break;
            const guess = consistentPick(candidates, rand);
            const res = state.makeGuess(guess.species);
            if (res.isCorrect) break;
            candidates = narrowByGuess(
                data,
                candidates,
                guess.id,
                res.lca ?? "__disjoint__"
            );
        }
    }
    console.log(
        `  sanity: reproduced split<=${HINT_SPLIT_FRACTION} policy vs shipped findNextHintCladeId: ${checked - mismatch}/${checked} agree\n`
    );
}

// ---------------------------------------------------------------------------

function cladeSizeShape(data: GameData): void {
    console.log("## 0. Shape of the lineage ladder\n");
    const rows: string[] = [];
    // Per depth level from the root, how much of the field does the target's
    // lineage clade at that level contain?
    const byLevelFromRoot: number[][] = [];
    for (const s of data.species) {
        const lin = data.lineage(s.clade); // [immediate ... root]
        const fromRoot = [...lin].reverse();
        fromRoot.forEach((clade, i) => {
            const n = narrowByClade(data, data.species, clade).length;
            (byLevelFromRoot[i] ??= []).push(n / data.species.length);
        });
    }
    byLevelFromRoot.forEach((xs, i) => {
        const sorted = [...xs].sort((a, b) => a - b);
        rows.push(
            `    level ${i} from root: median share of field ${(quantile(sorted, 0.5) * 100).toFixed(0)}%  (n=${xs.length} species reach this depth)`
        );
    });
    console.log(rows.join("\n"));
    const depths = data.species
        .map((s) => data.lineage(s.clade).length)
        .sort((a, b) => a - b);
    console.log(
        `    lineage depth: median ${quantile(depths, 0.5)}, p90 ${quantile(depths, 0.9)}, max ${depths[depths.length - 1]}\n`
    );
}

// ---------------------------------------------------------------------------
// 6. Pacing: how many hints does a policy have to give, from a cold board?
// ---------------------------------------------------------------------------
//
// A hint people can spam until it names the answer is a different game. This
// asks: buying hints and nothing else, how many are on offer before the policy
// runs out, and what is the bill at cost 1?

function pacing(data: GameData): void {
    console.log(
        "## 4. Pacing: hints available from a cold board (no guesses), and the bill at cost 1\n"
    );
    for (const { name, play } of POLICIES) {
        const counts: number[] = [];
        const solved: number[] = [];
        for (const target of data.species) {
            const state = new GameState(data, target.id);
            let candidates = data.species.slice();
            let n = 0;
            while (n < 40) {
                const clade = play(contextFor(data, state, candidates));
                if (!clade) break;
                state.hintClades.add(clade);
                candidates = narrowByClade(data, candidates, clade);
                n++;
                if (candidates.length <= 1) break;
            }
            counts.push(n);
            solved.push(candidates.length);
        }
        const sortedN = [...counts].sort((a, b) => a - b);
        const sortedLeft = [...solved].sort((a, b) => a - b);
        console.log(
            `  ${name.padEnd(22)} hints on offer: median ${quantile(sortedN, 0.5)}, p90 ${quantile(sortedN, 0.9)}, max ${sortedN[sortedN.length - 1]}` +
                `   candidates left when exhausted: median ${quantile(sortedLeft, 0.5)}, p90 ${quantile(sortedLeft, 0.9)}`
        );
    }
    console.log(
        `\n  threshold-rule fallback branch (nothing met the threshold, so the deepest clade was used): ` +
            `${fallbackHits.fired}/${fallbackHits.total} calls (${((fallbackHits.fired / Math.max(1, fallbackHits.total)) * 100).toFixed(1)}%)`
    );
    const fbSizes = [...fallbackHits.sizes].sort((a, b) => a - b);
    console.log(
        `  candidates still live when it fired: median ${quantile(fbSizes, 0.5)}, p90 ${quantile(fbSizes, 0.9)}, max ${fbSizes[fbSizes.length - 1]}`
    );
    const fbShares = [...fallbackHits.shares].sort((a, b) => a - b);
    console.log(
        `  share of the live field the fallback clade STILL holds: min ${(fbShares[0] * 100).toFixed(0)}%, median ${(quantile(fbShares, 0.5) * 100).toFixed(0)}%` +
            `  (must exceed the threshold, so the fallback narrows LESS than a qualifying clade, never more)`
    );
    console.log();
}

// Trials per target. 5 is enough for the headline gaps (>= 1.0 guesses); raise
// it with PLAYTEST_TRIALS when a cell needs to be trusted to a tenth.
const TRIALS = Number(process.env.PLAYTEST_TRIALS ?? 5);

// ---------------------------------------------------------------------------
// 7. Rescue: does a hint save the player who cannot read the tree?
// ---------------------------------------------------------------------------
//
// Sections 1-4 ask "does a hint pay for itself", i.e. is it a good INVESTMENT.
// That is the wrong bar if a hint is meant to be a desperate move rather than
// an edge (user, 20260729). The bar here instead: a hint should rescue a player
// who cannot play, without ever helping one who can.
//
// Two player models, neither of which reads the tree:
//
//   blind          - ignores everything, guesses an unplayed species at random.
//                    Included to make a point concrete: a player who ignores
//                    information cannot be helped by more of it, so a hint
//                    CANNOT move this number. It is the wrong target.
//   hint-follower  - cannot deduce from join points, but CAN act on a clade
//                    named in plain words: it guesses at random from inside the
//                    deepest hinted clade. This is the player a hint is for, and
//                    it only exists in the real game if a surface maps a clade to
//                    its member species (task 20260729-141425).

type RescueModel = "blind" | "hint-follower";

function rescueRound(
    data: GameData,
    targetId: string,
    rand: () => number,
    model: RescueModel,
    policy: HintPolicy,
    hintCost: number,
    hintsWanted: number,
    afterGuesses: number
): boolean {
    const state = new GameState(data, targetId);
    // The GAME can always compute the consistent set from its own guess history,
    // even when the PLAYER is ignoring it - so hint selection stays honest.
    let candidates = data.species.slice();
    let hints = 0;
    let field = data.species.slice();
    const spent = () => state.guesses.size + hints * hintCost;

    const buyHints = (): void => {
        for (let i = 0; i < hintsWanted; i++) {
            if (spent() + hintCost > MAX_GUESSES) break;
            const clade = policy(contextFor(data, state, candidates));
            if (!clade) break;
            state.hintClades.add(clade);
            hints++;
            candidates = narrowByClade(data, candidates, clade);
            if (model === "hint-follower") {
                field = narrowByClade(data, field, clade);
            }
        }
    };

    if (afterGuesses === 0) buyHints();

    while (spent() < MAX_GUESSES) {
        const left = field.filter((sp) => !state.guesses.has(sp.id));
        if (left.length === 0) break;
        const guess = left[Math.floor(rand() * left.length)];
        const res = state.makeGuess(guess.species);
        if (res.isCorrect) return true;
        candidates = narrowByGuess(
            data,
            candidates,
            guess.id,
            res.lca ?? "__disjoint__"
        );
        if (afterGuesses > 0 && state.guesses.size === afterGuesses) buyHints();
    }

    return false;
}

function rescue(data: GameData, trials: number): void {
    console.log(
        "## 5. Rescue: loss rate for players who cannot read the tree\n"
    );
    console.log(
        "  A hint should rescue a player who cannot play, and never help one who can.\n" +
            "  Loss rate at MAX_GUESSES; lower is better. `blind` is the control.\n"
    );

    const fractions: { name: string; play: HintPolicy }[] = [
        { name: "split<=1/2", play: splitThreshold(0.5) },
        { name: "split<=1/3", play: splitThreshold(1 / 3) },
        { name: "split<=1/4", play: splitThreshold(0.25) },
    ];

    for (const model of ["blind", "hint-follower"] as RescueModel[]) {
        console.log(`  [${model}]`);
        for (const { name, play } of fractions) {
            for (const hintCost of [1, 2, 3]) {
                const cells: string[] = [];
                for (const hintsWanted of [0, 1, 2, 3]) {
                    const rand = rng(31337);
                    let lost = 0;
                    let n = 0;
                    for (const target of data.species) {
                        for (let t = 0; t < trials; t++) {
                            const won = rescueRound(
                                data,
                                target.id,
                                rand,
                                model,
                                play,
                                hintCost,
                                hintsWanted,
                                0
                            );
                            n++;
                            if (!won) lost++;
                        }
                    }
                    cells.push(
                        `${hintsWanted} hint: ${((lost / n) * 100).toFixed(0).padStart(3)}%`.padEnd(
                            14
                        )
                    );
                }
                console.log(
                    `    ${name.padEnd(12)} cost=${hintCost}  ${cells.join("")}`
                );
            }
            if (model === "blind") break; // hints cannot move it; one row makes the point
        }
        console.log();
    }
}

function main(): void {
    const data = loadRealGameData();
    console.log("Metajurassic hint-value spike (tasks/20260729-160500)");
    console.log(
        `payload: ${path.relative(REPO_ROOT, PAYLOAD)}  species: ${data.species.length}  clades: ${Object.keys(data.clades).length}  trials/target: ${TRIALS}\n`
    );
    if (process.env.PLAYTEST_ONLY === "rescue") {
        rescue(data, TRIALS);
        return;
    }
    sanityCheck(data);
    cladeSizeShape(data);
    bitsPerGuess(data, TRIALS);
    hintValue(data, [0, 1, 2, 4, 6], TRIALS);
    pacing(data);
    simulate(data, TRIALS);
    rescue(data, TRIALS);
}

main();
