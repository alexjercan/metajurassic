const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlPartialsPlugin = require("./webpack-partials");
const CopyPlugin = require("copy-webpack-plugin");
const getPort = require("get-port");

// PUBLIC_PATH should be "/" for local dev (default) or "/metajurassic/" for GitHub Pages.
const publicPath = process.env.PUBLIC_PATH || "/";

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
            }),
            new HtmlWebpackPlugin({
                template: "src/index.html",
                filename: "practice/index.html",
                chunks: ["practice"],
                basePath: publicPath,
            }),
            new HtmlWebpackPlugin({
                template: "src/faq.html",
                filename: "faq/index.html",
                chunks: ["faq"],
                basePath: publicPath,
            }),
            new HtmlWebpackPlugin({
                template: "src/species.html",
                filename: "species/index.html",
                chunks: ["species"],
                basePath: publicPath,
            }),
            new HtmlWebpackPlugin({
                template: "src/clades.html",
                filename: "clades/index.html",
                chunks: ["clades"],
                basePath: publicPath,
            }),
            new HtmlWebpackPlugin({
                template: "src/profile.html",
                filename: "profile/index.html",
                chunks: ["profile"],
                basePath: publicPath,
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
            new HtmlPartialsPlugin({
                basePath: publicPath,
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
