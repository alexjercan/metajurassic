const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const config = {
    entry: {
        index: "./src/index.ts",
        practice: "./src/practice.ts",
        faq: "./src/faq.ts",
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        assetModuleFilename: "assets/[name][ext]",
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/index.html",
            chunks: ["index"],
        }),
        new HtmlWebpackPlugin({
            template: "src/index.html",
            filename: "practice/index.html",
            chunks: ["practice"],
        }),
        new HtmlWebpackPlugin({
            template: "src/faq.html",
            filename: "faq/index.html",
            chunks: ["faq"],
        }),
        new CopyPlugin({
            patterns: [{ from: "src/jurassic", to: "jurassic" }],
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
        ],
    },
    mode: "development",
    devServer: {
        static: path.join(__dirname, "dist"),
        port: 8080,
        historyApiFallback: {
            rewrites: [
                { from: /^\/practice/, to: "/practice/index.html" },
                { from: /^\/faq/, to: "/faq/index.html" },
            ],
        },
    },
    experiments: {
        asyncWebAssembly: true,
    },
};

module.exports = config;
