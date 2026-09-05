import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");
const indexSource = readFileSync(path.join(projectRoot, "index.html"), "utf8");

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createManualWindowTimers() {
  let nextTimerId = 1;
  const timers = new Map();

  return {
    clearTimeout(timerId) {
      timers.delete(timerId);
    },
    get pendingCount() {
      return timers.size;
    },
    runNext() {
      const nextTimer = Array.from(timers.entries())
        .sort(([, left], [, right]) => left.delayMs - right.delayMs)[0];
      if (!nextTimer) {
        throw new Error("No pending window timer");
      }

      const [timerId, timer] = nextTimer;
      timers.delete(timerId);
      timer.callback();
      return timer.delayMs;
    },
    setTimeout(callback, delayMs = 0) {
      const timerId = nextTimerId;
      nextTimerId += 1;
      timers.set(timerId, { callback, delayMs });
      return timerId;
    },
  };
}

function createAbortableFetchStall({ bodyMethod, phase }) {
  let abortCount = 0;
  let bodyCalls = 0;
  let signal;

  const waitForAbort = () => new Promise((_, reject) => {
    const rejectAbort = () => {
      abortCount += 1;
      const error = new Error("Aborted test request");
      error.name = "AbortError";
      reject(error);
    };

    if (signal.aborted) {
      rejectAbort();
      return;
    }

    signal.addEventListener("abort", rejectAbort, { once: true });
  });

  return {
    get abortCount() {
      return abortCount;
    },
    get bodyCalls() {
      return bodyCalls;
    },
    fetch(_url, options) {
      signal = options.signal;
      if (phase === "headers") {
        return waitForAbort();
      }

      return Promise.resolve({
        ok: true,
        [bodyMethod]() {
          bodyCalls += 1;
          return waitForAbort();
        },
      });
    },
    get signal() {
      return signal;
    },
  };
}

function createManualClock(initialTimeMs = 0) {
  let currentTimeMs = initialTimeMs;

  return {
    advance(durationMs) {
      currentTimeMs += durationMs;
    },
    now() {
      return currentTimeMs;
    },
  };
}

function getRadarTimingEvents(analyticsEvents) {
  return analyticsEvents
    .filter(([eventName]) => eventName === "radar_load_timing")
    .map(([, metadata]) => ({ ...metadata }));
}

async function withTimeout(promise, label, timeoutMs = 750) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function createClassList() {
  const values = new Set();
  return {
    add(...names) {
      names.forEach((name) => values.add(name));
    },
    contains(name) {
      return values.has(name);
    },
    remove(...names) {
      names.forEach((name) => values.delete(name));
    },
    toggle(name, force) {
      const shouldAdd = force === undefined ? !values.has(name) : Boolean(force);
      if (shouldAdd) {
        values.add(name);
      } else {
        values.delete(name);
      }
      return shouldAdd;
    },
  };
}

function createStubElement(selector = "element") {
  const attributes = new Map();
  const eventListeners = new Map();
  const element = {
    selector,
    children: [],
    classList: createClassList(),
    className: "",
    dataset: {},
    disabled: false,
    hidden: false,
    innerHTML: "",
    offsetWidth: 34,
    scrollIntoViewCalls: [],
    textContent: "",
    tabIndex: -1,
    title: "",
    value: selector === "#locationInput" ? "Amsterdam" : "0",
    style: {
      removeProperty() {},
      setProperty() {},
    },
    addEventListener(type, listener) {
      const listeners = eventListeners.get(type) || [];
      listeners.push(listener);
      eventListeners.set(type, listeners);
    },
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
    dispatchEvent(event) {
      (eventListeners.get(event.type) || []).forEach((listener) => listener.call(this, event));
      return !event.defaultPrevented;
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    getBoundingClientRect() {
      return { bottom: 100, height: 40, left: 0, right: 320, top: 60, width: 320 };
    },
    prepend(child) {
      this.children.unshift(child);
    },
    querySelector(childSelector) {
      if (childSelector === '[aria-selected="true"]') {
        return this.children.find((child) => child.getAttribute?.("aria-selected") === "true") || null;
      }
      return createStubElement(`${selector} ${childSelector}`);
    },
    querySelectorAll(childSelector) {
      if (childSelector === '[role="option"]') {
        return this.children.filter((child) => child.getAttribute?.("role") === "option");
      }
      return [];
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    scrollIntoView(options) {
      this.scrollIntoViewCalls.push(options);
    },
    select() {},
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    showModal() {},
    toggleAttribute(name, force) {
      const shouldSet = force === undefined ? !attributes.has(name) : Boolean(force);
      if (shouldSet) {
        attributes.set(name, "");
      } else {
        attributes.delete(name);
      }
      return shouldSet;
    },
  };
  element.parentElement = createStubElement.parentStub || {
    getBoundingClientRect() {
      return { width: 320 };
    },
  };
  return element;
}

class ImageStub {
  constructor() {
    this.decoding = "";
    this.loading = "";
    this.src = "";
  }
}

function createHarness({ analyticsEvents, hostname = "127.0.0.1", performanceNow, windowTimers } = {}) {
  const elementCache = new Map();
  const getElement = (selector) => {
    if (!elementCache.has(selector)) {
      elementCache.set(selector, createStubElement(selector));
    }
    return elementCache.get(selector);
  };

  const documentStub = {
    activeElement: null,
    visibilityState: "visible",
    addEventListener() {},
    createElement(selector) {
      const element = createStubElement(selector);
      if (selector === "canvas") {
        element.getContext = () => ({
          measureText(text) {
            return { width: String(text).length * 8 };
          },
        });
      }
      return element;
    },
    createTextNode(text) {
      return { textContent: text };
    },
    querySelector: getElement,
    querySelectorAll() {
      return [];
    },
  };

  const windowStub = {
    addEventListener() {},
    cancelAnimationFrame() {},
    clearInterval,
    clearTimeout: windowTimers?.clearTimeout ?? clearTimeout,
    dataLayer: [],
    getComputedStyle() {
      return {
        columnGap: "6px",
        fontFamily: "sans-serif",
        fontSize: "16px",
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: "400",
        gap: "6px",
      };
    },
    isSecureContext: true,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    location: {
      hostname,
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
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setInterval() {
      return 1;
    },
    setTimeout: windowTimers?.setTimeout ?? setTimeout,
  };
  if (analyticsEvents) {
    windowStub.sa_event = (...args) => {
      analyticsEvents.push(args);
    };
  }

  const context = {
    AbortController,
    Blob,
    Image: ImageStub,
    ResizeObserver: undefined,
    URL,
    URLSearchParams,
    console,
    document: documentStub,
    fetch: async () => {
      throw new Error("Unexpected fetch");
    },
    navigator: {
      geolocation: {},
    },
    performance: {
      now: performanceNow ?? (() => Date.now()),
    },
    window: windowStub,
  };
  windowStub.document = documentStub;
  windowStub.navigator = context.navigator;

  vm.createContext(context);
  vm.runInContext(
    `${appSource}
const __originalSetHybridRadarPosition = setHybridRadarPosition;
const __originalSetKnmiFramePosition = setKnmiFramePosition;
globalThis.__mymeteoLoadingTest = {
  beginManualLocationIntent,
  commitCurrentRadarPosition() {
    knmiLoadedFrameUrls = new Set(knmiFrameUrls);
    setKnmiImageLayer = (_layer, _currentKey, frameIndex) => ({ mymeteoFrameIndex: frameIndex });
    const sliderValue = Number(elements.radarSlider.value) || 0;
    if (displayedRadarSource === "hybrid") {
      __originalSetHybridRadarPosition(sliderValue);
    } else if (displayedRadarSource === "knmi") {
      __originalSetKnmiFramePosition(sliderValue);
    }
  },
  createDataLoadContext,
  createRadarFixtures(startTimeMs) {
    const frameDurationMs = 5 * 60 * 1000;
    const knmiStartDate = new Date(startTimeMs);
    const buienradarStartDate = new Date(startTimeMs + frameDurationMs);
    const knmiFrameDates = Array.from(
      { length: 25 },
      (_, index) => new Date(startTimeMs + index * frameDurationMs),
    );

    return {
      buienradar: {
        fetchedAt: Date.now(),
        frameUrls: Array.from({ length: 36 }, (_, index) => "buienradar-" + index),
        modeId: "3h",
        startDate: buienradarStartDate,
        timeline: {
          frameCount: 36,
          frameDurationMs: 1000,
        },
      },
      knmi: {
        fetchedAt: Date.now(),
        frameDates: knmiFrameDates,
        frameUrls: knmiFrameDates.map((_, index) => "knmi-" + index),
        modeId: "knmi-2h",
        referenceDate: knmiStartDate,
        startDate: knmiStartDate,
        timeline: {
          frameCount: knmiFrameDates.length,
          frameDurationMs: 1000,
        },
      },
    };
  },
  createRadarLoadContext,
  displayHybridRadar,
  displayKnmiRadar,
  downloadKnmiRadarMetadataResponse,
  downloadBuienradarRadarMode,
  fetchBuienradarRadarMode,
  decodeBuienradarFramesWithImageDecoder,
  decodeBuienradarFramesWithGifuct,
  fetchBodyWithTimeout,
  getBuienradarRequestState() {
    return { pending: buienradarRadarRequests.size, cached: buienradarRadarCache.size };
  },
  setDeadlineDependencies({ decode, preload, importModule, NativeDecoder, canvas, ImageClass, BitmapCreator, revoke, createUrl } = {}) {
    globalThis.console = { ...console, error() {}, warn() {} };
    if (decode) decodeBuienradarFrames = decode;
    if (preload) preloadImage = preload;
    if (importModule) loadBuienradarGifDecoder = importModule;
    if (NativeDecoder) {
      window.ImageDecoder = NativeDecoder;
      globalThis.ImageDecoder = NativeDecoder;
    }
    if (canvas) {
      const createElement = document.createElement;
      document.createElement = (name) => name === "canvas" ? canvas : createElement(name);
    }
    if (ImageClass) globalThis.Image = ImageClass;
    if (BitmapCreator) {
      window.createImageBitmap = BitmapCreator;
      globalThis.createImageBitmap = BitmapCreator;
    }
    if (revoke || createUrl) {
      globalThis.URL = { createObjectURL: createUrl || URL.createObjectURL, revokeObjectURL: revoke || URL.revokeObjectURL };
    }
  },
  fetchKnmiRadar,
  getLocationSearchResults() {
    return locationSearchResults;
  },
  getLocationAutocompleteState() {
    return {
      activeDescendant: elements.locationInput.getAttribute("aria-activedescendant"),
      activeIndex: activeLocationOptionIndex,
      dismissed: areLocationOptionsDismissed,
      expanded: elements.locationInput.getAttribute("aria-expanded"),
      hidden: elements.locationOptions.hidden,
      inputValue: elements.locationInput.value,
      options: elements.locationOptions.children.map((option) => ({
        active: option.classList.contains("is-active"),
        id: option.id,
        role: option.getAttribute("role"),
        scrollCalls: option.scrollIntoViewCalls.length,
        selected: option.getAttribute("aria-selected"),
        tabIndex: option.tabIndex,
        text: option.textContent,
      })),
    };
  },
  getControls() {
    return {
      appLoading: elements.app.classList.contains("is-loading"),
      locateAriaBusy: elements.locateButton.getAttribute("aria-busy") !== null,
      locateAriaLabel: elements.locateButton.getAttribute("aria-label"),
      locateDisabled: elements.locateButton.disabled,
      locateTitle: elements.locateButton.title,
      locationDisabled: elements.locationInput.disabled,
      refreshAriaBusy: elements.refreshButton.getAttribute("aria-busy") !== null,
      refreshDisabled: elements.refreshButton.disabled,
    };
  },
  getRadarState() {
    return { displayedRadarSource, radarFrames };
  },
  getRadarMapStatus() {
    return {
      hidden: elements.radarMapStatus.hidden,
      isError: elements.radarMapStatus.classList.contains("is-error"),
      message: elements.radarMapStatus.textContent,
    };
  },
  getRadarUiState() {
    return {
      activeTimeMs: activeRadarDate?.getTime(),
      ariaValue: elements.radarSlider.getAttribute("aria-valuetext"),
      radarTime: elements.radarTime.textContent,
      sliderDisabled: elements.radarSlider.disabled,
      sliderMax: Number(elements.radarSlider.max),
      sliderMin: Number(elements.radarSlider.min),
      sliderValue: Number(elements.radarSlider.value),
      sliderWasAtStart: radarSliderWasAtStart,
      source: displayedRadarSource,
    };
  },
  getSelectedLocationKey() {
    return getBuienradarSampleLocationKey(selectedLocation);
  },
  getStatus() {
    return { isError: statusIsError, message: statusMessage, revision: statusMessageRevision };
  },
  handleLocationInput,
  handleLocationInputKeydown,
  hideLocationOptions,
  hydrateStoredCurrentLocationName,
  isRadarLoadContextCurrent,
  loadAll,
  loadHybridRadar,
  loadLibreWxrRadar,
  loadRadar,
  loadWeather,
  refreshCurrentLocationIfAllowed,
  renderWeather,
  renderWeatherForRadarBlend,
  requestCurrentLocation,
  searchLocationSuggestions,
  selectTypedLocation,
  setBlendRenderers({ fiveDay, selected, selectedDate, timeline }) {
    renderFiveDayForecast = fiveDay;
    renderSelectedWeather = selected;
    getSelectedWeatherDate = selectedDate;
    renderPrecipitationTimeline = timeline;
  },
  setFetch(fetchImplementation) {
    globalThis.fetch = fetchImplementation;
  },
  setApplyLocation(apply) {
    applyLocation = apply;
  },
  setGeolocationDependencies({ apply, currentLocation, permission, position, render, status }) {
    if (apply) {
      applyLocation = apply;
    }
    if (currentLocation) {
      currentLocationFromPosition = currentLocation;
    }
    if (permission) {
      getGeolocationPermissionState = permission;
    }
    if (position) {
      getCurrentPosition = position;
    }
    if (render) {
      renderLocation = render;
    }
    if (status) {
      setStatusMessage = status;
    }
  },
  setStoredLocationHydrationDependencies({ render, reverse, save }) {
    renderLocation = render;
    reverseGeocodeLocation = reverse;
    saveLocation = save;
  },
  setLoaders(weatherLoader, radarLoader) {
    loadWeather = weatherLoader;
    loadRadar = radarLoader;
  },
  setHybridRadarDependencies({
    fetchBuienradar,
    fetchKnmi,
    renderBuienradar,
    renderHybrid,
    renderKnmi,
    schedulePreload,
  }) {
    if (fetchBuienradar) {
      fetchBuienradarRadarMode = fetchBuienradar;
    }
    if (fetchKnmi) {
      fetchKnmiRadar = fetchKnmi;
    }
    if (renderBuienradar) {
      displayBuienradarRadar = renderBuienradar;
    }
    if (renderHybrid) {
      displayHybridRadar = renderHybrid;
    }
    if (renderKnmi) {
      displayKnmiRadar = renderKnmi;
    }
    if (schedulePreload) {
      scheduleInactiveBuienradarRadarPreload = schedulePreload;
    }
  },
  setKnmiRadarDownload(download) {
    knmiRadarCache = undefined;
    knmiRadarRequest = undefined;
    downloadKnmiRadar = download;
  },
  setRadarState({ frames, source }) {
    radarFrames = frames;
    displayedRadarSource = source;
  },
  setRadarDependencies({ disable, libre, status, update }) {
    disableRadar = disable;
    loadLibreWxrRadar = libre;
    setRadarMapStatus = status;
    updateBuienradarModeControl = update;
  },
  setRadarSamplePreparers({ buienradar, knmi }) {
    prepareBuienradarRainSamples = buienradar;
    prepareKnmiRainSamples = knmi;
  },
  setRadarSliderSelection(value, { wasAtStart = false } = {}) {
    radarSliderWasAtStart = wasAtStart;
    handleRadarSliderInput(value);
  },
  stubRadarRenderingSideEffects({ preserveRadarStatus = false } = {}) {
    clearBuienradarLayers = () => {};
    clearKnmiLayers = () => {};
    clearLibreWxrRadar = () => {};
    if (!preserveRadarStatus) {
      clearRadarMapStatus = () => {};
    }
    prepareBuienradarRainSamples = () => {};
    prepareKnmiRainSamples = () => {};
    refreshMapSize = () => {};
    renderPrecipitationTimeline = () => {};
    renderSelectedWeather = () => {};
    updatePrecipitationTimelineMarker = () => {};
    updateSliderTimestamps = () => {};
    setBuienradarFramePosition = (value) => {
      updateRadarTimeDisplay(
        getBuienradarDateForSlider(value),
        value,
        DEFAULT_LOCATION.timezone,
      );
    };
    setHybridRadarPosition = (value) => {
      updateRadarTimeDisplay(
        getHybridDateForSlider(value),
        value,
        DEFAULT_LOCATION.timezone,
      );
    };
    setKnmiFramePosition = (value) => {
      updateRadarTimeDisplay(
        getKnmiDateForSlider(value),
        value,
        DEFAULT_LOCATION.timezone,
      );
    };
  },
  setSelectedLocation(location) {
    selectedLocation = normalizeLocation(location);
  },
  setStatusMessage,
  setLocationInput(value) {
    elements.locationInput.value = value;
  },
  setLocationSearchResults(results) {
    locationSearchResults = results;
    locationSearchResultSetId += 1;
    areLocationOptionsDismissed = false;
    activeLocationOptionIndex = results.length ? 0 : -1;
    renderLocationOptions();
  },
  dispatchLocationOptionEvent(index, type, event = {}) {
    const option = elements.locationOptions.children[index];
    option?.dispatchEvent({ type, ...event });
  },
  setWeatherDependencies({ blend, knmiPoint, point, render, status }) {
    prepareBuienradarPointRainForLocation = point;
    prepareKnmiPointRainForLocation = knmiPoint;
    renderWeather = render;
    renderWeatherForRadarBlend = blend;
    setStatusMessage = status;
  },
  setLoading,
};`,
    context,
    { filename: "app.js" },
  );

  return context.__mymeteoLoadingTest;
}

function forecastResponse(data) {
  return {
    ok: true,
    async json() {
      return data;
    },
  };
}

async function flushPromises() {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
}

function createKeyEvent(key, options = {}) {
  return {
    defaultPrevented: false,
    isComposing: false,
    key,
    keyCode: 0,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...options,
  };
}

function configureProgressiveRadarHarness(test, { buienradarRun, knmiRun }) {
  const displays = [];
  const fetches = [];
  let preloadCalls = 0;

  test.setHybridRadarDependencies({
    fetchBuienradar(modeId, options) {
      fetches.push({
        forceRefresh: options.forceRefresh,
        hasTiming: Boolean(options.timing),
        modeId,
        source: "buienradar",
      });
      return buienradarRun.promise;
    },
    fetchKnmi(options) {
      fetches.push({
        forceRefresh: options.forceRefresh,
        hasTiming: Boolean(options.timing),
        source: "knmi",
      });
      return knmiRun.promise;
    },
    renderBuienradar(radar, options) {
      displays.push({
        id: radar.id,
        preserveSelection: options?.preserveSelection ?? false,
        source: "buienradar",
      });
      test.setRadarState({ frames: [{ source: "buienradar" }], source: "buienradar" });
    },
    renderHybrid(knmiRadar, buienradarRadar, options) {
      displays.push({
        buienradarId: buienradarRadar.id,
        knmiId: knmiRadar.id,
        preserveSelection: options?.preserveSelection ?? false,
        source: "hybrid",
      });
      test.setRadarState({ frames: [{ source: "hybrid" }], source: "hybrid" });
    },
    renderKnmi(radar, options) {
      displays.push({
        id: radar.id,
        preserveSelection: options?.preserveSelection ?? false,
        source: "knmi",
      });
      test.setRadarState({ frames: [{ source: "knmi" }], source: "knmi" });
    },
    schedulePreload() {
      preloadCalls += 1;
    },
  });

  return {
    displays,
    fetches,
    get preloadCalls() {
      return preloadCalls;
    },
  };
}

assert.match(indexSource, /role="combobox"/);
assert.match(indexSource, /aria-autocomplete="list"/);
assert.match(indexSource, /role="listbox"/);
assert.match(indexSource, /aria-label="Location suggestions"/);

{
  const test = createHarness();
  test.setLoading(true);
  assert.deepEqual({ ...test.getControls() }, {
    appLoading: true,
    locateAriaBusy: false,
    locateAriaLabel: null,
    locateDisabled: false,
    locateTitle: "",
    locationDisabled: false,
    refreshAriaBusy: true,
    refreshDisabled: true,
  });
  test.setLoading(false);
  assert.equal(test.getControls().refreshDisabled, false);
}

{
  const test = createHarness();
  const weatherRuns = [];
  const radarRuns = [];
  test.setLoaders(
    (context) => {
      const run = createDeferred();
      weatherRuns.push({ context, run });
      return run.promise;
    },
    (options) => {
      const run = createDeferred();
      radarRuns.push({ options, run });
      return run.promise;
    },
  );

  const firstLoad = test.loadAll();
  const latestLoad = test.loadAll({ forceRadarRefresh: false });
  assert.ok(weatherRuns[0].context.requestId < weatherRuns[1].context.requestId);
  assert.equal(weatherRuns[0].context.signal.aborted, true, "a newer forecast should abort the older fetch");
  assert.equal(weatherRuns[1].context.signal.aborted, false);
  assert.deepEqual(radarRuns.map(({ options }) => ({ ...options })), [
    { forceRefresh: true, trigger: "other" },
    { forceRefresh: false, trigger: "other" },
  ]);
  weatherRuns[0].run.resolve();
  radarRuns[0].run.resolve();
  await firstLoad;
  assert.equal(test.getControls().appLoading, true, "an older load must not stop the latest spinner");

  weatherRuns[1].run.resolve();
  radarRuns[1].run.resolve();
  await latestLoad;
  assert.equal(test.getControls().appLoading, false);
}

{
  const test = createHarness();
  const weatherRuns = [];
  const radarRuns = [];
  test.setLoaders(
    () => {
      const run = createDeferred();
      weatherRuns.push(run);
      return run.promise;
    },
    () => {
      const run = createDeferred();
      radarRuns.push(run);
      return run.promise;
    },
  );

  const firstLoad = test.loadAll();
  const latestLoad = test.loadAll();
  weatherRuns[1].resolve();
  radarRuns[1].resolve();
  await latestLoad;
  assert.equal(test.getControls().appLoading, false, "completed latest data should not wait for obsolete work");

  weatherRuns[0].resolve();
  radarRuns[0].resolve();
  await firstLoad;
  assert.equal(test.getControls().appLoading, false);
}

{
  const test = createHarness();
  const pointRain = createDeferred();
  const knmiPointRain = createDeferred();
  const pointOptions = [];
  const knmiPointOptions = [];
  const renders = [];
  const blends = [];
  test.setFetch(async () => forecastResponse({ id: "base" }));
  test.setWeatherDependencies({
    blend(locationKey, requestId) {
      blends.push({ locationKey, requestId });
    },
    knmiPoint(_location, options) {
      knmiPointOptions.push({ ...options });
      return knmiPointRain.promise;
    },
    point(_location, options) {
      pointOptions.push({ ...options });
      return pointRain.promise;
    },
    render(data) {
      renders.push(data.id);
    },
    status() {},
  });
  const context = test.createDataLoadContext();
  context.signal = new AbortController().signal;
  await withTimeout(
    test.loadWeather(context),
    "base forecast render while point-rain enrichment is pending",
  );
  assert.deepEqual(pointOptions, [{ forceRefresh: true }]);
  assert.deepEqual(knmiPointOptions, [{ forceRefresh: true }]);
  assert.deepEqual(renders, ["base"], "Open-Meteo should render before point rain finishes");
  assert.equal(blends.length, 0);

  pointRain.resolve();
  await flushPromises();
  assert.equal(blends.length, 1, "point rain should enrich the already visible forecast");
  knmiPointRain.resolve();
  await flushPromises();
  assert.equal(blends.length, 2);
}

{
  const test = createHarness();
  const downloadCalls = [];
  const timing = { paths: {} };
  test.setKnmiRadarDownload(async (options) => {
    downloadCalls.push(options);
    return { id: "manual-refresh" };
  });

  const radar = await test.fetchKnmiRadar({ forceRefresh: true, timing });
  assert.equal(radar.id, "manual-refresh");
  assert.equal(downloadCalls.length, 1);
  assert.equal(
    downloadCalls[0].forceMetadataRefresh,
    true,
    "a forced radar refresh must also bypass the client-side KNMI metadata cache",
  );
  assert.equal(downloadCalls[0].timing, timing);
}

{
  const test = createHarness();
  const renderCalls = [];
  test.setBlendRenderers({
    fiveDay() {
      renderCalls.push("five-day");
    },
    selected() {
      renderCalls.push("selected");
    },
    selectedDate() {
      return new Date(0);
    },
    timeline() {
      renderCalls.push("timeline");
    },
  });

  const firstContext = test.createDataLoadContext();
  firstContext.signal = new AbortController().signal;
  test.renderWeather({ current: { time: 1_755_600_000 } }, firstContext);
  assert.deepEqual(renderCalls, ["five-day", "selected", "timeline"]);

  renderCalls.length = 0;
  test.renderWeatherForRadarBlend(test.getSelectedLocationKey(), firstContext.requestId);
  assert.deepEqual(renderCalls, ["five-day", "selected", "timeline"]);

  renderCalls.length = 0;
  const latestContext = test.createDataLoadContext();
  latestContext.signal = new AbortController().signal;
  test.renderWeatherForRadarBlend(test.getSelectedLocationKey(), firstContext.requestId);
  assert.deepEqual(renderCalls, [], "point rain from an obsolete load must not rerender old weather");

  test.renderWeather({ current: { time: 1_755_603_600 } }, latestContext);
  renderCalls.length = 0;
  test.renderWeatherForRadarBlend(test.getSelectedLocationKey(), latestContext.requestId);
  assert.deepEqual(renderCalls, ["five-day", "selected", "timeline"]);
}

{
  const test = createHarness();
  const renderCalls = [];
  test.setBlendRenderers({
    fiveDay() {
      renderCalls.push("five-day");
    },
    selected() {
      renderCalls.push("selected");
    },
    selectedDate() {
      return new Date(0);
    },
    timeline() {
      renderCalls.push("timeline");
    },
  });
  const context = test.createDataLoadContext();
  context.signal = new AbortController().signal;
  test.setStatusMessage("Location not found", { isError: true });
  test.renderWeather({ current: { time: 1_755_600_000 } }, context);
  assert.deepEqual(renderCalls, ["five-day", "selected", "timeline"], "weather data should still render");
  assert.deepEqual({ ...test.getStatus() }, {
    isError: true,
    message: "Location not found",
    revision: 1,
  }, "an older forecast must not overwrite a newer location status");
}

{
  const test = createHarness();
  const oldResponse = createDeferred();
  const latestResponse = createDeferred();
  let fetchCount = 0;
  const renderedIds = [];
  const statuses = [];
  test.setFetch(() => {
    fetchCount += 1;
    return fetchCount === 1 ? oldResponse.promise : latestResponse.promise;
  });
  test.setWeatherDependencies({
    blend() {},
    knmiPoint: async () => undefined,
    point: async () => undefined,
    render(data) {
      renderedIds.push(data.id);
    },
    status(message) {
      statuses.push(message);
    },
  });

  const oldContext = test.createDataLoadContext();
  oldContext.signal = new AbortController().signal;
  const oldLoad = test.loadWeather(oldContext);
  const latestContext = test.createDataLoadContext();
  latestContext.signal = new AbortController().signal;
  const latestLoad = test.loadWeather(latestContext);

  latestResponse.resolve(forecastResponse({ id: "latest" }));
  await latestLoad;
  oldResponse.resolve(forecastResponse({ id: "old" }));
  await oldLoad;
  assert.deepEqual(renderedIds, ["latest"]);
  assert.deepEqual(statuses, []);
}

{
  const test = createHarness();
  const oldResponse = createDeferred();
  test.setFetch(() => oldResponse.promise);
  test.setWeatherDependencies({
    blend() {},
    knmiPoint: async () => undefined,
    point: async () => undefined,
    render() {
      throw new Error("stale forecast rendered");
    },
    status() {
      throw new Error("stale forecast changed status");
    },
  });
  const oldContext = test.createDataLoadContext();
  oldContext.signal = new AbortController().signal;
  const oldLoad = test.loadWeather(oldContext);
  test.createDataLoadContext();
  oldResponse.resolve({ ok: false, status: 503 });
  await oldLoad;
}

{
  const test = createHarness();
  const parisResponse = createDeferred();
  const utrechtResponse = createDeferred();
  let fetchCount = 0;
  test.setFetch(() => {
    fetchCount += 1;
    return fetchCount === 1 ? parisResponse.promise : utrechtResponse.promise;
  });

  test.setLocationInput("Par");
  const parisSearch = test.searchLocationSuggestions("Par");
  test.setLocationInput("Utr");
  const utrechtSearch = test.searchLocationSuggestions("Utr");
  utrechtResponse.resolve(forecastResponse({
    results: [{ name: "Utrecht", latitude: 52.09, longitude: 5.12 }],
  }));
  await withTimeout(utrechtSearch, "latest location autocomplete");
  parisResponse.resolve(forecastResponse({
    results: [{ name: "Paris", latitude: 48.86, longitude: 2.35 }],
  }));
  await withTimeout(parisSearch, "stale location autocomplete");

  const results = Array.from(test.getLocationSearchResults(), ({ name }) => name);
  assert.deepEqual(results, ["Utrecht"], "stale autocomplete results must not replace the latest query");
  const autocompleteState = test.getLocationAutocompleteState();
  assert.equal(autocompleteState.activeIndex, 0);
  assert.match(autocompleteState.activeDescendant, /^location-option-\d+-0$/);
  assert.equal(autocompleteState.options[0].selected, "true");
}

{
  const test = createHarness();
  const appliedLocations = [];
  let fetchCount = 0;
  test.setLocationInput("Ut");
  test.setFetch(async () => {
    fetchCount += 1;
    return forecastResponse({ results: [] });
  });
  test.setApplyLocation((location) => {
    appliedLocations.push(location);
  });
  test.setLocationSearchResults([
    { name: "Utrecht", latitude: 52.09, longitude: 5.12, timezone: "Europe/Amsterdam" },
    { name: "Utrechtse Heuvelrug", latitude: 52.04, longitude: 5.35, timezone: "Europe/Amsterdam" },
    { name: "Utting", latitude: 48.03, longitude: 11.09, timezone: "Europe/Berlin" },
  ]);

  let state = test.getLocationAutocompleteState();
  assert.equal(state.hidden, false);
  assert.equal(state.expanded, "true");
  assert.equal(state.activeIndex, 0);
  assert.equal(state.inputValue, "Ut", "showing suggestions must not replace the typed query");
  assert.match(state.activeDescendant, /^location-option-\d+-0$/);
  assert.deepEqual(Array.from(state.options, ({ active, role, selected, tabIndex }) => ({ active, role, selected, tabIndex })), [
    { active: true, role: "option", selected: "true", tabIndex: -1 },
    { active: false, role: "option", selected: "false", tabIndex: -1 },
    { active: false, role: "option", selected: "false", tabIndex: -1 },
  ]);

  const down = createKeyEvent("ArrowDown");
  test.handleLocationInputKeydown(down);
  state = test.getLocationAutocompleteState();
  assert.equal(down.defaultPrevented, true);
  assert.equal(state.activeIndex, 1);
  assert.equal(state.options[1].scrollCalls, 1);
  assert.equal(state.inputValue, "Ut");

  test.handleLocationInputKeydown(createKeyEvent("ArrowDown"));
  test.handleLocationInputKeydown(createKeyEvent("ArrowDown"));
  state = test.getLocationAutocompleteState();
  assert.equal(state.activeIndex, 2, "ArrowDown should stop at the final result");
  assert.equal(state.options.filter(({ selected }) => selected === "true").length, 1);

  test.handleLocationInputKeydown(createKeyEvent("ArrowUp"));
  state = test.getLocationAutocompleteState();
  assert.equal(state.activeIndex, 1);

  const enter = createKeyEvent("Enter");
  test.handleLocationInputKeydown(enter);
  assert.equal(enter.defaultPrevented, true);
  assert.equal(appliedLocations.length, 1);
  assert.equal(appliedLocations[0].name, "Utrechtse Heuvelrug");
  assert.equal(fetchCount, 0, "Enter should commit the visible result without another geocoding request");
  state = test.getLocationAutocompleteState();
  assert.equal(state.hidden, true);
  assert.equal(state.activeIndex, -1);
  assert.equal(state.activeDescendant, null);
}

{
  const test = createHarness();
  const appliedLocations = [];
  test.setApplyLocation((location) => {
    appliedLocations.push(location);
  });
  test.setLocationInput("Par");
  test.setLocationSearchResults([
    { name: "Paris", latitude: 48.86, longitude: 2.35, timezone: "Europe/Paris" },
    { name: "Parma", latitude: 44.8, longitude: 10.33, timezone: "Europe/Rome" },
  ]);
  test.handleLocationInputKeydown(createKeyEvent("ArrowDown"));

  const escape = createKeyEvent("Escape");
  test.handleLocationInputKeydown(escape);
  let state = test.getLocationAutocompleteState();
  assert.equal(escape.defaultPrevented, true);
  assert.equal(state.hidden, true);
  assert.equal(state.expanded, "false");
  assert.equal(state.activeIndex, -1);
  assert.equal(state.activeDescendant, null);
  assert.equal(state.inputValue, "Par");
  assert.equal(appliedLocations.length, 0);

  test.setLocationSearchResults([
    { name: "Paris", latitude: 48.86, longitude: 2.35, timezone: "Europe/Paris" },
    { name: "Parma", latitude: 44.8, longitude: 10.33, timezone: "Europe/Rome" },
  ]);
  const tab = createKeyEvent("Tab");
  test.handleLocationInputKeydown(tab);
  state = test.getLocationAutocompleteState();
  assert.equal(tab.defaultPrevented, false);
  assert.equal(state.hidden, true);
  assert.equal(appliedLocations.length, 0, "Tab must not commit the active result");

  test.setLocationSearchResults([
    { name: "Paris", latitude: 48.86, longitude: 2.35, timezone: "Europe/Paris" },
  ]);
  const composingEnter = createKeyEvent("Enter", { isComposing: true });
  test.handleLocationInputKeydown(composingEnter);
  const imeEnter = createKeyEvent("Enter", { keyCode: 229 });
  test.handleLocationInputKeydown(imeEnter);
  assert.equal(composingEnter.defaultPrevented, false);
  assert.equal(imeEnter.defaultPrevented, false);
  assert.equal(appliedLocations.length, 0, "IME confirmation must not choose a location");
}

{
  const test = createHarness();
  const pendingResponse = createDeferred();
  test.setLocationInput("Ber");
  test.setFetch(() => pendingResponse.promise);
  const pendingSearch = test.searchLocationSuggestions("Ber");
  test.hideLocationOptions();
  pendingResponse.resolve(forecastResponse({
    results: [{ name: "Berlin", latitude: 52.52, longitude: 13.4 }],
  }));
  await withTimeout(pendingSearch, "dismissed location autocomplete");

  let state = test.getLocationAutocompleteState();
  assert.equal(state.hidden, true, "a dismissed pending search must not reopen the popup");
  assert.equal(state.activeIndex, -1);
  assert.equal(state.activeDescendant, null);

  const reopen = createKeyEvent("ArrowDown");
  test.handleLocationInputKeydown(reopen);
  state = test.getLocationAutocompleteState();
  assert.equal(reopen.defaultPrevented, true);
  assert.equal(state.hidden, false);
  assert.equal(state.activeIndex, 0);
}

{
  const test = createHarness();
  const appliedLocations = [];
  test.setApplyLocation((location) => {
    appliedLocations.push(location);
  });
  test.setLocationInput("Ams");
  test.setLocationSearchResults([
    { name: "Amsterdam", latitude: 52.37, longitude: 4.9 },
    { name: "Amsterdam Airport Schiphol", latitude: 52.31, longitude: 4.76 },
  ]);
  test.dispatchLocationOptionEvent(1, "pointermove", { pointerType: "mouse" });
  let state = test.getLocationAutocompleteState();
  assert.equal(state.activeIndex, 1);
  assert.equal(state.options.filter(({ selected }) => selected === "true").length, 1);
  test.dispatchLocationOptionEvent(1, "click");
  assert.equal(appliedLocations[0].name, "Amsterdam Airport Schiphol");
}

{
  const test = createHarness();
  test.setLocationInput("Ams");
  test.setLocationSearchResults([
    { name: "Amsterdam", latitude: 52.37, longitude: 4.9 },
    { name: "Amsterdam Airport Schiphol", latitude: 52.31, longitude: 4.76 },
  ]);
  test.handleLocationInputKeydown(createKeyEvent("ArrowDown"));
  test.setLocationInput("B");
  test.handleLocationInput();
  let state = test.getLocationAutocompleteState();
  assert.equal(state.hidden, true);
  assert.equal(state.activeIndex, -1);
  assert.equal(state.activeDescendant, null);

  test.setLocationInput("Ber");
  test.setLocationSearchResults([
    { name: "Berlin", latitude: 52.52, longitude: 13.4 },
  ]);
  state = test.getLocationAutocompleteState();
  assert.equal(state.activeIndex, 0, "a new result set should activate its first option");

  test.setLocationSearchResults([]);
  state = test.getLocationAutocompleteState();
  assert.equal(state.hidden, true);
  assert.equal(state.expanded, "false");
  assert.equal(state.activeIndex, -1);
  assert.equal(state.activeDescendant, null);
}

{
  const test = createHarness();
  const appliedLocations = [];
  let fetchCount = 0;
  test.setLocationInput("Rome");
  test.setApplyLocation((location) => {
    appliedLocations.push(location);
  });
  test.setFetch(async () => {
    fetchCount += 1;
    return forecastResponse({
      results: [{ name: "Rome", latitude: 41.9, longitude: 12.5, timezone: "Europe/Rome" }],
    });
  });

  await withTimeout(test.selectTypedLocation(), "typed location fallback without visible suggestions");
  assert.equal(fetchCount, 1);
  assert.equal(appliedLocations[0].name, "Rome");
}

{
  const test = createHarness();
  const position = createDeferred();
  let appliedLocation;
  const statusBeforeGps = { ...test.getStatus() };
  test.setGeolocationDependencies({
    apply(location) {
      appliedLocation = location;
    },
    async currentLocation() {
      return { name: "GPS", lat: 52.1, lon: 5.1, timezone: "Europe/Amsterdam" };
    },
    position() {
      return position.promise;
    },
  });
  const gpsRequest = test.requestCurrentLocation();
  assert.deepEqual({ ...test.getControls() }, {
    appLoading: false,
    locateAriaBusy: true,
    locateAriaLabel: "Updating current location",
    locateDisabled: true,
    locateTitle: "Updating current location",
    locationDisabled: false,
    refreshAriaBusy: false,
    refreshDisabled: false,
  }, "only the active GPS request should make its own button busy");
  test.setLoading(false);
  assert.equal(test.getControls().locateDisabled, true, "weather loading state must not control the GPS button");
  test.setLocationInput("U");
  test.handleLocationInput();
  assert.equal(test.getControls().locateAriaLabel, "Use current location");
  assert.equal(test.getControls().locateTitle, "Use current location");
  assert.deepEqual({ ...test.getStatus() }, statusBeforeGps, "superseding GPS should restore its previous status");
  position.resolve({ coords: { latitude: 52.1, longitude: 5.1 } });
  await withTimeout(gpsRequest, "GPS superseded while position is pending");
  assert.equal(appliedLocation, undefined, "a late GPS result must not override a newer manual intent");
  assert.equal(test.getControls().locateDisabled, false);
  assert.equal(test.getControls().locateAriaBusy, false);
}

{
  const test = createHarness();
  const gpsPosition = createDeferred();
  const weatherRun = createDeferred();
  const radarRun = createDeferred();
  test.setBlendRenderers({
    fiveDay() {},
    selected() {},
    selectedDate() {
      return new Date(0);
    },
    timeline() {},
  });
  test.setGeolocationDependencies({
    apply() {},
    async currentLocation() {
      return { name: "GPS", lat: 52.1, lon: 5.1, timezone: "Europe/Amsterdam" };
    },
    position() {
      return gpsPosition.promise;
    },
  });
  test.setLoaders(
    (context) => weatherRun.promise.then(() => {
      test.renderWeather({ current: { time: 1_755_600_000 } }, context);
    }),
    () => radarRun.promise,
  );

  const gpsRequest = test.requestCurrentLocation();
  const refresh = test.loadAll();
  test.setLocationInput("U");
  test.handleLocationInput();
  weatherRun.resolve();
  radarRun.resolve();
  await withTimeout(refresh, "forecast refresh superseding GPS status");
  assert.match(test.getStatus().message, /^Checked /, "the current refresh should own status after GPS is superseded");

  gpsPosition.resolve({ coords: { latitude: 52.1, longitude: 5.1 } });
  await withTimeout(gpsRequest, "superseded GPS cleanup after a completed refresh");
}

{
  const test = createHarness();
  const gpsPosition = createDeferred();
  const weatherRun = createDeferred();
  const radarRun = createDeferred();
  test.setBlendRenderers({
    fiveDay() {},
    selected() {},
    selectedDate() {
      return new Date(0);
    },
    timeline() {},
  });
  test.setGeolocationDependencies({
    apply() {},
    async currentLocation() {
      return { name: "GPS", lat: 52.1, lon: 5.1, timezone: "Europe/Amsterdam" };
    },
    position() {
      return gpsPosition.promise;
    },
  });
  test.setLoaders(
    (context) => weatherRun.promise.then(() => {
      test.renderWeather({ current: { time: 1_755_600_000 } }, context);
    }),
    () => radarRun.promise,
  );

  const refresh = test.loadAll();
  const gpsRequest = test.requestCurrentLocation();
  weatherRun.resolve();
  radarRun.resolve();
  await withTimeout(refresh, "forecast completion underneath GPS status");
  assert.equal(test.getStatus().message, "Locating...", "GPS should remain the visible status while it owns the UI");

  test.setLocationInput("U");
  test.handleLocationInput();
  assert.match(test.getStatus().message, /^Checked /, "superseding GPS should reveal the completed refresh status");

  gpsPosition.resolve({ coords: { latitude: 52.1, longitude: 5.1 } });
  await withTimeout(gpsRequest, "GPS cleanup after an underlying refresh completes");
}

{
  const test = createHarness();
  const reverseGeocoding = createDeferred();
  let reverseGeocodingCalls = 0;
  let appliedLocation;
  test.setGeolocationDependencies({
    apply(location) {
      appliedLocation = location;
    },
    currentLocation() {
      reverseGeocodingCalls += 1;
      return reverseGeocoding.promise;
    },
    async position() {
      return { coords: { latitude: 52.1, longitude: 5.1 } };
    },
  });

  const gpsRequest = test.requestCurrentLocation();
  await flushPromises();
  assert.equal(reverseGeocodingCalls, 1);
  test.setLocationInput("U");
  test.handleLocationInput();
  reverseGeocoding.resolve({ name: "GPS", lat: 52.1, lon: 5.1, timezone: "Europe/Amsterdam" });
  await withTimeout(gpsRequest, "GPS superseded while reverse geocoding is pending");
  assert.equal(appliedLocation, undefined, "a named GPS result must not override newer typing");
  assert.equal(test.getControls().locateDisabled, false);
}

{
  const test = createHarness();
  const permission = createDeferred();
  let positionCalls = 0;
  let locationRenders = 0;
  test.setSelectedLocation({
    name: "Current location",
    lat: 52.3676,
    lon: 4.9041,
    source: "current",
    timezone: "Europe/Amsterdam",
  });
  test.setGeolocationDependencies({
    apply() {},
    async currentLocation() {
      return {};
    },
    permission() {
      return permission.promise;
    },
    async position() {
      positionCalls += 1;
      return {};
    },
    render() {
      locationRenders += 1;
    },
    status() {},
  });

  const automaticRefresh = test.refreshCurrentLocationIfAllowed();
  test.setLocationInput("U");
  test.handleLocationInput();
  permission.resolve("denied");
  const didRefresh = await withTimeout(automaticRefresh, "stale geolocation permission query");
  assert.equal(didRefresh, false);
  assert.equal(positionCalls, 0, "stale permission results must not start geolocation");
  assert.equal(locationRenders, 0, "stale permission results must not erase typed text");
}

{
  const test = createHarness();
  const reverseGeocoding = createDeferred();
  let locationRenders = 0;
  let savedLocations = 0;
  test.setSelectedLocation({
    name: "Current location",
    lat: 52.3676,
    lon: 4.9041,
    source: "current",
    timezone: "Europe/Amsterdam",
  });
  test.setStoredLocationHydrationDependencies({
    render() {
      locationRenders += 1;
    },
    reverse() {
      return reverseGeocoding.promise;
    },
    save() {
      savedLocations += 1;
    },
  });

  const hydration = test.hydrateStoredCurrentLocationName();
  test.setLocationInput("U");
  test.handleLocationInput();
  reverseGeocoding.resolve({ name: "Amsterdam", label: "Amsterdam, Netherlands" });
  await withTimeout(hydration, "stale stored-location name hydration");
  assert.equal(locationRenders, 0, "late stored-location naming must not erase typed text");
  assert.equal(savedLocations, 0, "stale stored-location naming must not be persisted");
}

{
  const test = createHarness();
  const libreLoad = createDeferred();
  let disabledRadarCalls = 0;
  test.setSelectedLocation({ name: "Paris", lat: 48.8566, lon: 2.3522, timezone: "Europe/Paris" });
  test.setRadarDependencies({
    disable() {
      disabledRadarCalls += 1;
    },
    libre() {
      return libreLoad.promise;
    },
    status() {},
    update() {},
  });
  const oldRadarLoad = test.loadRadar();
  test.setSelectedLocation({ name: "Amsterdam", lat: 52.3676, lon: 4.9041, timezone: "Europe/Amsterdam" });
  test.createRadarLoadContext();
  libreLoad.reject(new Error("obsolete LibreWXR failure"));
  await withTimeout(oldRadarLoad, "stale radar failure");
  assert.equal(disabledRadarCalls, 0, "an obsolete radar failure must not disable the latest radar");
}

{
  const test = createHarness();
  const libreResponse = createDeferred();
  test.setSelectedLocation({ name: "Paris", lat: 48.8566, lon: 2.3522, timezone: "Europe/Paris" });
  const oldContext = test.createRadarLoadContext();
  test.setRadarState({ frames: [{ sentinel: true }], source: "hybrid" });
  test.setFetch(() => libreResponse.promise);
  const oldLibreLoad = test.loadLibreWxrRadar(oldContext);

  test.setSelectedLocation({ name: "Amsterdam", lat: 52.3676, lon: 4.9041, timezone: "Europe/Amsterdam" });
  test.createRadarLoadContext();
  libreResponse.resolve(forecastResponse({
    host: "https://example.test",
    radar: {
      nowcast: [{ path: "/new", time: 2 }],
      past: [{ path: "/old", time: 1 }],
    },
  }));
  await oldLibreLoad;
  const radarState = test.getRadarState();
  assert.equal(radarState.displayedRadarSource, "hybrid");
  assert.equal(radarState.radarFrames[0].sentinel, true, "stale LibreWXR must not replace newer Dutch radar");
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  const progressive = configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });
  const context = test.createRadarLoadContext();
  const radarLoad = test.loadHybridRadar(context);

  assert.deepEqual(progressive.fetches, [
    { forceRefresh: true, hasTiming: true, source: "knmi" },
    { forceRefresh: true, hasTiming: true, modeId: "3h", source: "buienradar" },
  ], "KNMI and Buienradar should start together");

  knmiRun.resolve({ id: "knmi-first" });
  await withTimeout(radarLoad, "KNMI-first progressive radar");
  assert.deepEqual(progressive.displays, [
    { id: "knmi-first", preserveSelection: false, source: "knmi" },
  ], "fresh KNMI should display without waiting for Buienradar");
  assert.equal(progressive.preloadCalls, 0);

  buienradarRun.resolve({ id: "buienradar-late" });
  await flushPromises();
  assert.deepEqual(progressive.displays, [
    { id: "knmi-first", preserveSelection: false, source: "knmi" },
    {
      buienradarId: "buienradar-late",
      knmiId: "knmi-first",
      preserveSelection: true,
      source: "hybrid",
    },
  ], "late Buienradar should enrich the visible KNMI radar in place");
  assert.equal(progressive.preloadCalls, 1);
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  const progressive = configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });
  let disabledRadarCalls = 0;
  let libreFallbackCalls = 0;
  test.setRadarDependencies({
    disable() {
      disabledRadarCalls += 1;
    },
    libre() {
      libreFallbackCalls += 1;
      return Promise.resolve();
    },
    status() {},
    update() {},
  });

  const radarLoad = test.loadRadar();
  knmiRun.resolve({ id: "knmi-only" });
  await withTimeout(radarLoad, "KNMI radar with failed Buienradar enrichment");
  buienradarRun.reject(new Error("Buienradar unavailable"));
  await flushPromises();

  assert.deepEqual(progressive.displays, [
    { id: "knmi-only", preserveSelection: false, source: "knmi" },
  ]);
  assert.equal(libreFallbackCalls, 0, "a usable KNMI radar must not fall back to LibreWXR");
  assert.equal(disabledRadarCalls, 0, "a late Buienradar failure must not disable KNMI");
  assert.equal(test.getRadarState().displayedRadarSource, "knmi");
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const weatherRun = createDeferred();
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  const progressive = configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });
  const realRadarLoader = test.loadRadar;
  test.setLoaders(() => weatherRun.promise, realRadarLoader);
  test.setRadarDependencies({
    disable() {},
    libre: async () => undefined,
    status() {},
    update() {},
  });

  const refresh = test.loadAll();
  weatherRun.resolve();
  await flushPromises();
  assert.equal(test.getControls().appLoading, true, "weather alone must not end loading before radar is usable");
  assert.equal(test.getControls().refreshDisabled, true);

  knmiRun.resolve({ id: "knmi-refresh" });
  await withTimeout(refresh, "refresh ending at first usable radar");
  assert.equal(test.getControls().appLoading, false, "weather plus KNMI should end the main loading state");
  assert.equal(test.getControls().refreshDisabled, false);
  assert.deepEqual(progressive.displays, [
    { id: "knmi-refresh", preserveSelection: false, source: "knmi" },
  ], "the refresh should finish while Buienradar is still pending");

  buienradarRun.resolve({ id: "buienradar-background" });
  await flushPromises();
  assert.deepEqual(progressive.displays.map(({ source }) => source), ["knmi", "hybrid"]);
  assert.equal(test.getControls().appLoading, false, "background enrichment must not restart the main spinner");
  assert.equal(test.getControls().refreshDisabled, false);
}

{
  const test = createHarness();
  const startTimeMs = Date.UTC(2026, 7, 21, 10, 0, 0);
  const radar = test.createRadarFixtures(startTimeMs);
  test.stubRadarRenderingSideEffects();

  test.displayKnmiRadar(radar.knmi);
  assert.equal(test.getRadarUiState().sliderMax, 2400);
  test.setRadarSliderSelection(1200);
  const beforeHybrid = test.getRadarUiState();
  assert.equal(beforeHybrid.activeTimeMs, startTimeMs + 60 * 60 * 1000);
  assert.equal(beforeHybrid.sliderWasAtStart, false);

  test.displayHybridRadar(radar.knmi, radar.buienradar, { preserveSelection: true });
  const afterHybrid = test.getRadarUiState();
  assert.equal(afterHybrid.source, "hybrid");
  assert.equal(afterHybrid.sliderMax, 3600, "Buienradar should extend the range to three hours");
  assert.equal(afterHybrid.sliderValue, 1200, "hybrid enrichment must preserve time, not reset or preserve percentage");
  assert.equal(afterHybrid.activeTimeMs, beforeHybrid.activeTimeMs, "the absolute selected radar time must stay unchanged");
  assert.equal(afterHybrid.sliderWasAtStart, false);
  assert.equal(afterHybrid.radarTime, beforeHybrid.radarTime);
  assert.equal(afterHybrid.ariaValue, beforeHybrid.ariaValue);
}

{
  const test = createHarness();
  const startTimeMs = Date.UTC(2026, 7, 21, 10, 0, 0);
  const radar = test.createRadarFixtures(startTimeMs);
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  let disabledRadarCalls = 0;
  let libreFallbackCalls = 0;
  let preloadCalls = 0;
  let radarLoaderReturned = false;
  test.stubRadarRenderingSideEffects();
  test.displayHybridRadar(radar.knmi, radar.buienradar);
  test.setRadarSliderSelection(3000);
  const retainedState = test.getRadarUiState();
  assert.equal(retainedState.sliderMax, 3600);
  assert.equal(retainedState.activeTimeMs, startTimeMs + 150 * 60 * 1000);

  test.setHybridRadarDependencies({
    fetchBuienradar() {
      return buienradarRun.promise;
    },
    fetchKnmi() {
      return knmiRun.promise;
    },
    schedulePreload() {
      preloadCalls += 1;
    },
  });
  test.setRadarDependencies({
    disable() {
      disabledRadarCalls += 1;
    },
    libre() {
      libreFallbackCalls += 1;
      return Promise.resolve();
    },
    status() {},
    update() {},
  });
  const realRadarLoader = test.loadRadar;
  test.setLoaders(
    async () => undefined,
    async (options) => {
      await realRadarLoader(options);
      radarLoaderReturned = true;
    },
  );

  const refresh = test.loadAll();
  knmiRun.resolve(radar.knmi);
  await flushPromises();
  await withTimeout(refresh, "retained hybrid refresh after fresh KNMI");

  const knmiRefreshedState = test.getRadarUiState();
  assert.equal(radarLoaderReturned, true, "loadRadar should return while fresh Buienradar remains pending");
  assert.equal(test.getControls().appLoading, false, "loadAll should finish with the retained hybrid usable");
  assert.equal(knmiRefreshedState.source, "hybrid", "fresh KNMI must combine with retained Buienradar");
  assert.equal(knmiRefreshedState.sliderMax, 3600, "the retained Buienradar range must stay available");
  assert.equal(knmiRefreshedState.sliderValue, retainedState.sliderValue);
  assert.equal(knmiRefreshedState.activeTimeMs, retainedState.activeTimeMs);
  assert.equal(knmiRefreshedState.radarTime, retainedState.radarTime);
  assert.equal(knmiRefreshedState.ariaValue, retainedState.ariaValue);

  buienradarRun.reject(new Error("fresh Buienradar unavailable"));
  await flushPromises();
  const failedBuienradarState = test.getRadarUiState();
  assert.equal(failedBuienradarState.source, "hybrid", "a failed refresh must not downgrade retained hybrid to KNMI-only");
  assert.equal(failedBuienradarState.sliderMax, 3600);
  assert.equal(failedBuienradarState.sliderValue, retainedState.sliderValue);
  assert.equal(failedBuienradarState.activeTimeMs, retainedState.activeTimeMs);
  assert.equal(libreFallbackCalls, 0);
  assert.equal(disabledRadarCalls, 0);
  assert.equal(preloadCalls, 0);
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  const progressive = configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });
  const obsoleteContext = test.createRadarLoadContext();
  const obsoleteLoad = test.loadHybridRadar(obsoleteContext);

  knmiRun.resolve({ id: "obsolete-knmi" });
  await withTimeout(obsoleteLoad, "first radar before superseding load");
  test.createRadarLoadContext();
  buienradarRun.resolve({ id: "obsolete-buienradar" });
  await flushPromises();

  assert.deepEqual(progressive.displays, [
    { id: "obsolete-knmi", preserveSelection: false, source: "knmi" },
  ], "late enrichment from an obsolete radar load must not render");
  assert.equal(progressive.preloadCalls, 0);
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  const progressive = configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });
  const context = test.createRadarLoadContext();
  const radarLoad = test.loadHybridRadar(context);

  buienradarRun.resolve({ id: "buienradar-fast" });
  await flushPromises();
  assert.deepEqual(progressive.displays, [], "Buienradar should briefly wait for preferred KNMI");
  assert.equal(windowTimers.pendingCount, 1);
  const preferenceDelayMs = windowTimers.runNext();
  assert.ok(preferenceDelayMs > 0, "the KNMI preference should use a soft positive deadline");

  await withTimeout(radarLoad, "Buienradar fallback after KNMI preference deadline");
  assert.deepEqual(progressive.displays, [
    { id: "buienradar-fast", preserveSelection: false, source: "buienradar" },
  ]);

  knmiRun.resolve({ id: "knmi-late" });
  await flushPromises();
  assert.deepEqual(progressive.displays, [
    { id: "buienradar-fast", preserveSelection: false, source: "buienradar" },
    {
      buienradarId: "buienradar-fast",
      knmiId: "knmi-late",
      preserveSelection: true,
      source: "hybrid",
    },
  ], "late KNMI should enrich the deadline fallback without blocking it");
}

for (const timeoutCase of [
  {
    bodyMethod: "text",
    invoke(test) {
      return test.downloadKnmiRadarMetadataResponse();
    },
    label: "KNMI metadata",
    message: "KNMI radar capabilities timed out",
  },
  {
    bodyMethod: "json",
    invoke(test) {
      return test.loadLibreWxrRadar(test.createRadarLoadContext());
    },
    label: "LibreWXR",
    message: "LibreWXR radar timed out",
  },
]) {
  for (const phase of ["headers", "body"]) {
    const windowTimers = createManualWindowTimers();
    const test = createHarness({ windowTimers });
    const stalledFetch = createAbortableFetchStall({
      bodyMethod: timeoutCase.bodyMethod,
      phase,
    });
    test.setFetch(stalledFetch.fetch);

    const operation = timeoutCase.invoke(test);
    await flushPromises();
    assert.ok(stalledFetch.signal, timeoutCase.label + " should receive an abort signal");
    assert.equal(stalledFetch.signal.aborted, false);
    assert.equal(stalledFetch.bodyCalls, phase === "body" ? 1 : 0);
    assert.equal(windowTimers.pendingCount, 1);

    const rejection = assert.rejects(operation, { message: timeoutCase.message });
    const timeoutMs = windowTimers.runNext();
    assert.equal(timeoutMs, 6000, timeoutCase.label + " " + phase + " stall should use the six-second deadline");
    await rejection;
    assert.equal(stalledFetch.signal.aborted, true);
    assert.equal(stalledFetch.abortCount, 1);
    assert.equal(windowTimers.pendingCount, 0);
  }
}

for (const firstFreshSource of ["knmi", "buienradar"]) {
  const test = createHarness();
  const startTimeMs = Date.UTC(2026, 7, 21, 10, 0, 0);
  const radar = test.createRadarFixtures(startTimeMs);
  const runs = {
    buienradar: createDeferred(),
    knmi: createDeferred(),
  };
  const sampleCalls = [];
  test.stubRadarRenderingSideEffects({ preserveRadarStatus: true });
  test.displayHybridRadar(radar.knmi, radar.buienradar);
  test.setRadarSamplePreparers({
    buienradar() {
      sampleCalls.push("buienradar");
    },
    knmi() {
      sampleCalls.push("knmi");
    },
  });
  test.setHybridRadarDependencies({
    fetchBuienradar() {
      return runs.buienradar.promise;
    },
    fetchKnmi() {
      return runs.knmi.promise;
    },
    schedulePreload() {},
  });

  await withTimeout(test.loadRadar(), "retained hybrid refresh start");
  runs[firstFreshSource].resolve(radar[firstFreshSource]);
  await flushPromises();
  assert.deepEqual(
    sampleCalls,
    [firstFreshSource],
    "retained hybrid should sample only the newly refreshed " + firstFreshSource + " half",
  );
  assert.deepEqual({ ...test.getRadarMapStatus() }, {
    hidden: false,
    isError: false,
    message: "Updating rain forecast...",
  }, "the retained hybrid should remain calmly updating after its first fresh source");

  const failedSource = firstFreshSource === "knmi" ? "buienradar" : "knmi";
  runs[failedSource].reject(new Error(failedSource + " unavailable"));
  await flushPromises();
  assert.deepEqual({ ...test.getRadarMapStatus() }, {
    hidden: false,
    isError: true,
    message: "Radar update delayed",
  }, "a partial retained refresh should become an error only after the other source fails");
  assert.deepEqual(sampleCalls, [firstFreshSource]);
  assert.equal(test.getRadarUiState().source, "hybrid");
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const startTimeMs = Date.UTC(2026, 7, 21, 10, 0, 0);
  const radar = test.createRadarFixtures(startTimeMs);
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  const sampleCalls = [];
  test.stubRadarRenderingSideEffects();
  test.setRadarSamplePreparers({
    buienradar() {
      sampleCalls.push("buienradar");
    },
    knmi() {
      sampleCalls.push("knmi");
    },
  });
  test.setHybridRadarDependencies({
    fetchBuienradar() {
      return buienradarRun.promise;
    },
    fetchKnmi() {
      return knmiRun.promise;
    },
    schedulePreload() {},
  });

  const radarLoad = test.loadHybridRadar(test.createRadarLoadContext());
  knmiRun.resolve(radar.knmi);
  buienradarRun.resolve(radar.buienradar);
  await withTimeout(radarLoad, "all-fresh hybrid sampling");
  await flushPromises();
  assert.deepEqual(
    sampleCalls,
    ["knmi", "buienradar"],
    "an ordinary all-fresh hybrid display should prepare both radar sample series",
  );
}

{
  const test = createHarness();
  const startTimeMs = Date.now() - 5 * 60 * 1000;
  const radar = test.createRadarFixtures(startTimeMs);
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  test.stubRadarRenderingSideEffects({ preserveRadarStatus: true });
  test.displayHybridRadar(radar.knmi, radar.buienradar);
  test.setHybridRadarDependencies({
    fetchBuienradar() {
      return buienradarRun.promise;
    },
    fetchKnmi() {
      return knmiRun.promise;
    },
    schedulePreload() {},
  });

  await withTimeout(test.loadRadar(), "retained all-success refresh start");
  knmiRun.resolve(radar.knmi);
  await flushPromises();
  assert.deepEqual({ ...test.getRadarMapStatus() }, {
    hidden: false,
    isError: false,
    message: "Updating rain forecast...",
  });

  buienradarRun.resolve(radar.buienradar);
  await flushPromises();
  assert.deepEqual({ ...test.getRadarMapStatus() }, {
    hidden: false,
    isError: false,
    message: "Updating rain forecast...",
  }, "fresh metadata alone should not clear the updating status before its selected image is ready");

  test.commitCurrentRadarPosition();
  assert.deepEqual({ ...test.getRadarMapStatus() }, {
    hidden: true,
    isError: false,
    message: "Updating rain forecast...",
  }, "the fully fresh retained hybrid clears the updating status when its selected image commits");
}

{
  const analyticsEvents = [];
  const clock = createManualClock();
  const windowTimers = createManualWindowTimers();
  const test = createHarness({
    analyticsEvents,
    hostname: "mymeteo.nl",
    performanceNow: clock.now,
    windowTimers,
  });
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });
  const context = test.createRadarLoadContext({ trigger: "manual_refresh" });
  const radarLoad = test.loadHybridRadar(context);

  clock.advance(240);
  knmiRun.resolve({ id: "knmi-direct-hybrid" });
  buienradarRun.resolve({ id: "buienradar-direct-hybrid" });
  await withTimeout(radarLoad, "direct hybrid timing report");
  await flushPromises();

  const timingEvents = getRadarTimingEvents(analyticsEvents);
  assert.equal(timingEvents.length, 1, "a completed current radar load should emit exactly one timing event");
  assert.equal(timingEvents[0].first_source, "hybrid", "direct hybrid display must not be reported as KNMI-first");
  assert.equal(timingEvents[0].outcome, "hybrid");
  assert.equal(timingEvents[0].trigger, "manual_refresh");
  assert.equal(timingEvents[0].radar_mode, "3h");
  assert.equal(timingEvents[0].knmi_status, "success");
  assert.equal(timingEvents[0].buienradar_status, "success");
  assert.equal(timingEvents[0].knmi_settled_ms, 300);
  assert.equal(timingEvents[0].buienradar_settled_ms, 300);
}

{
  const analyticsEvents = [];
  const clock = createManualClock();
  const windowTimers = createManualWindowTimers();
  const test = createHarness({
    analyticsEvents,
    hostname: "mymeteo.nl",
    performanceNow: clock.now,
    windowTimers,
  });
  const startTimeMs = Date.UTC(2026, 7, 21, 10, 0, 0);
  const radar = test.createRadarFixtures(startTimeMs);
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  test.stubRadarRenderingSideEffects();
  test.displayHybridRadar(radar.knmi, radar.buienradar);
  configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });

  const radarLoad = test.loadRadar({ trigger: "manual_refresh" });
  await withTimeout(radarLoad, "retained radar timing refresh start");
  clock.advance(120);
  knmiRun.resolve({ id: "fresh-knmi-for-retained" });
  await flushPromises();
  clock.advance(150);
  buienradarRun.resolve({ id: "fresh-buienradar-for-retained" });
  await flushPromises();

  const timingEvents = getRadarTimingEvents(analyticsEvents);
  assert.equal(timingEvents.length, 1);
  assert.equal(timingEvents[0].first_source, "retained");
  assert.equal(timingEvents[0].retained_visible, true);
  assert.equal(
    Object.hasOwn(timingEvents[0], "first_usable_ms"),
    false,
    "retained radar should use a boolean flag instead of unsupported numeric zero metadata",
  );
  assert.equal(timingEvents[0].first_fresh_ms, 200);
  assert.equal(timingEvents[0].outcome, "hybrid");
  assert.equal(timingEvents[0].trigger, "manual_refresh");
  assert.equal(timingEvents[0].radar_mode, "3h");
}

{
  const analyticsEvents = [];
  const clock = createManualClock();
  const windowTimers = createManualWindowTimers();
  const test = createHarness({
    analyticsEvents,
    hostname: "mymeteo.nl",
    performanceNow: clock.now,
    windowTimers,
  });
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });
  const context = test.createRadarLoadContext({ trigger: "location_change" });
  const radarLoad = test.loadHybridRadar(context);

  clock.advance(350);
  knmiRun.reject(new Error("KNMI unavailable"));
  await flushPromises();
  clock.advance(420);
  buienradarRun.resolve({ id: "buienradar-after-knmi-failure" });
  await withTimeout(radarLoad, "source failure timing report");
  await flushPromises();

  const timingEvents = getRadarTimingEvents(analyticsEvents);
  assert.equal(timingEvents.length, 1);
  assert.equal(timingEvents[0].knmi_status, "failure");
  assert.equal(timingEvents[0].knmi_settled_ms, 400, "failed sources should retain their settled latency");
  assert.equal(timingEvents[0].buienradar_status, "success");
  assert.equal(timingEvents[0].buienradar_settled_ms, 800);
  assert.equal(timingEvents[0].first_source, "buienradar");
  assert.equal(timingEvents[0].outcome, "buienradar_only");
  assert.equal(timingEvents[0].trigger, "location_change");
}

{
  const analyticsEvents = [];
  const clock = createManualClock();
  const windowTimers = createManualWindowTimers();
  const test = createHarness({
    analyticsEvents,
    hostname: "mymeteo.nl",
    performanceNow: clock.now,
    windowTimers,
  });
  const knmiRun = createDeferred();
  const buienradarRun = createDeferred();
  configureProgressiveRadarHarness(test, { buienradarRun, knmiRun });
  const obsoleteContext = test.createRadarLoadContext({ trigger: "location_change" });
  const obsoleteLoad = test.loadHybridRadar(obsoleteContext);

  test.createRadarLoadContext({ trigger: "manual_refresh" });
  clock.advance(500);
  knmiRun.resolve({ id: "obsolete-knmi-timing" });
  buienradarRun.resolve({ id: "obsolete-buienradar-timing" });
  await withTimeout(obsoleteLoad, "stale timing load completion");
  await flushPromises();

  assert.equal(
    getRadarTimingEvents(analyticsEvents).length,
    0,
    "a stale radar context must not emit production timing analytics",
  );
}


function configureForecastDeadlineTest(test, renders = []) {
  test.setDeadlineDependencies();
  test.setWeatherDependencies({
    blend() {},
    point: async () => {},
    knmiPoint: async () => {},
    render: (data) => renders.push(data.id),
    status: test.setStatusMessage,
  });
  test.setBlendRenderers({ fiveDay() {}, selected() {}, selectedDate: () => new Date(), timeline() {} });
  test.setLoaders(test.loadWeather, async () => {});
}

function gifResponse() {
  return {
    ok: true,
    url: "https://example.test/Animation/202609051200__radar.gif",
    headers: { get: () => "image/gif" },
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

for (const phase of ["headers", "body"]) {
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  configureForecastDeadlineTest(test);
  const stalled = createAbortableFetchStall({ bodyMethod: "json", phase });
  test.setFetch(stalled.fetch);
  const load = test.loadAll();
  await flushPromises();
  assert.equal(test.getControls().refreshDisabled, true);
  assert.equal(windowTimers.runNext(), 10000);
  await withTimeout(load, "forecast " + phase + " deadline releases loading");
  assert.equal(stalled.signal.aborted, true);
  assert.equal(test.getControls().refreshDisabled, false);
  assert.equal(test.getStatus().isError, true);
  assert.match(test.getStatus().message, /Forecast timed out/);
  assert.equal(windowTimers.pendingCount, 0);
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const renders = [];
  const oldBody = createDeferred();
  const latestBody = createDeferred();
  const signals = [];
  configureForecastDeadlineTest(test, renders);
  test.setFetch(async (_url, { signal }) => {
    signals.push(signal);
    return { ok: true, json: () => signals.length === 1 ? oldBody.promise : latestBody.promise };
  });
  const obsoleteLoad = test.loadAll();
  await flushPromises();
  const latestLoad = test.loadAll();
  await flushPromises();
  assert.equal(signals[0].aborted, true, "deadline signal must forward caller supersession");
  await withTimeout(obsoleteLoad, "superseded body ignoring abort still releases old load");
  assert.equal(test.getControls().refreshDisabled, true, "obsolete completion cannot stop the current spinner");
  assert.equal(test.getStatus().isError, false, "supersession stays silent");
  latestBody.resolve({ id: "latest" });
  await latestLoad;
  oldBody.resolve({ id: "obsolete" });
  await flushPromises();
  assert.deepEqual(renders, ["latest"]);
  assert.equal(test.getControls().refreshDisabled, false);
  assert.equal(windowTimers.pendingCount, 0);
}

for (const phase of ["headers", "body"]) {
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const stalled = createAbortableFetchStall({ bodyMethod: "arrayBuffer", phase });
  test.setFetch(stalled.fetch);
  const download = test.fetchBuienradarRadarMode("3h");
  const rejection = assert.rejects(download, /Buienradar radar timed out/);
  await flushPromises();
  assert.equal(windowTimers.runNext(), 10000, "GIF transfer keeps its existing 10s deadline");
  await rejection;
  assert.equal(stalled.signal.aborted, true);
  assert.deepEqual({ ...test.getBuienradarRequestState() }, { pending: 0, cached: 0 });
  assert.equal(windowTimers.pendingCount, 0);
}

for (const phase of ["decode", "image"]) {
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const stalled = createDeferred();
  const revoked = [];
  let decodeCalls = 0;
  let preloadCalls = 0;
  test.setDeadlineDependencies({
    decode: () => {
      decodeCalls += 1;
      return phase === "decode" && decodeCalls === 1 ? stalled.promise : Promise.resolve(["blob:fresh"]);
    },
    preload: () => {
      preloadCalls += 1;
      return phase === "image" && preloadCalls === 1 ? stalled.promise : Promise.resolve(true);
    },
    revoke: (url) => revoked.push(url),
  });
  test.setFetch(async () => gifResponse());
  const failed = test.fetchBuienradarRadarMode("3h");
  const rejection = assert.rejects(failed, /Buienradar radar timed out/);
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.equal(windowTimers.runNext(), 20000, "complete readiness has a 20s total deadline");
  await rejection;
  assert.deepEqual({ ...test.getBuienradarRequestState() }, { pending: 0, cached: 0 });
  const retried = await test.fetchBuienradarRadarMode("3h");
  assert.deepEqual([...retried.frameUrls], ["blob:fresh"]);
  assert.equal(decodeCalls, 2, "a timeout must release in-flight deduplication for retry");
  stalled.resolve(phase === "decode" ? ["blob:late"] : true);
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.deepEqual(revoked, phase === "decode" ? ["blob:late"] : ["blob:fresh"]);
  assert.equal((await test.fetchBuienradarRadarMode("3h")).frameUrls[0], "blob:fresh", "late old readiness cannot replace retry cache");
  assert.equal(windowTimers.pendingCount, 0);
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const pendingModule = createDeferred();
  let parseCalls = 0;
  test.setDeadlineDependencies({ importModule: () => pendingModule.promise });
  test.setFetch(async () => gifResponse());
  const operation = test.fetchBuienradarRadarMode("3h");
  const rejection = assert.rejects(operation, /Buienradar radar timed out/);
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.equal(windowTimers.runNext(), 20000);
  await rejection;
  pendingModule.resolve({ parseGIF() { parseCalls += 1; }, decompressFrames: () => [] });
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.equal(parseCalls, 0, "a late fallback-module load cannot resume an abandoned GIF decode");
  assert.deepEqual({ ...test.getBuienradarRequestState() }, { pending: 0, cached: 0 });
}

for (const phase of ["tracks", "decode", "blob"]) {
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const stalled = createDeferred();
  let decoderClosed = 0;
  let imageClosed = 0;
  let createdUrls = 0;
  const revoked = [];
  let encodedFrames = 0;
  class NativeDecoder {
    tracks = { ready: phase === "tracks" ? stalled.promise : Promise.resolve(), selectedTrack: { frameCount: 2 } };
    decode() {
      if (phase === "decode") return stalled.promise;
      return Promise.resolve({ image: { displayWidth: 2, displayHeight: 2, close() { imageClosed += 1; } } });
    }
    close() { decoderClosed += 1; }
  }
  test.setDeadlineDependencies({
    NativeDecoder,
    canvas: {
      getContext: () => ({ clearRect() {}, drawImage() {} }),
      toBlob(callback) {
        encodedFrames += 1;
        if (phase === "blob" && encodedFrames === 2) {
          stalled.promise.then(callback);
        } else {
          callback({});
        }
      },
    },
    createUrl: () => "blob:decoded-" + (++createdUrls),
    revoke: (url) => revoked.push(url),
  });
  test.setFetch(async () => gifResponse());
  const operation = test.fetchBuienradarRadarMode("3h");
  const rejection = assert.rejects(operation, /Buienradar radar timed out/);
  for (let i = 0; i < 6; i += 1) await flushPromises();
  assert.equal(windowTimers.runNext(), 20000);
  await rejection;
  stalled.resolve(phase === "decode" ? { image: { close() { imageClosed += 1; } } } : {});
  for (let i = 0; i < 6; i += 1) await flushPromises();
  assert.equal(decoderClosed, 1, "abort closes the native decoder once during " + phase);
  assert.equal(createdUrls, phase === "blob" ? 1 : 0, "late encoding must not create another blob URL");
  assert.deepEqual(revoked, phase === "blob" ? ["blob:decoded-1"] : []);
  if (phase === "decode") assert.equal(imageClosed, 1, "a late decoded VideoFrame is closed");
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const images = [];
  const revoked = [];
  test.setDeadlineDependencies({
    decode: async () => ["blob:pending-image"],
    ImageClass: class { constructor() { images.push(this); } },
    revoke: (url) => revoked.push(url),
  });
  test.setFetch(async () => gifResponse());
  const operation = test.fetchBuienradarRadarMode("3h");
  const rejection = assert.rejects(operation, /Buienradar radar timed out/);
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.equal(images[0].src, "blob:pending-image");
  assert.equal(windowTimers.runNext(), 20000);
  await rejection;
  assert.equal(images[0].src, "", "abandon the stalled image request");
  assert.equal(images[0].onload, null);
  assert.equal(images[0].onerror, null);
  assert.deepEqual(revoked, ["blob:pending-image"]);
}

for (const retained of [false, true]) {
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const stalled = createDeferred();
  const statuses = [];
  let fallbackCalls = 0;
  test.setDeadlineDependencies({ decode: () => stalled.promise });
  test.setFetch(async () => gifResponse());
  test.setHybridRadarDependencies({ fetchKnmi: async () => { throw new Error("KNMI unavailable"); } });
  test.setRadarDependencies({
    disable() {},
    libre: async () => { fallbackCalls += 1; },
    status: (message) => statuses.push(message),
    update() {},
  });
  test.setLoaders(async () => {}, test.loadRadar);
  if (retained) test.setRadarState({ source: "hybrid", frames: [{ id: "retained" }] });
  const operation = test.loadAll();
  for (let i = 0; i < 5; i += 1) await flushPromises();
  if (!retained) assert.equal(windowTimers.runNext(), 1500);
  assert.equal(windowTimers.runNext(), 20000);
  await withTimeout(operation, "radar readiness timeout recovers load");
  for (let i = 0; i < 5; i += 1) await flushPromises();
  assert.equal(test.getControls().refreshDisabled, false);
  assert.equal(fallbackCalls, retained ? 0 : 1);
  if (retained) {
    assert.equal(test.getRadarState().radarFrames[0].id, "retained");
    assert.equal(statuses.at(-1), "Radar update delayed");
  }
}

for (const phase of ["load", "error"]) {
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const images = [];
  const revoked = [];
  test.setDeadlineDependencies({
    decode: async () => ["blob:first-frame"],
    ImageClass: class { constructor() { images.push(this); } },
    revoke: (url) => revoked.push(url),
  });
  test.setFetch(async () => gifResponse());
  const operation = test.fetchBuienradarRadarMode("3h");
  const outcome = phase === "error" ? assert.rejects(operation, /first frame did not load/) : operation;
  for (let i = 0; i < 4; i += 1) await flushPromises();
  images[0][phase === "error" ? "onerror" : "onload"]();
  await outcome;
  assert.deepEqual({ ...test.getBuienradarRequestState() }, { pending: 0, cached: phase === "load" ? 1 : 0 });
  assert.deepEqual(revoked, phase === "load" ? [] : ["blob:first-frame"]);
  assert.equal(windowTimers.pendingCount, 0);
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const bitmap = createDeferred();
  let closeCalls = 0;
  test.setDeadlineDependencies({ decode: async () => [], BitmapCreator: () => bitmap.promise });
  test.setFetch(async () => gifResponse());
  const operation = test.fetchBuienradarRadarMode("3h");
  const rejection = assert.rejects(operation, /Buienradar radar timed out/);
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.equal(windowTimers.runNext(), 20000);
  await rejection;
  bitmap.resolve({ close() { closeCalls += 1; } });
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.equal(closeCalls, 1, "a late static fallback ImageBitmap is closed");
  assert.deepEqual({ ...test.getBuienradarRequestState() }, { pending: 0, cached: 0 });
}

{
  const windowTimers = createManualWindowTimers();
  const test = createHarness({ windowTimers });
  const lateFailure = createDeferred();
  test.setDeadlineDependencies({ decode: () => lateFailure.promise });
  test.setFetch(async () => gifResponse());
  const operation = test.fetchBuienradarRadarMode("3h");
  const rejection = assert.rejects(operation, /Buienradar radar timed out/);
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.equal(windowTimers.runNext(), 20000);
  await rejection;
  lateFailure.reject(new Error("Late abandoned decoder rejection"));
  for (let i = 0; i < 4; i += 1) await flushPromises();
  assert.deepEqual({ ...test.getBuienradarRequestState() }, { pending: 0, cached: 0 });
}

console.log("MyMeteo loading race checks passed.");
