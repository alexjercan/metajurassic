import "./style.css";
import { computeGameStats } from "./gameStats";
import { loadGameData } from "./jsonLoader";
import { createSpeciesCard, shrinkCardTitle } from "./ui/card";
import { GameData } from "./gameData";
import { migrateGameStates } from "./migration";

async function main() {
    // Run migration before computing stats
    migrateGameStates();

    const gameData = await loadGameData();
    const stats = computeGameStats(gameData);

    updateStatsUI(stats, gameData);
}

function updateStatsUI(
    stats: ReturnType<typeof computeGameStats>,
    gameData: GameData
) {
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

    document.getElementById("avg-guesses")!.textContent =
        stats.wins > 0 ? stats.averageGuesses.toFixed(1) : "0";

    document.getElementById("total-wins")!.textContent = stats.wins.toString();

    document.getElementById("total-losses")!.textContent =
        stats.losses.toString();

    const totalDinosaurs = gameData.species.length;
    const unlockedDinosaurs = stats.allGuessedDinosaurs.size;
    const unlockedPercentage =
        totalDinosaurs > 0 ? (unlockedDinosaurs / totalDinosaurs) * 100 : 0;
    document.getElementById("unique-dinos")!.textContent =
        `${unlockedDinosaurs}/${totalDinosaurs}`;
    const progressBar = document.getElementById("unique-dinos-progress");
    if (progressBar) {
        progressBar.style.width = `${unlockedPercentage}%`;
    }

    renderGuessDistribution(stats.guessDistribution, stats.wins);
    renderGuessedDinosaurs(
        stats.allGuessedDinosaurs,
        stats.discoveredDinosaurs,
        gameData
    );
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

function renderGuessedDinosaurs(
    guessedIds: Set<string>,
    discoveredIds: Set<string>,
    gameData: GameData
) {
    const carousel = document.getElementById("profile-carousel");
    if (!carousel) return;

    if (guessedIds.size === 0) {
        carousel.innerHTML =
            '<p class="profile-no-data">No guesses yet! Play some games to see your guessed dinosaurs.</p>';
        return;
    }

    const guessedSpecies = Array.from(guessedIds)
        .map((id) => gameData.findSpeciesById(id))
        .filter((s) => s !== null)
        .sort((a, b) => a!.species.localeCompare(b!.species));

    for (const species of guessedSpecies) {
        if (!species) continue;
        const clade = gameData.findCladeById(species.clade);
        const isRare = discoveredIds.has(species.id);
        const rarity = isRare ? "rare" : "common";
        const card = createSpeciesCard(
            species,
            clade || undefined,
            "archive-card",
            rarity
        );
        carousel.appendChild(card);
        shrinkCardTitle(card);
    }

    setupCarouselNav(carousel);
}

function setupCarouselNav(carousel: HTMLElement) {
    const leftBtn = document.getElementById(
        "profile-carousel-left"
    ) as HTMLButtonElement | null;
    const rightBtn = document.getElementById(
        "profile-carousel-right"
    ) as HTMLButtonElement | null;
    if (!leftBtn || !rightBtn) return;

    const scrollAmount = 370;

    const updateButtons = () => {
        leftBtn.disabled = carousel.scrollLeft <= 0;
        rightBtn.disabled =
            carousel.scrollLeft + carousel.clientWidth >=
            carousel.scrollWidth - 1;
    };

    leftBtn.addEventListener("click", () => {
        carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });

    rightBtn.addEventListener("click", () => {
        carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });

    carousel.addEventListener("scroll", updateButtons);
    updateButtons();

    carousel.addEventListener(
        "wheel",
        (e) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            carousel.scrollBy({ left: e.deltaY });
        },
        { passive: false }
    );
}

main();
