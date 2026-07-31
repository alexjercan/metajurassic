import "../style.css";
import { computeGameStats } from "../gameStats";
import { calculateRollingAverage } from "../rollingAverage";
import { loadGameData } from "../jsonLoader";
import { defaultStorage } from "../storage";
import { updateStatsUI } from "./statsPanel";
import { renderRollingAverage } from "./rollingAverageChart";

async function main() {
    const gameData = await loadGameData();
    const statsDaily = computeGameStats(gameData, defaultStorage(), "daily");
    const statsPractice = computeGameStats(
        gameData,
        defaultStorage(),
        "practice"
    );

    updateStatsUI(statsDaily, statsPractice, gameData);
    setupTabs();

    const rollingAverageData = calculateRollingAverage(
        gameData,
        defaultStorage(),
        "practice",
        7,
        "daily"
    );
    renderRollingAverage(rollingAverageData, "rolling-average-practice");
}

function setupTabs() {
    const dailyTab = document.getElementById("daily-tab");
    const practiceTab = document.getElementById("practice-tab");
    const dailyStats = document.getElementById("daily-stats");
    const practiceStats = document.getElementById("practice-stats");

    if (!dailyTab || !practiceTab || !dailyStats || !practiceStats) return;

    dailyTab.addEventListener("click", () => {
        dailyTab.classList.add("active");
        practiceTab.classList.remove("active");
        dailyStats.style.display = "block";
        practiceStats.style.display = "none";
    });

    practiceTab.addEventListener("click", () => {
        practiceTab.classList.add("active");
        dailyTab.classList.remove("active");
        practiceStats.style.display = "block";
        dailyStats.style.display = "none";
    });
}

main();
