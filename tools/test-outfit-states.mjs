import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");

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
    hostname: "127.0.0.1",
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

class ImageStub {
  constructor() {
    this.decoding = "";
    this.src = "";
  }
}

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
globalThis.__mymeteoOutfitTest = {
  sceneIds: outfitSceneIds.slice(),
  getSceneId({ previousSceneId, snapshot, precipitation, weatherCode }) {
    activeOutfitSceneId = previousSceneId;
    return getOutfitSceneId(snapshot, precipitation, weatherCode ?? snapshot?.weatherCode);
  },
};`,
  context,
  { filename: "app.js" },
);

const rules = context.__mymeteoOutfitTest;

function weatherSnapshot({ temperature = 16, windSpeed = 8, weatherCode = 0 } = {}) {
  return {
    isDaytime: true,
    temperature,
    weatherCode,
    windSpeed,
  };
}

function precipitation({ chance = 0, intensity = "light", type = "rain" } = {}) {
  return {
    chance,
    intensity,
    type,
  };
}

const cases = [
  {
    name: "defaults to mild cloudy when temperature is unavailable",
    snapshot: weatherSnapshot({ temperature: Number.NaN }),
    expected: "mild-cloudy",
  },
  {
    name: "hot sunny temperature band",
    snapshot: weatherSnapshot({ temperature: 27 }),
    expected: "hot-sunny",
  },
  {
    name: "warm fair temperature band",
    snapshot: weatherSnapshot({ temperature: 22 }),
    expected: "warm-fair",
  },
  {
    name: "mild cloudy temperature band",
    snapshot: weatherSnapshot({ temperature: 16 }),
    expected: "mild-cloudy",
  },
  {
    name: "cool dry temperature band",
    snapshot: weatherSnapshot({ temperature: 10 }),
    expected: "cool-dry",
  },
  {
    name: "cold dry temperature band",
    snapshot: weatherSnapshot({ temperature: 4 }),
    expected: "cold-dry",
  },
  {
    name: "freezing dry temperature band",
    snapshot: weatherSnapshot({ temperature: -2 }),
    expected: "freezing-dry",
  },
  {
    name: "thunderstorm overrides warm dry weather",
    snapshot: weatherSnapshot({ temperature: 24, weatherCode: 95 }),
    expected: "thunderstorm",
  },
  {
    name: "weather-code heavy snow",
    snapshot: weatherSnapshot({ temperature: -1, weatherCode: 75 }),
    expected: "heavy-snow",
  },
  {
    name: "weather-code snow",
    snapshot: weatherSnapshot({ temperature: -1, weatherCode: 71 }),
    expected: "snow",
  },
  {
    name: "weather-code heavy rain",
    snapshot: weatherSnapshot({ temperature: 16, weatherCode: 65 }),
    expected: "heavy-rain",
  },
  {
    name: "warm weather-code heavy rain uses warm heavy rain outfit",
    snapshot: weatherSnapshot({ temperature: 27, weatherCode: 65 }),
    expected: "warm-heavy-rain",
  },
  {
    name: "freezing rain uses heavy-rain protection",
    snapshot: weatherSnapshot({ temperature: -1, weatherCode: 56 }),
    expected: "heavy-rain",
  },
  {
    name: "weather-code rain",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 61 }),
    expected: "rain",
  },
  {
    name: "warm weather-code rain uses warm rain outfit",
    snapshot: weatherSnapshot({ temperature: 27, weatherCode: 61 }),
    expected: "warm-rain",
  },
  {
    name: "weather-code drizzle",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 51 }),
    expected: "drizzle",
  },
  {
    name: "warm heavy drizzle uses warm drizzle outfit",
    snapshot: weatherSnapshot({ temperature: 27, weatherCode: 55 }),
    expected: "warm-drizzle",
  },
  {
    name: "fog overrides temperature",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 45 }),
    expected: "fog",
  },
  {
    name: "wind overrides dry temperature at enter threshold",
    snapshot: weatherSnapshot({ temperature: 22, windSpeed: 39 }),
    expected: "windy",
  },
  {
    name: "rain has priority over wind",
    snapshot: weatherSnapshot({ temperature: 22, windSpeed: 45, weatherCode: 61 }),
    expected: "rain",
  },
  {
    name: "heavy rain by precipitation chance and intensity",
    snapshot: weatherSnapshot({ temperature: 18 }),
    precipitation: precipitation({ chance: 50, intensity: "heavy" }),
    expected: "heavy-rain",
  },
  {
    name: "warm heavy rain by precipitation chance and intensity",
    snapshot: weatherSnapshot({ temperature: 27 }),
    precipitation: precipitation({ chance: 50, intensity: "heavy" }),
    expected: "warm-heavy-rain",
  },
  {
    name: "rain by precipitation chance",
    snapshot: weatherSnapshot({ temperature: 18 }),
    precipitation: precipitation({ chance: 50, intensity: "moderate" }),
    expected: "rain",
  },
  {
    name: "warm rain by precipitation chance",
    snapshot: weatherSnapshot({ temperature: 27 }),
    precipitation: precipitation({ chance: 50, intensity: "moderate" }),
    expected: "warm-rain",
  },
  {
    name: "drizzle by light precipitation chance",
    snapshot: weatherSnapshot({ temperature: 18 }),
    precipitation: precipitation({ chance: 30, intensity: "light" }),
    expected: "drizzle",
  },
  {
    name: "warm drizzle by light precipitation chance",
    snapshot: weatherSnapshot({ temperature: 27 }),
    precipitation: precipitation({ chance: 30, intensity: "light" }),
    expected: "warm-drizzle",
  },
  {
    name: "heavy snow by precipitation chance and intensity",
    snapshot: weatherSnapshot({ temperature: -1 }),
    precipitation: precipitation({ chance: 50, intensity: "heavy", type: "snow" }),
    expected: "heavy-snow",
  },
  {
    name: "snow by precipitation chance",
    snapshot: weatherSnapshot({ temperature: -1 }),
    precipitation: precipitation({ chance: 30, intensity: "light", type: "snow" }),
    expected: "snow",
  },
  {
    name: "mild stays mild one degree below its band",
    previousSceneId: "mild-cloudy",
    snapshot: weatherSnapshot({ temperature: 13 }),
    expected: "mild-cloudy",
  },
  {
    name: "cool stays cool one degree above its band",
    previousSceneId: "cool-dry",
    snapshot: weatherSnapshot({ temperature: 14 }),
    expected: "cool-dry",
  },
  {
    name: "windy stays windy at leave threshold",
    previousSceneId: "windy",
    snapshot: weatherSnapshot({ temperature: 22, windSpeed: 35 }),
    expected: "windy",
  },
  {
    name: "windy leaves below leave threshold",
    previousSceneId: "windy",
    snapshot: weatherSnapshot({ temperature: 22, windSpeed: 34 }),
    expected: "warm-fair",
  },
  {
    name: "rain stays rain at leave threshold",
    previousSceneId: "rain",
    snapshot: weatherSnapshot({ temperature: 18 }),
    precipitation: precipitation({ chance: 40, intensity: "moderate" }),
    expected: "rain",
  },
  {
    name: "drizzle stays drizzle at leave threshold",
    previousSceneId: "drizzle",
    snapshot: weatherSnapshot({ temperature: 18 }),
    precipitation: precipitation({ chance: 20, intensity: "light" }),
    expected: "drizzle",
  },
  {
    name: "heavy rain stays heavy at leave threshold",
    previousSceneId: "heavy-rain",
    snapshot: weatherSnapshot({ temperature: 18 }),
    precipitation: precipitation({ chance: 40, intensity: "heavy" }),
    expected: "heavy-rain",
  },
  {
    name: "warm rain stays warm at leave temperature",
    previousSceneId: "warm-rain",
    snapshot: weatherSnapshot({ temperature: 22 }),
    precipitation: precipitation({ chance: 40, intensity: "moderate" }),
    expected: "warm-rain",
  },
  {
    name: "warm rain leaves below leave temperature",
    previousSceneId: "warm-rain",
    snapshot: weatherSnapshot({ temperature: 21 }),
    precipitation: precipitation({ chance: 40, intensity: "moderate" }),
    expected: "rain",
  },
  {
    name: "heavy snow stays heavy at leave threshold",
    previousSceneId: "heavy-snow",
    snapshot: weatherSnapshot({ temperature: -1 }),
    precipitation: precipitation({ chance: 40, intensity: "heavy", type: "snow" }),
    expected: "heavy-snow",
  },
];

const seenSceneIds = new Set();

for (const testCase of cases) {
  const actual = rules.getSceneId(testCase);
  seenSceneIds.add(actual);
  assert.equal(actual, testCase.expected, testCase.name);
}

const untestedSceneIds = rules.sceneIds.filter((sceneId) => !seenSceneIds.has(sceneId));
assert.equal(untestedSceneIds.length, 0, `Missing coverage for outfit scenes: ${untestedSceneIds.join(", ")}`);

console.log(`Outfit state QA passed: ${cases.length} rule checks, ${rules.sceneIds.length} outfit scenes covered.`);
