/**
 * Progressively shrink the font-size of an element until its text
 * fits within the available width in its parent, accounting for
 * sibling elements and flex gap.
 */
export function autoShrinkText(
    el: HTMLElement,
    maxFontSize: number = 1.8,
    minFontSize: number = 0.9,
    step: number = 0.1
) {
    const parent = el.parentElement;
    if (!parent) return;

    const parentStyle = getComputedStyle(parent);
    const gap = parseFloat(parentStyle.gap) || 0;
    const paddingLeft = parseFloat(parentStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(parentStyle.paddingRight) || 0;

    let siblingsWidth = 0;
    for (const child of Array.from(parent.children)) {
        if (child === el) continue;
        siblingsWidth += (child as HTMLElement).offsetWidth + gap;
    }

    const availableWidth = parent.clientWidth - siblingsWidth - paddingLeft - paddingRight;

    el.style.fontSize = `${maxFontSize}rem`;

    let size = maxFontSize;
    while (el.scrollWidth > availableWidth && size > minFontSize) {
        size = Math.round((size - step) * 100) / 100;
        el.style.fontSize = `${size}rem`;
    }
}
