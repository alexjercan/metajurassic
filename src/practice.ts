import "./style.css";
import { createNewGameState } from "./gameState";
import { loadData, initGame } from "./game";

const data = await loadData();
const seed = Math.floor(Math.random() * 1_000_000);
const state = createNewGameState(data, seed);

initGame({
    data,
    state,
});
