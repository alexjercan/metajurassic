// Screen capture walkthrough for the playtest pass (tasks/20260729-092435).
//
// Drives the real running game and photographs the moments a player actually
// meets - first screen, after the first guess, after a hint, game over - for
// daily and seeded practice, at a desktop and a phone viewport. It asserts
// NOTHING: its whole output is images that get read by a human or an agent.
// That is exactly why it lives here and not in `e2e/`, where Playwright's
// testDir would run it on every `npm run ci` for zero signal.
//
// Run:
//   npm run serve            # in one shell
//   npm run playtest:walkthrough
//
// Shots land in `playtest-shots/` (gitignored - they are evidence for one pass,
// not repository content). Findings go in tasks/20260729-092435/NOTES.md.

import * as fs from "fs";
import * as path from "path";
import { chromium, devices, Browser, Page } from "@playwright/test";

import { MAX_GUESSES } from "../../src/constants";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const OUT_DIR = path.resolve(__dirname, "..", "..", "playtest-shots");

// Seeds for the reproducible practice rounds. Which species each one maps to is
// a property of the daily permutation, not something a seed can be chosen for,
// so every scenario PRINTS the target it actually played - read that, rather
// than assuming a seed covers a particular lineage depth or a famous name.
const SEEDS = [1, 7, 42, 99, 123];

const VIEWPORTS = [
    { name: "desktop", options: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", options: devices["Pixel 5"] },
];

async function shoot(page: Page, name: string): Promise<void> {
    const file = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  shot: ${path.basename(file)}`);
}

// Submit a guess and confirm it LANDED by watching the guess counter, not by
// watching the input clear: the failure path clears the input too, so a cleared
// box is not proof of anything (LESSONS.md
// `side-effect-cleared-state-is-not-proof-of-success`).
async function guess(page: Page, name: string): Promise<boolean> {
    const before = await guessesLeft(page);
    await page.locator("#player-input").click();
    await page.locator("#player-input").fill(name);
    await page.waitForTimeout(150);
    await page.locator("#player-input").press("Enter");
    await page.waitForTimeout(250);
    const after = await guessesLeft(page);
    return after === before - 1;
}

async function guessesLeft(page: Page): Promise<number> {
    const text = (await page.locator("#stat-box").textContent()) ?? "";
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : NaN;
}

async function readSavedTarget(page: Page): Promise<string> {
    return page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith("gameState-")) continue;
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            try {
                return (JSON.parse(raw) as { targetId: string }).targetId;
            } catch {
                /* keep looking */
            }
        }
        return "";
    });
}

// An opening guess used across scenarios: it forces a save (so the target can
// be read back from storage) and gives the tree its first join to draw.
const PROBE = "Triceratops";

async function fresh(browser: Browser, viewport: (typeof VIEWPORTS)[number]) {
    const context = await browser.newContext(viewport.options);
    const page = await context.newPage();
    return { context, page };
}

// --------------------------------------------------------------------------
// Scenario 1: the first minute, daily, on a cold browser
// --------------------------------------------------------------------------

async function firstRun(browser: Browser): Promise<void> {
    for (const viewport of VIEWPORTS) {
        console.log(`\n[first-run/${viewport.name}] daily, cold storage`);
        const { context, page } = await fresh(browser, viewport);

        await page.goto(`${BASE_URL}/`);
        await page.waitForSelector("#stat-box");
        await page.waitForTimeout(500);
        await shoot(page, `01-first-screen-${viewport.name}`);

        // What is reachable from the first screen without playing?
        const links = await page.locator("a").evaluateAll((els) =>
            els.map((e) => ({
                text: (e.textContent ?? "").trim(),
                href: e.getAttribute("href"),
            }))
        );
        console.log(
            `  links on the play screen: ${links.map((l) => l.text || "(icon)").join(", ")}`
        );
        const hintText =
            (await page.locator("#hint-box").textContent())?.trim() ?? "";
        console.log(`  hint affordance reads: "${hintText}"`);
        console.log(`  guesses shown: ${await guessesLeft(page)}`);

        // The panel holds the only clade card on screen; is it open or hidden?
        const panelOpen = await page
            .locator("#info-panel")
            .evaluate((el) => el.classList.contains("active"));
        console.log(`  info panel open on arrival: ${panelOpen}`);

        // Autocomplete: what does a player see when they start typing?
        await page.locator("#player-input").click();
        await page.locator("#player-input").fill("tyr");
        await page.waitForTimeout(300);
        await shoot(page, `02-autocomplete-${viewport.name}`);
        const suggestions = await page
            .locator("#autocomplete-box .autocomplete-item")
            .allTextContents();
        console.log(
            `  "tyr" suggests ${suggestions.length}: ${suggestions.slice(0, 6).join(", ")}`
        );

        // First guess, then the tree and panel a player has to read.
        await page.locator("#player-input").fill("");
        const landed = await guess(page, PROBE);
        console.log(`  guess "${PROBE}" landed: ${landed}`);
        await page.waitForTimeout(400);
        await shoot(page, `03-after-first-guess-${viewport.name}`);

        const panelAfter = await page
            .locator("#info-panel")
            .evaluate((el) => el.classList.contains("active"));
        console.log(`  info panel open after first guess: ${panelAfter}`);
        const cardText =
            (
                await page.locator("#panel-card-container").textContent()
            )?.trim() ?? "";
        console.log(`  panel card says: "${cardText.slice(0, 160)}"`);

        // Buy a hint and see what three guesses bought.
        const beforeHint = await guessesLeft(page);
        await page.locator("#hint-box").click();
        await page.waitForTimeout(400);
        const afterHint = await guessesLeft(page);
        console.log(`  hint: ${beforeHint} -> ${afterHint} guesses left`);
        await shoot(page, `04-after-hint-${viewport.name}`);
        const cardAfterHint =
            (
                await page.locator("#panel-card-container").textContent()
            )?.trim() ?? "";
        console.log(`  hint revealed card: "${cardAfterHint.slice(0, 160)}"`);

        await context.close();
    }
}

// --------------------------------------------------------------------------
// Scenario 2: a seeded practice round played to a win
// --------------------------------------------------------------------------

async function seededWin(browser: Browser, seed: number): Promise<void> {
    for (const viewport of VIEWPORTS) {
        console.log(
            `\n[practice/${viewport.name}] seed=${seed}, played to win`
        );
        const { context, page } = await fresh(browser, viewport);

        await page.goto(`${BASE_URL}/practice/?seed=${seed}`);
        await page.waitForSelector("#stat-box");
        await guess(page, PROBE);
        const targetId = await readSavedTarget(page);
        console.log(`  target: ${targetId}`);

        // Play the target by name. Ids are the lowercased species name in this
        // content graph, which the win modal then confirms on screen.
        const targetName = targetId.charAt(0).toUpperCase() + targetId.slice(1);
        const landed = await guess(page, targetName);
        console.log(`  winning guess "${targetName}" landed: ${landed}`);
        await page.waitForTimeout(600);
        await shoot(page, `05-win-modal-seed${seed}-${viewport.name}`);

        const modal =
            (await page.locator("#modal").textContent())?.trim() ?? "";
        console.log(`  win modal: "${modal.replace(/\s+/g, " ")}"`);
        const actions = await page.locator(".modal-actions").allTextContents();
        console.log(`  modal actions: ${actions.join(" | ").trim()}`);

        await context.close();
    }
}

// --------------------------------------------------------------------------
// Scenario 3: a seeded practice round played to a loss
// --------------------------------------------------------------------------

async function seededLoss(browser: Browser, seed: number): Promise<void> {
    console.log(`\n[practice/desktop] seed=${seed}, played to a loss`);
    const { context, page } = await fresh(browser, VIEWPORTS[0]);

    await page.goto(`${BASE_URL}/practice/?seed=${seed}`);
    await page.waitForSelector("#stat-box");
    await guess(page, PROBE);
    const targetId = await readSavedTarget(page);

    // Burn the budget on anything that is not the target.
    const pool = ALL_NAMES.filter(
        (n) => n.toLowerCase() !== targetId && n !== PROBE
    );
    let i = 0;
    while ((await guessesLeft(page)) > 0 && i < pool.length) {
        await guess(page, pool[i]);
        i++;
    }
    await page.waitForTimeout(600);
    await shoot(page, `06-loss-modal-seed${seed}-desktop`);
    const modal = (await page.locator("#modal").textContent())?.trim() ?? "";
    console.log(`  loss modal: "${modal.replace(/\s+/g, " ")}"`);
    console.log(`  guesses left at the end: ${await guessesLeft(page)}`);

    await context.close();
}

// --------------------------------------------------------------------------
// Scenario 4: the returning daily player (a finished round, reloaded)
// --------------------------------------------------------------------------

async function returningDaily(browser: Browser): Promise<void> {
    for (const viewport of VIEWPORTS) {
        console.log(`\n[returning/${viewport.name}] daily, reloaded mid-game`);
        const { context, page } = await fresh(browser, viewport);

        await page.goto(`${BASE_URL}/`);
        await page.waitForSelector("#stat-box");
        await guess(page, PROBE);
        await guess(page, "Stegosaurus");
        await page.waitForTimeout(300);

        await page.reload();
        await page.waitForSelector("#stat-box");
        await page.waitForTimeout(600);
        await shoot(page, `07-returning-midgame-${viewport.name}`);
        console.log(`  guesses left after reload: ${await guessesLeft(page)}`);
        const panelOpen = await page
            .locator("#info-panel")
            .evaluate((el) => el.classList.contains("active"));
        console.log(`  info panel open after reload: ${panelOpen}`);

        await context.close();
    }
}

// --------------------------------------------------------------------------
// Scenario 5: does the autocomplete survive a long round?
// --------------------------------------------------------------------------
//
// `findMatches` in src/ui/autocomplete.ts truncates to 8 BEFORE filtering out
// guessed species, so guessed names keep consuming suggestion slots. This plays
// the case out against the real widget instead of arguing it from the source.

async function autocompleteEndurance(
    browser: Browser,
    query: string
): Promise<void> {
    console.log(`\n[autocomplete/desktop] query "${query}" after 8 guesses`);
    const { context, page } = await fresh(browser, VIEWPORTS[0]);

    await page.goto(`${BASE_URL}/practice/?seed=5`);
    await page.waitForSelector("#player-input");

    const suggest = async (): Promise<string[]> => {
        await page.locator("#player-input").fill(query);
        await page.waitForTimeout(250);
        return page
            .locator("#autocomplete-box .autocomplete-item")
            .allTextContents();
    };

    const matches = ALL_NAMES.filter((n) =>
        n.toLowerCase().includes(query.toLowerCase())
    );
    console.log(`  species matching "${query}" in the data: ${matches.length}`);
    console.log(
        `  suggested before any guess: ${(await suggest()).join(", ")}`
    );

    // Guess exactly the first 8 matches - the ones `slice(0, 8)` will keep
    // offering slots to.
    let landed = 0;
    for (const name of matches.slice(0, 8)) {
        if (await guess(page, name)) landed++;
    }

    // Self-diagnosing: if a content change ever makes seed 5's target one of
    // these eight, the round ends mid-loop and everything below describes a
    // finished game rather than the exhaustion case. Say so rather than
    // reporting a number that looks like a result.
    if (landed < 8) {
        console.log(
            `  INVALID RUN: only ${landed}/8 guesses landed - the round almost certainly ended early (is seed 5's target among the first 8 "${query}" matches?). Pick another seed.`
        );
    }

    const after = await suggest();
    console.log(`  guesses left: ${await guessesLeft(page)}`);
    console.log(
        `  suggested after guessing those 8: ${after.length ? after.join(", ") : "(EMPTY)"}`
    );
    console.log(
        `  unguessed matches that remain reachable only by typing in full: ${matches.length - 8}`
    );
    await shoot(page, `08-autocomplete-exhausted-desktop`);

    await context.close();
}

// --------------------------------------------------------------------------

let ALL_NAMES: string[] = [];

async function loadNames(browser: Browser): Promise<void> {
    const { context, page } = await fresh(browser, VIEWPORTS[0]);
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector("#player-input");
    // Read the species list straight off the served payload rather than the
    // autocomplete, which truncates to 8.
    ALL_NAMES = await page.evaluate(async () => {
        const res = await fetch("jurassic/index.json");
        const raw = (await res.json()) as {
            species: Record<string, { species: string }>;
        };
        return Object.values(raw.species).map((s) => s.species);
    });
    console.log(`species list loaded: ${ALL_NAMES.length} names`);
    await context.close();
}

async function main(): Promise<void> {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Metajurassic playtest walkthrough`);
    console.log(`base: ${BASE_URL}   shots: ${OUT_DIR}`);
    console.log(`rules: MAX_GUESSES=${MAX_GUESSES}\n`);

    const browser = await chromium.launch();
    try {
        await loadNames(browser);
        await firstRun(browser);
        for (const seed of SEEDS) {
            await seededWin(browser, seed);
        }
        await seededLoss(browser, SEEDS[0]);
        await returningDaily(browser);
        await autocompleteEndurance(browser, "saur");
    } finally {
        await browser.close();
    }

    console.log(`\ndone - read the shots in ${OUT_DIR}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
