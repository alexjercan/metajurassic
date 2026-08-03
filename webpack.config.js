const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlPartialsPlugin = require("./webpack-partials");
const CopyPlugin = require("copy-webpack-plugin");
const getPort = require("get-port");

// PUBLIC_PATH should be "/" for local dev (default) or "/metajurassic/" for GitHub Pages.
const publicPath = process.env.PUBLIC_PATH || "/";

// Canonical production origin for the absolute social URLs in src/_head.html.
// Deliberately NOT publicPath: og:url and og:image are resolved by a crawler
// that never sees this build's host, so they must be absolute and must point at
// production even in a dev build. Duplicated by SHARE_URL in src/shareText.ts
// and SITE_URL in e2e/social.spec.ts - keep the three in sync by hand; the
// runtime bundle importing build config would be the worse coupling. See
// tasks/20260729-101751/DECISION.md.
const SITE_URL = "https://alexjercan.github.io/metajurassic";

// Per-page social/SEO copy. Each entry feeds one HtmlWebpackPlugin instance;
// pagePath is the trailing-slash path the page is served under and is what
// og:url and the canonical link are built from.
const PAGES = {
    index: {
        pagePath: "",
        pageTitle: "Metajurassic - the daily dinosaur guessing game",
        pageDescription:
            "Guess today's dinosaur. Every guess reveals how close you are on the evolutionary tree.",
    },
    practice: {
        pagePath: "practice/",
        pageTitle: "Metajurassic Practice - unlimited dinosaur rounds",
        pageDescription:
            "Play Metajurassic as often as you like. Seeded practice rounds are reproducible, so you can share the exact puzzle you played.",
    },
    faq: {
        pagePath: "faq/",
        pageTitle: "Metajurassic FAQ - how the game works",
        pageDescription:
            "How guesses, closeness, hints and the daily puzzle work in Metajurassic.",
    },
    species: {
        pagePath: "species/",
        pageTitle: "Metajurassic Species Archive",
        pageDescription:
            "Browse every dinosaur in Metajurassic, with its lineage and where it sits on the evolutionary tree.",
    },
    clades: {
        pagePath: "clades/",
        pageTitle: "Metajurassic Clades Archive",
        pageDescription:
            "Browse the clades of the Metajurassic tree, from the broad branches down to the individual species.",
    },
    profile: {
        pagePath: "profile/",
        pageTitle: "Metajurassic Profile - your streak and stats",
        pageDescription:
            "Your Metajurassic streak, win rate, rank and guess history, kept in this browser.",
    },
};

module.exports = async () => {
    // Get a random port in 7XXX for the UI app; useful when having multiple things running in dev.
    try {
        process.env.METAJURASSIC_PORT = await getPort.default({
            port: getPort.portNumbers(7000, 7999),
        });
    } catch (e) {
        console.error("Failed to get a random port for the UI app:", e);
    }

    const port = process.env.METAJURASSIC_PORT || 7000;

    return {
        entry: {
            index: "./src/index.ts",
            practice: "./src/practice.ts",
            faq: "./src/faq.ts",
            species: "./src/species.ts",
            clades: "./src/clades.ts",
            profile: "./src/profile/index.ts",
        },
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].js",
            assetModuleFilename: "assets/[name][ext]",
            clean: true,
            publicPath: publicPath,
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "src/index.html",
                chunks: ["index"],
                basePath: publicPath,
                ...PAGES.index,
            }),
            new HtmlWebpackPlugin({
                template: "src/index.html",
                filename: "practice/index.html",
                chunks: ["practice"],
                basePath: publicPath,
                ...PAGES.practice,
            }),
            new HtmlWebpackPlugin({
                template: "src/faq.html",
                filename: "faq/index.html",
                chunks: ["faq"],
                basePath: publicPath,
                ...PAGES.faq,
            }),
            new HtmlWebpackPlugin({
                template: "src/species.html",
                filename: "species/index.html",
                chunks: ["species"],
                basePath: publicPath,
                ...PAGES.species,
            }),
            new HtmlWebpackPlugin({
                template: "src/clades.html",
                filename: "clades/index.html",
                chunks: ["clades"],
                basePath: publicPath,
                ...PAGES.clades,
            }),
            new HtmlWebpackPlugin({
                template: "src/profile.html",
                filename: "profile/index.html",
                chunks: ["profile"],
                basePath: publicPath,
                ...PAGES.profile,
            }),
            new CopyPlugin({
                patterns: [{ from: "src/jurassic", to: "jurassic" }],
            }),
            new CopyPlugin({
                patterns: [{ from: "src/favicon.svg", to: "favicon.svg" }],
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: "src/assets/profile.svg",
                        to: "assets/profile.svg",
                    },
                ],
            }),
            // A CopyPlugin entry, not the asset-module rule: the og:image URL is
            // absolute and baked into the HTML, so the filename must stay
            // hash-free.
            new CopyPlugin({
                patterns: [
                    {
                        from: "src/assets/og-image.png",
                        to: "assets/og-image.png",
                    },
                ],
            }),
            new HtmlPartialsPlugin({
                basePath: publicPath,
                siteUrl: SITE_URL,
            }),
        ],
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".wasm"],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: ["style-loader", "css-loader", "postcss-loader"],
                },
                {
                    test: /\.(md|json)$/i,
                    type: "asset/resource",
                    generator: {
                        filename: "content/[name][ext]",
                    },
                },
                {
                    test: /\.svg$/i,
                    type: "asset/resource",
                    generator: {
                        filename: "assets/[name][contenthash][ext]",
                    },
                },
            ],
        },
        mode: "development",
        devServer: {
            static: path.join(__dirname, "dist"),
            port: port,
            historyApiFallback: {
                rewrites: [
                    { from: /^\/practice/, to: "/practice/index.html" },
                    { from: /^\/faq/, to: "/faq/index.html" },
                    { from: /^\/species/, to: "/species/index.html" },
                    { from: /^\/clades/, to: "/clades/index.html" },
                    { from: /^\/profile/, to: "/profile/index.html" },
                ],
            },
        },
        experiments: {
            asyncWebAssembly: true,
        },
    };
};
