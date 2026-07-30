import { MAX_GUESSES, HINT_COST } from "../constants";

/**
 * In-board onboarding copy: the pre-guess brief, the deeper how-to-play card,
 * and the hint chip string.
 *
 * The playable screen used to state none of the rules (playtest F3.1): a
 * guesses-left chip, a hint chip that named only its price, a `?` node, and an
 * input placeholder. The rules existed only behind a small grey footer link to
 * the FAQ - the one place the reference game deliberately does not keep them.
 *
 * WHY THE BRIEF LIVES IN THE ARENA, and not on an interstitial or in the top
 * bar, is a user-confirmed fork recorded in tasks/20260729-092327/DECISION.md.
 * The short version: the brief fills the band 20260729-141414 left empty below
 * the pre-guess tree, which costs the board nothing once play starts, and the
 * deeper reference routes through the EXISTING #open-panel affordance rather
 * than a competing one.
 *
 * The brief is deliberately gated on "no guesses yet" rather than on a stored
 * first-visit flag, so it fills that band at the top of every round instead of
 * only a player's first. A returning player dismisses it by guessing.
 */

// Copy is built here rather than typed into src/index.html so the two numbers
// in it come from the constants that define them. The old markup hardcoded
// "Cost 3 Guesses", a copy of HINT_COST that a reprice would have rotted
// silently (LESSONS.md: hand-copied-logic-mirrors-rot-update-them-in-the-same-change).
export function hintChipCopy(): { label: string; detail: string } {
    return {
        // "Stuck?" rather than "Hint": the hint is a rescue, not an edge. It
        // costs a player who can read the tree +2.2 guesses
        // (tasks/20260729-160500/SPIKE.md), so copy that sells it as an
        // advantage would be selling a trap.
        label: "Stuck?",
        // Names the product and the price and stops there. It must NOT promise
        // to halve the field: the rule falls back to a smaller cut on ~19% of
        // presses, so that promise would be false about one press in five.
        detail: `Spend ${HINT_COST} guesses to reveal a clade`,
    };
}

/**
 * The four facts a first-timer is missing (playtest F3.1), as plain strings.
 *
 * Kept separate from the DOM building below so the copy - and the MAX_GUESSES
 * wiring inside it - is unit-testable. The constraint that still binds is
 * coverage: `src/ui/**` is excluded from it as DOM-heavy by design
 * (jest.config.js). A jsdom environment IS available since 20260729-092352,
 * but opt-in per file (`@jest-environment jsdom`, see
 * test/cardRendering.test.ts) rather than the default. The seam is still worth
 * keeping: "copy is pure, mounting is end-to-end".
 */
export function briefCopy(): {
    objective: string;
    mystery: string;
    feedback: string;
    budget: string;
    howToPlay: string;
} {
    return {
        // "the mystery dinosaur", not "today's": the practice page renders this
        // same template (webpack.config.js) against a random target, where
        // "today's" would be false.
        objective: "Find the mystery dinosaur.",
        mystery: "? is the answer, hidden in the tree above.",
        feedback:
            "Each guess joins the tree at the clade it shares with the answer. " +
            "The deeper it joins, the closer you are.",
        budget: `You have ${MAX_GUESSES} guesses.`,
        howToPlay: "How to play",
    };
}

/**
 * The pre-guess brief: the four facts above, plus one control leading to the
 * fuller card. Four short lines - the board should still read as a game screen,
 * not as documentation.
 */
export function buildOnboardingBrief(): HTMLElement {
    const copy = briefCopy();

    const brief = document.createElement("div");
    brief.className = "onboarding-brief";
    brief.id = "onboarding-brief";

    const line = (id: string, extraClass: string, text: string) => {
        const p = document.createElement("p");
        p.id = id;
        p.className = `brief-line${extraClass ? ` ${extraClass}` : ""}`;
        p.textContent = text;
        brief.appendChild(p);
    };

    line("brief-objective", "brief-objective", copy.objective);
    line("brief-mystery", "", copy.mystery);
    line("brief-feedback", "", copy.feedback);
    line("brief-budget", "brief-budget", copy.budget);

    const button = document.createElement("button");
    button.type = "button";
    button.id = "brief-how-to-play";
    button.className = "brief-how-to-play";
    button.textContent = copy.howToPlay;
    brief.appendChild(button);

    return brief;
}

/**
 * The deeper reference, shown in the existing info panel. Still short: the FAQ
 * remains the place for everything past the loop itself.
 */
export function buildHowToPlayCard(): HTMLElement {
    const card = document.createElement("div");
    card.className = "museum-card how-to-play-card";

    card.innerHTML = `
        <div class="museum-card-inner">
            <div class="card-header">
                <h2 class="card-title">How to play</h2>
            </div>
            <div class="card-content">
                <div class="card-fact">
                    <strong>Goal:</strong>
                    <span>Find the mystery dinosaur, marked <strong>?</strong> on the tree.</span>
                </div>
                <div class="card-fact">
                    <strong>Guessing:</strong>
                    <span>Type a dinosaur name and press Enter, or pick one from the list.</span>
                </div>
                <div class="card-fact">
                    <strong>Reading the tree:</strong>
                    <span>Your guess is placed at the clade it shares with the answer -
                    the group they both belong to. A deeper shared clade means a
                    closer guess, so the tree is telling you how warm you are.</span>
                </div>
                <div class="card-fact">
                    <strong>Budget:</strong>
                    <span>${MAX_GUESSES} guesses. A name the game does not know is
                    rejected without costing one.</span>
                </div>
                <div class="card-fact">
                    <strong>Stuck:</strong>
                    <span>A hint spends ${HINT_COST} guesses to name a clade the answer
                    belongs to. It is a way out of a lost round, not a shortcut to a
                    quick one.</span>
                </div>
            </div>
        </div>
    `;

    return card;
}
