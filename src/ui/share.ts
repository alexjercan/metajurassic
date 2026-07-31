// How a finished round leaves the page: the OS share sheet where there is one,
// the clipboard where there is not (tasks/20260729-101823/DECISION.md). Kept
// DOM-free and dependency-injected so both paths are unit-testable without a
// browser.

export interface ShareTargets {
    share?: (data: { text: string }) => Promise<void>;
    copy?: (text: string) => Promise<void>;
}

// "cancelled" means the player dismissed the native sheet: an explicit "no",
// so it must NOT quietly fall through to a clipboard write they did not ask
// for, and the caller should show no confirmation.
export type ShareOutcome = "shared" | "copied" | "cancelled";

function platformTargets(): ShareTargets {
    if (typeof navigator === "undefined") return {};

    return {
        share: navigator.share ? (data) => navigator.share(data) : undefined,
        copy: navigator.clipboard
            ? (text) => navigator.clipboard.writeText(text)
            : undefined,
    };
}

function isCancellation(error: unknown): boolean {
    return (error as { name?: string } | null)?.name === "AbortError";
}

export async function shareResult(
    text: string,
    targets: ShareTargets = platformTargets()
): Promise<ShareOutcome> {
    if (targets.share) {
        try {
            await targets.share({ text });
            return "shared";
        } catch (error) {
            if (isCancellation(error)) return "cancelled";
            // Any other failure (no permission, unsupported payload, an
            // insecure context) is a platform problem rather than a player
            // decision, so the clipboard still gets its turn.
            console.warn(
                "Native share failed, falling back to clipboard",
                error
            );
        }
    }

    if (!targets.copy) {
        throw new Error("No share or clipboard support available");
    }

    await targets.copy(text);
    return "copied";
}
