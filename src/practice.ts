import "./style.css";
import { createNewGameState } from "./gameState";
import { loadData, initGame } from "./game";
import { migrateGameStates } from "./migration";

async function main() {
    // Run migration before loading game state
    migrateGameStates();

    const data = await loadData();
    const seed = Math.floor(Math.random() * 1_000_000);
    const state = createNewGameState(data, seed);

    initGame({
        data,
        state,
    });
}

main();
