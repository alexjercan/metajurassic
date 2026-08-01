import { expect, Page } from "@playwright/test";
import { MAX_GUESSES } from "../../src/constants";
import { dailyKeyForNow } from "../dailyKeyMirror";

// See tasks/20260729-092258/DECISION.md for why modal state is injected via
// localStorage keyed off a frozen clock rather than the (not-yet-built) seed
// mode.

// Recompute the daily storage key the app uses, inside the browser, so it is
// derived from the SAME frozen `new Date()` the app sees. Must be called after
// page.clock has fixed the time. The mirror itself lives in
// `dailyKeyMirror.ts`, where a Jest test holds it to the real functions.
export function computeDailyKey(page: Page): Promise<string> {
    return page.evaluate(dailyKeyForNow);
}

// Read the real served content graph from the browser. Uses the actual payload
// (src/jurassic/index.json copied to /jurassic/index.json) rather than a mock,
// per the repo lesson mock-fixtures-hide-real-data-defects.
export function loadContent(
    page: Page
): Promise<{ speciesIds: string[]; speciesNames: string[] }> {
    return page.evaluate(async () => {
        const res = await fetch("/jurassic/index.json");
        const raw = (await res.json()) as {
            species: Record<string, { species: string }>;
        };
        const speciesIds = Object.keys(raw.species);
        const speciesNames = speciesIds.map((id) => raw.species[id].species);
        return { speciesIds, speciesNames };
    });
}

type FinishedGame = {
    targetId: string;
    guesses: string[];
    lastGuessId?: string;
    hintClades?: string[];
};

// Write a finished daily game into localStorage so the next load renders the
// end-of-game modal deterministically. loadGameState() reads targetId straight
// from storage, so the chosen target does not have to match the real daily pick.
export async function seedFinishedDailyGame(
    page: Page,
    game: FinishedGame
): Promise<void> {
    const key = await computeDailyKey(page);
    await page.evaluate(
        ([storageKey, payload]) => {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    targetId: payload.targetId,
                    guesses: payload.guesses,
                    lastGuessId: payload.lastGuessId,
                    hintClades: payload.hintClades ?? [],
                    createdAt: new Date().toISOString(),
                })
            );
        },
        [key, game] as const
    );
}

// A URL src is "structurally valid" if it is a non-empty http(s) URL. The
// species-icon defect repaired by 20260729-092352 stored a stringified Python
// list ("['https://...svg']"); the leading-"[" guard is what keeps that shape
// failing, without needing the external CDN. See DECISION.md choice 4.
export function isStructurallyValidImageSrc(src: string | null): boolean {
    if (!src) return false;
    if (src.trim().startsWith("[")) return false;
    return (
        /^https?:\/\/.+/.test(src) ||
        src.startsWith("/") ||
        src.startsWith("data:")
    );
}

// MAX_GUESSES species ids from the served payload, none of them the target:
// exactly enough wrong guesses to spend a whole round. Read at run time and
// filtered against the target, so no hand-kept list can rot into an accidental
// win. Shared by e2e/postgame.spec.ts and e2e/share.spec.ts rather than copied
// into both, per LESSONS.md
// `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`.
//
// Needs a page already on an app route, since `loadContent` fetches the payload
// through the page.
export async function wrongGuessIds(
    page: Page,
    targetId: string
): Promise<string[]> {
    const { speciesIds } = await loadContent(page);
    const wrong = speciesIds
        .filter((id) => id !== targetId)
        .slice(0, MAX_GUESSES);
    expect(
        wrong,
        `the payload has too few species to spend ${MAX_GUESSES} guesses`
    ).toHaveLength(MAX_GUESSES);
    return wrong;
}
