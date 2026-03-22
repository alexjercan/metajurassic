import "./style.css";
import {
    computeGameStats,
    GameStats,
    calculateRollingAverage,
} from "./gameStats";
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

    // Render rolling average for practice mode (7-day window)
    const rollingAverageData = calculateRollingAverage(
        gameData,
        defaultStorage(),
        "practice",
        7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
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

function renderRollingAverage(
    dataPoints: ReturnType<typeof calculateRollingAverage>,
    containerId: string
) {
    const container = document.getElementById(containerId)!;

    if (dataPoints.length === 0) {
        container.innerHTML =
            '<p class="profile-no-data">Play some practice games to see your weekly progress!</p>';
        return;
    }

    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("profile-graph-svg");

    const width = 600;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 50, left: 60 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Find min and max values
    const values = dataPoints.map((d) => d.value);
    const minValue = Math.floor(Math.min(...values) - 0.5);
    const maxValue = Math.ceil(Math.max(...values) + 0.5);

    // Time range
    const times = dataPoints.map((d) => d.time.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime;

    // Create scales
    const xScale = (time: Date) =>
        timeRange > 0
            ? padding.left +
              ((time.getTime() - minTime) / timeRange) * graphWidth
            : padding.left + graphWidth / 2;
    const yScale = (value: number) =>
        padding.top +
        graphHeight -
        ((value - minValue) / (maxValue - minValue)) * graphHeight;

    // Draw grid lines
    const gridGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
    );
    for (let i = 0; i <= 5; i++) {
        const value = minValue + ((maxValue - minValue) / 5) * i;
        const y = yScale(value);

        const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );
        line.setAttribute("x1", padding.left.toString());
        line.setAttribute("y1", y.toString());
        line.setAttribute("x2", (padding.left + graphWidth).toString());
        line.setAttribute("y2", y.toString());
        line.classList.add("profile-graph-grid-line");
        gridGroup.appendChild(line);

        // Y-axis label
        const label = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );
        label.setAttribute("x", (padding.left - 10).toString());
        label.setAttribute("y", (y + 4).toString());
        label.setAttribute("text-anchor", "end");
        label.classList.add("profile-graph-axis-label");
        label.textContent = value.toFixed(1);
        gridGroup.appendChild(label);
    }
    svg.appendChild(gridGroup);

    // Draw line
    if (dataPoints.length > 1) {
        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );
        let pathData = "";

        dataPoints.forEach((point, index) => {
            const x = xScale(point.time);
            const y = yScale(point.value);

            if (index === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        });

        path.setAttribute("d", pathData);
        path.classList.add("profile-graph-line");
        svg.appendChild(path);
    }

    // Draw points
    const pointsGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
    );
    dataPoints.forEach((point) => {
        const x = xScale(point.time);
        const y = yScale(point.value);

        const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );
        circle.setAttribute("cx", x.toString());
        circle.setAttribute("cy", y.toString());
        circle.setAttribute("r", "4");
        circle.classList.add("profile-graph-point");

        // Add tooltip on hover
        circle.addEventListener("mouseenter", (e) => {
            showTooltip(e, point, container);
        });
        circle.addEventListener("mouseleave", () => {
            hideTooltip(container);
        });

        pointsGroup.appendChild(circle);
    });
    svg.appendChild(pointsGroup);

    // X-axis labels (show first, middle, and last data points)
    const xAxisGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
    );
    const labelIndices =
        dataPoints.length > 2
            ? [0, Math.floor(dataPoints.length / 2), dataPoints.length - 1]
            : dataPoints.length > 1
              ? [0, dataPoints.length - 1]
              : [0];

    labelIndices.forEach((index) => {
        if (index < dataPoints.length) {
            const point = dataPoints[index];
            const x = xScale(point.time);
            const y = padding.top + graphHeight + 25;

            const label = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );
            label.setAttribute("x", x.toString());
            label.setAttribute("y", y.toString());
            label.setAttribute("text-anchor", "middle");
            label.classList.add("profile-graph-axis-label");
            label.textContent = formatDateShort(point.time);
            xAxisGroup.appendChild(label);
        }
    });
    svg.appendChild(xAxisGroup);

    // Axis titles
    const yAxisTitle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
    );
    yAxisTitle.setAttribute("x", "15");
    yAxisTitle.setAttribute("y", (height / 2).toString());
    yAxisTitle.setAttribute("text-anchor", "middle");
    yAxisTitle.setAttribute("transform", `rotate(-90, 15, ${height / 2})`);
    yAxisTitle.classList.add("profile-graph-axis-title");
    yAxisTitle.textContent = "Avg Guesses";
    svg.appendChild(yAxisTitle);

    const xAxisTitle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
    );
    xAxisTitle.setAttribute("x", (padding.left + graphWidth / 2).toString());
    xAxisTitle.setAttribute("y", (height - 5).toString());
    xAxisTitle.setAttribute("text-anchor", "middle");
    xAxisTitle.classList.add("profile-graph-axis-title");
    xAxisTitle.textContent = "Time";
    svg.appendChild(xAxisTitle);

    container.innerHTML = "";
    container.appendChild(svg);

    // Add tooltip element
    const tooltip = document.createElement("div");
    tooltip.classList.add("profile-graph-tooltip");
    container.appendChild(tooltip);
}

function showTooltip(
    event: MouseEvent,
    point: ReturnType<typeof calculateRollingAverage>[number],
    container: HTMLElement
) {
    const tooltip = container.querySelector(
        ".profile-graph-tooltip"
    ) as HTMLElement;
    if (!tooltip) return;

    const dateStr = formatDateLong(point.time);

    tooltip.innerHTML = `
        <div class="profile-graph-tooltip-date">${dateStr}</div>
        <div class="profile-graph-tooltip-value">Avg: ${point.value.toFixed(1)} guesses</div>
        <div class="profile-graph-tooltip-value">Games in window: ${point.gamesCount}</div>
    `;

    const rect = container.getBoundingClientRect();
    tooltip.style.left = `${event.clientX - rect.left + 10}px`;
    tooltip.style.top = `${event.clientY - rect.top - 10}px`;
    tooltip.classList.add("visible");
}

function hideTooltip(container: HTMLElement) {
    const tooltip = container.querySelector(
        ".profile-graph-tooltip"
    ) as HTMLElement;
    if (!tooltip) return;
    tooltip.classList.remove("visible");
}

function formatDateShort(date: Date): string {
    const month = date.toLocaleString("en", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
}

function formatDateLong(date: Date): string {
    const month = date.toLocaleString("en", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
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
