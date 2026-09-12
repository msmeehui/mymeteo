import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
    append(...children) {
      this.children.push(...children);
    },
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
  const imageInstances = [];

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
    Image: class extends ImageStub {
      constructor() {
        super();
        imageInstances.push(this);
      }
    },
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
  getDisplayedWeatherCode(snapshot, precipitation) {
    return getRadarAdjustedSnapshotWeatherCode(snapshot, precipitation);
  },
  getForecastAdjustedWeatherCode(code, precipitation) {
    return getPrecipitationAdjustedWeatherCode(code, precipitation);
  },
  resolveSceneAssets(sceneId, timeOfDay, weatherCode) {
    const assets = resolveOutfitSceneAssets(outfitScenes[sceneId], timeOfDay, weatherCode);
    return {
      backgroundSrc: buildOutfitSceneAssetUrl(outfitSceneBackgroundBasePath, assets.background),
      characterSrc: buildOutfitSceneAssetUrl(outfitSceneCharacterBasePath, assets.character),
    };
  },
  renderLegendScene(sceneId) {
    const row = createOutfitLegendItem({ sceneId, label: sceneId, description: "Test preview" });
    const [background, character] = row.children[0].children;
    return { backgroundSrc: background.src, characterSrc: character.src };
  },
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
  schedulePreload({ outfitMode, connection }) {
    cancelOutfitScenePreload();
    preloadedOutfitSceneIds = new Set();
    outfitScenePreloadImages.clear();
    isOutfitMode = outfitMode;
    navigator.connection = connection;
    scheduleOutfitScenePreload();
    return {
      queuedSceneIds: outfitScenePreloadQueue.slice(),
      scheduled: Boolean(outfitScenePreloadTimer || outfitScenePreloadIdleHandle),
    };
  },
  preloadScene(sceneId, { reset = true } = {}) {
    if (reset) {
      preloadedOutfitSceneIds = new Set();
      outfitScenePreloadImages.clear();
      preloadedOutfitAssetImages.clear();
    }
    preloadOutfitSceneImages(sceneId);
    return (outfitScenePreloadImages.get(sceneId) || []).map((image) => image.src);
  },
};`,
    context,
    { filename: "app.js" },
  );

  return {
    ...context.__mymeteoOutfitTest,
    getRequestedImageUrls() {
      return imageInstances.map((image) => image.src).filter(Boolean);
    },
  };
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

const drySkyCases = [
  { code: 0, day: "sky-clear.webp", night: "sky-clear-night.webp" },
  { code: 1, day: "warm-fair.webp", night: "warm-fair-night.webp" },
  { code: 2, day: "cool-dry.webp", night: "cool-dry-night.webp" },
  { code: 3, day: "sky-overcast.webp", night: "sky-overcast-night.webp" },
];
for (const { code, day, night } of drySkyCases) {
  for (const isDaytime of [true, false]) {
    const render = rules.renderScene({
      snapshot: weatherSnapshot({ temperature: 21, weatherCode: code, isDaytime }),
      precipitation: precipitation(),
    });
    const expectedBackground = isDaytime ? day : night;
    assert.ok(render.backgroundSrc.includes(`/${expectedBackground}?v=`), `weather code ${code} selects its ${isDaytime ? "day" : "night"} sky`);
    assert.equal(render.sceneId, "warm-fair", `weather code ${code} leaves the 21-degree clothes unchanged`);
  }
}

const warmClearRender = rules.renderScene({
  snapshot: weatherSnapshot({ temperature: 21, weatherCode: 0 }),
  precipitation: precipitation(),
});
const warmOvercastRender = rules.renderScene({
  preserveActiveState: true,
  snapshot: weatherSnapshot({ temperature: 21, weatherCode: 3 }),
  precipitation: precipitation(),
});
assert.equal(warmOvercastRender.sceneId, "warm-fair", "21-degree overcast weather keeps the warm outfit");
assert.equal(warmOvercastRender.characterSrc, warmClearRender.characterSrc, "a sky change leaves the clothing unchanged");
assert.match(warmOvercastRender.backgroundSrc, /\/sky-overcast\.webp\?v=/, "overcast uses the approved continuous-cloud background");
assert.notEqual(warmOvercastRender.backgroundSrc, warmClearRender.backgroundSrc, "same-outfit clear-to-overcast transitions update the background");

const warmOvercastNightRender = rules.renderScene({
  preserveActiveState: true,
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 26, weatherCode: 3 }),
  precipitation: precipitation(),
});
assert.equal(warmOvercastNightRender.sceneId, "warm-fair", "changing sky and sunset preserve temperature hysteresis");
assert.equal(warmOvercastNightRender.characterSrc, warmClearRender.characterSrc, "warm clothing remains unchanged after sunset");
assert.notEqual(warmOvercastNightRender.backgroundSrc, warmOvercastRender.backgroundSrc, "the selected forecast's night signal changes the overcast background");

for (const [temperature, windSpeed, expectedSceneId] of [[27, 8, "hot-sunny"], [4, 8, "cold-dry"], [21, 39, "windy"]]) {
  const render = rules.renderScene({
    snapshot: weatherSnapshot({ temperature, windSpeed, weatherCode: 3 }),
    precipitation: precipitation(),
  });
  assert.equal(render.sceneId, expectedSceneId, `${expectedSceneId} still selects clothes by temperature and wind`);
  assert.equal(render.backgroundSrc, warmOvercastRender.backgroundSrc, `${expectedSceneId} shares the overcast sky independently of its clothes`);
  assert.ok(render.characterSrc.includes(`/${expectedSceneId}.webp`), `${expectedSceneId} keeps its own character`);
}

const rawRainSnapshot = weatherSnapshot({ temperature: 21, weatherCode: 63 });
const selectedDryPrecipitation = precipitation({ chance: 0 });
const displayedWeatherCode = rules.getDisplayedWeatherCode(rawRainSnapshot, selectedDryPrecipitation);
assert.equal(displayedWeatherCode, 3, "a dry selected-time rain signal replaces the raw rainy icon with overcast");
const adjustedRender = rules.renderScene({
  snapshot: rawRainSnapshot,
  precipitation: selectedDryPrecipitation,
  weatherCode: displayedWeatherCode,
});
assert.equal(adjustedRender.sceneId, "warm-fair", "radar-adjusted dry weather selects dry clothing");
assert.equal(adjustedRender.backgroundSrc, warmOvercastRender.backgroundSrc, "the sky follows the displayed adjusted condition instead of the raw rainy forecast");

// Today must retain the forecast shower family while using selected-time rain
// intensity and type. Forecast rows still use their existing shared adjustment.
const displayedPrecipitationCases = [
  { rawCode: 82, intensity: "moderate", type: "rain", expectedCode: 81, scene: "rain", background: "rain-showers-day.webp" },
  { rawCode: 81, intensity: "heavy", type: "rain", expectedCode: 82, scene: "heavy-rain", background: "heavy-showers-day.webp" },
  { rawCode: 85, intensity: "moderate", type: "snow", expectedCode: 85, scene: "snow", background: "snow.webp" },
  { rawCode: 85, intensity: "heavy", type: "snow", expectedCode: 86, scene: "heavy-snow", background: "heavy-snow.webp" },
  { rawCode: 81, intensity: "moderate", type: "snow", expectedCode: 73, scene: "snow", background: "steady-snow-day.webp" },
  { rawCode: 85, intensity: "moderate", type: "rain", expectedCode: 63, scene: "rain", background: "rain.webp" },
  { rawCode: 61, intensity: "moderate", type: "rain", expectedCode: 63, scene: "rain", background: "rain.webp" },
];
for (const { rawCode, intensity, type, expectedCode, scene, background } of displayedPrecipitationCases) {
  const snapshot = weatherSnapshot({ weatherCode: rawCode });
  const selectedPrecipitation = precipitation({ chance: 80, intensity, type });
  const displayedCode = rules.getDisplayedWeatherCode(snapshot, selectedPrecipitation);
  assert.equal(displayedCode, expectedCode, `raw code ${rawCode} with selected ${intensity} ${type} displays code ${expectedCode}`);
  const render = rules.renderScene({ snapshot, precipitation: selectedPrecipitation, weatherCode: displayedCode });
  assert.equal(render.sceneId, scene, `displayed code ${expectedCode} controls precipitation clothing`);
  assert.ok(render.backgroundSrc.includes(`/${background}?v=`), `the sky agrees with adjusted displayed code ${expectedCode}`);
}
assert.equal(rules.getForecastAdjustedWeatherCode(81, precipitation({ chance: 80, intensity: "moderate" })), 63, "the shared forecast adjustment retains its existing steady-rain code outside Today");
assert.equal(rules.getDisplayedWeatherCode(weatherSnapshot({ weatherCode: 95 }), precipitation()), 95, "a dry selected-time signal retains explicit thunderstorm priority");
assert.equal(rules.getDisplayedWeatherCode(weatherSnapshot({ weatherCode: 81 }), {
  ...precipitation({ chance: 80, intensity: "heavy" }),
  stormSignal: { hasThunderstormCode: true },
}), 95, "a selected-time storm signal takes priority over the forecast shower family");

// Check both icon families and intensity-driven outfit upgrades. An ordinary
// shower sky must never weaken the background of an upgraded heavy-rain outfit.
const precipitationSkyCases = [
  { code: 80, temperature: 16, intensity: "moderate", scene: "rain", background: "rain-showers" },
  { code: 81, temperature: 27, intensity: "moderate", scene: "warm-rain", background: "rain-showers" },
  { code: 82, temperature: 16, intensity: "light", scene: "heavy-rain", background: "heavy-showers" },
  { code: 82, temperature: 27, intensity: "light", scene: "warm-heavy-rain", background: "heavy-showers" },
  { code: 80, temperature: 16, intensity: "heavy", scene: "heavy-rain", background: "heavy-showers" },
  { code: 81, temperature: 27, intensity: "heavy", scene: "warm-heavy-rain", background: "heavy-showers" },
  { code: 71, temperature: -1, intensity: "light", scene: "snow", background: "steady-snow" },
  { code: 73, temperature: -1, intensity: "moderate", scene: "snow", background: "steady-snow" },
  { code: 77, temperature: -1, intensity: "light", scene: "snow", background: "steady-snow" },
  { code: 71, temperature: -1, intensity: "heavy", scene: "heavy-snow" },
  { code: 73, temperature: -1, intensity: "heavy", scene: "heavy-snow" },
];
for (const { code, temperature, intensity, scene, background } of precipitationSkyCases) {
  for (const isDaytime of [true, false]) {
    const time = isDaytime ? "day" : "night";
    const render = rules.renderScene({
      snapshot: weatherSnapshot({ temperature, weatherCode: code, isDaytime }),
      precipitation: precipitation({ chance: 80, intensity, type: scene.includes("snow") ? "snow" : "rain" }),
    });
    const expectedBackground = background ? `${background}-${time}.webp` : `heavy-snow${isDaytime ? "" : "-night"}.webp`;
    assert.equal(render.sceneId, scene, `code ${code} with ${intensity} precipitation keeps its ${scene} recommendation`);
    assert.ok(render.backgroundSrc.includes(`/${expectedBackground}?v=`), `code ${code} with ${intensity} precipitation selects ${expectedBackground}`);
    assert.ok(render.characterSrc.includes(`/characters/${scene}.webp?v=`), `code ${code} keeps the original ${scene} character`);
    assert.ok(existsSync(path.join(projectRoot, render.backgroundSrc.split("?")[0])), `Precipitation background exists: ${expectedBackground}`);
  }
}

const warmSteadyRain = rules.renderScene({
  snapshot: weatherSnapshot({ temperature: 27, weatherCode: 63 }),
  precipitation: precipitation({ chance: 80, intensity: "moderate" }),
});
for (const [code, isDaytime, background] of [
  [80, true, "rain-showers-day.webp"],
  [81, false, "rain-showers-night.webp"],
  [63, false, "rain.webp"],
]) {
  const render = rules.renderScene({
    preserveActiveState: true,
    snapshot: weatherSnapshot({ temperature: 22, weatherCode: code, isDaytime }),
    precipitation: precipitation({ chance: 40, intensity: "moderate" }),
  });
  assert.equal(render.sceneId, "warm-rain", "warm rain hysteresis preserves clothing as the sky and selected time change");
  assert.equal(render.characterSrc, warmSteadyRain.characterSrc, "steady rain, showers and sunset preserve the warm rain character");
  assert.ok(render.backgroundSrc.includes(`/${background}?v=`), `same-outfit rain transition redraws ${background}`);
}

const steadySnow = rules.renderScene({
  snapshot: weatherSnapshot({ temperature: -1, weatherCode: 73 }),
  precipitation: precipitation({ chance: 80, type: "snow" }),
});
for (const [code, isDaytime, background] of [
  [85, true, "snow.webp"],
  [73, true, "steady-snow-day.webp"],
  [73, false, "steady-snow-night.webp"],
]) {
  const render = rules.renderScene({
    preserveActiveState: true,
    snapshot: weatherSnapshot({ temperature: -1, weatherCode: code, isDaytime }),
    precipitation: precipitation({ chance: 80, type: "snow" }),
  });
  assert.equal(render.sceneId, "snow", "steady snow and snow showers retain the same clothing recommendation");
  assert.equal(render.characterSrc, steadySnow.characterSrc, "snow sky changes preserve the character");
  assert.ok(render.backgroundSrc.includes(`/${background}?v=`), `same-outfit snow transition redraws ${background}`);
}

for (const rawCode of [81, 82, 73]) {
  const snapshot = weatherSnapshot({ temperature: 21, weatherCode: rawCode });
  const selectedDry = precipitation({ chance: 0, type: rawCode === 73 ? "snow" : "rain" });
  const adjustedCode = rules.getDisplayedWeatherCode(snapshot, selectedDry);
  const render = rules.renderScene({ snapshot, precipitation: selectedDry, weatherCode: adjustedCode });
  assert.equal(adjustedCode, 3, `selected dry conditions suppress the raw precipitation icon ${rawCode}`);
  assert.equal(render.sceneId, "warm-fair", `raw code ${rawCode} cannot retain wet clothing after the displayed icon becomes dry`);
  assert.equal(render.backgroundSrc, warmOvercastRender.backgroundSrc, `raw code ${rawCode} cannot leak a precipitation sky into the adjusted dry display`);
}

for (const [weatherCode, sceneId] of [[45, "fog"], [48, "fog"], [51, "drizzle"], [63, "rain"], [65, "heavy-rain"], [56, "heavy-rain"], [57, "heavy-rain"], [66, "heavy-rain"], [67, "heavy-rain"], [85, "snow"], [75, "heavy-snow"], [86, "heavy-snow"], [95, "thunderstorm"], [96, "thunderstorm"]]) {
  for (const isDaytime of [true, false]) {
    const render = rules.renderScene({
      snapshot: weatherSnapshot({ isDaytime, temperature: 16, weatherCode }),
      precipitation: precipitation({ chance: weatherCode === 51 ? 30 : 80, type: sceneId.includes("snow") ? "snow" : "rain" }),
    });
    const hasNightBackground = ["fog", "snow", "heavy-snow"].includes(sceneId);
    const expectedBackground = `${sceneId}${!isDaytime && hasNightBackground ? "-night" : ""}.webp`;
    assert.equal(render.sceneId, sceneId, `${sceneId} keeps its specialist clothing`);
    assert.ok(render.backgroundSrc.includes(`/${expectedBackground}?v=`), `${sceneId} retains its specialist ${isDaytime ? "day" : "night"} background`);
  }
}

const hotDayRender = rules.renderScene({
  snapshot: weatherSnapshot({ isDaytime: true, temperature: 27 }),
  precipitation: precipitation(),
});
assert.equal(hotDayRender.sceneId, "hot-sunny", "hot weather keeps its recommendation state during the day");
assert.equal(hotDayRender.timeOfDay, "day", "daytime snapshot marks the outfit scene as day");
assert.match(hotDayRender.backgroundSrc, /\/sky-clear\.webp\?v=/, "daytime clear weather uses the shared clear-sky background");
assert.match(hotDayRender.characterSrc, /\/hot-sunny\.webp\?v=/, "daytime hot weather uses the sunglasses character");

const hotNightRender = rules.renderScene({
  preserveActiveState: true,
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 27 }),
  precipitation: precipitation(),
});
assert.equal(hotNightRender.sceneId, "hot-sunny", "crossing sunset does not change the outfit recommendation");
assert.equal(hotNightRender.timeOfDay, "night", "nighttime snapshot marks the outfit scene as night");
assert.match(hotNightRender.backgroundSrc, /\/sky-clear-night\.webp\?v=/, "same-scene sunset switches to the clear night background");
assert.match(hotNightRender.characterSrc, /\/hot-sunny-night\.webp\?v=/, "hot weather removes sunglasses after sunset");

const warmBoundaryNightRender = rules.renderScene({
  previousSceneId: "warm-fair",
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 26 }),
  precipitation: precipitation(),
});
assert.equal(warmBoundaryNightRender.sceneId, "warm-fair", "sunset switching preserves temperature hysteresis at a scene boundary");
assert.match(warmBoundaryNightRender.backgroundSrc, /\/sky-clear-night\.webp\?v=/, "hysteresis-preserved clothes still use the forecast's clear night sky");

const mildNightRender = rules.renderScene({
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 16 }),
  precipitation: precipitation(),
});
assert.match(mildNightRender.backgroundSrc, /\/sky-clear-night\.webp\?v=/, "mild clothing uses the clear night background when the forecast is clear");
assert.match(mildNightRender.characterSrc, /\/mild-cloudy\.webp\?v=/, "night variant reuses the existing character when no night character exists");

const rainNightRender = rules.renderScene({
  snapshot: weatherSnapshot({ isDaytime: false, temperature: 16, weatherCode: 63 }),
  precipitation: precipitation({ chance: 80 }),
});
assert.match(rainNightRender.backgroundSrc, /\/rain\.webp\?v=/, "already-dark rain scene safely reuses its background at night");
assert.match(rainNightRender.characterSrc, /\/rain\.webp\?v=/, "already-dark rain scene safely reuses its character at night");

const hotPreloadUrls = rules.preloadScene("hot-sunny");
assert.equal(hotPreloadUrls.length, new Set(hotPreloadUrls).size, "an outfit's preload list contains no duplicate URLs");
assert.ok(hotPreloadUrls.some((url) => url.includes("/characters/hot-sunny-night.webp")), "hot weather preload includes the sunglasses-free night character");
for (const sky of drySkyCases) {
  for (const fileName of [sky.day, sky.night]) {
    assert.ok(hotPreloadUrls.some((url) => url.includes(`/backgrounds/${fileName}?v=`)), `dry outfit preload includes shared sky ${fileName}`);
  }
}
const requestsBeforeWarmPreload = rules.getRequestedImageUrls().length;
rules.preloadScene("warm-fair", { reset: false });
const newWarmRequests = rules.getRequestedImageUrls().slice(requestsBeforeWarmPreload);
assert.equal(newWarmRequests.length, 1, "preloading another dry outfit reuses the shared sky image objects");
assert.ok(newWarmRequests[0].includes("/characters/warm-fair.webp"), "only the next outfit's new character needs another image request");

const precipitationBackgroundFiles = ["rain-showers-day.webp", "rain-showers-night.webp", "heavy-showers-day.webp", "heavy-showers-night.webp", "steady-snow-day.webp", "steady-snow-night.webp"];
assert.ok(hotPreloadUrls.every((url) => !precipitationBackgroundFiles.some((fileName) => url.includes(`/backgrounds/${fileName}?v=`))), "dry outfit preloads do not download precipitation refinements");

for (const [sceneId, warmSceneId, expectedFiles, expectedCount] of [
  ["rain", "warm-rain", ["rain-showers-day.webp", "rain-showers-night.webp"], 4],
  ["heavy-rain", "warm-heavy-rain", ["heavy-showers-day.webp", "heavy-showers-night.webp"], 4],
  ["snow", undefined, ["steady-snow-day.webp", "steady-snow-night.webp"], 5],
]) {
  const urls = rules.preloadScene(sceneId);
  assert.equal(urls.length, expectedCount, `${sceneId} preloads only canonical assets and its two relevant sky refinements`);
  assert.equal(urls.length, new Set(urls).size, `${sceneId} preload list contains no duplicate URLs`);
  assert.ok(urls.some((url) => url.includes(`/backgrounds/${sceneId}.webp?v=`)), `${sceneId} preserves its canonical background preload`);
  for (const fileName of expectedFiles) {
    assert.ok(urls.some((url) => url.includes(`/backgrounds/${fileName}?v=`)), `${sceneId} preload includes ${fileName}`);
  }
  if (warmSceneId) {
    const requestsBefore = rules.getRequestedImageUrls().length;
    const warmUrls = rules.preloadScene(warmSceneId, { reset: false });
    const newRequests = rules.getRequestedImageUrls().slice(requestsBefore);
    assert.equal(warmUrls.length, expectedCount, `${warmSceneId} has the same shared precipitation backgrounds`);
    assert.equal(newRequests.length, 1, `${warmSceneId} reuses existing precipitation image objects`);
    assert.ok(newRequests[0].includes(`/characters/${warmSceneId}.webp?v=`), `only ${warmSceneId}'s character creates an additional image request`);
  }
}

const preloadRules = loadRules();
assert.equal(preloadRules.getRequestedImageUrls().length, 0, "loading the app does not eagerly request outfit assets");
for (const configuration of [
  { outfitMode: false },
  { outfitMode: true, connection: { saveData: true } },
  { outfitMode: true, connection: { effectiveType: "2g" } },
  { outfitMode: true, connection: { effectiveType: "slow-2g" } },
]) {
  const preload = preloadRules.schedulePreload(configuration);
  assert.equal(preload.scheduled, false, "map mode and constrained connections do not schedule outfit preloading");
  assert.equal(preload.queuedSceneIds.length, 0, "disabled preloading leaves no pending outfit assets");
}
const scheduledPreload = preloadRules.schedulePreload({ outfitMode: true, connection: { effectiveType: "4g" } });
assert.equal(scheduledPreload.scheduled, true, "opening outfit mode allows progressive preloading on a normal connection");
assert.equal(scheduledPreload.queuedSceneIds.length, rules.sceneIds.length, "the existing scene queue covers all outfit recommendations");
assert.equal(preloadRules.getRequestedImageUrls().length, 0, "scheduled outfit preloading waits for its idle delay before requesting images");

for (const sceneId of rules.sceneIds) {
  for (const timeOfDay of ["day", "night"]) {
    for (const weatherCode of [0, 1, 2, 3]) {
      const assets = rules.resolveSceneAssets(sceneId, timeOfDay, weatherCode);
      for (const assetUrl of [assets.backgroundSrc, assets.characterSrc]) {
        assert.ok(existsSync(path.join(projectRoot, assetUrl.split("?")[0])), `Resolved outfit asset exists: ${assetUrl}`);
      }
    }
  }
}

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
assert.match(debugOverrideRender.backgroundSrc, /\/mild-cloudy\.webp\?v=/, "forced debug outfits keep their canonical background despite a different live sky");
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

for (const [sceneId, code] of [["rain", 81], ["heavy-rain", 82], ["snow", 73]]) {
  const forcedRules = loadRules(`?debugOutfit=1&outfitState=${sceneId}&outfitTime=night`);
  const render = forcedRules.renderScene({
    snapshot: weatherSnapshot({ temperature: 16, weatherCode: code }),
    precipitation: precipitation({ chance: 80, type: sceneId === "snow" ? "snow" : "rain" }),
  });
  const canonicalNightBackground = `${sceneId}${sceneId === "snow" ? "-night" : ""}.webp`;
  assert.ok(render.backgroundSrc.includes(`/${canonicalNightBackground}?v=`), `${sceneId} forced debug view retains canonical night art despite the selected precipitation code`);
  assert.equal(render.sceneId, sceneId, "precipitation refinements preserve the forced debug clothing state");
  assert.equal(render.badgeHidden, false, "forced precipitation scenes retain their debug badge");
  const legend = rules.renderLegendScene(sceneId);
  assert.ok(legend.backgroundSrc.includes(`/backgrounds/${sceneId}.webp?v=`), `${sceneId} legend keeps its canonical daytime background`);
  assert.ok(legend.characterSrc.includes(`/characters/${sceneId}.webp?v=`), `${sceneId} legend keeps its canonical character`);
}

console.log(`Outfit state QA passed: ${cases.length} clothing rule checks, ${rules.sceneIds.length} scenes, ${drySkyCases.length} dry skies, ${precipitationSkyCases.length} precipitation sky cases, rendering transitions, and preload safeguards.`);
