import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function flushPromises() {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
}

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

function loadPrecipitationRules() {
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
const __originalActiveRainSourceAdjustment = getActiveRainSourceAdjustmentForForecastTime;
const __originalTimelineRadarAdjustment = getPrecipitationTimelineRadarAdjustment;
const __originalPreloadKnmiFrameImage = preloadKnmiFrameImage;
const __originalSetKnmiImageLayer = setKnmiImageLayer;
globalThis.__mymeteoPrecipitationTest = {
  buildBasePrecipitationChance,
  buildRadarImageTimelinePrecipitation,
  buildTimelineHourlyPrecipitation(hourly, index, timeMs) {
    return buildTimelineHourlyPrecipitation(hourly, index, new Date(timeMs));
  },
  getClosestTimeIndex,
  getInstantAdjustment(sampleSeries, timeMs, source = sampleSeries.source) {
    return getBuienradarAdjustmentFromSampleSeries(
      sampleSeries,
      new Date(timeMs),
      "instant",
      {
        maxLookaheadHours: 8,
        source,
        weight: 1,
      },
    );
  },
  getPrecipitationAdjustedWeatherCode,
  getPrecipitationTimelineLevel,
  getSelectedTimePrecipitation: typeof getSelectedTimePrecipitation === "function"
    ? (timeMs) => getSelectedTimePrecipitation(new Date(timeMs))
    : undefined,
  reset() {
    getActiveRainSourceAdjustmentForForecastTime = __originalActiveRainSourceAdjustment;
    getPrecipitationTimelineRadarAdjustment = __originalTimelineRadarAdjustment;
    preloadKnmiFrameImage = __originalPreloadKnmiFrameImage;
    setKnmiImageLayer = __originalSetKnmiImageLayer;
    knmiPointRainCache.clear();
    knmiRainSamples = undefined;
    displayedRadarSource = undefined;
    weatherData = undefined;
  },
  configureKnmiFrameRendering({ frameIds, loadedFrameIds, startTimeMs }) {
    knmiFrameUrls = [...frameIds];
    knmiFrameDates = frameIds.map((_, index) => new Date(startTimeMs + index * 5 * 60 * 1000));
    knmiStartDate = knmiFrameDates[0];
    knmiLoadedFrameUrls = new Set(loadedFrameIds);
    knmiLayer = { mymeteoFrameIndex: 0 };
    knmiLayerKey = 0;
    knmiNextLayer = undefined;
    knmiNextLayerKey = undefined;
    knmiFrameRenderRequestId = 0;
    displayedRadarSource = "knmi";
  },
  getDisplayedRadarSample(timeMs) {
    const sampleSeries = getPrecipitationTimelineRadarSampleSeries(new Date(timeMs));
    return sampleSeries
      ? {
        frameMatchesKnmi: sampleSeries.frameUrls === knmiFrameUrls,
        frameMatchesBuienradar: sampleSeries.frameUrls === buienradarFrameUrls,
        modeId: sampleSeries.modeId,
        source: sampleSeries.source,
      }
      : undefined;
  },
  markKnmiFrameLoaded(frameId) {
    knmiLoadedFrameUrls.add(frameId);
  },
  renderKnmiFramePosition,
  setDisplayedRadarSamples({
    chance = 60,
    displayedFrameId,
    displayedModeId = "3h",
    exactSignal = 0.2,
    fetchedAt = 0,
    intensityRank = exactSignal > 0.02 ? 1 : 0,
    intensitySignal = exactSignal > 0.02 ? 0.2 : 0,
    locationKey = getBuienradarSampleLocationKey(selectedLocation),
    nearbySignal = exactSignal,
    referenceTimeMs,
    sampleFrameId,
    sampleModeId = displayedModeId,
    signal = exactSignal,
    source,
    timeMs,
    sampleTimeMs = timeMs,
  }) {
    const displayedFrames = [displayedFrameId];
    const sampleFrames = sampleFrameId === displayedFrameId ? displayedFrames : [sampleFrameId];
    const sampleSeries = {
      fetchedAt,
      frameMinutes: 5,
      frameUrls: sampleFrames,
      locationKey,
      modeId: source === "knmi" ? "knmi-image" : sampleModeId,
      samples: [{
        chance,
        exactCoverage: exactSignal,
        exactIntensityRank: intensityRank,
        exactSignal,
        intensityRank,
        intensitySignal,
        nearbyCoverage: nearbySignal,
        nearbyIntensityRank: intensityRank,
        nearbySignal,
        signal,
        time: sampleTimeMs,
      }],
      source: source === "knmi" ? "knmi-image" : "radar-image",
      startDate: new Date(sampleTimeMs),
      referenceDate: Number.isFinite(referenceTimeMs) ? new Date(referenceTimeMs) : undefined,
    };

    displayedRadarSource = source;
    if (source === "knmi") {
      knmiFrameUrls = displayedFrames;
      knmiFrameDates = [new Date(timeMs)];
      knmiStartDate = knmiFrameDates[0];
      knmiRainSamples = sampleSeries;
    } else {
      loadedBuienradarRadarModeId = displayedModeId;
      buienradarFrameUrls = displayedFrames;
      buienradarStartDate = new Date(timeMs);
      buienradarRainSamples = new Map([[sampleModeId, sampleSeries]]);
    }
  },
  setKnmiPointSamples({
    chance = 70,
    fetchedAt = Date.now(),
    signal,
    intensityRank = signal > 0.02 ? 1 : 0,
    intensitySignal = signal > 0.02 ? 0.2 : 0,
    locationKey = getBuienradarSampleLocationKey(selectedLocation),
    referenceTimeMs,
    timeMs,
  }) {
    knmiPointRainCache.set(locationKey, {
      modeId: "knmi-point",
      source: "knmi-point",
      pointWindow: true,
      locationKey,
      startDate: new Date(timeMs),
      referenceDate: Number.isFinite(referenceTimeMs) ? new Date(referenceTimeMs) : undefined,
      fetchedAt,
      frameMinutes: 5,
      samples: [{
        chance,
        intensityRank,
        intensitySignal,
        signal,
        time: timeMs,
      }],
    });
  },
  setKnmiFrameRenderingDependencies({ preload, setLayer }) {
    preloadKnmiFrameImage = preload;
    setKnmiImageLayer = setLayer;
  },
  setActiveRainSourceAdjustment(adjustment) {
    getActiveRainSourceAdjustmentForForecastTime = () => adjustment;
  },
  setTimelineRadarAdjustment(adjustment) {
    getPrecipitationTimelineRadarAdjustment = () => adjustment;
  },
  setWeatherData(data) {
    weatherData = data;
  },
  withBuienradarPrecipitationAdjustment,
};`,
    context,
    { filename: "app.js" },
  );

  return context.__mymeteoPrecipitationTest;
}

function basePrecipitation(rules, {
  chance = 0,
  includeIntensity = true,
  rainAmount = 0,
  weatherCode = 3,
} = {}) {
  return rules.buildBasePrecipitationChance({
    chance,
    includeIntensity,
    rainAmount,
    showersAmount: 0,
    snowfallAmount: 0,
    temperature: 12,
    weatherCode,
  });
}

function radarAdjustment(overrides = {}) {
  return {
    source: "knmi-image",
    chance: 60,
    signal: 0.2,
    intensitySignal: 0.2,
    intensityRank: 1,
    exactSignal: 0.2,
    nearbySignal: 0.2,
    exactCoverage: 0.2,
    nearbyCoverage: 0.2,
    exactIntensityRank: 1,
    nearbyIntensityRank: 1,
    sampleMode: "instant",
    horizonHours: 0,
    time: Date.UTC(2026, 7, 26, 12),
    weight: 1,
    ...overrides,
  };
}

function hourlyFixture({ chances, codes, rainAmounts, startTimeMs }) {
  const length = chances.length;
  return {
    time: Array.from({ length }, (_, index) => (startTimeMs + index * 60 * 60 * 1000) / 1000),
    precipitation_probability: chances,
    weather_code: codes,
    rain: rainAmounts,
    showers: Array(length).fill(0),
    snowfall: Array(length).fill(0),
    temperature_2m: Array(length).fill(12),
    is_day: Array(length).fill(1),
    wind_direction_10m: Array(length).fill(180),
    wind_speed_10m: Array(length).fill(10),
  };
}

function getKnmiPointImageConflictResult(rules, {
  selectedTimeMs,
  imageReferenceTimeMs,
  imageTimeMs = selectedTimeMs,
  pointReferenceTimeMs = imageReferenceTimeMs,
  pointSignal = 0.3,
  pointTimeMs = selectedTimeMs,
}) {
  rules.reset();
  rules.setWeatherData({
    hourly: hourlyFixture({
      chances: [0],
      codes: [3],
      rainAmounts: [0],
      startTimeMs: selectedTimeMs,
    }),
  });
  rules.setDisplayedRadarSamples({
    chance: 0,
    displayedFrameId: "knmi-conflict",
    exactSignal: 0,
    fetchedAt: Date.now(),
    nearbySignal: 0,
    referenceTimeMs: imageReferenceTimeMs,
    sampleFrameId: "knmi-conflict",
    sampleTimeMs: imageTimeMs,
    signal: 0,
    source: "knmi",
    timeMs: selectedTimeMs,
  });
  rules.setKnmiPointSamples({
    fetchedAt: Date.now(),
    referenceTimeMs: pointReferenceTimeMs,
    signal: pointSignal,
    timeMs: pointTimeMs,
  });

  return rules.getSelectedTimePrecipitation(selectedTimeMs);
}

const rules = loadPrecipitationRules();
assert.equal(
  typeof rules.getSelectedTimePrecipitation,
  "function",
  "app exposes one canonical selected-time precipitation builder",
);

// Radar evidence must be retained even when display rounding and intensity do not change.
rules.reset();
rules.setActiveRainSourceAdjustment(radarAdjustment({
  source: "knmi-point",
  chance: 0,
  signal: 0,
  intensitySignal: 0,
  intensityRank: 0,
  exactSignal: undefined,
  nearbySignal: undefined,
  exactCoverage: undefined,
  nearbyCoverage: undefined,
  exactIntensityRank: undefined,
  nearbyIntensityRank: undefined,
  weight: 0.95,
}));
const dryRainCode = rules.withBuienradarPrecipitationAdjustment(
  basePrecipitation(rules, { chance: 0, rainAmount: 0, weatherCode: 61 }),
  Date.UTC(2026, 7, 26, 12) / 1000,
  { includeIntensity: true, radarSampleMode: "instant" },
);
assert.equal(dryRainCode.hasRadarEvidence, true, "unchanged dry radar is still recorded as evidence");
assert.ok(dryRainCode.radarAdjustment, "unchanged dry radar keeps its adjustment metadata");
assert.equal(dryRainCode.chance, 0, "dry radar keeps the selected-time rain chance at zero");
assert.equal(
  rules.getPrecipitationAdjustedWeatherCode(61, dryRainCode),
  3,
  "a rain model code is cleared when the selected-time radar state is Dry",
);

rules.reset();
rules.setActiveRainSourceAdjustment(radarAdjustment({ source: "knmi-point" }));
const unchangedWetEvidence = rules.withBuienradarPrecipitationAdjustment(
  basePrecipitation(rules, { chance: 60, rainAmount: 0.1, weatherCode: 3 }),
  Date.UTC(2026, 7, 26, 12) / 1000,
  { includeIntensity: true, radarSampleMode: "instant" },
);
assert.equal(unchangedWetEvidence.value, "60%", "wet evidence can leave the rounded value unchanged");
assert.equal(unchangedWetEvidence.intensity, "light", "wet evidence can leave intensity unchanged");
assert.equal(unchangedWetEvidence.hasRadarEvidence, true, "unchanged wet radar is still recorded as evidence");
assert.equal(
  rules.getPrecipitationAdjustedWeatherCode(3, unchangedWetEvidence),
  61,
  "wet selected-time radar upgrades an overcast model icon",
);

// The same canonical wet/dry rules apply during the model-only base render.
rules.reset();
const modelOnlyDry = basePrecipitation(rules, { chance: 0, rainAmount: 0, weatherCode: 61 });
assert.equal(modelOnlyDry.hasRadarEvidence, undefined, "model-only dry state has no radar evidence");
assert.equal(
  rules.getPrecipitationAdjustedWeatherCode(61, modelOnlyDry),
  3,
  "model-only Dry clears a contradictory rain icon before radar enrichment",
);

const modelOnlyWet = basePrecipitation(rules, { chance: 70, rainAmount: 2, weatherCode: 3 });
assert.equal(modelOnlyWet.intensity, "moderate", "model-only fixture has moderate selected-time rain");
assert.equal(
  rules.getPrecipitationAdjustedWeatherCode(3, modelOnlyWet),
  63,
  "model-only high-chance moderate rain upgrades a contradictory overcast icon",
);
assert.equal(
  rules.getPrecipitationAdjustedWeatherCode(95, modelOnlyDry),
  95,
  "an explicit thunderstorm code remains a deliberate safety exception to local Dry",
);

// The compact Today precipitation value describes the selected instant, not a later daily maximum.
rules.reset();
const selectedStartMs = Date.UTC(2026, 7, 26, 12);
const selectedHourly = hourlyFixture({
  chances: [20, 25, 95],
  codes: [3, 3, 65],
  rainAmounts: [0, 0.1, 5],
  startTimeMs: selectedStartMs,
});
rules.setWeatherData({ hourly: selectedHourly });
const selectedTime = rules.getSelectedTimePrecipitation(selectedStartMs + 10 * 60 * 1000);
assert.equal(selectedTime.chance, 25, "selected-time state uses the next ending precipitation interval");
assert.equal(selectedTime.value, "25%", "selected-time display value is not the rest-of-day 95% maximum");

// The graph and selected icon consume the same radar-image precipitation state.
rules.reset();
const canonicalDateMs = Date.UTC(2026, 7, 26, 14, 5);
const canonicalHourly = hourlyFixture({
  chances: [60],
  codes: [3],
  rainAmounts: [0.1],
  startTimeMs: Date.UTC(2026, 7, 26, 14),
});
const canonicalAdjustment = radarAdjustment({
  chance: 65,
  exactSignal: 0.3,
  nearbySignal: 0.45,
  signal: 0.3,
  time: canonicalDateMs,
});
rules.setWeatherData({ hourly: canonicalHourly });
rules.setTimelineRadarAdjustment(canonicalAdjustment);
const selectedCanonical = rules.getSelectedTimePrecipitation(canonicalDateMs);
const timelineCanonical = rules.buildTimelineHourlyPrecipitation(canonicalHourly, 0, canonicalDateMs);
assert.equal(selectedCanonical.chance, timelineCanonical.chance, "card and graph use the same selected-time chance");
assert.equal(selectedCanonical.intensity, timelineCanonical.intensity, "card and graph use the same selected-time intensity");
assert.equal(
  selectedCanonical.radarAdjustment?.source,
  timelineCanonical.radarAdjustment?.source,
  "card and graph retain the same displayed radar source",
);
assert.equal(
  rules.getPrecipitationTimelineLevel(selectedCanonical),
  rules.getPrecipitationTimelineLevel(timelineCanonical),
  "card and graph resolve the same wet/dry level",
);
assert.equal(
  rules.getPrecipitationAdjustedWeatherCode(3, selectedCanonical),
  61,
  "the selected icon reflects the graph's local wet state",
);

// A fresh, same-run KNMI point observation may safely correct a dry image only near now.
const conflictNowMs = Date.now();
const conflictReferenceTimeMs = conflictNowMs - 5 * 60 * 1000;
const resolvedPointImageConflict = getKnmiPointImageConflictResult(rules, {
  imageReferenceTimeMs: conflictReferenceTimeMs,
  selectedTimeMs: conflictNowMs,
});
assert.equal(
  resolvedPointImageConflict.radarAdjustment?.source,
  "knmi-point",
  "near-now same-run wet point evidence overrides a dry KNMI image",
);
assert.equal(
  resolvedPointImageConflict.radarAdjustment?.conflictResolution,
  "point-wet-over-image-dry",
  "the safety override explicitly records how the source conflict was resolved",
);
assert.equal(
  resolvedPointImageConflict.radarAdjustment?.conflictingImageExactSignal,
  0,
  "the resolved conflict retains the image's exact-location dry signal",
);
assert.equal(
  resolvedPointImageConflict.radarAdjustment?.conflictingImageReferenceTime,
  conflictReferenceTimeMs,
  "the resolved conflict retains the shared KNMI reference run",
);
assert.ok(resolvedPointImageConflict.chance > 0, "the resolved near-now state is locally wet");

const historicalPointImageConflict = getKnmiPointImageConflictResult(rules, {
  imageReferenceTimeMs: conflictReferenceTimeMs,
  selectedTimeMs: conflictNowMs - 11 * 60 * 1000,
});
assert.equal(
  historicalPointImageConflict.radarAdjustment?.source,
  "knmi-image",
  "the point-wet/image-dry override is not applied outside the near-now window",
);
assert.equal(
  historicalPointImageConflict.radarAdjustment?.conflictResolution,
  undefined,
  "historical source differences remain unresolved evidence rather than a current-rain override",
);

const mismatchedRunConflict = getKnmiPointImageConflictResult(rules, {
  imageReferenceTimeMs: conflictReferenceTimeMs,
  pointReferenceTimeMs: conflictReferenceTimeMs + 5 * 60 * 1000,
  selectedTimeMs: conflictNowMs,
});
assert.equal(
  mismatchedRunConflict.radarAdjustment?.source,
  "knmi-image",
  "point evidence from a different KNMI reference run cannot override the image",
);
assert.equal(mismatchedRunConflict.radarAdjustment?.conflictResolution, undefined);

const dryPointConflict = getKnmiPointImageConflictResult(rules, {
  imageReferenceTimeMs: conflictReferenceTimeMs,
  pointSignal: 0,
  selectedTimeMs: conflictNowMs,
});
assert.equal(
  dryPointConflict.radarAdjustment?.source,
  "knmi-image",
  "a dry point observation does not trigger the wet-point safety override",
);
assert.equal(dryPointConflict.radarAdjustment?.conflictResolution, undefined);

const mismatchedSampleTimeConflict = getKnmiPointImageConflictResult(rules, {
  imageReferenceTimeMs: conflictReferenceTimeMs,
  imageTimeMs: conflictNowMs - 4 * 60 * 1000,
  pointTimeMs: conflictNowMs + 4 * 60 * 1000,
  selectedTimeMs: conflictNowMs,
});
assert.equal(
  mismatchedSampleTimeConflict.radarAdjustment?.source,
  "knmi-image",
  "wet point and dry image samples more than one frame apart cannot be combined",
);
assert.equal(mismatchedSampleTimeConflict.radarAdjustment?.conflictResolution, undefined);

// Rain visible only in the wider nearby radius is context, not rain at the marker.
rules.reset();
const nearbyOnly = rules.buildRadarImageTimelinePrecipitation(
  basePrecipitation(rules, { chance: 80, rainAmount: 2, weatherCode: 61 }),
  radarAdjustment({
    chance: 45,
    exactSignal: 0,
    nearbySignal: 0.7,
    exactCoverage: 0,
    nearbyCoverage: 0.5,
    exactIntensityRank: 0,
    nearbyIntensityRank: 2,
    intensityRank: 2,
    intensitySignal: 0.5,
    signal: 0.385,
  }),
);
assert.equal(nearbyOnly.hasRadarEvidence, true, "nearby-only radar still records source evidence");
assert.equal(nearbyOnly.chance, 0, "nearby-only rain is locally Dry");
assert.equal(nearbyOnly.intensity, undefined, "nearby-only rain does not assign local intensity");
assert.equal(rules.getPrecipitationTimelineLevel(nearbyOnly), 0, "nearby-only rain keeps the local graph dry");
assert.equal(nearbyOnly.radarAdjustment?.exactSignal, 0, "nearby-only evidence retains the dry exact signal");
assert.equal(nearbyOnly.radarAdjustment?.nearbySignal, 0.7, "nearby-only evidence retains nearby context");
assert.equal(
  rules.getPrecipitationAdjustedWeatherCode(61, nearbyOnly),
  3,
  "nearby-only rain clears a contradictory local rain icon",
);

// Open-Meteo precipitation values describe the preceding hour, so selection is forward-looking.
rules.reset();
const boundaryStartMs = Date.UTC(2026, 7, 26, 16);
const boundaryHourly = hourlyFixture({
  chances: [0, 80, 10],
  codes: [3, 63, 3],
  rainAmounts: [0, 2, 0],
  startTimeMs: boundaryStartMs,
});
rules.setWeatherData({ hourly: boundaryHourly });
const beforeBoundary = rules.getSelectedTimePrecipitation(boundaryStartMs + 59 * 60 * 1000);
const atBoundary = rules.getSelectedTimePrecipitation(boundaryStartMs + 60 * 60 * 1000);
assert.equal(beforeBoundary.chance, 80, "16:59 uses the interval ending at 17:00");
assert.equal(atBoundary.chance, 10, "17:00 moves to the upcoming interval ending at 18:00");
assert.equal(
  rules.getClosestTimeIndex(boundaryHourly.time, (boundaryStartMs + 30 * 60 * 1000) / 1000),
  0,
  "instantaneous weather fields keep a stable earlier-hour nearest-time tie",
);

// The timeline may only consume image samples from the exact frame array on screen.
const displayedSampleTimeMs = Date.UTC(2026, 7, 26, 18);
rules.setDisplayedRadarSamples({
  displayedFrameId: "knmi-new",
  sampleFrameId: "knmi-old",
  source: "knmi",
  timeMs: displayedSampleTimeMs,
});
assert.equal(
  rules.getDisplayedRadarSample(displayedSampleTimeMs),
  undefined,
  "a fresh-looking KNMI series from an older frame array is rejected",
);
rules.setDisplayedRadarSamples({
  displayedFrameId: "knmi-current",
  fetchedAt: 0,
  sampleFrameId: "knmi-current",
  source: "knmi",
  timeMs: displayedSampleTimeMs,
});
assert.deepEqual(
  { ...rules.getDisplayedRadarSample(displayedSampleTimeMs) },
  {
    frameMatchesKnmi: true,
    frameMatchesBuienradar: false,
    modeId: "knmi-image",
    source: "knmi-image",
  },
  "the exact displayed KNMI series stays valid onscreen independently of cache age",
);
rules.setDisplayedRadarSamples({
  displayedFrameId: "buienradar-current",
  displayedModeId: "8h",
  sampleFrameId: "buienradar-current",
  sampleModeId: "3h",
  source: "buienradar",
  timeMs: displayedSampleTimeMs,
});
assert.equal(
  rules.getDisplayedRadarSample(displayedSampleTimeMs),
  undefined,
  "an inactive Buienradar mode cannot supply the displayed timeline",
);
rules.setDisplayedRadarSamples({
  displayedFrameId: "buienradar-current",
  displayedModeId: "8h",
  fetchedAt: 0,
  sampleFrameId: "buienradar-current",
  sampleModeId: "8h",
  source: "buienradar",
  timeMs: displayedSampleTimeMs,
});
assert.equal(
  rules.getDisplayedRadarSample(displayedSampleTimeMs)?.frameMatchesBuienradar,
  true,
  "the exact displayed Buienradar series stays valid onscreen independently of cache age",
);

// Image signals use the same continuous lower/upper weights as the map crossfade.
const interpolationStartMs = Date.UTC(2026, 7, 26, 19);
const dryFrameSample = {
  chance: 0,
  chanceSignal: 0,
  exactCoverage: 0,
  exactIntensityRank: 0,
  exactSignal: 0,
  intensityRank: 0,
  intensitySignal: 0,
  nearbyCoverage: 0,
  nearbyIntensityRank: 0,
  nearbySignal: 0,
  signal: 0,
  time: interpolationStartMs,
};
const heavyFrameSample = {
  chance: 100,
  chanceSignal: 0.9,
  exactCoverage: 0.8,
  exactIntensityRank: 3,
  exactSignal: 0.8,
  intensityRank: 3,
  intensitySignal: 0.85,
  nearbyCoverage: 0.6,
  nearbyIntensityRank: 3,
  nearbySignal: 0.6,
  signal: 0.9,
  time: interpolationStartMs + 5 * 60 * 1000,
};
const imageSeries = {
  frameMinutes: 5,
  samples: [dryFrameSample, heavyFrameSample],
  source: "radar-image",
  startDate: new Date(interpolationStartMs),
};
const quarterAdjustment = rules.getInstantAdjustment(
  imageSeries,
  interpolationStartMs + 75 * 1000,
);
assert.equal(quarterAdjustment.signal, 0.225, "25% map progress uses 25% of the upper image signal");
assert.equal(quarterAdjustment.exactSignal, 0.2, "exact-local signal follows the same 25% crossfade");
assert.equal(quarterAdjustment.chance, 25, "image chance follows the same 25% crossfade");
const midpointAdjustment = rules.getInstantAdjustment(
  imageSeries,
  interpolationStartMs + 150 * 1000,
);
assert.equal(midpointAdjustment.signal, 0.45, "the midpoint blends both radar frames equally");
assert.equal(midpointAdjustment.intensitySignal, 0.425, "intensity follows the map's equal frame weights");
assert.equal(midpointAdjustment.intensityRank, 2, "the blended midpoint derives a moderate intensity rank");
const pointAdjustment = rules.getInstantAdjustment(
  {
    ...imageSeries,
    source: "point",
  },
  interpolationStartMs + 75 * 1000,
  "point",
);
assert.equal(pointAdjustment.signal, 0, "point observations retain nearest-sample semantics");

// A requested KNMI frame redraws after preload, but obsolete preloads cannot snap the map back.
rules.reset();
const firstFramePreload = createDeferred();
const firstFrameLayerCalls = [];
rules.configureKnmiFrameRendering({
  frameIds: ["knmi-0", "knmi-1"],
  loadedFrameIds: ["knmi-0"],
  startTimeMs: interpolationStartMs,
});
rules.setKnmiFrameRenderingDependencies({
  preload(frameId) {
    assert.equal(frameId, "knmi-1");
    return firstFramePreload.promise;
  },
  setLayer(_layer, _currentKey, frameIndex) {
    firstFrameLayerCalls.push(frameIndex);
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.renderKnmiFramePosition(1);
assert.deepEqual(firstFrameLayerCalls, [], "the previous KNMI image stays visible while the target loads");
rules.markKnmiFrameLoaded("knmi-1");
firstFramePreload.resolve(true);
await flushPromises();
assert.deepEqual(firstFrameLayerCalls, [1], "the loaded target redraws without another slider event");

rules.reset();
const obsoleteFramePreload = createDeferred();
const currentFramePreload = createDeferred();
const racedFrameLayerCalls = [];
rules.configureKnmiFrameRendering({
  frameIds: ["knmi-0", "knmi-1", "knmi-2"],
  loadedFrameIds: ["knmi-0"],
  startTimeMs: interpolationStartMs,
});
rules.setKnmiFrameRenderingDependencies({
  preload(frameId) {
    return frameId === "knmi-1" ? obsoleteFramePreload.promise : currentFramePreload.promise;
  },
  setLayer(_layer, _currentKey, frameIndex) {
    racedFrameLayerCalls.push(frameIndex);
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.renderKnmiFramePosition(1);
rules.renderKnmiFramePosition(2);
rules.markKnmiFrameLoaded("knmi-1");
obsoleteFramePreload.resolve(true);
await flushPromises();
assert.deepEqual(racedFrameLayerCalls, [], "a completed obsolete preload cannot redraw an earlier selection");
rules.markKnmiFrameLoaded("knmi-2");
currentFramePreload.resolve(true);
await flushPromises();
assert.deepEqual(racedFrameLayerCalls, [2], "only the latest requested KNMI frame may redraw");

console.log("MyMeteo precipitation consistency checks passed.");
