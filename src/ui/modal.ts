import confetti from "canvas-confetti";
import { MAX_GUESSES } from "../constants";

const overlay = document.getElementById("modal-overlay");
const modal = document.getElementById("modal");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalStats = document.getElementById("modal-stats");

function showModal() {
    overlay?.classList.add("active");
}

function hideModal() {
    overlay?.classList.remove("active");
}

export function showWinModal(speciesName: string, guessCount: number) {
    if (modalIcon) modalIcon.textContent = "🏆";
    if (modalTitle) {
        modalTitle.textContent = "You found it!";
        modalTitle.className = "modal-title modal-title-win";
    }
    if (modalMessage) {
        modalMessage.innerHTML = `The answer was <strong>${speciesName}</strong>`;
    }
    if (modalStats) {
        modalStats.textContent = `Solved in ${guessCount} / ${MAX_GUESSES} guesses`;
    }

    if (modal) {
        modal.className = "modal modal-win";
    }

    showModal();
    fireConfetti();
}

export function showLossModal(speciesName: string) {
    if (modalIcon) modalIcon.textContent = "💀";
    if (modalTitle) {
        modalTitle.textContent = "Game Over";
        modalTitle.className = "modal-title modal-title-loss";
    }
    if (modalMessage) {
        modalMessage.innerHTML = `The answer was <strong>${speciesName}</strong>`;
    }
    if (modalStats) {
        modalStats.textContent = `You used all ${MAX_GUESSES} guesses`;
    }

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

    // Initial burst
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ffd700", "#e6a861", "#ffec8b", "#fff"],
    });

    frame();
}
