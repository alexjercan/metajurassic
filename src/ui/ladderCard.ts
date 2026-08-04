import type { LadderGuess, LadderProvenance, RankLadder } from "../rankLadder";
import { plural } from "../plural";

/**
 * The round summary card. Deliberately dumb: `src/ui/**` is excluded from jest
 * coverage (jest.config.js), so every decision about WHAT the ladder says lives
 * in `src/rankLadder.ts` and this file only paints it - the same argument the
 * `SpeciesNode.closenessTier` doc comment makes for the tree.
 */

const PROVENANCE_LABEL: Record<LadderProvenance, string> = {
    root: "root",
    guesses: "from your guesses",
    hint: "revealed by a hint",
};

function countsLine(ladder: RankLadder): string {
    const guesses = plural(ladder.guessCount, "guess", "guesses");
    if (ladder.hintCount === 0) return guesses;
    return `${guesses} - ${plural(ladder.hintCount, "hint", "hints")}`;
}

function buildGuessItem(guess: LadderGuess): HTMLElement {
    const item = document.createElement("li");
    // The tier classes are the BOARD's, reused rather than restyled, so a chip
    // and its node can never disagree about how warm a guess was. Retune them
    // in src/partials/tree.css.
    item.className = "ladder-guess";
    if (guess.closenessTier === undefined) {
        item.classList.add("ladder-guess-found");
    } else {
        item.classList.add(`node-close-${guess.closenessTier}`);
    }
    if (guess.isLastGuess) item.classList.add("ladder-guess-last");

    const name = document.createElement("span");
    name.className = "ladder-guess-name";
    name.textContent = guess.name;
    item.appendChild(name);

    if (guess.isLastGuess) {
        const badge = document.createElement("span");
        badge.className = "ladder-guess-badge";
        badge.textContent = "newest";
        item.appendChild(badge);
    }

    return item;
}

function buildRow(
    row: RankLadder["rows"][number],
    isDeepest: boolean
): HTMLElement {
    const item = document.createElement("li");
    item.className = `ladder-row${isDeepest ? " ladder-row-deepest" : ""}`;

    const head = document.createElement("div");
    head.className = "ladder-clade";

    const name = document.createElement("span");
    name.className = "ladder-clade-name";
    name.textContent = row.name;
    head.appendChild(name);

    const provenance = document.createElement("span");
    provenance.className = "ladder-provenance";
    provenance.textContent = PROVENANCE_LABEL[row.provenance];
    head.appendChild(provenance);

    item.appendChild(head);

    if (row.guesses.length > 0) {
        const list = document.createElement("ul");
        list.className = "ladder-guesses";
        for (const guess of row.guesses) {
            list.appendChild(buildGuessItem(guess));
        }
        item.appendChild(list);
    }

    return item;
}

export function buildLadderCard(ladder: RankLadder): HTMLElement {
    const card = document.createElement("div");
    card.className = "museum-card ladder-card";

    const inner = document.createElement("div");
    inner.className = "museum-card-inner";
    card.appendChild(inner);

    const header = document.createElement("div");
    header.className = "card-header";
    inner.appendChild(header);

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = "Round summary";
    header.appendChild(title);

    const counts = document.createElement("span");
    counts.className = "ladder-counts";
    counts.textContent = countsLine(ladder);
    header.appendChild(counts);

    const content = document.createElement("div");
    content.className = "card-content";
    inner.appendChild(content);

    const rows = document.createElement("ol");
    rows.className = "ladder-rows";
    ladder.rows.forEach((row, index) => {
        rows.appendChild(buildRow(row, index === ladder.rows.length - 1));
    });
    content.appendChild(rows);

    return card;
}
