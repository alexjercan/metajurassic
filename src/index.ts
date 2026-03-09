import "./style.css";
import { loadGameData } from "./loader";

const arenaWrapper = document.getElementById("arena-wrapper");
const panel = document.getElementById("info-panel");

export function closePanel() {
    panel.classList.remove("active");
    arenaWrapper.classList.remove("panel-open");
}

const data = await loadGameData();
console.log(data);

(window as typeof window & { closePanel: () => void }).closePanel = closePanel;
