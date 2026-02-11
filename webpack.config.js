const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const config = {
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js",
        assetModuleFilename: "assets/[name][ext]",
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/index.html",
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
              use: [
                "style-loader",
                "css-loader",
                "postcss-loader",
              ],
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
    },
    experiments: {
        asyncWebAssembly: true,
    },
};

module.exports = config;
