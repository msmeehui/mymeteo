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
  for (let index = 0; index < 20; index += 1) {
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
    getComputedStyle() {
      return {
        getPropertyValue() {
          return "41px";
        },
      };
    },
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
const __originalSetBuienradarImageLayer = setBuienradarImageLayer;
const __originalMap = map;
const __originalSelectedLocation = selectedLocation;
const __originalSampleKnmiRainFrame = sampleKnmiRainFrame;
const __originalRenderPrecipitationTimeline = renderPrecipitationTimeline;
const __originalRevokeFrameUrl = revokeFrameUrl;
let __recordedFrameUrlRevocations = [];
function __makeHybridImageSamples(signals, startTimeMs) {
  return signals.map((signal, index) => ({
    chance: signal > 0 ? 80 : 0,
    signal,
    intensitySignal: signal,
    intensityRank: signal > 0 ? 1 : 0,
    exactSignal: signal,
    exactIntensitySignal: signal,
    exactIntensityRank: signal > 0 ? 1 : 0,
    time: startTimeMs + index * 5 * 60 * 1000,
  }));
}
globalThis.__mymeteoPrecipitationTest = {
  buildBasePrecipitationChance,
  buildRadarImageTimelinePrecipitation,
  createPrecipitationTimelineLinePath,
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
  getPrecipitationTimelineMarkerPosition,
  getPrecipitationTimelineLevel,
  getSelectedTimePrecipitation: typeof getSelectedTimePrecipitation === "function"
    ? (timeMs) => getSelectedTimePrecipitation(new Date(timeMs))
    : undefined,
  reset() {
    getActiveRainSourceAdjustmentForForecastTime = __originalActiveRainSourceAdjustment;
    getPrecipitationTimelineRadarAdjustment = __originalTimelineRadarAdjustment;
    preloadKnmiFrameImage = __originalPreloadKnmiFrameImage;
    setKnmiImageLayer = __originalSetKnmiImageLayer;
    setBuienradarImageLayer = __originalSetBuienradarImageLayer;
    map = __originalMap;
    selectedLocation = __originalSelectedLocation;
    sampleKnmiRainFrame = __originalSampleKnmiRainFrame;
    renderPrecipitationTimeline = __originalRenderPrecipitationTimeline;
    revokeFrameUrl = __originalRevokeFrameUrl;
    __recordedFrameUrlRevocations = [];
    knmiPointRainCache.clear();
    knmiRainSamples = undefined;
    knmiRainSampleRun = undefined;
    knmiCommittedFrameUrls = [];
    knmiCommittedRainSampleRun = undefined;
    buienradarCommittedFrameUrls = [];
    buienradarCommittedModeId = buienradarDefaultRadarModeId;
    buienradarCommittedRainSamples = undefined;
    buienradarRetainedFrameUrlsToRevoke.clear();
    buienradarLayer = undefined;
    buienradarLayerKey = undefined;
    buienradarNextLayer = undefined;
    buienradarNextLayerKey = undefined;
    knmiFrameRenderRequestId = 0;
    radarDisplayReplacement = undefined;
    displayedRadarSource = undefined;
    committedRadarSource = "none";
    committedRadarSliderMin = 0;
    activeRadarDate = undefined;
    weatherData = undefined;
    elements.radarMapStatus.hidden = true;
    elements.radarMapStatus.textContent = "";
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
    knmiRainSampleRun = undefined;
    knmiCommittedFrameUrls = knmiFrameUrls;
    knmiCommittedRainSampleRun = undefined;
    knmiFrameRenderRequestId = 0;
    displayedRadarSource = "knmi";
    committedRadarSource = "knmi";
    committedRadarSliderMin = 0;
    activeRadarDate = knmiFrameDates[0];
    elements.radarSlider.min = "0";
    elements.radarSlider.max = String(Math.max((frameIds.length - 1) * 100, 0));
    elements.radarSlider.value = "0";
  },
  configureKnmiFrameSampling({ sampledFrameIndexes = [] } = {}) {
    const radar = {
      frameUrls: knmiFrameUrls,
      frameDates: knmiFrameDates,
      startDate: knmiStartDate,
      referenceDate: knmiStartDate,
      fetchedAt: Date.now(),
    };
    const locationKey = getBuienradarSampleLocationKey(selectedLocation);
    knmiRainSampleRun = createKnmiRainSampleRun(radar, selectedLocation, locationKey);
    sampledFrameIndexes.forEach((index) => {
      knmiRainSampleRun.samplesByIndex.set(index, {
        chance: 0,
        exactCoverage: 0,
        exactIntensityRank: 0,
        exactIntensitySignal: 0,
        exactSignal: 0,
        intensityRank: 0,
        intensitySignal: 0,
        nearbyCoverage: 0,
        nearbyIntensityRank: 0,
        nearbySignal: 0,
        signal: 0,
        time: knmiFrameDates[index].getTime(),
      });
    });
  },
  configureHybridRadar({ startTimeMs, knmiSignals, buienradarSignals }) {
    const locationKey = getBuienradarSampleLocationKey(selectedLocation);
    weatherDataLocationKey = locationKey;
    weatherDataLoadRequestId = dataLoadRequestId;
    map = { removeLayer() {} };
    const setLayer = (_layer, _currentKey, frameIndex) => ({ mymeteoFrameIndex: frameIndex });
    setKnmiImageLayer = setLayer;
    setBuienradarImageLayer = setLayer;
    knmiLayer = undefined;
    knmiNextLayer = undefined;
    knmiFrameUrls = knmiSignals.map((_, index) => "hybrid-knmi-" + index);
    knmiFrameDates = knmiSignals.map((_, index) => new Date(startTimeMs + index * 5 * 60 * 1000));
    knmiStartDate = new Date(startTimeMs);
    knmiReferenceDate = new Date(startTimeMs);
    knmiLoadedFrameUrls = new Set(knmiFrameUrls);
    const knmiRadar = {
      frameUrls: knmiFrameUrls,
      frameDates: knmiFrameDates,
      startDate: knmiStartDate,
      referenceDate: knmiReferenceDate,
      fetchedAt: Date.now(),
    };
    knmiRainSampleRun = createKnmiRainSampleRun(knmiRadar, selectedLocation, locationKey);
    __makeHybridImageSamples(knmiSignals, startTimeMs).forEach((sample, index) => knmiRainSampleRun.samplesByIndex.set(index, sample));
    buienradarFrameUrls = buienradarSignals.map((_, index) => "hybrid-buienradar-" + index);
    loadedBuienradarRadarModeId = "3h";
    buienradarStartDate = new Date(startTimeMs);
    buienradarTimeline = { ...buienradarDefaultTimeline, frameCount: buienradarSignals.length };
    buienradarRainSamples.set("3h", {
      source: "radar-image",
      modeId: "3h",
      locationKey,
      frameUrls: buienradarFrameUrls,
      frameMinutes: 5,
      startDate: buienradarStartDate,
      fetchedAt: Date.now(),
      samples: __makeHybridImageSamples(buienradarSignals, startTimeMs),
    });
    displayedRadarSource = "hybrid";
    committedRadarSource = "hybrid";
    hybridRadarStartDate = new Date(startTimeMs);
    hybridRadarKnmiEndDate = knmiFrameDates.at(-1);
    hybridRadarEndDate = new Date(startTimeMs + (buienradarSignals.length - 1) * 5 * 60 * 1000);
    elements.radarSlider.disabled = false;
    elements.radarSlider.min = "0";
    elements.radarSlider.max = String(getHybridRadarSliderMaxValue());
    elements.radarSlider.value = "0";
  },
  stageHybridKnmiGeneration({ signals, startTimeMs }) {
    const nextFrameUrls = signals.map((_, index) => "refreshed-hybrid-knmi-" + index);
    stageRadarDisplayReplacement(nextFrameUrls);
    prepareKnmiLayersForReplacement();
    knmiFrameUrls = nextFrameUrls;
    knmiFrameDates = signals.map((_, index) => new Date(startTimeMs + index * 5 * 60 * 1000));
    knmiStartDate = new Date(startTimeMs);
    knmiReferenceDate = new Date(startTimeMs);
    hybridRadarKnmiEndDate = knmiFrameDates.at(-1);
    const radar = {
      frameUrls: knmiFrameUrls,
      frameDates: knmiFrameDates,
      startDate: knmiStartDate,
      referenceDate: knmiReferenceDate,
      fetchedAt: Date.now(),
    };
    knmiRainSampleRun = createKnmiRainSampleRun(radar, selectedLocation, getBuienradarSampleLocationKey(selectedLocation));
    const nextSamples = __makeHybridImageSamples(signals, startTimeMs);
    sampleKnmiRainFrame = (_sampleRun, index) => nextSamples[index];
  },
  setTestLocation(location) {
    selectedLocation = { ...selectedLocation, ...location };
  },
  getTimelineSnapshot() {
    return precipitationTimelineSamples.map(({ date, level, precipitation }) => ({
      timeMs: date.getTime(),
      level,
      chance: precipitation.chance,
      source: precipitation.radarAdjustment?.source,
    }));
  },
  clearKnmiRadar,
  setHybridRadarPosition,
  stageKnmiFrameGeneration({ frameIds, startTimeMs }) {
    const nextFrameUrls = [...frameIds];
    stageRadarDisplayReplacement(nextFrameUrls);
    prepareKnmiLayersForReplacement();
    radarFrames = [];
    resetHybridRadarRange();
    displayedRadarSource = "knmi";
    knmiFrameUrls = nextFrameUrls;
    knmiFrameDates = frameIds.map((_, index) => new Date(startTimeMs + index * 5 * 60 * 1000));
    knmiStartDate = knmiFrameDates[0];
    knmiReferenceDate = knmiStartDate;
    knmiRainSampleRun = undefined;
    elements.radarSlider.disabled = frameIds.length < 2;
    elements.radarSlider.min = "0";
    elements.radarSlider.max = String(Math.max((frameIds.length - 1) * 100, 0));
    elements.radarSlider.step = "1";
    elements.radarSlider.value = "0";
  },
  getDisplayedRadarSample(timeMs) {
    const sampleSeries = getPrecipitationTimelineRadarSampleSeries(new Date(timeMs));
    return sampleSeries
      ? {
        frameMatchesKnmi: sampleSeries.frameUrls === knmiCommittedFrameUrls,
        frameMatchesBuienradar: sampleSeries.frameUrls === buienradarCommittedFrameUrls,
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
    exactIntensitySignal = exactSignal > 0.02 ? intensitySignal : 0,
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
        exactIntensitySignal,
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
    committedRadarSource = source;
    if (source === "knmi") {
      knmiFrameUrls = displayedFrames;
      knmiFrameDates = [new Date(timeMs)];
      knmiStartDate = knmiFrameDates[0];
      knmiRainSamples = sampleSeries;
      knmiCommittedFrameUrls = displayedFrames;
      knmiCommittedRainSampleRun = undefined;
    } else {
      loadedBuienradarRadarModeId = displayedModeId;
      buienradarFrameUrls = displayedFrames;
      buienradarStartDate = new Date(timeMs);
      buienradarRainSamples = new Map([[sampleModeId, sampleSeries]]);
      buienradarLayer = { mymeteoFrameIndex: 0 };
      buienradarLayerKey = 0;
      buienradarCommittedFrameUrls = displayedFrames;
      buienradarCommittedModeId = displayedModeId;
      buienradarCommittedRainSamples = sampleSeries;
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
  setKnmiFrameRenderingDependencies({ preload, renderTimeline, sampleFrame, setLayer }) {
    if (preload) {
      preloadKnmiFrameImage = preload;
    }
    if (sampleFrame) {
      sampleKnmiRainFrame = sampleFrame;
    }
    if (setLayer) {
      setKnmiImageLayer = setLayer;
    }
    if (renderTimeline) {
      renderPrecipitationTimeline = renderTimeline;
    }
  },
  getRadarUiState() {
    return {
      activeTimeMs: activeRadarDate?.getTime(),
      sliderMin: elements.radarSlider.min,
      sliderValue: elements.radarSlider.value,
      statusHidden: elements.radarMapStatus.hidden,
      statusText: elements.radarMapStatus.textContent,
    };
  },
  getRadarSelectionIdentity() {
    return {
      frameIds: [...knmiFrameUrls],
      rangeStartTimeMs: getRadarTimeRange()?.start?.getTime(),
      sliderTimeMs: getRadarDateForSlider(Number(elements.radarSlider.value) || 0)?.getTime(),
    };
  },
  getPublishedKnmiSampleCount() {
    return knmiRainSamples?.samples?.length || 0;
  },
  getKnmiLayerRetentionState() {
    return {
      committedFrameCount: knmiCommittedFrameUrls.length,
      hasLayer: Boolean(knmiLayer),
      layerKey: knmiLayerKey,
      nextLayerKey: knmiNextLayerKey,
    };
  },
  prepareKnmiLayersForReplacement,
  prepareCurrentKnmiRainSamples() {
    if (knmiRainSampleRun?.radar) {
      prepareKnmiRainSamples(knmiRainSampleRun.radar);
      return knmiRainSampleRun.backgroundPromise;
    }
  },
  setActiveRainSourceAdjustment(adjustment) {
    getActiveRainSourceAdjustmentForForecastTime = () => adjustment;
  },
  setTimelineRadarAdjustment(adjustment) {
    getPrecipitationTimelineRadarAdjustment = () => adjustment;
  },
  setRadarSliderValue(value) {
    elements.radarSlider.value = String(value);
  },
  setRadarSliderMinimum(value) {
    elements.radarSlider.min = String(value);
  },
  stageBuienradarReplacement(frameIds) {
    const previousFrameUrls = buienradarFrameUrls;
    prepareBuienradarLayersForReplacement();
    if (!isBuienradarFrameUrlsCached(previousFrameUrls)) {
      previousFrameUrls.forEach((url) => buienradarRetainedFrameUrlsToRevoke.add(url));
    }
    buienradarFrameUrls = [...frameIds];
    displayedRadarSource = "hybrid";
  },
  commitBuienradarReplacement() {
    commitBuienradarFrameGeneration();
    releaseRetainedBuienradarFrameUrls();
  },
  recordFrameUrlRevocations() {
    __recordedFrameUrlRevocations = [];
    revokeFrameUrl = (url) => __recordedFrameUrlRevocations.push(url);
  },
  getRecordedFrameUrlRevocations() {
    return [...__recordedFrameUrlRevocations];
  },
  getBuienradarLayerRetentionState() {
    return {
      committedFrameIds: [...buienradarCommittedFrameUrls],
      hasLayer: Boolean(buienradarLayer),
      layerKey: buienradarLayerKey,
    };
  },
  setKnmiFramePosition,
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
    exactIntensitySignal: 0.2,
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

function getKnmiImagePointResult(rules, {
  selectedTimeMs,
  imageReferenceTimeMs,
  imageTimeMs = selectedTimeMs,
  imageSignal = 0,
  imageChance = imageSignal > 0.02 ? 70 : 0,
  imageIntensityRank = imageSignal > 0.02 ? 1 : 0,
  imageIntensitySignal = imageSignal > 0.02 ? 0.2 : 0,
  includeImage = true,
  includePoint = true,
  modelChance = 0,
  modelCode = 3,
  modelRain = 0,
  pointReferenceTimeMs = imageReferenceTimeMs,
  pointSignal = 0.3,
  pointTimeMs = selectedTimeMs,
}) {
  rules.reset();
  rules.setWeatherData({
    hourly: hourlyFixture({
      chances: [modelChance],
      codes: [modelCode],
      rainAmounts: [modelRain],
      startTimeMs: selectedTimeMs,
    }),
  });
  if (includeImage) {
    rules.setDisplayedRadarSamples({
      chance: imageChance,
      displayedFrameId: "knmi-image",
      exactSignal: imageSignal,
      fetchedAt: Date.now(),
      intensityRank: imageIntensityRank,
      intensitySignal: imageIntensitySignal,
      nearbySignal: imageSignal,
      referenceTimeMs: imageReferenceTimeMs,
      sampleFrameId: "knmi-image",
      sampleTimeMs: imageTimeMs,
      signal: imageSignal,
      source: "knmi",
      timeMs: selectedTimeMs,
    });
  }
  if (includePoint) {
    rules.setKnmiPointSamples({
      fetchedAt: Date.now(),
      referenceTimeMs: pointReferenceTimeMs,
      signal: pointSignal,
      timeMs: pointTimeMs,
    });
  }

  return rules.getSelectedTimePrecipitation(selectedTimeMs);
}

const rules = loadPrecipitationRules();
assert.equal(
  typeof rules.getSelectedTimePrecipitation,
  "function",
  "app exposes one canonical selected-time precipitation builder",
);
assert.deepEqual(
  [0, 0.5, 1].map((progress) => rules.getPrecipitationTimelineMarkerPosition(progress)),
  [0, 50, 100],
  "the graph marker uses the same normalized start, midpoint, and end as the slider thumb",
);
assert.equal(
  rules.createPrecipitationTimelineLinePath([
    { x: 0, y: 60 },
    { x: 50, y: 30 },
    { x: 100, y: 10 },
  ]),
  "M 0 60 L 50 30 L 100 10",
  "the graph line passes through every canonical five-minute sample",
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

// A displayed KNMI image is authoritative; point/model data is fallback only without image evidence.
const authorityNowMs = Date.now();
const authorityReferenceTimeMs = authorityNowMs - 5 * 60 * 1000;
const dryImageWetPoint = getKnmiImagePointResult(rules, {
  imageReferenceTimeMs: authorityReferenceTimeMs,
  selectedTimeMs: authorityNowMs,
});
assert.equal(
  dryImageWetPoint.radarAdjustment?.source,
  "knmi-image",
  "a dry displayed image remains authoritative when the same-run point signal is wet",
);
assert.equal(dryImageWetPoint.chance, 0, "the dry displayed image keeps the canonical state dry");
assert.equal(dryImageWetPoint.radarAdjustment?.conflictResolution, undefined);

const pointOnly = getKnmiImagePointResult(rules, {
  imageReferenceTimeMs: authorityReferenceTimeMs,
  includeImage: false,
  selectedTimeMs: authorityNowMs,
});
assert.equal(pointOnly.radarAdjustment?.source, "knmi-point", "the point signal remains the fallback without an image sample");
assert.ok(pointOnly.chance > 0, "the wet point fallback keeps the canonical state wet");

const wetImageDryPoint = getKnmiImagePointResult(rules, {
  imageChance: 90,
  imageIntensityRank: 3,
  imageIntensitySignal: 0.85,
  imageReferenceTimeMs: authorityReferenceTimeMs,
  imageSignal: 0.8,
  pointSignal: 0,
  selectedTimeMs: authorityNowMs,
});
assert.equal(wetImageDryPoint.radarAdjustment?.source, "knmi-image", "a wet displayed image remains authoritative over a dry point");
assert.equal(wetImageDryPoint.intensity, "heavy", "the displayed image retains its local intensity");

const modelOnly = getKnmiImagePointResult(rules, {
  imageReferenceTimeMs: authorityReferenceTimeMs,
  includeImage: false,
  includePoint: false,
  modelChance: 65,
  modelCode: 61,
  modelRain: 0.4,
  selectedTimeMs: authorityNowMs,
});
assert.equal(modelOnly.radarAdjustment, undefined, "model data remains the final fallback without image or point evidence");
assert.equal(modelOnly.chance, 65, "the model fallback preserves its rain chance");

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
    exactIntensitySignal: 0,
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

// Broad light rain can raise confidence without being misread as moderate intensity.
const broadLightRain = rules.buildRadarImageTimelinePrecipitation(
  basePrecipitation(rules),
  radarAdjustment({
    chance: 77.67,
    exactSignal: 0.594,
    exactIntensityRank: 1,
    exactIntensitySignal: 0.2,
    intensityRank: 1,
    intensitySignal: 0.2,
    nearbySignal: 0.7,
    signal: 0.594,
  }),
);
assert.equal(broadLightRain.value, "80%", "broad light rain keeps its coverage-derived display chance");
assert.equal(broadLightRain.amount, 0.1, "broad light rain keeps a light equivalent amount");
assert.equal(broadLightRain.intensity, "light", "broad light rain is not promoted to moderate intensity");
assert.equal(
  broadLightRain.radarAdjustment?.signal,
  0.594,
  "the exact wet signal remains available separately from intensity",
);
assert.equal(
  broadLightRain.radarAdjustment?.localIntensitySignal,
  0.2,
  "the local intensity signal remains independent of exact coverage",
);
assert.equal(
  rules.getPrecipitationTimelineLevel(broadLightRain),
  0.2,
  "the graph plots broad light rain at light intensity",
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
rules.stageBuienradarReplacement(["buienradar-new"]);
const retainedBuienradarState = rules.getBuienradarLayerRetentionState();
assert.deepEqual(
  [...retainedBuienradarState.committedFrameIds],
  ["buienradar-current"],
  "a staged Buienradar replacement keeps the prior committed generation",
);
assert.equal(retainedBuienradarState.hasLayer, true, "the prior Buienradar map layer remains visible");
assert.equal(retainedBuienradarState.layerKey, undefined, "the retained layer is invalidated for atomic replacement");
assert.deepEqual(
  { ...rules.getDisplayedRadarSample(displayedSampleTimeMs) },
  {
    frameMatchesKnmi: false,
    frameMatchesBuienradar: true,
    modeId: "8h",
    source: "radar-image",
  },
  "a staged hybrid/KNMI replacement keeps precipitation tied to the committed Buienradar image",
);

// Overlapping replacements never revoke the generation that becomes current again.
rules.reset();
rules.recordFrameUrlRevocations();
rules.setDisplayedRadarSamples({
  displayedFrameId: "buienradar-a",
  displayedModeId: "3h",
  sampleFrameId: "buienradar-a",
  source: "buienradar",
  timeMs: displayedSampleTimeMs,
});
rules.stageBuienradarReplacement(["buienradar-b"]);
rules.stageBuienradarReplacement(["buienradar-a"]);
rules.commitBuienradarReplacement();
assert.deepEqual(
  [...rules.getRecordedFrameUrlRevocations()],
  ["buienradar-b"],
  "overlapping replacements release only the abandoned generation, never the recommitted one",
);

// Image signals use the same continuous lower/upper weights as the map crossfade.
const interpolationStartMs = Date.UTC(2026, 7, 26, 19);
const dryFrameSample = {
  chance: 0,
  chanceSignal: 0,
  exactCoverage: 0,
  exactIntensityRank: 0,
  exactIntensitySignal: 0,
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
  exactIntensitySignal: 0.85,
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
assert.equal(
  quarterAdjustment.exactIntensitySignal,
  0.2125,
  "exact-local intensity follows the same 25% crossfade independently",
);
assert.equal(quarterAdjustment.chance, 25, "image chance follows the same 25% crossfade");
const midpointAdjustment = rules.getInstantAdjustment(
  imageSeries,
  interpolationStartMs + 150 * 1000,
);
assert.equal(midpointAdjustment.signal, 0.45, "the midpoint blends both radar frames equally");
assert.equal(midpointAdjustment.intensitySignal, 0.425, "intensity follows the map's equal frame weights");
assert.equal(
  midpointAdjustment.exactIntensitySignal,
  0.425,
  "exact-local intensity follows the map's equal frame weights",
);
assert.equal(midpointAdjustment.intensityRank, 2, "the blended midpoint derives a moderate intensity rank");

// Nearby heavy rain in a dry endpoint must not inflate an exact-light crossfade.
const localLightFrameSample = {
  chance: 62,
  chanceSignal: 0.3,
  exactCoverage: 0.4,
  exactIntensityRank: 1,
  exactIntensitySignal: 0.2,
  exactSignal: 0.3,
  intensityRank: 1,
  intensitySignal: 0.2,
  nearbyCoverage: 0.4,
  nearbyIntensityRank: 1,
  nearbySignal: 0.3,
  signal: 0.3,
  time: interpolationStartMs,
};
const nearbyHeavyFrameSample = {
  chance: 45,
  chanceSignal: 0.495,
  exactCoverage: 0,
  exactIntensityRank: 0,
  exactIntensitySignal: 0,
  exactSignal: 0,
  intensityRank: 3,
  intensitySignal: 0.85,
  nearbyCoverage: 0.8,
  nearbyIntensityRank: 3,
  nearbySignal: 0.9,
  signal: 0.495,
  time: interpolationStartMs + 5 * 60 * 1000,
};
const exactLightAdjustment = rules.getInstantAdjustment(
  {
    frameMinutes: 5,
    samples: [localLightFrameSample, nearbyHeavyFrameSample],
    source: "radar-image",
    startDate: new Date(interpolationStartMs),
  },
  interpolationStartMs + 150 * 1000,
);
assert.equal(exactLightAdjustment.exactSignal, 0.15, "exact wet confidence crossfades continuously");
assert.equal(
  exactLightAdjustment.exactIntensitySignal,
  0.1,
  "exact light intensity fades independently of nearby heavy rain",
);
assert.ok(
  Math.abs(exactLightAdjustment.intensitySignal - 0.525) < 1e-12,
  "the wider sample still records nearby heavy context",
);
const exactLightPrecipitation = rules.buildRadarImageTimelinePrecipitation(
  basePrecipitation(rules),
  exactLightAdjustment,
);
assert.equal(exactLightPrecipitation.intensity, "light", "nearby heavy rain cannot inflate local intensity");
assert.equal(
  rules.getPrecipitationTimelineLevel(exactLightPrecipitation),
  0.14,
  "the local graph remains in the light range during the crossfade",
);
const pointAdjustment = rules.getInstantAdjustment(
  {
    ...imageSeries,
    source: "point",
  },
  interpolationStartMs + 75 * 1000,
  "point",
);
assert.equal(pointAdjustment.signal, 0, "point observations retain nearest-sample semantics");

// Crossing the hybrid source boundary must not rewrite rain at any fixed timeline time.
rules.reset();
const hybridStartMs = Date.UTC(2026, 7, 26, 12);
rules.setWeatherData({
  current: {
    time: hybridStartMs / 1000,
    weather_code: 61,
    temperature_2m: 12,
    is_day: 1,
    wind_speed_10m: 10,
    wind_direction_10m: 180,
  },
  hourly: hourlyFixture({
    chances: [90, 90],
    codes: [61, 61],
    rainAmounts: [1, 1],
    startTimeMs: hybridStartMs,
  }),
});
rules.setKnmiPointSamples({ signal: 0.3, timeMs: hybridStartMs });
rules.configureHybridRadar({
  startTimeMs: hybridStartMs,
  knmiSignals: [0, 0.2, 0, 0.2, 0],
  buienradarSignals: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0, 0.2, 0],
});
rules.setHybridRadarPosition(399);
const stableHybridTimeline = Array.from(rules.getTimelineSnapshot(), (sample) => ({ ...sample }));
assert.equal(stableHybridTimeline.length, 9, "the regression covers every five-minute point in the full hybrid range");
assert.deepEqual(
  stableHybridTimeline.map(({ source }) => source),
  ["knmi-image", "knmi-image", "knmi-image", "knmi-image", "knmi-image", "radar-image", "radar-image", "radar-image", "radar-image"],
  "each timestamp uses its own side of the hybrid source boundary",
);
assert.equal(stableHybridTimeline[0].level, 0, "an earlier dry image suppresses the wet point/model fallback");
assert.ok(stableHybridTimeline[1].level > 0, "an earlier wet image remains a visible shower");
for (const sliderValue of [400, 401, 700, 401, 400, 100, 399, 401, 400, 0, 800, 399]) {
  rules.setHybridRadarPosition(sliderValue);
  assert.deepEqual(
    Array.from(rules.getTimelineSnapshot(), (sample) => ({ ...sample })),
    stableHybridTimeline,
    "scrubbing to " + sliderValue + " preserves the entire curve and its source for each timestamp",
  );
  assert.equal(
    rules.getRadarUiState().activeTimeMs,
    hybridStartMs + sliderValue * 3000,
    "the selected time still follows the slider while the forecast curve stays fixed",
  );
}
rules.setHybridRadarPosition(401);
assert.equal(rules.getKnmiLayerRetentionState().hasLayer, false, "the KNMI map layer is hidden on the Buienradar side");
// A new KNMI forecast can become available while the selected map stays on Buienradar.
rules.stageHybridKnmiGeneration({ signals: [0.2, 0, 0.2, 0, 0.2], startTimeMs: hybridStartMs });
rules.setHybridRadarPosition(401);
assert.equal(
  rules.getDisplayedRadarSample(hybridStartMs),
  undefined,
  "accepting a refreshed hybrid generation rejects image samples from the old KNMI frame URLs",
);
await rules.prepareCurrentKnmiRainSamples();
const refreshedHybridTimeline = Array.from(rules.getTimelineSnapshot(), (sample) => ({ ...sample }));
assert.equal(refreshedHybridTimeline[0].source, "knmi-image", "new KNMI samples publish while the map remains on Buienradar");
assert.ok(refreshedHybridTimeline[0].level > 0, "a real forecast refresh may add rain at an earlier time");
assert.equal(refreshedHybridTimeline[1].level, 0, "the refreshed KNMI image still overrides wet point/model evidence");
assert.deepEqual(refreshedHybridTimeline.slice(5), stableHybridTimeline.slice(5), "refreshing KNMI leaves the retained Buienradar half unchanged");
assert.equal(rules.getRadarUiState().activeTimeMs, hybridStartMs + 401 * 3000, "background sampling preserves the selected absolute time");
rules.setTestLocation({ lat: 51, lon: 4 });
assert.equal(rules.getDisplayedRadarSample(hybridStartMs), undefined, "retained KNMI samples cannot leak to another location");
assert.equal(rules.getDisplayedRadarSample(hybridStartMs + 30 * 60 * 1000), undefined, "retained Buienradar samples cannot leak to another location");
rules.clearKnmiRadar();
assert.equal(rules.getKnmiLayerRetentionState().committedFrameCount, 0, "a full KNMI reset still invalidates its committed generation");
assert.equal(rules.getPublishedKnmiSampleCount(), 0, "a full KNMI reset removes the retained local samples");
assert.equal(rules.getDisplayedRadarSample(hybridStartMs), undefined, "a full reset cannot expose the removed KNMI source");

// Preparing a refreshed KNMI generation keeps the last coherent image and sample generation visible.
rules.reset();
rules.configureKnmiFrameRendering({
  frameIds: ["knmi-old-0", "knmi-old-1"],
  loadedFrameIds: ["knmi-old-0", "knmi-old-1"],
  startTimeMs: interpolationStartMs,
});
rules.prepareKnmiLayersForReplacement();
assert.deepEqual(
  { ...rules.getKnmiLayerRetentionState() },
  {
    committedFrameCount: 2,
    hasLayer: true,
    layerKey: undefined,
    nextLayerKey: undefined,
  },
  "a radar refresh retains the committed layer while invalidating its keys for atomic replacement",
);

// A KNMI selection commits only after its image and exact-location samples are both ready.
rules.reset();
const pendingSample = createDeferred();
const gatedLayerCalls = [];
const gatedCommitCalls = [];
const gatedCommitSampleSources = [];
rules.configureKnmiFrameRendering({
  frameIds: ["knmi-0", "knmi-1"],
  loadedFrameIds: ["knmi-0", "knmi-1"],
  startTimeMs: interpolationStartMs,
});
rules.configureKnmiFrameSampling({ sampledFrameIndexes: [0] });
rules.setKnmiFrameRenderingDependencies({
  sampleFrame(_sampleRun, frameIndex) {
    assert.equal(frameIndex, 1);
    return pendingSample.promise;
  },
  setLayer(_layer, _currentKey, frameIndex) {
    gatedLayerCalls.push(frameIndex);
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.renderKnmiFramePosition(0.5, {
  onCommit(frameDate) {
    gatedCommitCalls.push(frameDate.getTime());
    gatedCommitSampleSources.push(rules.getDisplayedRadarSample(frameDate.getTime())?.source);
  },
});
assert.deepEqual(gatedLayerCalls, [], "the map stays on its committed frame while local sampling is pending");
assert.deepEqual(gatedCommitCalls, [], "the card/time callback also stays unchanged while sampling is pending");
pendingSample.resolve({
  chance: 0,
  exactCoverage: 0,
  exactIntensityRank: 0,
  exactIntensitySignal: 0,
  exactSignal: 0,
  intensityRank: 0,
  intensitySignal: 0,
  nearbyCoverage: 0,
  nearbyIntensityRank: 0,
  nearbySignal: 0,
  signal: 0,
  time: interpolationStartMs + 5 * 60 * 1000,
});
await flushPromises();
assert.deepEqual(gatedLayerCalls, [0, 1], "both crossfade layers install after both local samples settle");
assert.deepEqual(gatedCommitCalls, [interpolationStartMs + 150 * 1000], "map and selected UI commit once at the interpolated time");
assert.deepEqual(
  gatedCommitSampleSources,
  ["knmi-image"],
  "the selected local image samples are published before the card and graph commit callback",
);

// A genuinely failed image sample may commit the visible image, but precipitation falls back to point data.
rules.reset();
const failedSampleCommitCalls = [];
rules.configureKnmiFrameRendering({
  frameIds: ["knmi-0", "knmi-1"],
  loadedFrameIds: ["knmi-0", "knmi-1"],
  startTimeMs: interpolationStartMs,
});
rules.configureKnmiFrameSampling({ sampledFrameIndexes: [0] });
rules.setWeatherData({
  hourly: hourlyFixture({
    chances: [0],
    codes: [3],
    rainAmounts: [0],
    startTimeMs: interpolationStartMs,
  }),
});
rules.setKnmiPointSamples({
  referenceTimeMs: interpolationStartMs,
  signal: 0.3,
  timeMs: interpolationStartMs + 150 * 1000,
});
rules.setKnmiFrameRenderingDependencies({
  sampleFrame() {
    return undefined;
  },
  setLayer(_layer, _currentKey, frameIndex) {
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.renderKnmiFramePosition(0.5, {
  onCommit(frameDate) {
    failedSampleCommitCalls.push(frameDate.getTime());
  },
});
await flushPromises();
assert.deepEqual(failedSampleCommitCalls, [interpolationStartMs + 150 * 1000], "a settled sampling failure does not leave the map waiting forever");
const failedImageFallback = rules.getSelectedTimePrecipitation(interpolationStartMs + 150 * 1000);
assert.equal(failedImageFallback.radarAdjustment?.source, "knmi-point", "a missing required image sample falls back to the KNMI point reading");

// Already-loaded and already-sampled frames keep the synchronous fast path.
rules.reset();
const readyLayerCalls = [];
const readyCommitCalls = [];
rules.configureKnmiFrameRendering({
  frameIds: ["knmi-0", "knmi-1"],
  loadedFrameIds: ["knmi-0", "knmi-1"],
  startTimeMs: interpolationStartMs,
});
rules.configureKnmiFrameSampling({ sampledFrameIndexes: [0, 1] });
rules.setKnmiFrameRenderingDependencies({
  setLayer(_layer, _currentKey, frameIndex) {
    readyLayerCalls.push(frameIndex);
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.renderKnmiFramePosition(1, {
  onCommit(frameDate) {
    readyCommitCalls.push(frameDate.getTime());
  },
});
assert.deepEqual(readyLayerCalls, [1], "ready KNMI frames render synchronously");
assert.deepEqual(readyCommitCalls, [interpolationStartMs + 5 * 60 * 1000], "ready selected UI commits synchronously");

// The normal selection path redraws the graph in the same commit as the map and card.
rules.reset();
let committedTimelineRenderCount = 0;
rules.configureKnmiFrameRendering({
  frameIds: ["knmi-0", "knmi-1"],
  loadedFrameIds: ["knmi-0", "knmi-1"],
  startTimeMs: interpolationStartMs,
});
rules.configureKnmiFrameSampling({ sampledFrameIndexes: [0, 1] });
rules.setKnmiFrameRenderingDependencies({
  renderTimeline() {
    committedTimelineRenderCount += 1;
  },
  setLayer(_layer, _currentKey, frameIndex) {
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.setRadarSliderValue(100);
rules.setKnmiFramePosition(100);
assert.equal(committedTimelineRenderCount, 1, "the precipitation graph redraws with the committed local samples");
assert.equal(
  rules.getRadarUiState().activeTimeMs,
  interpolationStartMs + 5 * 60 * 1000,
  "the selected card time changes in that same successful commit",
);

// A failed target image retains the committed view and restores the slider to it.
rules.reset();
const failedFramePreload = createDeferred();
const failedFrameLayerCalls = [];
let failedTimelineRenderCount = 0;
rules.configureKnmiFrameRendering({
  frameIds: ["knmi-0", "knmi-1"],
  loadedFrameIds: ["knmi-0"],
  startTimeMs: interpolationStartMs,
});
rules.setKnmiFrameRenderingDependencies({
  preload() {
    return failedFramePreload.promise;
  },
  renderTimeline() {
    failedTimelineRenderCount += 1;
  },
  setLayer(_layer, _currentKey, frameIndex) {
    failedFrameLayerCalls.push(frameIndex);
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.setRadarSliderMinimum(100);
rules.setRadarSliderValue(100);
rules.setKnmiFramePosition(100);
assert.equal(rules.getRadarUiState().sliderValue, "100", "the thumb may follow the requested time while its image loads");
failedFramePreload.resolve(false);
await flushPromises();
assert.deepEqual(failedFrameLayerCalls, [], "an unavailable target never replaces the committed map layer");
assert.equal(failedTimelineRenderCount, 1, "an unavailable target restores the graph range for the committed time");
assert.deepEqual(
  { ...rules.getRadarUiState() },
  {
    activeTimeMs: interpolationStartMs,
    sliderMin: "0",
    sliderValue: "0",
    statusHidden: false,
    statusText: "Radar frame unavailable · showing previous time",
  },
  "a failed frame restores the slider and explicitly keeps the previous coherent time",
);

// A failed replacement run restores the old time range as well as its old image.
rules.reset();
const shiftedRunPreload = createDeferred();
let shiftedRunTimelineRenderCount = 0;
rules.configureKnmiFrameRendering({
  frameIds: ["old-knmi-0", "old-knmi-1"],
  loadedFrameIds: ["old-knmi-0", "old-knmi-1"],
  startTimeMs: interpolationStartMs,
});
rules.setKnmiFrameRenderingDependencies({
  preload(frameId) {
    assert.equal(frameId, "new-knmi-0");
    return shiftedRunPreload.promise;
  },
  renderTimeline() {
    shiftedRunTimelineRenderCount += 1;
  },
  setLayer(_layer, _currentKey, frameIndex) {
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.stageKnmiFrameGeneration({
  frameIds: ["new-knmi-0", "new-knmi-1"],
  startTimeMs: interpolationStartMs + 5 * 60 * 1000,
});
rules.setKnmiFramePosition(0);
assert.equal(
  rules.getRadarSelectionIdentity().sliderTimeMs,
  interpolationStartMs + 5 * 60 * 1000,
  "the pending replacement can temporarily give the thumb its newer time range",
);
shiftedRunPreload.resolve(false);
await flushPromises();
const restoredRunIdentity = rules.getRadarSelectionIdentity();
assert.deepEqual(
  [...restoredRunIdentity.frameIds],
  ["old-knmi-0", "old-knmi-1"],
  "a failed replacement restores the complete previous radar generation",
);
assert.equal(restoredRunIdentity.rangeStartTimeMs, interpolationStartMs, "the old radar range is restored");
assert.equal(restoredRunIdentity.sliderTimeMs, interpolationStartMs, "the restored thumb represents the retained image time");
assert.equal(rules.getRadarUiState().activeTimeMs, interpolationStartMs, "the card remains on that same retained time");
assert.equal(rules.getKnmiLayerRetentionState().layerKey, 0, "the retained image keeps its original frame identity");
assert.equal(shiftedRunTimelineRenderCount, 1, "the graph redraws once against the restored time range");

// Samples that finish for the retained run while a replacement is pending are republished on rollback.
rules.reset();
const retainedRunSample = createDeferred();
const failedReplacementPreload = createDeferred();
rules.configureKnmiFrameRendering({
  frameIds: ["retained-knmi-0", "retained-knmi-1"],
  loadedFrameIds: ["retained-knmi-0", "retained-knmi-1"],
  startTimeMs: interpolationStartMs,
});
rules.configureKnmiFrameSampling({ sampledFrameIndexes: [0] });
rules.setKnmiFrameRenderingDependencies({
  preload(frameId) {
    assert.equal(frameId, "replacement-knmi-0");
    return failedReplacementPreload.promise;
  },
  sampleFrame(_sampleRun, frameIndex) {
    assert.equal(frameIndex, 1);
    return retainedRunSample.promise;
  },
  setLayer(_layer, _currentKey, frameIndex) {
    return { mymeteoFrameIndex: frameIndex };
  },
});
rules.renderKnmiFramePosition(0);
assert.equal(rules.getPublishedKnmiSampleCount(), 1, "the retained generation begins with its committed local sample");
rules.prepareCurrentKnmiRainSamples();
await flushPromises();
rules.stageKnmiFrameGeneration({
  frameIds: ["replacement-knmi-0", "replacement-knmi-1"],
  startTimeMs: interpolationStartMs + 5 * 60 * 1000,
});
rules.setKnmiFramePosition(0);
retainedRunSample.resolve({
  ...dryFrameSample,
  time: interpolationStartMs + 5 * 60 * 1000,
});
await flushPromises();
assert.equal(
  rules.getPublishedKnmiSampleCount(),
  1,
  "a retained run finishing in the background does not publish into the staged replacement",
);
failedReplacementPreload.resolve(false);
await flushPromises();
assert.equal(
  rules.getPublishedKnmiSampleCount(),
  2,
  "rollback republishes every local image sample that completed for the restored generation",
);

// A requested KNMI frame redraws after preload, but obsolete preloads cannot snap the map or UI back.
rules.reset();
const firstFramePreload = createDeferred();
const firstFrameLayerCalls = [];
const firstFrameCommitCalls = [];
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
rules.renderKnmiFramePosition(1, {
  onCommit(frameDate) {
    firstFrameCommitCalls.push(frameDate.getTime());
  },
});
assert.deepEqual(firstFrameLayerCalls, [], "the previous KNMI image stays visible while the target loads");
assert.deepEqual(firstFrameCommitCalls, [], "the selected UI stays on the previous committed time while the target loads");
rules.markKnmiFrameLoaded("knmi-1");
firstFramePreload.resolve(true);
await flushPromises();
assert.deepEqual(firstFrameLayerCalls, [1], "the loaded target redraws without another slider event");
assert.deepEqual(firstFrameCommitCalls, [interpolationStartMs + 5 * 60 * 1000], "the loaded map and selected UI commit together");

rules.reset();
const obsoleteFramePreload = createDeferred();
const currentFramePreload = createDeferred();
const racedFrameLayerCalls = [];
const racedCommitCalls = [];
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
rules.renderKnmiFramePosition(1, {
  onCommit() {
    racedCommitCalls.push(1);
  },
});
rules.renderKnmiFramePosition(2, {
  onCommit() {
    racedCommitCalls.push(2);
  },
});
rules.markKnmiFrameLoaded("knmi-1");
obsoleteFramePreload.resolve(true);
await flushPromises();
assert.deepEqual(racedFrameLayerCalls, [], "a completed obsolete preload cannot redraw an earlier selection");
assert.deepEqual(racedCommitCalls, [], "an obsolete preload cannot update the selected card/time either");
rules.markKnmiFrameLoaded("knmi-2");
currentFramePreload.resolve(true);
await flushPromises();
assert.deepEqual(racedFrameLayerCalls, [2], "only the latest requested KNMI frame may redraw");
assert.deepEqual(racedCommitCalls, [2], "only the latest requested KNMI frame may commit selected UI");

console.log("MyMeteo precipitation consistency checks passed.");
