/**
 * Progressively shrink the font-size of an element until its text
 * fits within its parent's width, down to a minimum size.
 */
export function autoShrinkText(
    el: HTMLElement,
    maxFontSize: number = 1.8,
    minFontSize: number = 0.9,
    step: number = 0.1
) {
    const parent = el.parentElement;
    if (!parent) return;

    el.style.fontSize = `${maxFontSize}rem`;

    let size = maxFontSize;
    while (el.scrollWidth > parent.clientWidth && size > minFontSize) {
        size = Math.round((size - step) * 100) / 100;
        el.style.fontSize = `${size}rem`;
    }
}
