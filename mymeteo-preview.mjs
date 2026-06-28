import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const previewHost = "127.0.0.1";
const projectRoot = fileURLToPath(new URL("./", import.meta.url));
const knmiProxyUrl = "https://mymeteo.nl/api/knmi-wms.php";
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
]);

const previewServer = await startPreviewServer();
const previewPort = previewServer.address().port;
const appUrl = `http://${previewHost}:${previewPort}/`;

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

async function startPreviewServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", `http://${previewHost}`);

      if (requestUrl.pathname === "/api/knmi-wms.php") {
        await proxyKnmiWmsRequest(requestUrl, response);
        return;
      }

      await serveStaticFile(requestUrl, response);
    } catch (error) {
      console.error("Preview server error:", error);
      sendPlainResponse(response, 500, "Preview server error");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, previewHost, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return server;
}

async function proxyKnmiWmsRequest(requestUrl, response) {
  const upstreamUrl = new URL(knmiProxyUrl);
  upstreamUrl.search = requestUrl.search;

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      accept: "*/*",
      "user-agent": "MyMeteo local preview",
    },
  });
  const body = Buffer.from(await upstreamResponse.arrayBuffer());

  response.writeHead(upstreamResponse.status, {
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
    "content-type": upstreamResponse.headers.get("content-type") || "application/octet-stream",
  });
  response.end(body);
}

async function serveStaticFile(requestUrl, response) {
  const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
  const filePath = resolve(projectRoot, `.${pathname}`);

  if (!filePath.startsWith(projectRoot)) {
    sendPlainResponse(response, 403, "Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream",
    });
    response.end(body);
  } catch {
    sendPlainResponse(response, 404, "Not found");
  }
}

function sendPlainResponse(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
  });
  response.end(body);
}

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
    previewServer.close();
    clearTimeout(forceExit);
    process.exit(0);
  }
}

process.on("SIGINT", closePreview);
process.on("SIGTERM", closePreview);

const context = await browser.newContext({
  viewport: null,
});

async function keepPreviewTitle(page, tabTitle) {
  await page.addInitScript((desiredTitle) => {
    let isApplyingTitle = false;
    let titleObserver;

    function applyPreviewTitle() {
      if (isApplyingTitle) {
        return;
      }

      if (document.title !== desiredTitle) {
        isApplyingTitle = true;
        document.title = desiredTitle;
        isApplyingTitle = false;
      }
    }

    function observeTitleChanges() {
      const title = document.querySelector("title");

      if (title && !titleObserver) {
        titleObserver = new MutationObserver(applyPreviewTitle);
        titleObserver.observe(title, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      }
    }

    applyPreviewTitle();
    observeTitleChanges();
    window.addEventListener("DOMContentLoaded", () => {
      applyPreviewTitle();
      observeTitleChanges();
    });
    window.addEventListener("load", applyPreviewTitle);
  }, tabTitle);
}

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
  const tabTitle = `${viewport.name}: ${viewport.width}x${viewport.height} px`;

  await keepPreviewTitle(page, tabTitle);
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await page.goto(appUrl);
  await page.evaluate(
    (title) => {
      if (document.title !== title) {
        document.title = title;
      }
    },
    tabTitle,
  );
}

console.log(
  `Opened MyMeteo preview tabs in a ${windowSize.width}x${windowSize.height} Chrome window.`,
);
console.log(`Local preview server: ${appUrl}`);
console.log(`KNMI proxy route: ${appUrl}api/knmi-wms.php -> ${knmiProxyUrl}`);
console.log(`Chrome page area before viewport emulation: ${pageArea.width}x${pageArea.height}.`);
console.log(`Largest requested viewport: ${largestViewport.width}x${largestViewport.height}.`);
console.log("Close the browser or press Ctrl+C to stop.");
