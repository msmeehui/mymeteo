import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");

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

function createHarness() {
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
  vm.runInContext(appSource, context, { filename: "app.js" });
  const run = (source) => vm.runInContext(source, context);
  run(`
    const reviewStart = Date.now() + 60000;
    selectedLocation = { name: 'Berlin', lat: 52.52, lon: 13.405, timezone: 'Europe/Berlin' };
    weatherDataLocationKey = getBuienradarSampleLocationKey(selectedLocation);
    weatherDataLoadRequestId = dataLoadRequestId;
    weatherData = {
      current: { time: reviewStart / 1000, weather_code: 61, is_day: 1, temperature_2m: 20,
        wind_direction_10m: 270, wind_speed_10m: 15 },
      hourly: {
        time: Array.from({ length: 10 }, (_, index) => reviewStart / 1000 + index * 3600),
        weather_code: Array(10).fill(61), precipitation_probability: Array(10).fill(90),
        rain: Array(10).fill(1), showers: Array(10).fill(0), snowfall: Array(10).fill(0),
        temperature_2m: Array(10).fill(20), cape: Array(10).fill(0), is_day: Array(10).fill(1),
        wind_direction_10m: Array(10).fill(270), wind_speed_10m: Array(10).fill(15),
      },
    };
    renderCurrentTemperatureRange = () => {};
    renderRainSourceDebugPanel = () => {};
    refreshMapSize = () => {};
    updateSliderTimestamps = () => {};
    function reviewSample(time, rank = 0, { nearbyRank = 0 } = {}) {
      const exactSignal = getBuienradarChanceSignalForRank(rank);
      const nearbySignal = getBuienradarChanceSignalForRank(nearbyRank);
      const intensitySignal = getBuienradarIntensitySignalForRank(rank);
      return {
        time, signal: Math.max(exactSignal, nearbySignal), exactSignal, nearbySignal,
        intensitySignal, intensityRank: rank, exactIntensitySignal: intensitySignal,
        exactIntensityRank: rank, nearbyIntensityRank: nearbyRank,
        exactCoverage: rank ? 1 : 0, nearbyCoverage: nearbyRank ? 1 : 0,
        chance: rank || nearbyRank ? 90 : 0,
      };
    }
    function reviewMakeRun(id, ranks = [0, 0, 0], minutes = [0, 10, 20]) {
      const frames = minutes.map((offset, index) => ({
        time: reviewStart / 1000 + offset * 60, path: '/' + id + '/' + index,
        host: 'https://radar.example.test',
      }));
      const run = {
        frames, location: { ...selectedLocation }, locationKey: getBuienradarSampleLocationKey(selectedLocation),
        fetchedAt: Date.now(), samplesByIndex: new Map(), layers: new Map(),
        tiles: new Map(), tileRequests: new Map(), zoom: 7,
      };
      ranks.forEach((rank, index) => {
        if (rank !== null) run.samplesByIndex.set(index, reviewSample(frames[index].time * 1000, rank));
      });
      return run;
    }
    function reviewRadar(id, ranks, minutes) {
      const run = reviewMakeRun(id, ranks, minutes);
      const frames = run.frames;
      libreWxrRadarRun = run;
      radarFrames = frames;
      committedRadarSource = displayedRadarSource = 'librewxr';
      elements.radarSlider.disabled = false;
      elements.radarSlider.min = '0';
      elements.radarSlider.max = String((frames.length - 1) * 100);
      elements.radarSlider.value = '0';
      return run;
    }
    function reviewDeferred() {
      let resolve;
      let reject;
      const promise = new Promise((nextResolve, nextReject) => { resolve = nextResolve; reject = nextReject; });
      return { promise, resolve, reject };
    }
    const reviewRemovedLayers = [];
    map = { getZoom() { return 7; }, removeLayer(layer) { reviewRemovedLayers.push(layer.path); } };
    function reviewMakeLayers(run) {
      const layers = new Map();
      run.frames.forEach(frame => layers.set(frame.path, {
        path: frame.path, opacity: 0,
        setOpacity(value) { this.opacity = value; }, setZIndex() {},
      }));
      run.layers = layers;
      return layers;
    }
    function reviewInstallRadar(id, ranks, minutes) {
      const run = reviewRadar(id, ranks, minutes);
      libreWxrRadarLayers = reviewMakeLayers(run);
      commitLibreWxrRadarPosition(0);
      renderPrecipitationTimeline();
      return run;
    }
    function reviewDisplaySnapshot() {
      return {
        time: activeRadarDate?.getTime(), slider: Number(elements.radarSlider.value),
        frames: radarFrames.map(frame => frame.path),
        visible: [...libreWxrRadarLayers.values()].filter(layer => layer.opacity > 0).map(layer => [layer.path, layer.opacity]),
        precipitation: getSelectedTimePrecipitation(activeRadarDate),
        graph: precipitationTimelineSamples.map(sample => [sample.date.getTime(), sample.level]),
        graphHidden: elements.precipitationTimeline.hidden,
      };
    }
    function reviewCoverage(run) {
      return {
        status: 'ok', ecmwf_grid: { loaded: true, timesteps: 20 },
        nwp_chain: { sources: ['ecmwf_ifs'] }, frames: { latest: run.frames[0].time },
        nowcast: { frames: run.frames.slice(1).map(frame => frame.time) },
      };
    }
    function reviewTile(red = 0, green = 0, blue = 0, alpha = 0) {
      const pixels = new Uint8ClampedArray(256 * 256 * 4);
      for (let offset = 0; offset < pixels.length; offset += 4) {
        pixels.set([red, green, blue, alpha], offset);
      }
      return { pixels };
    }
    function reviewSnapshot(minutes = 0) {
      const date = new Date(reviewStart + minutes * 60000);
      const precipitation = renderSelectedWeather(date);
      const timeline = buildPrecipitationTimelineSample(date, {
        start: new Date(reviewStart), end: new Date(reviewStart + 30 * 60000),
      });
      return {
        chance: precipitation.chance, intensity: precipitation.intensity,
        amount: precipitation.amount, source: precipitation.radarAdjustment?.source,
        signal: precipitation.radarAdjustment?.exactSignal,
        localIntensitySignal: precipitation.radarAdjustment?.localIntensitySignal,
        time: precipitation.radarAdjustment?.time,
        condition: elements.conditionLabel.textContent,
        timelineLevel: timeline.level, timelineChance: timeline.precipitation.chance,
        timelineSource: timeline.precipitation.radarAdjustment?.source,
      };
    }
  `);
  return {
    run,
    displaySnapshot() { return JSON.parse(JSON.stringify(run('reviewDisplaySnapshot()'))); },
    snapshot(minutes = 0) {
      return JSON.parse(JSON.stringify(run('reviewSnapshot(' + minutes + ')')));
    },
  };
}

// Berlin reproducer: a valid dry local radar sample suppresses the hourly
// model's continuous light-rain band and rain condition at the selected time.
{
  const test = createHarness();
  test.run("reviewRadar('berlin-dry')");
  const selected = test.snapshot(5);
  assert.equal(selected.source, 'librewxr-image');
  assert.equal(selected.chance, 0);
  assert.equal(selected.amount, 0);
  assert.equal(selected.timelineLevel, 0);
  assert.equal(selected.timelineChance, selected.chance);
  assert.equal(selected.timelineSource, selected.source);
  assert.doesNotMatch(selected.condition, /rain|drizzle|shower/i);
}

// A local wet pixel supplies both the condition and curve, including intensity;
// a dry hourly model must not erase rain actually present in the displayed map.
for (const [rank, intensity] of [[1, 'light'], [2, 'moderate'], [3, 'heavy']]) {
  const test = createHarness();
  test.run("weatherData.hourly.precipitation_probability.fill(0); weatherData.hourly.rain.fill(0); reviewRadar('wet', [" + rank + ',' + rank + ',' + rank + '])');
  const selected = test.snapshot(5);
  assert.equal(selected.source, 'librewxr-image');
  assert.equal(selected.intensity, intensity);
  assert.ok(selected.chance > 0);
  assert.ok(selected.timelineLevel > 0);
  assert.equal(selected.timelineChance, selected.chance);
  assert.match(selected.condition, /rain|drizzle|shower/i);
}

// The graph is local to the marker: stronger rain nearby cannot turn a valid
// dry exact-location reading into light rain.
{
  const test = createHarness();
  test.run("const nearbyRun = reviewRadar('nearby'); nearbyRun.frames.forEach((frame, index) => nearbyRun.samplesByIndex.set(index, reviewSample(frame.time * 1000, 0, { nearbyRank: 3 })))");
  const selected = test.snapshot(5);
  assert.equal(selected.source, 'librewxr-image');
  assert.equal(selected.chance, 0);
  assert.equal(selected.timelineLevel, 0);
  assert.doesNotMatch(selected.condition, /rain|drizzle|shower/i);
}

// Time blending follows the actual frame times, including irregular source
// intervals, rather than nearest-frame snapping or an assumed five-minute step.
{
  const test = createHarness();
  test.run("reviewRadar('blend', [0, 2, 0], [0, 10, 30])");
  for (const [minutes, fraction] of [[2.5, 0.25], [5, 0.5], [10, 1], [20, 0.5], [25, 0.25]]) {
    const selected = test.snapshot(minutes);
    assert.equal(selected.source, 'librewxr-image');
    assert.ok(Math.abs(selected.signal - 0.62 * fraction) < 1e-9, 'rain must follow the map crossfade at minute ' + minutes);
    assert.ok(Math.abs(selected.localIntensitySignal - 0.5 * fraction) < 1e-9);
    assert.equal(selected.time, test.run('reviewStart') + minutes * 60000);
    assert.equal(selected.timelineChance, selected.chance);
  }
}

// Starting the slider at an offset Now must preserve actual frame vertices:
// the regular graph grid alone can otherwise miss a short peak or dry gap.
{
  const test = createHarness();
  test.run("reviewRadar('offset-now', [0, 3, 0, 2], [0, 10, 20, 30])");
  const samples = test.run(`buildPrecipitationTimelineSamples({
    start: new Date(reviewStart + 2 * 60000), end: new Date(reviewStart + 30 * 60000),
  }).map(sample => ({ minutes: (sample.date.getTime() - reviewStart) / 60000, level: sample.level }))`);
  const peak = samples.find(sample => sample.minutes === 10);
  const dryGap = samples.find(sample => sample.minutes === 20);
  assert.ok(peak, 'the exact heavy-rain frame must remain a graph vertex');
  assert.ok(dryGap, 'the exact dry frame must remain a graph vertex');
  assert.equal(peak.level, test.snapshot(10).timelineLevel);
  assert.ok(peak.level > test.snapshot(30).timelineLevel);
  assert.equal(dryGap.level, 0);
  assert.ok(samples.every((sample, index) => sample.minutes >= 2 && sample.minutes <= 30
    && (index === 0 || sample.minutes > samples[index - 1].minutes)));
}

// Missing data stays unknown: do not bridge over a failed middle frame, reuse
// the nearest dry endpoint, or extrapolate dry readings beyond the map range.
{
  const test = createHarness();
  test.run("reviewRadar('missing', [0, null, 0])");
  for (const minutes of [-1, 5, 10, 15, 21]) {
    const selected = test.snapshot(minutes);
    assert.notEqual(selected.source, 'librewxr-image', 'no radar claim for minute ' + minutes);
    assert.equal(selected.chance, 90, 'missing radar data must retain the model fallback');
    assert.ok(selected.timelineLevel > 0);
  }
  for (const minutes of [0, 20]) {
    const selected = test.snapshot(minutes);
    assert.equal(selected.source, 'librewxr-image');
    assert.equal(selected.chance, 0, 'an exact valid endpoint remains useful');
  }
}

// Cached samples from a different location or a replaced frame collection may
// never become authoritative for the newly displayed radar.
for (const invalidate of [
  "selectedLocation = { ...selectedLocation, lat: 48.8566, lon: 2.3522 }",
  "radarFrames = radarFrames.map(frame => ({ ...frame, path: frame.path + '-new' }))",
]) {
  const test = createHarness();
  test.run("reviewRadar('old'); " + invalidate);
  assert.notEqual(test.snapshot(5).source, 'librewxr-image');
  assert.equal(test.snapshot(5).chance, 90);
}

// A short map forecast must not draw an apparently precise, continuous graph
// when a local frame cannot be sampled. A fully sampled dry run is still shown.
{
  const test = createHarness();
  test.run("reviewInstallRadar('complete')");
  assert.equal(test.displaySnapshot().graphHidden, false);
  assert.ok(test.displaySnapshot().graph.every(([, level]) => level === 0));
  test.run("libreWxrRadarRun.samplesByIndex.delete(1); renderPrecipitationTimeline()");
  assert.equal(test.displaySnapshot().graphHidden, true);
}

// Exercise the real pixel reader using source-like RGBA tiles. Local pixels are
// dry even when the rest of the tile is wet; health metadata must positively
// establish dry coverage for the exact accepted radar run and forecast frame.
{
  const test = createHarness();
  test.run(`
    const sampledRun = reviewMakeRun('pixels');
    const wetTile = reviewTile(0, 153, 204, 255);
    loadLibreWxrSampleTile = async () => wetTile;
    sampledRun.coveragePromise = Promise.resolve(undefined);
  `);
  const wet = await test.run('sampleLibreWxrRainFrame(sampledRun, 0)');
  assert.equal(wet.exactIntensityRank, 1);
  assert.ok(wet.exactSignal > 0);
  test.run(`
    const localPoints = getLibreWxrSamplePixels(sampledRun.location, sampledRun.zoom);
    localPoints.forEach(point => wetTile.pixels.fill(0, (point.y * 256 + point.x) * 4, (point.y * 256 + point.x) * 4 + 4));
    sampledRun.coveragePromise = Promise.resolve(reviewCoverage(sampledRun));
  `);
  const dry = await test.run('sampleLibreWxrRainFrame(sampledRun, 1)');
  assert.equal(dry.exactSignal, 0);
  assert.equal(dry.exactIntensityRank, 0);
  assert.equal(dry.chance, 0);
  for (const invalid of [
    'undefined',
    "{ ...reviewCoverage(sampledRun), status: 'degraded' }",
    '{ ...reviewCoverage(sampledRun), ecmwf_grid: { loaded: false, timesteps: 0 } }',
    '{ ...reviewCoverage(sampledRun), frames: { latest: sampledRun.frames[0].time - 600 } }',
    '{ ...reviewCoverage(sampledRun), nowcast: { frames: [] } }',
    '{ ...reviewCoverage(sampledRun), nwp_chain: { sources: [] } }',
  ]) {
    test.run('sampledRun.coveragePromise = Promise.resolve(' + invalid + ')');
    assert.equal(await test.run('sampleLibreWxrRainFrame(sampledRun, 1)'), undefined,
      'unknown coverage must not become a dry observation: ' + invalid);
  }
  test.run("loadLibreWxrSampleTile = async () => { throw new Error('tile unavailable'); }");
  assert.equal(await test.run('sampleLibreWxrRainFrame(sampledRun, 0)'), undefined);
}

// Palette anchors are broad classes, not inferred millimetres. A transparent
// pixel remains dry at the decoder level and is coverage-checked by the reader.
{
  const test = createHarness();
  for (const [rgba, rank] of [
    [[136, 221, 238, 255], 1], [[255, 238, 0, 255], 2], [[255, 170, 0, 255], 3],
    [[68, 111, 119, 128], 1], [[255, 170, 0, 0], 0],
  ]) {
    assert.equal(test.run('getLibreWxrPixelRainSample(' + rgba.join(',') + ').intensityRank'), rank);
  }
  for (const longitude of [13.405, -180, 180]) {
    const points = test.run('getLibreWxrSamplePixels({lat:52.52,lon:' + longitude + '}, 7)');
    assert.ok(Math.abs(points.reduce((sum, point) => sum + point.weight, 0) - 1) < 1e-9);
    assert.ok(points.every(point => point.tileX >= 0 && point.tileX < 128
      && point.x >= 0 && point.x < 256 && point.y >= 0 && point.y < 256));
  }
}

// Translucent orange fringes are faint local rain, even though their decoded
// palette color belongs to a heavy core. Alpha must attenuate intensity too.
{
  const test = createHarness();
  test.run("const fringeRun = reviewMakeRun('fringe'); fringeRun.coveragePromise = Promise.resolve(reviewCoverage(fringeRun))");
  for (const alpha of [18, 40, 70]) {
    test.run('loadLibreWxrSampleTile = async () => reviewTile(' + alpha + ',' + Math.round(170 * alpha / 255) + ',0,' + alpha + ')');
    const sample = await test.run('sampleLibreWxrRainFrame(fringeRun, 0)');
    assert.ok(sample.exactIntensityRank <= 1, 'a faint orange edge must not become heavy rain');
    assert.ok(sample.exactIntensitySignal <= 0.85 * alpha / 255 + 1e-9);
  }
}

// Exercise the real map readiness gate: one loaded endpoint cannot commit a
// crossfade. A tile error or a stalled layer fails within the configured bound.
{
  const test = createHarness();
  test.run(`
    const loadingRun = reviewMakeRun('loading');
    const layerTimers = new Map();
    let nextTimer = 0;
    window.setTimeout = callback => { layerTimers.set(++nextTimer, callback); return nextTimer; };
    window.clearTimeout = id => layerTimers.delete(id);
    loadingRun.frames.forEach(frame => loadingRun.layers.set(frame.path, {
      loading: true, events: new Map(), isLoading() { return this.loading; },
      on(name, listener) { this.events.set(name, listener); },
      off(name) { this.events.delete(name); },
    }));
    let readiness;
    const waiting = ensureLibreWxrLayersReady(loadingRun, 50).then(result => { readiness = result; return result; });
    const lower = loadingRun.layers.get('/loading/0');
    const upper = loadingRun.layers.get('/loading/1');
    lower.loading = false; lower.events.get('load')();
  `);
  await flushPromises();
  assert.equal(test.run('readiness'), undefined);
  test.run("upper.loading = false; upper.events.get('load')()");
  assert.equal(await test.run('waiting'), true);
  assert.equal(test.run('layerTimers.size'), 0);
  test.run('upper.mymeteoTileError = true');
  assert.equal(await test.run('ensureLibreWxrLayersReady(loadingRun, 50)'), false);
  test.run('upper.mymeteoTileError = false; upper.loading = true; const stalled = ensureLibreWxrLayersReady(loadingRun, 100); [...layerTimers.values()][0]()');
  assert.equal(await test.run('stalled'), false);
  assert.equal(test.run('upper.events.size'), 0);
  assert.equal(test.run('layerTimers.size'), 0);
}

// A new slider selection waits for its complete visible pair. Finishing an old
// pair afterward must not change the committed map, card, graph marker or time.
{
  const test = createHarness();
  test.run(`
    reviewInstallRadar('selection', [0, 2, 0]);
    const pendingPositions = new Map();
    ensureLibreWxrLayersReady = (_run, value) => {
      const deferred = reviewDeferred(); pendingPositions.set(value, deferred); return deferred.promise;
    };
    const firstSelection = setLibreWxrRadarPosition(50);
  `);
  const original = test.displaySnapshot();
  test.run('const secondSelection = setLibreWxrRadarPosition(100); pendingPositions.get(50).resolve(true)');
  await flushPromises();
  assert.deepEqual(test.displaySnapshot(), original);
  test.run('pendingPositions.get(100).resolve(true)');
  await test.run('secondSelection');
  const selected = test.displaySnapshot();
  assert.equal(selected.time, test.run('reviewStart') + 10 * 60000);
  assert.deepEqual(selected.visible.map(([name]) => name), ['/selection/1']);
  assert.equal(selected.precipitation.intensity, 'moderate');
}

// Tile failure leaves the previous coherent selected view in place and restores
// the slider thumb, rather than committing an empty map with new precipitation.
{
  const test = createHarness();
  test.run("reviewInstallRadar('retained', [0, 2, 0]); commitLibreWxrRadarPosition(50); elements.radarSlider.value = '50'");
  const original = test.displaySnapshot();
  test.run("ensureLibreWxrLayersReady = async () => false; elements.radarSlider.value = '150'");
  await test.run('setLibreWxrRadarPosition(150)');
  assert.deepEqual(test.displaySnapshot(), original);
}

// Location supersession or disposal invalidates a pending selection immediately.
for (const supersede of [
  "selectedLocation = { ...selectedLocation, lat: 48.8566, lon: 2.3522 }",
  'clearLibreWxrRadar()',
]) {
  const test = createHarness();
  test.run(`
    reviewInstallRadar('stale', [0, 2, 0]);
    const pending = reviewDeferred();
    ensureLibreWxrLayersReady = () => pending.promise;
    const selection = setLibreWxrRadarPosition(100);
  `);
  const originalTime = test.displaySnapshot().time;
  test.run(supersede + '; pending.resolve(true)');
  await test.run('selection');
  assert.equal(test.displaySnapshot().time, originalTime);
}

function installLoadHarness(test, { initial = false } = {}) {
  test.run(`
    ${initial ? '' : "reviewInstallRadar('old', [0, 0, 0]); commitLibreWxrRadarPosition(50); elements.radarSlider.value = '50';"}
    let candidate;
    const pendingLoads = new Map();
    fetchBodyWithTimeout = async () => ({
      response: { ok: true },
      body: { host: 'https://radar.example.test', radar: { past: [candidate.frames[0]], nowcast: candidate.frames.slice(1) } },
    });
    prepareLibreWxrRadarRun = async frames => { candidate.frames = frames; return candidate; };
    createLibreWxrRadarLayers = reviewMakeLayers;
    ensureLibreWxrLayersReady = (run, value) => {
      const pending = reviewDeferred();
      pendingLoads.set(run.frames[0].path, { ...pending, value });
      return pending.promise;
    };
  `);
}

// Initial loading waits for the first usable image pair. Refresh keeps the old
// samples and curve visible, then preserves absolute selection time on commit.
for (const initial of [false, true]) {
  const test = createHarness();
  installLoadHarness(test, { initial });
  const before = test.displaySnapshot();
  test.run("candidate = reviewMakeRun('fresh', [2, 2, 0]); const refresh = loadLibreWxrRadar(createRadarLoadContext())");
  await flushPromises();
  assert.deepEqual(test.displaySnapshot(), before);
  test.run("pendingLoads.get('/fresh/0').resolve(true)");
  await test.run('refresh');
  const after = test.displaySnapshot();
  assert.deepEqual(after.frames, ['/fresh/0', '/fresh/1', '/fresh/2']);
  assert.equal(after.precipitation.radarAdjustment.source, 'librewxr-image');
  assert.equal(after.precipitation.intensity, 'moderate');
  if (!initial) {
    assert.equal(after.time, before.time);
    assert.ok(test.run("reviewRemovedLayers.includes('/old/0')"));
  }
}

// A failed candidate is disposed without replacing the retained display. A
// stale refresh completion must also leave a newer committed generation intact.
{
  const test = createHarness();
  installLoadHarness(test);
  const before = test.displaySnapshot();
  test.run("candidate = reviewMakeRun('failed'); const failedRefresh = loadLibreWxrRadar(createRadarLoadContext()).catch(error => error.message)");
  await flushPromises();
  test.run("pendingLoads.get('/failed/0').resolve(false)");
  assert.match(await test.run('failedRefresh'), /did not load/);
  assert.deepEqual(test.displaySnapshot(), before);
  assert.ok(test.run("reviewRemovedLayers.includes('/failed/0')"));
  test.run("candidate = reviewMakeRun('slow'); const slowRefresh = loadLibreWxrRadar(createRadarLoadContext())");
  await flushPromises();
  test.run("candidate = reviewMakeRun('newest', [2, 2, 0]); const newestRefresh = loadLibreWxrRadar(createRadarLoadContext())");
  await flushPromises();
  test.run("pendingLoads.get('/newest/0').resolve(true)");
  await test.run('newestRefresh');
  const newest = test.displaySnapshot();
  test.run("pendingLoads.get('/slow/0').resolve(true)");
  await test.run('slowRefresh');
  assert.deepEqual(test.displaySnapshot(), newest);
  assert.ok(test.run("reviewRemovedLayers.includes('/slow/0')"));
}

// A location change while exact-location readings are still being prepared
// must dispose the old candidate before it can create layers or publish samples.
{
  const test = createHarness();
  installLoadHarness(test);
  const before = test.displaySnapshot();
  test.run(`
    candidate = reviewMakeRun('old-location');
    const preparedCandidate = candidate;
    const pendingPreparation = reviewDeferred();
    prepareLibreWxrRadarRun = () => pendingPreparation.promise;
    const oldLocationLoad = loadLibreWxrRadar(createRadarLoadContext());
  `);
  await flushPromises();
  test.run(`
    selectedLocation = { ...selectedLocation, lat: 48.8566, lon: 2.3522 };
    createRadarLoadContext();
    pendingPreparation.resolve(preparedCandidate);
  `);
  await test.run('oldLocationLoad');
  assert.deepEqual(test.displaySnapshot().frames, before.frames);
  assert.equal(test.displaySnapshot().time, before.time);
  assert.equal(test.run('pendingLoads.size'), 0);
  assert.equal(test.run("getPrecipitationTimelineRadarAdjustment(new Date(reviewStart + 5 * 60000))"), undefined);
}

console.log('MyMeteo LibreWXR synchronization checks passed.');
