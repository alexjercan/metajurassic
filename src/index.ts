import "./style.css";
import { loadGameState, saveGameState } from "./gameState";
import { loadData, initGame } from "./game";
import { migrateGameStates } from "./migration";

async function main() {
    // Run migration before loading game state
    migrateGameStates();

    const data = await loadData();
    const state = loadGameState(data);

    initGame({
        data,
        state,
        saveState: (s) => saveGameState(s),
    });
}

main();
