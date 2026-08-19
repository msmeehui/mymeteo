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

function createHarness() {
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
    clearTimeout,
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
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setInterval() {
      return 1;
    },
    setTimeout,
  };

  const context = {
    AbortController,
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
    window: windowStub,
  };
  windowStub.document = documentStub;
  windowStub.navigator = context.navigator;

  vm.createContext(context);
  vm.runInContext(
    `${appSource}
globalThis.__mymeteoLoadingTest = {
  beginManualLocationIntent,
  createDataLoadContext,
  createRadarLoadContext,
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
  await Promise.resolve();
  await Promise.resolve();
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
    { forceRefresh: true },
    { forceRefresh: false },
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
  const renders = [];
  const blends = [];
  test.setFetch(async () => forecastResponse({ id: "base" }));
  test.setWeatherDependencies({
    blend(locationKey, requestId) {
      blends.push({ locationKey, requestId });
    },
    knmiPoint() {
      return knmiPointRain.promise;
    },
    point() {
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

console.log("MyMeteo loading race checks passed.");
