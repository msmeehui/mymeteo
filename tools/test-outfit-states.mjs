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

class ImageStub {
  constructor() {
    this.decoding = "";
    this.src = "";
  }
}

function loadRules(search = "") {
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
      origin: "http://127.0.0.1:4173",
      search,
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
globalThis.__mymeteoOutfitTest = {
  sceneIds: outfitSceneIds.slice(),
  getOverrideSceneId() {
    return getOutfitSceneOverrideId();
  },
  getTimeOverride() {
    return getOutfitTimeOverride(getOutfitSceneOverrideId());
  },
  getSceneId({ previousSceneId, snapshot, precipitation, weatherCode }) {
    activeOutfitSceneId = previousSceneId;
    return getOutfitSceneId(snapshot, precipitation, weatherCode ?? snapshot?.weatherCode);
  },
  renderScene({ preserveActiveState = false, previousSceneId, snapshot, precipitation, weatherCode }) {
    if (!preserveActiveState) {
      activeOutfitSceneId = previousSceneId;
      activeOutfitSceneVisualKey = undefined;
    }
    renderOutfitScene(snapshot, precipitation, weatherCode ?? snapshot?.weatherCode);
    return {
      backgroundSrc: elements.outfitSceneBackground.src,
      badgeHidden: elements.outfitDebugBadge.hidden,
      badgeText: elements.outfitDebugBadge.textContent,
      characterSrc: elements.outfitSceneCharacter.src,
      sceneId: elements.outfitScene.dataset.outfitScene,
      timeOfDay: elements.outfitScene.dataset.outfitTime,
    };
  },
  preloadScene(sceneId) {
    preloadedOutfitSceneIds = new Set();
    outfitScenePreloadImages.clear();
    preloadOutfitSceneImages(sceneId);
    return (outfitScenePreloadImages.get(sceneId) || []).map((image) => image.src);
  },
};`,
    context,
    { filename: "app.js" },
  );

  return context.__mymeteoOutfitTest;
}

const rules = loadRules();

function weatherSnapshot({ isDaytime = true, temperature = 16, windSpeed = 8, weatherCode = 0 } = {}) {
  return {
    isDaytime,
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
    name: "rain code upgrades to heavy rain by chance and intensity",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 61 }),
    precipitation: precipitation({ chance: 50, intensity: "heavy" }),
    expected: "heavy-rain",
  },
  {
    name: "warm rain code upgrades to warm heavy rain by chance and intensity",
    snapshot: weatherSnapshot({ temperature: 27, weatherCode: 61 }),
    precipitation: precipitation({ chance: 50, intensity: "heavy" }),
    expected: "warm-heavy-rain",
  },
  {
    name: "drizzle code upgrades to rain at precipitation threshold",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 51 }),
    precipitation: precipitation({ chance: 50, intensity: "moderate" }),
    expected: "rain",
  },
  {
    name: "warm drizzle code upgrades to warm rain at precipitation threshold",
    snapshot: weatherSnapshot({ temperature: 27, weatherCode: 51 }),
    precipitation: precipitation({ chance: 50, intensity: "moderate" }),
    expected: "warm-rain",
  },
  {
    name: "drizzle code stays drizzle at light precipitation threshold",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 51 }),
    precipitation: precipitation({ chance: 30, intensity: "light" }),
    expected: "drizzle",
  },
  {
    name: "warm drizzle code stays warm drizzle at light precipitation threshold",
    snapshot: weatherSnapshot({ temperature: 27, weatherCode: 51 }),
    precipitation: precipitation({ chance: 30, intensity: "light" }),
    expected: "warm-drizzle",
  },
  {
    name: "snow code upgrades to heavy snow by chance and intensity",
    snapshot: weatherSnapshot({ temperature: -1, weatherCode: 71 }),
    precipitation: precipitation({ chance: 50, intensity: "heavy", type: "snow" }),
    expected: "heavy-snow",
  },
  {
    name: "snow code stays snow at light precipitation threshold",
    snapshot: weatherSnapshot({ temperature: -1, weatherCode: 71 }),
    precipitation: precipitation({ chance: 30, intensity: "light", type: "snow" }),
    expected: "snow",
  },
  {
    name: "dry weather code ignores heavy rain probability",
    snapshot: weatherSnapshot({ temperature: 22, weatherCode: 3 }),
    precipitation: precipitation({ chance: 80, intensity: "heavy" }),
    expected: "warm-fair",
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
    name: "rain stays rain at leave threshold with rain code",
    previousSceneId: "rain",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 61 }),
    precipitation: precipitation({ chance: 40, intensity: "moderate" }),
    expected: "rain",
  },
  {
    name: "rain leaves when selected weather code is dry",
    previousSceneId: "rain",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 3 }),
    precipitation: precipitation({ chance: 40, intensity: "moderate" }),
    expected: "mild-cloudy",
  },
  {
    name: "drizzle stays drizzle at leave threshold with drizzle code",
    previousSceneId: "drizzle",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 51 }),
    precipitation: precipitation({ chance: 20, intensity: "light" }),
    expected: "drizzle",
  },
  {
    name: "heavy rain stays heavy at leave threshold with rain code",
    previousSceneId: "heavy-rain",
    snapshot: weatherSnapshot({ temperature: 18, weatherCode: 61 }),
    precipitation: precipitation({ chance: 40, intensity: "heavy" }),
    expected: "heavy-rain",
  },
  {
    name: "warm rain stays warm at leave temperature with rain code",
    previousSceneId: "warm-rain",
    snapshot: weatherSnapshot({ temperature: 22, weatherCode: 61 }),
    precipitation: precipitation({ chance: 40, intensity: "moderate" }),
    expected: "warm-rain",
  },
  {
    name: "warm rain leaves below leave temperature with rain code",
    previousSceneId: "warm-rain",
    snapshot: weatherSnapshot({ temperature: 21, weatherCode: 61 }),
    precipitation: precipitation({ chance: 40, intensity: "moderate" }),
    expected: "rain",
  },
  {
    name: "heavy snow stays heavy at leave threshold with snow code",
    previousSceneId: "heavy-snow",
    snapshot: weatherSnapshot({ temperature: -1, weatherCode: 71 }),
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

const hotDayRender = rules.renderScene({
  snapshot: weatherSnapshot({ isDaytime: true, temperature: 27 }),
  precipitation: precipitation(),
});
assert.equal(hotDayRender.sceneId, "hot-sunny", "hot weather keeps its recommendation state during the day");
assert.equal(hotDayRender.timeOfDay, "day", "daytime snapshot marks the outfit scene as day");
assert.match(hotDayRender.backgroundSrc, /\/hot-sunny\.webp\?v=/, "daytime hot weather uses the daytime background");
assert.match(hotDayRender.characterSrc, /\/hot-sunny\.webp\?v=/, "daytime hot weather uses the sunglasses character");

const hotNightRender = rules.renderScene({
  preserveActiveState: true,
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 27 }),
  precipitation: precipitation(),
});
assert.equal(hotNightRender.sceneId, "hot-sunny", "crossing sunset does not change the outfit recommendation");
assert.equal(hotNightRender.timeOfDay, "night", "nighttime snapshot marks the outfit scene as night");
assert.match(hotNightRender.backgroundSrc, /\/hot-sunny-night\.webp\?v=/, "same-scene sunset switches to the night background");
assert.match(hotNightRender.characterSrc, /\/hot-sunny-night\.webp\?v=/, "hot weather removes sunglasses after sunset");

const warmBoundaryNightRender = rules.renderScene({
  previousSceneId: "warm-fair",
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 26 }),
  precipitation: precipitation(),
});
assert.equal(warmBoundaryNightRender.sceneId, "warm-fair", "sunset switching preserves temperature hysteresis at a scene boundary");
assert.match(warmBoundaryNightRender.backgroundSrc, /\/warm-fair-night\.webp\?v=/, "hysteresis-preserved scene still selects its night background");

const mildNightRender = rules.renderScene({
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 16 }),
  precipitation: precipitation(),
});
assert.match(mildNightRender.backgroundSrc, /\/mild-cloudy-night\.webp\?v=/, "night variant uses the mild cloudy night background");
assert.match(mildNightRender.characterSrc, /\/mild-cloudy\.webp\?v=/, "night variant reuses the existing character when no night character exists");

const rainNightRender = rules.renderScene({
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 16, weatherCode: 63 }),
  precipitation: precipitation({ chance: 80 }),
});
assert.match(rainNightRender.backgroundSrc, /\/rain\.webp\?v=/, "already-dark rain scene safely reuses its background at night");
assert.match(rainNightRender.characterSrc, /\/rain\.webp\?v=/, "already-dark rain scene safely reuses its character at night");

const hotPreloadUrls = rules.preloadScene("hot-sunny");
assert.equal(hotPreloadUrls.length, 4, "hot weather preload includes both backgrounds and both characters");
assert.ok(hotPreloadUrls.some((url) => url.includes("/hot-sunny-night.webp")), "hot weather preload includes night assets");

const rainPreloadUrls = rules.preloadScene("rain");
assert.equal(rainPreloadUrls.length, 2, "unchanged rain scene preloads only its background and character");

const oldOverrideUrlRules = loadRules("?outfitState=mild-cloudy");
assert.equal(
  oldOverrideUrlRules.getOverrideSceneId(),
  undefined,
  "outfitState is ignored unless debugOutfit is enabled",
);

const debugOverrideRules = loadRules("?debugOutfit=1&outfitState=mild-cloudy");
assert.equal(debugOverrideRules.getOverrideSceneId(), "mild-cloudy", "debug outfit override is enabled by paired query params");

const debugOverrideRender = debugOverrideRules.renderScene({
  snapshot: weatherSnapshot({ temperature: 27 }),
  precipitation: precipitation(),
});
assert.equal(debugOverrideRender.sceneId, "mild-cloudy", "debug outfit override forces the rendered scene");
assert.equal(debugOverrideRender.badgeHidden, false, "debug outfit override reveals the forced-state badge");
assert.equal(debugOverrideRender.badgeText, "Forced outfit: mild-cloudy", "debug outfit override labels the forced state");

const unpairedTimeOverrideRules = loadRules("?outfitState=hot-sunny&outfitTime=night");
assert.equal(unpairedTimeOverrideRules.getTimeOverride(), undefined, "outfitTime is ignored without the full debug outfit gate");
const unpairedTimeOverrideRender = unpairedTimeOverrideRules.renderScene({
  snapshot: weatherSnapshot({ isDaytime: true, temperature: 27 }),
  precipitation: precipitation(),
});
assert.equal(unpairedTimeOverrideRender.timeOfDay, "day", "ignored outfitTime cannot force night presentation");

const debugNightRules = loadRules("?debugOutfit=1&outfitState=mild-cloudy&outfitTime=night");
assert.equal(debugNightRules.getTimeOverride(), "night", "paired debug controls can force the night presentation");
const debugNightRender = debugNightRules.renderScene({
  snapshot: weatherSnapshot({ isDaytime: true, temperature: 27 }),
  precipitation: precipitation(),
});
assert.equal(debugNightRender.sceneId, "mild-cloudy", "night debug override retains the forced outfit state");
assert.equal(debugNightRender.timeOfDay, "night", "night debug override forces after-dark presentation");
assert.match(debugNightRender.backgroundSrc, /\/mild-cloudy-night\.webp\?v=/, "night debug override loads the night background");
assert.equal(debugNightRender.badgeText, "Forced outfit: mild-cloudy · night", "debug badge identifies the forced time presentation");

console.log(`Outfit state QA passed: ${cases.length} rule checks, ${rules.sceneIds.length} outfit scenes covered.`);
