import * as d3 from "d3";

export interface TreeNode {
    name: string;
    isTarget?: boolean;
    isGuess?: boolean;
    children?: TreeNode[];
}

export interface TreeVisualizerOptions {
    containerId: string;
    width?: number;
    height?: number;
    nodeRadius?: number;
    animationDuration?: number;
}

export class TreeVisualizer {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private g: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    private tree: d3.TreeLayout<TreeNode>;
    private width: number;
    private height: number;
    private nodeRadius: number;
    private animationDuration: number;
    private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;

    constructor(options: TreeVisualizerOptions) {
        this.width = options.width || 600;
        this.height = options.height || 400;
        this.nodeRadius = options.nodeRadius || 28;
        this.animationDuration = options.animationDuration || 300;

        // Create SVG with responsive sizing
        this.svg = d3
            .select(`#${options.containerId}`)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, this.width, this.height].join(","))
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("background", "transparent")
            .style("font-family", "'DM Sans', sans-serif");

        // Create zoom behavior for interactivity
        this.zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
            this.g.attr("transform", event.transform);
        });

        this.svg.call(this.zoom);

        // Create main group
        this.g = this.svg.append("g");

        // Create tree layout
        this.tree = d3.tree<TreeNode>().size([this.width - 80, this.height - 80]);
    }

    render(data: TreeNode): void {
        // Generate hierarchy
        const root = d3.hierarchy(data);

        // Calculate positions
        this.tree(root);

        // Clear previous content
        this.g.selectAll("*").remove();

        // Offset to center
        const offsetX = 40;
        const offsetY = 40;

        // Draw links (branches)
        this.g
            .selectAll(".link")
            .data(root.links())
            .join("line")
            .attr("class", "link")
            .attr("x1", (d) => d.source.x + offsetX)
            .attr("y1", (d) => d.source.y + offsetY)
            .attr("x2", (d) => d.target.x + offsetX)
            .attr("y2", (d) => d.target.y + offsetY)
            .attr("stroke", "rgba(0, 0, 0, 0.25)")
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round");

        // Draw nodes
        const nodes = this.g
            .selectAll(".node")
            .data(root.descendants())
            .join("g")
            .attr("class", "node")
            .attr("transform", (d) => `translate(${d.x + offsetX},${d.y + offsetY})`);

        // Add rectangles instead of circles
        nodes
            .append("rect")
            .attr("width", (d) => this.getNodeWidth(d.data))
            .attr("height", 40)
            .attr("x", (d) => -this.getNodeWidth(d.data) / 2)
            .attr("y", -20)
            .attr("fill", (d) => this.getNodeColor(d.data))
            .attr("stroke", (d) => this.getNodeStroke(d.data))
            .attr("stroke-width", (d) => (this.isSpecial(d.data) ? 3 : 2))
            .attr("rx", 6)
            .attr("ry", 6)
            .style("cursor", "pointer");

        // Add text labels
        nodes
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.3em")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", (d) => this.getTextColor(d.data))
            .style("pointer-events", "none")
            .text((d) => this.formatLabel(d.data.name))
            .each(function (d) {
                // Split long text into multiple lines
                const text = d3.select(this);
                const words = d.data.name.split(" ");
                if (words.length > 1 && d.data.name !== "???") {
                    text.text("");
                    words.forEach((word, i) => {
                        text
                            .append("tspan")
                            .attr("x", 0)
                            .attr("dy", i > 0 ? "1.1em" : 0)
                            .attr("font-size", "10px")
                            .text(word);
                    });
                }
            });

        // Add tooltips
        nodes.append("title").text((d) => d.data.name);

        // Auto-fit zoom
        this.resetZoom();
    }

    update(data: TreeNode): void {
        this.render(data);
    }

    private getNodeColor(node: TreeNode): string {
        if (node.isTarget) {
            return "#22c55e"; // Green for target
        }
        if (node.isGuess) {
            return "white"; // White background for guesses
        }
        return "#d4a574"; // Brown/tan for clades
    }

    private getNodeStroke(node: TreeNode): string {
        if (node.isTarget) {
            return "#16a34a"; // Darker green
        }
        if (node.isGuess) {
            return "#000000"; // Black outline for guesses
        }
        return "#8b6f47"; // Darker brown for clades
    }

    private getTextColor(node: TreeNode): string {
        if (node.isGuess) {
            return "#000000"; // Black text for white background
        }
        return "white"; // White text for colored backgrounds
    }

    private isSpecial(node: TreeNode): boolean {
        return !!(node.isTarget || node.isGuess);
    }

    private getNodeWidth(node: TreeNode): number {
        // Estimate width based on text length
        const baseWidth = 60;
        const charWidth = 6;
        return Math.max(baseWidth, node.name.length * charWidth);
    }

    private formatLabel(name: string): string {
        // Don't shorten the ??? or short names
        if (name.length <= 3) {
            return name;
        }
        if (name.length > 20) {
            return name.substring(0, 17) + "...";
        }
        return name;
    }

    private resetZoom(): void {
        const bounds = (this.g.node() as SVGGElement).getBBox();
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        const midX = bounds.x + fullWidth / 2;
        const midY = bounds.y + fullHeight / 2;

        if (fullWidth === 0 || fullHeight === 0) {
            return;
        }

        const scale = 0.75 / Math.max(fullWidth / this.width, fullHeight / this.height);
        const translate = [
            this.width / 2 - scale * midX,
            this.height / 2 - scale * midY,
        ];

        this.svg
            .transition()
            .duration(this.animationDuration)
            .call(
                this.zoom.transform as any,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
    }
}
