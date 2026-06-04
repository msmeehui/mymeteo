import { chromium } from "playwright";

const appUrl = new URL("./index.html", import.meta.url).href;

const viewports = [
  { name: "iPhone 5/SE", width: 320, height: 568 },
  { name: "iPhone 6/7/8", width: 375, height: 667 },
  { name: "iPhone 17", width: 402, height: 874 },
  { name: "Widest mobile", width: 899, height: 874 },
  { name: "Narrowest desktop", width: 900, height: 776 },  
  { name: "Widest desktop", width: 1220, height: 776 },
];

const largestViewport = viewports.reduce(
  (largest, viewport) => ({
    width: Math.max(largest.width, viewport.width),
    height: Math.max(largest.height, viewport.height),
  }),
  { width: 0, height: 0 },
);

const windowSize = {
  width: 1250,
  height: 1000,
};

const windowPosition = {
  left: 80,
  top: 40,
};

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  devtools: true,
  args: [
    `--window-size=${windowSize.width},${windowSize.height}`,
    `--window-position=${windowPosition.left},${windowPosition.top}`,
  ],
});

let isClosing = false;

async function closePreview() {
  if (isClosing) {
    process.exit(0);
    return;
  }

  isClosing = true;
  console.log("\nClosing MyMeteo preview...");

  const forceExit = setTimeout(() => {
    process.exit(0);
  }, 1500);

  try {
    await browser.close();
  } catch {
    // The process is already closing, so there is nothing useful to report here.
  } finally {
    clearTimeout(forceExit);
    process.exit(0);
  }
}

process.on("SIGINT", closePreview);
process.on("SIGTERM", closePreview);

const context = await browser.newContext({
  viewport: null,
});

const firstPage = await context.newPage();
const cdpSession = await context.newCDPSession(firstPage);
const { windowId } = await cdpSession.send("Browser.getWindowForTarget");
await cdpSession.send("Browser.setWindowBounds", {
  windowId,
  bounds: {
    left: windowPosition.left,
    top: windowPosition.top,
    width: windowSize.width,
    height: windowSize.height,
    windowState: "normal",
  },
});
await firstPage.waitForTimeout(300);

const pageArea = await firstPage.evaluate(() => ({
  width: window.innerWidth,
  height: window.innerHeight,
}));

for (const [index, viewport] of viewports.entries()) {
  const page = index === 0 ? firstPage : await context.newPage();
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await page.goto(appUrl);
  await page.evaluate(
    (name) => {
      document.title = `${name} - ${document.title}`;
    },
    viewport.name,
  );
}

console.log(
  `Opened MyMeteo preview tabs in a ${windowSize.width}x${windowSize.height} Chrome window.`,
);
console.log(`Chrome page area before viewport emulation: ${pageArea.width}x${pageArea.height}.`);
console.log(`Largest requested viewport: ${largestViewport.width}x${largestViewport.height}.`);
console.log("Close the browser or press Ctrl+C to stop.");
