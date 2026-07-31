import { GameStats } from "../gameStats";
import { GameData } from "../gameData";
import { renderGuessedDinosaurs } from "./dinosaurList";

export function updateStatsUI(
    statsDaily: GameStats,
    statsPractice: GameStats,
    gameData: GameData
) {
    document.getElementById("games-played-daily").textContent =
        statsDaily.gamesPlayed.toString();

    const winRateDaily =
        statsDaily.gamesPlayed > 0
            ? Math.round((statsDaily.wins / statsDaily.gamesPlayed) * 100)
            : 0;
    document.getElementById("win-rate-daily").textContent = `${winRateDaily}%`;

    document.getElementById("current-streak-daily").textContent =
        statsDaily.currentStreak.toString();

    document.getElementById("longest-streak-daily").textContent =
        statsDaily.longestStreak.toString();

    document.getElementById("avg-guesses-daily").textContent =
        statsDaily.wins > 0 ? statsDaily.averageGuesses.toFixed(1) : "0";

    document.getElementById("total-wins-daily").textContent =
        statsDaily.wins.toString();

    document.getElementById("total-losses-daily").textContent =
        statsDaily.losses.toString();

    const totalDinosaurs = gameData.species.length;
    const unlockedDinosaurs = statsDaily.allGuessedDinosaurs.size;
    const unlockedPercentage =
        totalDinosaurs > 0 ? (unlockedDinosaurs / totalDinosaurs) * 100 : 0;
    document.getElementById("unique-dinos-daily").textContent =
        `${unlockedDinosaurs}/${totalDinosaurs}`;
    const progressBarDaily = document.getElementById(
        "unique-dinos-progress-daily"
    );
    if (progressBarDaily) {
        progressBarDaily.style.width = `${unlockedPercentage}%`;
    }

    renderGuessDistribution(
        statsDaily.guessDistribution,
        statsDaily.wins,
        "guess-distribution-daily"
    );

    document.getElementById("games-played-practice").textContent =
        statsPractice.gamesPlayed.toString();

    const winRatePractice =
        statsPractice.gamesPlayed > 0
            ? Math.round((statsPractice.wins / statsPractice.gamesPlayed) * 100)
            : 0;
    document.getElementById("win-rate-practice").textContent =
        `${winRatePractice}%`;

    document.getElementById("avg-guesses-practice").textContent =
        statsPractice.wins > 0 ? statsPractice.averageGuesses.toFixed(1) : "0";

    document.getElementById("total-wins-practice").textContent =
        statsPractice.wins.toString();

    document.getElementById("total-losses-practice").textContent =
        statsPractice.losses.toString();

    renderGuessDistribution(
        statsPractice.guessDistribution,
        statsPractice.wins,
        "guess-distribution-practice"
    );

    // Daily stats only: practice guesses do not unlock collection cards.
    renderGuessedDinosaurs(
        statsDaily.allGuessedDinosaurs,
        statsDaily.discoveredDinosaurs,
        gameData
    );
}

function renderGuessDistribution(
    distribution: Map<number, number>,
    totalWins: number,
    containerId: string
) {
    const container = document.getElementById(containerId);

    if (totalWins === 0) {
        container.innerHTML =
            '<p class="profile-no-data">No wins yet! Play some games to see your distribution.</p>';
        return;
    }

    const maxCount = Math.max(...Array.from(distribution.values()));
    const maxGuesses = Math.max(...Array.from(distribution.keys()));

    let html = "";
    for (let guesses = 1; guesses <= maxGuesses; guesses++) {
        const count = distribution.get(guesses) || 0;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

        html += `
            <div class="profile-dist-row">
                <div class="profile-dist-label">${guesses}</div>
                <div class="profile-dist-bar-container">
                    <div class="profile-dist-bar" style="width: ${percentage}%"></div>
                    <div class="profile-dist-count">${count}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}
