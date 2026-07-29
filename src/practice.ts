import "./style.css";
import { createNewGameState, parseSeedParam, saveGameState } from "./gameState";
import { loadData, initGame } from "./game";
import { defaultStorage } from "./storage";

async function main() {
    const data = await loadData();
    // A `?seed=N` query param loads a chosen, reproducible target (bug repros,
    // E2E fixtures, playtests). Without it, practice keeps rolling a random
    // seed. The daily page never reads this param - see tasks/20260729-101819.
    const seedParam = parseSeedParam(window.location.search);
    const seed = seedParam ?? Math.floor(Math.random() * 1_000_000);
    const state = createNewGameState(data, seed);

    initGame({
        data,
        state,
        saveState: (s) => saveGameState(s, seed, defaultStorage(), "practice"),
        share: { mode: "practice", seed },
    });
}

main();
