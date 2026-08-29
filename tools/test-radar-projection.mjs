import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");
const proxySource = readFileSync(path.join(projectRoot, "api", "knmi-wms.php"), "utf8");

function createStubElement(selector = "element") {
  return {
    selector,
    children: [],
    className: "",
    dataset: {},
    hidden: false,
    innerHTML: "",
    textContent: "",
    title: "",
    value: "0",
    classList: {
      add() {},
      contains() {
        return false;
      },
      remove() {},
      toggle() {},
    },
    style: {
      removeProperty() {},
      setProperty() {},
    },
    addEventListener() {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    close() {},
    contains() {
      return false;
    },
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 };
    },
    prepend(child) {
      this.children.unshift(child);
      return child;
    },
    querySelector(childSelector) {
      return createStubElement(`${selector} ${childSelector}`);
    },
    querySelectorAll() {
      return [];
    },
    removeAttribute() {},
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute() {},
    showModal() {},
  };
}

class ImageStub {
  constructor() {
    this.decoding = "";
    this.src = "";
  }
}

function loadRadarProjectionRules() {
  const elementCache = new Map();

  function getStubElement(selector) {
    if (!elementCache.has(selector)) {
      elementCache.set(selector, createStubElement(selector));
    }

    return elementCache.get(selector);
  }

  const localStorageStub = {
    getItem() {
      return null;
    },
    setItem() {},
  };

  const documentStub = {
    activeElement: null,
    visibilityState: "visible",
    addEventListener() {},
    createElement: createStubElement,
    createTextNode(text) {
      return { textContent: text };
    },
    querySelector: getStubElement,
    querySelectorAll() {
      return [];
    },
  };

  const windowStub = {
    addEventListener() {},
    clearInterval() {},
    clearTimeout() {},
    dataLayer: [],
    gtag: undefined,
    localStorage: localStorageStub,
    location: {
      hostname: "mymeteo.test",
      origin: "https://mymeteo.test",
      search: "",
    },
    matchMedia() {
      return {
        addEventListener() {},
        matches: false,
        removeEventListener() {},
      };
    },
    setInterval() {
      return 1;
    },
    setTimeout() {
      return 1;
    },
  };

  const context = {
    Image: ImageStub,
    ResizeObserver: undefined,
    URLSearchParams,
    console,
    document: documentStub,
    navigator: {},
    window: windowStub,
  };

  windowStub.document = documentStub;
  windowStub.navigator = context.navigator;

  vm.createContext(context);
  vm.runInContext(
    `${appSource}
globalThis.__mymeteoRadarProjectionTest = {
  bounds: buienradarBounds,
  height: knmiRadarConfig.height,
  width: knmiRadarConfig.width,
  buildKnmiRadarImageUrl(timeMs, referenceTimeMs) {
    return buildKnmiRadarImageUrl(new Date(timeMs), new Date(referenceTimeMs));
  },
  buildKnmiPointRainUrl(location, timeMs, referenceTimeMs) {
    return buildKnmiPointRainUrl(location, new Date(timeMs), new Date(referenceTimeMs));
  },
  getKnmiFrameRainSample,
  getWebMercatorRadarPixelForLocation,
  getWmsEpsg3857Bbox,
};`,
    context,
    { filename: "app.js" },
  );

  return context.__mymeteoRadarProjectionTest;
}

function assertApproximatelyEqual(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`,
  );
}

function createSyntheticKnmiContext(rainPixel) {
  return {
    getImageData(left, top, width, height) {
      const data = new Uint8ClampedArray(width * height * 4);

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const absoluteX = left + x;
          const absoluteY = top + y;
          if (Math.hypot(absoluteX - rainPixel.x, absoluteY - rainPixel.y) > 1) {
            continue;
          }

          const offset = (y * width + x) * 4;
          data[offset] = 20;
          data[offset + 1] = 90;
          data[offset + 2] = 240;
          data[offset + 3] = 255;
        }
      }

      return { data };
    },
  };
}

const rules = loadRadarProjectionRules();
const width = rules.width;
const height = rules.height;
const frameTime = Date.UTC(2026, 7, 29, 6, 35);
const referenceTime = Date.UTC(2026, 7, 29, 6, 30);

const imageUrl = new URL(rules.buildKnmiRadarImageUrl(frameTime, referenceTime));
assert.equal(imageUrl.searchParams.get("REQUEST"), "GetMap");
assert.equal(imageUrl.searchParams.get("CRS"), "EPSG:3857");
assert.equal(imageUrl.searchParams.get("WIDTH"), String(width));
assert.equal(imageUrl.searchParams.get("HEIGHT"), String(height));

const projectedBbox = imageUrl.searchParams.get("BBOX").split(",").map(Number);
const expectedBbox = [
  0,
  6261721.357121636,
  1252344.2714243275,
  7514065.628545966,
];
projectedBbox.forEach((coordinate, index) => {
  assertApproximatelyEqual(coordinate, expectedBbox[index], 0.000001, `BBOX coordinate ${index}`);
});
assertApproximatelyEqual(
  projectedBbox[2] - projectedBbox[0],
  projectedBbox[3] - projectedBbox[1],
  0.000001,
  "the shared Netherlands radar bounds stay square in Web Mercator",
);
assert.equal(
  rules.getWmsEpsg3857Bbox(JSON.parse(JSON.stringify(rules.bounds))),
  imageUrl.searchParams.get("BBOX"),
  "the map request and client-side pixel mapping use the same projected bounds",
);

const pointUrl = new URL(rules.buildKnmiPointRainUrl(
  { lat: 52.3676, lon: 4.9041 },
  frameTime,
  referenceTime,
));
assert.equal(
  pointUrl.searchParams.get("CRS"),
  "EPSG:4326",
  "the centred GetFeatureInfo query keeps its latitude/longitude CRS",
);
assert.match(
  proxySource,
  /\$crs !== 'EPSG:4326' && \$crs !== 'EPSG:3857'/,
  "the proxy must allow Web Mercator for KNMI map images",
);
assert.match(
  proxySource,
  /\$crs === 'EPSG:3857'\s*\? mymeteo_web_mercator_bbox_param\(\$params\)/,
  "the proxy must validate projected map bounds with the Web Mercator allowlist",
);
assert.match(
  proxySource,
  /if \(\$crs !== 'EPSG:4326'\) \{\s*throw new InvalidArgumentException\('Unsupported KNMI CRS'\);\s*\}\s*\$bbox = mymeteo_bbox_param\(\$params\);/,
  "GetFeatureInfo must remain restricted to EPSG:4326",
);

const cityFixtures = [
  {
    name: "Amsterdam",
    location: { lat: 52.3676, lon: 4.9041 },
    markerPixel: { x: 305.144, y: 395.3440510072108 },
    north15KmPixel: { x: 305.144, y: 380.3146844432074 },
  },
  {
    name: "Maastricht",
    location: { lat: 50.8514, lon: 5.69097 },
    markerPixel: { x: 354.1048, y: 561.3846866186431 },
    north15KmPixel: { x: 354.1048, y: 546.8502449495883 },
  },
  {
    name: "Groningen",
    location: { lat: 53.2194, lon: 6.5665 },
    markerPixel: { x: 408.58222222222224, y: 299.55143867953353 },
    north15KmPixel: { x: 408.58222222222224, y: 284.22412348266573 },
  },
];

for (const fixture of cityFixtures) {
  const mappedPixel = rules.getWebMercatorRadarPixelForLocation(fixture.location, width, height);
  assert.ok(mappedPixel, `${fixture.name} must be inside the Netherlands radar bounds`);
  assertApproximatelyEqual(mappedPixel.x, fixture.markerPixel.x, 0.000001, `${fixture.name} x pixel`);
  assertApproximatelyEqual(mappedPixel.y, fixture.markerPixel.y, 0.000001, `${fixture.name} y pixel`);

  const alignedSample = rules.getKnmiFrameRainSample(
    createSyntheticKnmiContext(fixture.markerPixel),
    width,
    height,
    fixture.location,
  );
  assert.ok(alignedSample.exactSignal > 0, `${fixture.name} rain over the marker must sample as wet`);

  const displacedSample = rules.getKnmiFrameRainSample(
    createSyntheticKnmiContext(fixture.north15KmPixel),
    width,
    height,
    fixture.location,
  );
  assert.equal(displacedSample.exactSignal, 0, `${fixture.name} rain 15 km north must not count as exact rain`);
  assert.equal(displacedSample.nearbySignal, 0, `${fixture.name} rain 15 km north must stay outside nearby context`);
}

console.log(`Radar projection tests passed for ${cityFixtures.length} locations.`);
