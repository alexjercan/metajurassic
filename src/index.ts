import "./style.css";
import { loadGameState, saveGameState } from "./gameState";
import { getTodaySeed } from "./puzzleKey";
import { loadData, initGame } from "./game";
import { defaultStorage } from "./storage";

async function main() {
    const data = await loadData();
    const seed = getTodaySeed();
    const state = loadGameState(data, seed, defaultStorage(), "daily");

    initGame({
        data,
        state,
        saveState: (s) => saveGameState(s, seed, defaultStorage(), "daily"),
        share: { mode: "daily", seed },
    });
}

main();
