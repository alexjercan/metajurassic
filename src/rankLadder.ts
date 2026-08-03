import { GameState } from "./gameState";
import {
    CladeNode,
    SpeciesNode,
    isCladeNode,
    isSpeciesNode,
} from "./treeBuilder";

/**
 * The round summary: what the player's guesses have established, keyed by
 * GUESS rather than by node.
 *
 * It is a pure READ of the board. Every fact here is already on the tree, and
 * the ladder stops at the deepest REVEALED clade - no unrevealed rung, no `???`
 * row, no remaining-depth number anywhere. Depth-to-target is difficulty
 * information the game deliberately withholds; see
 * tasks/20260729-182320/DECISION.md for the fork and the call.
 *
 * It derives from the `CladeNode[]` `buildGuessTree` already returned rather
 * than re-traversing the species graph, so the card cannot disagree with the
 * board it sits next to.
 */

// How a row's clade came to be on screen. `guesses` is the interesting one -
// it is the ladder's reason for existing.
export type LadderProvenance = "root" | "guesses" | "hint";

export interface LadderGuess {
    speciesId: string;
    name: string;
    // Carried through from `SpeciesNode.closenessTier` untouched, so the card,
    // the board and the share grid index the same scale. Undefined on a WON
    // round's target, which is the answer rather than a temperature.
    closenessTier?: number;
    isLastGuess: boolean;
}

export interface LadderRow {
    cladeId: string;
    name: string;
    provenance: LadderProvenance;
    guesses: LadderGuess[];
}

export interface RankLadder {
    guessCount: number;
    hintCount: number;
    // Root first, deepest revealed clade last.
    rows: LadderRow[];
}

export function buildRankLadder(
    state: GameState,
    roots: CladeNode[]
): RankLadder {
    const ladder: RankLadder = {
        guessCount: state.guesses.size,
        hintCount: state.hintClades.size,
        rows: [],
    };

    const chain = findTargetChain(roots);
    if (!chain) return ladder;

    ladder.rows = chain.map((node, index) => ({
        cladeId: node.cladeId,
        name: node.name,
        provenance:
            index === 0
                ? "root"
                : state.hintClades.has(node.cladeId)
                  ? "hint"
                  : "guesses",
        guesses: [],
    }));

    const rowByClade = new Map(
        ladder.rows.map((row) => [row.cladeId, row] as const)
    );
    const guessOrder = Array.from(state.guesses);

    // A guess the tree bucketed under an OFF-CHAIN pairwise LCA rolls up to that
    // clade's nearest chain ancestor - which is provably its join with the
    // target, i.e. the clade the player already saw when they spent the guess.
    function collect(node: CladeNode, nearestChainRow: LadderRow) {
        const row = rowByClade.get(node.cladeId) ?? nearestChainRow;
        for (const child of node.children) {
            if (isCladeNode(child)) {
                collect(child, row);
            } else if (
                isSpeciesNode(child) &&
                state.guesses.has(child.speciesId)
            ) {
                row.guesses.push(toLadderGuess(child, state.lastGuessId));
            }
        }
    }

    for (const root of roots) {
        collect(root, ladder.rows[0]);
    }

    for (const row of ladder.rows) {
        row.guesses.sort(
            (a, b) =>
                guessOrder.indexOf(a.speciesId) -
                guessOrder.indexOf(b.speciesId)
        );
    }

    return ladder;
}

function toLadderGuess(node: SpeciesNode, lastGuessId?: string): LadderGuess {
    return {
        speciesId: node.speciesId,
        name: node.name,
        closenessTier: node.closenessTier,
        isLastGuess: node.speciesId === lastGuessId,
    };
}

/**
 * The clade nodes from the root down to the one holding the target's node,
 * which is exactly the REVEALED part of the target's lineage. Returns null when
 * the tree holds no target node - an empty `roots`, or a graph that could not
 * be built at all.
 */
function findTargetChain(roots: CladeNode[]): CladeNode[] | null {
    function walk(node: CladeNode, path: CladeNode[]): CladeNode[] | null {
        const here = [...path, node];
        for (const child of node.children) {
            if (isSpeciesNode(child) && child.isTarget) return here;
        }
        for (const child of node.children) {
            if (isCladeNode(child)) {
                const found = walk(child, here);
                if (found) return found;
            }
        }
        return null;
    }

    for (const root of roots) {
        const found = walk(root, []);
        if (found) return found;
    }
    return null;
}
