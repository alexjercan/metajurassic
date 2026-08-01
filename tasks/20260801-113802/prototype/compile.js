// Compile src/style.css through the project's real postcss config and print the
// result, so a split can be diffed against an unsplit baseline without the
// style-loader JS wrapper in the way.
// Usage: nix develop --command node tasks/20260801-113802/prototype/compile.js > out.css
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");
const config = require(path.resolve("postcss.config.js"));

const plugins = Object.entries(config.plugins).map(([name, opts]) =>
    require(name)(opts),
);
const from = path.resolve("src/style.css");

postcss(plugins)
    .process(fs.readFileSync(from, "utf8"), { from })
    .then((r) => process.stdout.write(r.css))
    .catch((e) => {
        console.error(e.message);
        process.exit(1);
    });
