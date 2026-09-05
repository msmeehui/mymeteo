import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");

function elementStub() {
  const classes = new Set();
  const attributes = new Map();
  return {
    children: [], dataset: {}, hidden: false, textContent: "", title: "", value: "0",
    listeners: new Map(),
    classList: {
      contains: (name) => classes.has(name),
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle(name, enabled = !classes.has(name)) {
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
    },
    style: { setProperty() {}, removeProperty() {} },
    addEventListener(name, handler) { this.listeners.set(name, handler); },
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    toggleAttribute(name, enabled) {
      if (enabled) attributes.set(name, ""); else attributes.delete(name);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    replaceChildren(...children) { this.children = children; },
    appendChild(child) { this.children.push(child); },
    getBoundingClientRect: () => ({ width: 390, height: 400 }),
    contains: () => false,
  };
}

function harness(failure) {
  const elements = new Map();
  const getElement = (selector) => {
    if (!elements.has(selector)) elements.set(selector, elementStub());
    return elements.get(selector);
  };
  const windowEvents = new Map();
  let animationFrames = 0;
  let removedMaps = 0;
  let refreshTimer;
  const window = {
    location: { origin: "http://localhost", hostname: "localhost", search: "" },
    localStorage: { getItem: () => null, setItem() {} },
    matchMedia: () => ({ matches: false }),
    addEventListener: (name, callback) => windowEvents.set(name, callback),
    requestAnimationFrame(callback) { animationFrames += 1; callback(); return animationFrames; },
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval(callback) { refreshTimer = callback; return 1; },
    clearInterval() {},
  };
  const document = {
    querySelector: getElement,
    querySelectorAll: () => [],
    createElement: elementStub,
    addEventListener() {},
  };
  const context = {
    AbortController, URLSearchParams, window, document, navigator: {},
    console: { warn() {}, error() {} },
  };
  if (failure !== "missing") {
    const map = {
      attributionControl: { setPrefix() {} },
      invalidateSize() {}, setView() {}, removeLayer() {},
      remove() {
        removedMaps += 1;
        if (failure === "cleanup") throw new Error("Partial map cleanup failed");
      },
    };
    const layer = { addTo: () => layer };
    const control = () => ({ addTo() { this.onAdd?.(); return this; } });
    control.zoom = control;
    context.L = {
      map(container) {
        container.children = [{ className: "leaflet-pane" }];
        container.classList.add("leaflet-container", "leaflet-grab");
        container.setAttribute("tabindex", "0");
        if (failure === "constructor") throw new Error("Map initialization failed");
        return map;
      },
      tileLayer() {
        if (failure === "partial" || failure === "cleanup") throw new Error("Base layer initialization failed");
        return layer;
      },
      circleMarker: () => ({ addTo() { return this; }, setLatLng() {} }),
      control,
      DomUtil: { create: () => elementStub() },
      DomEvent: { disableClickPropagation() {}, disableScrollPropagation() {} },
    };
  }
  vm.createContext(context);
  vm.runInContext(`${appSource}
let __forecastLoads = 0;
let __radarLoads = 0;
let __resolveForecast;
let __holdForecast = false;
// Isolate presentation and network responses; retain startup, control binding,
// map initialization, radar dispatch and loadAll's actual completion logic.
renderWeatherIconLegend = () => {};
renderLocation = () => {};
syncForecastViewForViewport = () => {};
hydrateStoredCurrentLocationName = () => {};
setStatusMessage = () => {};
setActiveRadarDate = () => {};
setRainForecastBadgeCurrent = () => {};
updateSliderTimestamps = () => {};
hidePrecipitationTimeline = () => {};
renderWeatherLoadingState = () => {};
loadWeather = async () => {
  __forecastLoads += 1;
  if (__holdForecast) await new Promise((resolve) => { __resolveForecast = resolve; });
};
loadHybridRadar = loadBuienradarRadar = loadKnmiRadar = loadLibreWxrRadar = async () => { __radarLoads += 1; };
globalThis.rules = {
  loadAll, initMap, applyLocation, updateMapLocation, centerMapOnSelectedLocation, refreshMapSize,
  handleRadarSliderInput, toggleBuienradarRadarMode,
  holdForecast() { __holdForecast = true; },
  releaseForecast() { __holdForecast = false; __resolveForecast?.(); },
  state() {
    return {
      forecastLoads: __forecastLoads, radarLoads: __radarLoads,
      mapUnavailable: isMapUnavailable, hasMap: Boolean(map), hasMarker: Boolean(locationMarker),
      hasModeControl: Boolean(buienradarModeControlContainer || buienradarModeButton),
      radarSource: displayedRadarSource,
    };
  },
};`, context, { filename: "app.js" });
  return {
    rules: context.rules, elements, getElement,
    init: () => windowEvents.get("DOMContentLoaded")(),
    automaticRefresh: () => refreshTimer(),
    get animationFrames() { return animationFrames; },
    get removedMaps() { return removedMaps; },
  };
}

async function flushPromises() {
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
}

for (const failure of ["missing", "constructor", "partial", "cleanup"]) {
  const test = harness(failure);
  assert.doesNotThrow(test.init, `${failure}: map failure cannot abort app startup`);
  await flushPromises();
  const state = test.rules.state();
  assert.equal(state.forecastLoads, 1, `${failure}: initial forecast still starts`);
  assert.equal(state.radarLoads, 0, `${failure}: unavailable map skips every radar image loader`);
  assert.equal(state.mapUnavailable, true);
  assert.equal(state.hasMap, false);
  assert.equal(state.hasMarker, false);
  assert.equal(state.hasModeControl, false);
  assert.equal(test.getElement("#radarMap").children.length, 0, "partial panes are removed");
  assert.equal(test.getElement("#radarMap").getAttribute("tabindex"), null, "dead map is not a keyboard stop");
  assert.equal(test.getElement("#radarMap").classList.contains("leaflet-grab"), false);
  assert.equal(test.removedMaps, failure === "partial" || failure === "cleanup" ? 1 : 0);
  assert.equal(test.getElement("#radarMapStatus").textContent, "Map unavailable");
  assert.equal(test.getElement("#radarMapStatus").hidden, false);
  assert.equal(test.getElement("#radarMapStatus").classList.contains("is-error"), true, "unavailable status does not spin");
  assert.equal(test.getElement("#radarSlider").disabled, true);
  assert.equal(test.getElement("#refreshButton").disabled, false);
  for (const [selector, event] of [
    ["#locationForm", "submit"], ["#locationInput", "input"], ["#locateButton", "click"],
    ["#refreshButton", "click"], ["#rainTab", "keydown"], ["#forecastTab", "click"],
    ["#infoButton", "click"], ["#outfitModeToggle", "click"],
  ]) assert.ok(test.getElement(selector).listeners.has(event), `${failure}: ${selector} remains connected`);

  // Refresh stays busy only for the real forecast, not an unusable radar dependency.
  test.rules.holdForecast();
  const refresh = test.rules.loadAll({ radarTrigger: "manual_refresh" });
  assert.equal(test.getElement("#refreshButton").disabled, true);
  test.rules.releaseForecast();
  await refresh;
  assert.equal(test.getElement("#refreshButton").disabled, false);
  assert.equal(test.getElement("#refreshButton").getAttribute("aria-busy"), null);
  assert.equal(test.rules.state().radarLoads, 0);
  assert.equal(test.getElement("#radarMapStatus").textContent, "Map unavailable");

  // Cross the Netherlands radar boundary in each direction without a map instance.
  for (const location of [
    { name: "Paris", lat: 48.8566, lon: 2.3522, timezone: "Europe/Paris" },
    { name: "Utrecht", lat: 52.09, lon: 5.12, timezone: "Europe/Amsterdam" },
  ]) {
    assert.equal(test.rules.applyLocation(location), true);
    await flushPromises();
    assert.equal(test.getElement("#refreshButton").disabled, false);
    assert.equal(test.getElement("#radarMapStatus").textContent, "Map unavailable");
  }
  const beforeLayout = test.animationFrames;
  test.rules.updateMapLocation();
  test.rules.centerMapOnSelectedLocation();
  test.rules.refreshMapSize();
  test.rules.handleRadarSliderInput(100);
  await test.rules.toggleBuienradarRadarMode();
  assert.equal(test.animationFrames, beforeLayout, "absent map does not schedule resize work");
  test.automaticRefresh();
  await flushPromises();
  assert.equal(test.rules.state().forecastLoads, 5);
  assert.equal(test.rules.state().radarLoads, 0);
}

const healthy = harness("none");
healthy.init();
await flushPromises();
assert.equal(healthy.rules.state().hasMap, true);
assert.equal(healthy.rules.state().hasMarker, true);
assert.equal(healthy.rules.state().mapUnavailable, false);
assert.equal(healthy.rules.state().forecastLoads, 1);
assert.equal(healthy.rules.state().radarLoads, 1, "normal map startup still dispatches radar loading");
assert.equal(healthy.removedMaps, 0);

console.log("MyMeteo map failure recovery checks passed.");
