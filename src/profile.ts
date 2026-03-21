import "./style.css";
import { computeGameStats } from "./gameStats";
import { loadGameData } from "./jsonLoader";

async function main() {
    const gameData = await loadGameData();
    const stats = computeGameStats(gameData);

    updateStatsUI(stats);
}

function updateStatsUI(stats: ReturnType<typeof computeGameStats>) {
    // Top stat cards
    document.getElementById("games-played")!.textContent =
        stats.gamesPlayed.toString();

    const winRate =
        stats.gamesPlayed > 0
            ? Math.round((stats.wins / stats.gamesPlayed) * 100)
            : 0;
    document.getElementById("win-rate")!.textContent = `${winRate}%`;

    document.getElementById("current-streak")!.textContent =
        stats.currentStreak.toString();

    document.getElementById("longest-streak")!.textContent =
        stats.longestStreak.toString();

    // Performance section
    document.getElementById("avg-guesses")!.textContent =
        stats.wins > 0 ? stats.averageGuesses.toFixed(1) : "0";

    document.getElementById("total-wins")!.textContent = stats.wins.toString();

    document.getElementById("total-losses")!.textContent =
        stats.losses.toString();

    document.getElementById("unique-dinos")!.textContent =
        stats.uniqueDinosaursDiscovered.toString();

    // Guess distribution
    renderGuessDistribution(stats.guessDistribution, stats.wins);
}

function renderGuessDistribution(
    distribution: Map<number, number>,
    totalWins: number
) {
    const container = document.getElementById("guess-distribution")!;

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

main();
