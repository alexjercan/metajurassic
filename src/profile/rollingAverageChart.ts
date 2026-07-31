import { calculateRollingAverage } from "../rollingAverage";

export function renderRollingAverage(
    dataPoints: ReturnType<typeof calculateRollingAverage>,
    containerId: string
) {
    const container = document.getElementById(containerId);

    if (dataPoints.length === 0) {
        container.innerHTML =
            '<p class="profile-no-data">Play some practice games to see your weekly progress!</p>';
        return;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("profile-graph-svg");

    const width = 600;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 50, left: 60 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const values = dataPoints.map((d) => d.value);
    const minValue = Math.floor(Math.min(...values) - 0.5);
    const maxValue = Math.ceil(Math.max(...values) + 0.5);

    const times = dataPoints.map((d) => d.time.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime;

    const xScale = (time: Date) =>
        timeRange > 0
            ? padding.left +
              ((time.getTime() - minTime) / timeRange) * graphWidth
            : padding.left + graphWidth / 2;
    const yScale = (value: number) =>
        padding.top +
        graphHeight -
        ((value - minValue) / (maxValue - minValue)) * graphHeight;

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

        circle.addEventListener("mouseenter", (e) => {
            showTooltip(e, point, container);
        });
        circle.addEventListener("mouseleave", () => {
            hideTooltip(container);
        });

        pointsGroup.appendChild(circle);
    });
    svg.appendChild(pointsGroup);

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

    const tooltip = document.createElement("div");
    tooltip.classList.add("profile-graph-tooltip");
    container.appendChild(tooltip);
}

function showTooltip(
    event: MouseEvent,
    point: ReturnType<typeof calculateRollingAverage>[number],
    container: HTMLElement
) {
    const tooltip = container.querySelector(".profile-graph-tooltip");
    if (!(tooltip instanceof HTMLElement)) return;

    const dateStr = formatDateShort(point.time);

    tooltip.innerHTML = `
        <div class="profile-graph-tooltip-date">${dateStr}</div>
        <div class="profile-graph-tooltip-value">Avg: ${point.value.toFixed(1)}</div>
        <div class="profile-graph-tooltip-value">Games: ${point.gamesCount}</div>
    `;

    const rect = container.getBoundingClientRect();
    const tooltipWidth = 100; // Approximate tooltip width
    const tooltipHeight = 70; // Approximate tooltip height

    let left = event.clientX - rect.left + 10;
    let top = event.clientY - rect.top - 10;

    if (left + tooltipWidth > rect.width) {
        left = event.clientX - rect.left - tooltipWidth - 10;
    }

    if (top + tooltipHeight > rect.height) {
        top = event.clientY - rect.top - tooltipHeight - 10;
    }

    if (top < 0) {
        top = event.clientY - rect.top + 10;
    }

    if (left < 0) {
        left = event.clientX - rect.left + 10;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add("visible");
}

function hideTooltip(container: HTMLElement) {
    const tooltip = container.querySelector(".profile-graph-tooltip");
    if (!(tooltip instanceof HTMLElement)) return;
    tooltip.classList.remove("visible");
}

function formatDateShort(date: Date): string {
    const month = date.toLocaleString("en", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
}
