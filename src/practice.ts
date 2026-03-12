import "./style.css";
import { createNewGameState } from "./gameState";
import { loadGameData } from "./markdownLoader";
import { initGame } from "./game";

const data = await loadGameData();
const seed = Math.floor(Math.random() * 1_000_000);
const state = createNewGameState(data, seed);

initGame({
    data,
    state,
});
