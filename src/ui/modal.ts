import confetti from "canvas-confetti";
import shareIcon from "../assets/share.svg";
import { formatCountdown, msUntilNextPuzzle } from "../countdown";
import { lossSummary, winSummary } from "../gameOverCopy";

const overlay = document.getElementById("modal-overlay");
const modal = document.getElementById("modal");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalStats = document.getElementById("modal-stats");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalExtras = document.getElementById("modal-extras");
const modalPlayed = document.getElementById("modal-played");
const modalWinRate = document.getElementById("modal-win-rate");
const modalStreak = document.getElementById("modal-streak");
const modalAvg = document.getElementById("modal-avg");
const modalCountdown = document.getElementById("modal-countdown");

// The four banked numbers the daily close shows, already formatted: the modal
// is a widget and does not decide how a win rate rounds. `src/game/index.ts`
// builds this from `computeGameStats` via the shared formatters in
// `src/gameStats.ts`, which is what the profile page reads too.
export interface ModalStats {
    played: string;
    winRate: string;
    streak: string;
    average: string;
}

export interface GameOverModalOptions {
    speciesName: string;
    guessCount: number;
    hintCount: number;
    // Present means this was the DAILY round: the stats card and the countdown
    // to the next puzzle are shown. Absent means practice, which stays
    // lightweight - there is no "next practice puzzle" to wait for.
    daily?: ModalStats;
}

// The countdown's 1s tick. Module-level and cleared on every hide and before
// every start: a finished round can render its modal more than once in one
// document (close, then re-open by pressing Enter), and a tick per open would
// accumulate, each one writing the same element.
let countdownTimer: ReturnType<typeof setInterval> | null = null;

function stopCountdown() {
    if (countdownTimer !== null) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

function paintCountdown() {
    if (!modalCountdown) return;
    const remaining = formatCountdown(msUntilNextPuzzle(new Date()));
    modalCountdown.innerHTML = `Next puzzle in <strong>${remaining}</strong>`;
}

function startCountdown() {
    stopCountdown();
    // Painted before the first tick fires, or the line would sit empty for a
    // second at the exact moment the player is reading it.
    paintCountdown();
    countdownTimer = setInterval(paintCountdown, 1000);
}

function renderExtras(daily?: ModalStats) {
    if (!modalExtras) return;

    if (!daily) {
        // Set in BOTH branches: the practice page renders this same template,
        // and a stale card left over from a previous render would be a daily
        // streak shown on a practice round.
        modalExtras.hidden = true;
        stopCountdown();
        return;
    }

    if (modalPlayed) modalPlayed.textContent = daily.played;
    if (modalWinRate) modalWinRate.textContent = daily.winRate;
    if (modalStreak) modalStreak.textContent = daily.streak;
    if (modalAvg) modalAvg.textContent = daily.average;
    modalExtras.hidden = false;
    startCountdown();
}

function showModal() {
    overlay?.classList.add("active");
}

function hideModal() {
    overlay?.classList.remove("active");
    // Nothing off screen keeps ticking; the next show starts a fresh one.
    stopCountdown();
}

overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) hideModal();
});

modalCloseBtn?.addEventListener("click", () => hideModal());

const modalShareBtn = document.getElementById("modal-share-btn");
const shareBtnIcon = modalShareBtn?.querySelector("img");
if (shareBtnIcon) {
    shareBtnIcon.src = shareIcon;
    shareBtnIcon.alt = "Share";
}

export function showWinModal(options: GameOverModalOptions) {
    if (modalIcon) modalIcon.textContent = "🏆";
    if (modalTitle) {
        modalTitle.textContent = "You found it!";
        modalTitle.className = "modal-title modal-title-win";
    }
    if (modalMessage) {
        modalMessage.innerHTML = `The answer was <strong>${options.speciesName}</strong>`;
    }
    if (modalStats) {
        modalStats.textContent = winSummary(
            options.guessCount,
            options.hintCount
        );
    }
    renderExtras(options.daily);

    if (modal) {
        modal.className = "modal modal-win";
    }

    showModal();
    fireConfetti();
}

export function showLossModal(options: GameOverModalOptions) {
    if (modalIcon) modalIcon.textContent = "💀";
    if (modalTitle) {
        modalTitle.textContent = "Game Over";
        modalTitle.className = "modal-title modal-title-loss";
    }
    if (modalMessage) {
        modalMessage.innerHTML = `The answer was <strong>${options.speciesName}</strong>`;
    }
    if (modalStats) {
        modalStats.textContent = lossSummary(
            options.guessCount,
            options.hintCount
        );
    }
    renderExtras(options.daily);

    if (modal) {
        modal.className = "modal modal-loss";
    }

    showModal();
}

function fireConfetti() {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ["#ffd700", "#e6a861", "#ffec8b"],
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ["#ffd700", "#e6a861", "#ffec8b"],
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    };

    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ffd700", "#e6a861", "#ffec8b", "#fff"],
    });

    frame();
}
