const fs = require("fs");
const path = require("path");

class HtmlPartialsPlugin {
    constructor(options) {
        this.options = options || {};
    }

    apply(compiler) {
        compiler.hooks.compilation.tap("HtmlPartialsPlugin", (compilation) => {
            const HtmlWebpackPlugin = compiler.webpack
                ? require("html-webpack-plugin")
                : require("html-webpack-plugin/lib/webpack4");

            const hooks = HtmlWebpackPlugin.getHooks(compilation);

            hooks.beforeEmit.tapAsync(
                "HtmlPartialsPlugin",
                (data, callback) => {
                    const basePath =
                        data.plugin.options.basePath ||
                        this.options.basePath ||
                        "/";

                    // Read partials
                    const headerPath = path.join(__dirname, "src/_header.html");
                    const footerPath = path.join(__dirname, "src/_footer.html");

                    let header = fs.existsSync(headerPath)
                        ? fs.readFileSync(headerPath, "utf8")
                        : "";
                    let footer = fs.existsSync(footerPath)
                        ? fs.readFileSync(footerPath, "utf8")
                        : "";

                    // Replace basePath placeholder
                    header = header.replace(/<%=\s*basePath\s*%>/g, basePath);
                    footer = footer.replace(/<%=\s*basePath\s*%>/g, basePath);

                    // Inject partials
                    data.html = data.html
                        .replace('<div id="header"></div>', header)
                        .replace('<div id="footer"></div>', footer);

                    callback(null, data);
                }
            );
        });
    }
}

module.exports = HtmlPartialsPlugin;
