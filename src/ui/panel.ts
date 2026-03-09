const arenaWrapper = document.getElementById("arena-wrapper");
const panel = document.getElementById("info-panel");

export function closePanel() {
    panel?.classList.remove("active");
    arenaWrapper?.classList.remove("panel-open");
}

(window as typeof window & { closePanel: () => void }).closePanel = closePanel;
