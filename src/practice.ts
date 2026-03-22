import "./style.css";
import { createNewGameState, saveGameState } from "./gameState";
import { loadData, initGame } from "./game";
import { defaultStorage } from "./storage";

async function main() {
    const data = await loadData();
    const seed = Math.floor(Math.random() * 1_000_000);
    const state = createNewGameState(data, seed);

    initGame({
        data,
        state,
        saveState: (s) => saveGameState(s, seed, defaultStorage(), "practice"),
    });
}

main();
