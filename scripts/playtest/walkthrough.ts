// Screen capture walkthrough.
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
// not repository content). Findings belong in the task record that ran it.

import * as fs from "fs";
import * as path from "path";
import { chromium, devices, Browser, Locator, Page } from "@playwright/test";

import { MAX_GUESSES } from "../../src/constants";
import { CLOSENESS_LADDER, WIDE_TREE_SEED } from "../../e2e/helpers/rounds";

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

// One element rather than the viewport, for shots whose subject is a widget
// that the layout crops or overlays.
async function shootElement(locator: Locator, name: string): Promise<void> {
    const file = path.join(OUT_DIR, `${name}.png`);
    await locator.screenshot({ path: file });
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

// The phone entry, by NAME. A scenario that wants only the phone must not
// index into VIEWPORTS positionally, or reordering the list silently
// photographs a different device.
function mobileViewport(): (typeof VIEWPORTS)[number] {
    const mobile = VIEWPORTS.find((v) => v.name === "mobile");
    if (!mobile) throw new Error("VIEWPORTS has no phone entry");
    return mobile;
}

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
// `findMatches` in src/ui/autocomplete.ts used to truncate to 8 BEFORE
// filtering out guessed species, so guessed names kept consuming suggestion
// slots and the box went empty with dozens of candidates left. It now filters
// first, so this plays out the endurance case against the real widget: guess
// everything the box offers, and it must offer a full list again.

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

    // Guess exactly what the box OFFERS, which is what a player does and what
    // used to starve the list. Read before each guess, because the offered set
    // changes as names are consumed.
    const played: string[] = [];
    let landed = 0;
    for (let i = 0; i < 8; i++) {
        const offered = await suggest();
        if (!offered.length) break;
        const name = offered[0].trim();
        played.push(name);
        if (await guess(page, name)) landed++;
    }

    // Self-diagnosing: if a content change ever makes seed 5's target one of
    // these eight, the round ends mid-loop and everything below describes a
    // finished game rather than the exhaustion case. Say so rather than
    // reporting a number that looks like a result.
    if (landed < 8) {
        console.log(
            `  INVALID RUN: only ${landed}/8 guesses landed - the round almost certainly ended early (is seed 5's target among the suggested "${query}" matches?). Pick another seed.`
        );
    }

    console.log(`  guessed the offered: ${played.join(", ")}`);

    const after = await suggest();
    console.log(`  guesses left: ${await guessesLeft(page)}`);
    console.log(
        `  suggested after guessing those ${played.length}: ${after.length ? after.join(", ") : "(EMPTY)"}`
    );
    const stillOffered = after.filter((n) => played.includes(n.trim()));
    if (stillOffered.length) {
        console.log(
            `  BUG: the box re-offered already-guessed species: ${stillOffered.join(", ")}`
        );
    }
    console.log(
        `  unguessed matches remaining in the data: ${matches.length - played.length}`
    );
    await shoot(page, `08-autocomplete-endurance-desktop`);

    await context.close();
}

// --------------------------------------------------------------------------
// Scenario 6: the five-tier board, in colour and with the hue taken away
// --------------------------------------------------------------------------
//
// The closeness scale used to live in hue alone, and three of its five hues -
// yellow, orange, green - are the deuteranope confusion set at the hot end of
// the scale, where the player is closing in. The fix is a lightness ramp
// (task 20260730-094852). `test/closeness.test.ts` pins the arithmetic of that
// ramp; what it cannot tell anyone is whether five steps are actually five
// steps to an eye. So this plays the ladder and shoots the SAME board twice,
// once as shipped and once with `filter: grayscale(1)` over the page. Read the
// greyscale one: five tiers must still be five.

async function closenessGreyscale(browser: Browser): Promise<void> {
    // A wider-than-life desktop, unlike every other scenario here. This one is
    // not photographing the LAYOUT, it is photographing five nodes that have to
    // be compared against each other, and at 1280 the arena scrolls two of the
    // five rungs off the side. The phone viewport stays honest because the
    // ramp has to survive a real phone too.
    const shots = [
        {
            name: "desktop",
            options: { viewport: { width: 1920, height: 1000 } },
        },
        mobileViewport(),
    ];
    for (const viewport of shots) {
        console.log(
            `\n[closeness/${viewport.name}] seed=${WIDE_TREE_SEED}, all five tiers`
        );
        const { context, page } = await fresh(browser, viewport);

        await page.goto(`${BASE_URL}/practice/?seed=${WIDE_TREE_SEED}`);
        await page.waitForSelector("#tree-container .node-box");

        for (const { name, tier } of CLOSENESS_LADDER) {
            const landed = await guess(page, name);
            console.log(`  guess "${name}" (tier ${tier}) landed: ${landed}`);
        }
        await page.waitForTimeout(600);

        // A board with no mystery node is a FINISHED board, which renders the
        // target's own encodings instead of the scale - the wrong photograph.
        const running = await page
            .locator("#tree-container .node-mystery")
            .count();
        if (running !== 1) {
            console.log(
                `  INVALID RUN: ${running} mystery nodes, so the round ended - the shots below are not the five-tier board`
            );
        }

        // Report what actually painted, so a shot that is missing a rung says
        // so here rather than being squinted at.
        for (const { name, tier } of CLOSENESS_LADDER) {
            const classes = await page
                .locator(`#tree-container .node-box`, { hasText: name })
                .first()
                .getAttribute("class");
            console.log(
                `  ${name}: expected tier ${tier}, painted "${classes}"`
            );
        }

        // Shoot the TREE, not the viewport, and get the info panel out of the
        // way first: it covers a third of the board, and a five-step ramp
        // cannot be judged three steps at a time.
        const panelOpen = await page
            .locator("#info-panel")
            .evaluate((el) => el.classList.contains("active"));
        if (panelOpen) {
            await page.locator("#open-panel").click();
            await page.waitForTimeout(500);
        }
        const tree = page.locator("#tree-container");
        await shootElement(tree, `09-closeness-colour-${viewport.name}`);

        await page.addStyleTag({
            content: "html { filter: grayscale(1) !important; }",
        });
        await page.waitForTimeout(200);
        await shootElement(tree, `10-closeness-greyscale-${viewport.name}`);

        await context.close();
    }
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
        await closenessGreyscale(browser);
    } finally {
        await browser.close();
    }

    console.log(`\ndone - read the shots in ${OUT_DIR}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
