const fs = require("fs");
const path = require("path");

// Substitute `<%= key %>` for every entry in `vars`. Partials are injected at
// html-webpack-plugin's `beforeEmit`, i.e. AFTER its own EJS pass, so they
// cannot use `htmlWebpackPlugin.options.X`; this is the substitution mechanism
// they get instead.
function fill(template, vars) {
    return Object.entries(vars).reduce(
        (out, [key, value]) =>
            // Function replacement, so a `$` in prose copy is not read as a
            // replacement pattern.
            out.replace(new RegExp(`<%=\\s*${key}\\s*%>`, "g"), () => value),
        template
    );
}

function readPartial(name) {
    const file = path.join(__dirname, "src", name);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

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
                    // Per-page options live on the HtmlWebpackPlugin instance;
                    // basePath falls back to the plugin-wide default.
                    const page = data.plugin.options;
                    const basePath =
                        page.basePath || this.options.basePath || "/";

                    const header = fill(readPartial("_header.html"), {
                        basePath,
                    });
                    const footer = fill(readPartial("_footer.html"), {
                        basePath,
                    });
                    const head = fill(readPartial("_head.html"), {
                        siteUrl: this.options.siteUrl || "",
                        pagePath: page.pagePath || "",
                        pageTitle: page.pageTitle || "",
                        pageDescription: page.pageDescription || "",
                    });

                    // Function replacements here too: a string replacement
                    // would expand `$&`/`` $` ``/`$'` inside the partial
                    // against the marker match, undoing the guard in `fill`.
                    data.html = data.html
                        .replace("<!-- social-head -->", () => head)
                        .replace('<div id="header"></div>', () => header)
                        .replace('<div id="footer"></div>', () => footer);

                    callback(null, data);
                }
            );
        });
    }
}

module.exports = HtmlPartialsPlugin;
