import "./style.css";
import { loadGameState, saveGameState } from "./gameState";
import { loadData, initGame } from "./game";

async function main() {
    const data = await loadData();
    const state = loadGameState(data);

    initGame({
        data,
        state,
        saveState: (s) => saveGameState(s),
    });
}

main();
