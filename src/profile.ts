import "./style.css";
import { computeGameStats, GameStats } from "./gameStats";
import { loadGameData } from "./jsonLoader";
import {
    createSpeciesCard,
    createLockedSpeciesCard,
    shrinkCardTitle,
} from "./ui/card";
import { GameData } from "./gameData";
import { defaultStorage } from "./storage";

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

function updateStatsUI(
    statsDaily: GameStats,
    statsPractice: GameStats,
    gameData: GameData
) {
    // Update Daily stats
    document.getElementById("games-played-daily")!.textContent =
        statsDaily.gamesPlayed.toString();

    const winRateDaily =
        statsDaily.gamesPlayed > 0
            ? Math.round((statsDaily.wins / statsDaily.gamesPlayed) * 100)
            : 0;
    document.getElementById("win-rate-daily")!.textContent = `${winRateDaily}%`;

    document.getElementById("current-streak-daily")!.textContent =
        statsDaily.currentStreak.toString();

    document.getElementById("longest-streak-daily")!.textContent =
        statsDaily.longestStreak.toString();

    document.getElementById("avg-guesses-daily")!.textContent =
        statsDaily.wins > 0 ? statsDaily.averageGuesses.toFixed(1) : "0";

    document.getElementById("total-wins-daily")!.textContent =
        statsDaily.wins.toString();

    document.getElementById("total-losses-daily")!.textContent =
        statsDaily.losses.toString();

    const totalDinosaurs = gameData.species.length;
    const unlockedDinosaurs = statsDaily.allGuessedDinosaurs.size;
    const unlockedPercentage =
        totalDinosaurs > 0 ? (unlockedDinosaurs / totalDinosaurs) * 100 : 0;
    document.getElementById("unique-dinos-daily")!.textContent =
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

    // Update Practice stats
    document.getElementById("games-played-practice")!.textContent =
        statsPractice.gamesPlayed.toString();

    const winRatePractice =
        statsPractice.gamesPlayed > 0
            ? Math.round((statsPractice.wins / statsPractice.gamesPlayed) * 100)
            : 0;
    document.getElementById("win-rate-practice")!.textContent =
        `${winRatePractice}%`;

    document.getElementById("avg-guesses-practice")!.textContent =
        statsPractice.wins > 0 ? statsPractice.averageGuesses.toFixed(1) : "0";

    document.getElementById("total-wins-practice")!.textContent =
        statsPractice.wins.toString();

    document.getElementById("total-losses-practice")!.textContent =
        statsPractice.losses.toString();

    renderGuessDistribution(
        statsPractice.guessDistribution,
        statsPractice.wins,
        "guess-distribution-practice"
    );

    // Render dinosaur collection (using daily stats only)
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
    const container = document.getElementById(containerId)!;

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
    const toggle = document.getElementById(
        "show-locked-toggle"
    ) as HTMLInputElement;
    if (!carousel || !toggle) return;

    const renderCards = (showLocked: boolean) => {
        carousel.innerHTML = "";

        // Get all species sorted alphabetically
        const allSpecies = [...gameData.species].sort((a, b) =>
            a.species.localeCompare(b.species)
        );

        for (const species of allSpecies) {
            const isUnlocked = guessedIds.has(species.id);

            if (isUnlocked) {
                // Render unlocked card
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
            } else if (showLocked) {
                // Render locked card only if showLocked is true
                const card = createLockedSpeciesCard(species, "archive-card");
                carousel.appendChild(card);
                shrinkCardTitle(card);
            }
        }

        setupCarouselNav(carousel);
    };

    // Initial render
    renderCards(toggle.checked);

    // Listen for toggle changes
    toggle.addEventListener("change", () => {
        renderCards(toggle.checked);
    });
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
