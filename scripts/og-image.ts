// Render the social preview card.
//
// Turns src/assets/og-image.html into the committed src/assets/og-image.png at
// exactly the 1200x630 the og:image:width / og:image:height tags in
// src/_head.html promise. The PNG is committed because CI builds must not need
// a browser; this script is the reproducible source of that binary, and lives
// outside e2e/ for the same reason scripts/playtest/ does - it asserts nothing.
//
// Run after editing the card:
//   npm run og:image
//
// The output is repository content, not evidence: commit the regenerated PNG.

import * as path from "path";
import { chromium } from "@playwright/test";

const WIDTH = 1200;
const HEIGHT = 630;

const SOURCE = path.resolve(__dirname, "..", "src", "assets", "og-image.html");
const OUTPUT = path.resolve(__dirname, "..", "src", "assets", "og-image.png");

async function main(): Promise<void> {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({
            viewport: { width: WIDTH, height: HEIGHT },
            // 1x: the card is authored at its final pixel size, and doubling it
            // would contradict the og:image:width tag.
            deviceScaleFactor: 1,
        });
        await page.goto(`file://${SOURCE}`);
        await page.screenshot({ path: OUTPUT });
        console.log(`Wrote ${OUTPUT} (${WIDTH}x${HEIGHT})`);
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
