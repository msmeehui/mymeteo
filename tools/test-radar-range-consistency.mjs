import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");

async function flushPromises() {
  for (let index = 0; index < 1200; index += 1) {
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
    append(child) { this.children.push(child); },
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
    console: Object.create(console),
    document: documentStub,
    navigator: {},
    window: windowStub,
  };

  windowStub.document = documentStub;
  windowStub.navigator = context.navigator;

  vm.createContext(context);
  vm.runInContext(`
    const NativeDate = Date;
    const fixtureNow = NativeDate.parse("2026-09-28T10:38:00Z");
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixtureNow])); }
      static now() { return fixtureNow; }
    };
  `, context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  const run = (source) => vm.runInContext(source, context);
  run(`
    const reviewStart = new Date('2026-09-28T10:35:00Z').getTime();
    const reviewPeak = new Date('2026-09-28T12:45:00Z').getTime();
    const reviewReadings = new Map();
    const reviewRevoked = [];
    const reviewImageFailures = new Set();
    const reviewFetchCalls = [];
    const reviewNativeCreateElement = document.createElement;
    document.createElement = kind => kind === 'canvas' ? {
      getContext() { return { drawImage(image) { this.url = image.url; } }; }
    } : reviewNativeCreateElement(kind);
    loadRadarSampleImage = async url => reviewImageFailures.has(url)
      ? undefined : {url,width:4,height:4,naturalWidth:4,naturalHeight:4};
    getBuienradarFrameRainSample = context => reviewReadings.get(context.url);
    revokeFrameUrl = url => reviewRevoked.push(url);
    map = { removeLayer() {} };
    setBuienradarImageLayer = (_layer,_key,index,opacity) => ({
      url:buienradarFrameUrls[index],mymeteoFrameIndex:index,opacity
    });
    refreshMapSize = () => {};
    updateSliderTimestamps = () => {};
    renderFiveDayForecast = () => {};
    renderSelectedWeather = date => getSelectedTimePrecipitation(date);
    weatherDataLocationKey = getBuienradarSampleLocationKey(selectedLocation);
    weatherDataLoadRequestId = dataLoadRequestId;
    weatherData = {current:{time:Date.now()/1000},hourly:{
      time:Array.from({length:11},(_,i)=>(reviewStart-3600000)/1000+i*3600),
      weather_code:Array(11).fill(61),precipitation_probability:Array(11).fill(90),
      rain:Array(11).fill(1),showers:Array(11).fill(0),snowfall:Array(11).fill(0),
      temperature_2m:Array(11).fill(15),cape:Array(11).fill(0),is_day:Array(11).fill(1)
    }};
    function reviewRadar(id,modeId='3h',start=reviewStart,count=36) {
      const frameMinutes = getBuienradarRadarMode(modeId).frameMinutes;
      const radar = {modeId,startDate:new Date(start),fetchedAt:Date.now(),
        frameUrls:Array.from({length:count},(_,i)=>'blob:'+id+':'+i),timeline:{frameCount:count}};
      radar.frameUrls.forEach((url,index)=>{
        const time = start+index*frameMinutes*60000;
        const signal = id==='near' ? (time===reviewPeak?1:time===reviewPeak-300000?.6:time===reviewPeak+300000?.4:0) : .22;
        const rank = signal>=.72?3:signal>=.42?2:signal>0?1:0;
        reviewReadings.set(url,{signal,exactSignal:signal,intensitySignal:signal,
          exactIntensitySignal:signal,intensityRank:rank,exactIntensityRank:rank,
          nearbySignal:0,nearbyIntensityRank:0});
      });
      cacheBuienradarRadar(radar);
      return radar;
    }
    const reviewNear = reviewRadar('near');
    const reviewLong = reviewRadar('long','8h',reviewStart-240000,34);
    fetchBuienradarRadarMode = async mode => {
      reviewFetchCalls.push(mode);
      return mode==='3h'?reviewNear:reviewLong;
    };
    function reviewSelect(time) {
      radarSliderWasAtStart = false;
      handleRadarSliderInput(getRadarSliderValueForDate(new Date(time)));
    }
    function reviewSnapshot() {
      const p=getSelectedTimePrecipitation(activeRadarDate);
      return {time:activeRadarDate?.getTime(),mode:getDisplayedBuienradarRadarModeId(),
        visible:[buienradarLayer?.url,buienradarNextLayer?.url],
        opacities:[buienradarLayer?.opacity,buienradarNextLayer?.opacity],
        intensity:p?.intensity,level:getPrecipitationTimelineLevel(p),chance:p?.chance,
        source:p?.radarAdjustment?.source,
        curve:precipitationTimelineSamples.map(sample=>[sample.date.getTime(),sample.level]),
        range:[getRadarTimeRange()?.start.getTime(),getRadarTimeRange()?.end.getTime()],
        pending:!!radarDisplayReplacement,revoked:[...reviewRevoked],
        status:elements.radarMapStatus.textContent,
        sampleTimes:buienradarCommittedRainSamples?.samples.map(sample=>sample.time)};
    }
  `);
  return {
    run,
    value: expression => JSON.parse(JSON.stringify(run(expression))),
    snapshot: () => JSON.parse(JSON.stringify(run('reviewSnapshot()'))),
  };
}

// Reproduce the reported narrow 14:45 heavy peak with a conflicting light 8h
// product. Real frame URLs and the production image reader feed map/card/curve.
{
  const test = createHarness();
  test.run("displayBuienradarRadar(buildBuienradarForecastView(reviewNear,reviewLong,'3h'))");
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const short = test.snapshot();
  assert.equal(short.source,'radar-image');
  assert.equal(short.intensity,'heavy');
  assert.equal(short.level,1);
  assert.ok(short.curve.some(([time,level])=>time===short.time&&level===1),'3h graph includes the actual narrow peak');
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  const long = test.snapshot();
  assert.equal(long.mode,'8h');
  assert.equal(long.time,short.time,'a range switch preserves the selected absolute time');
  assert.deepEqual(long.visible,short.visible,'the 8h map uses the same native near-term imagery');
  assert.equal(long.intensity,short.intensity,'weather card intensity remains heavy');
  assert.equal(long.level,short.level);
  assert.ok(long.curve.some(([time,level])=>time===short.time&&level===1),'8h graph preserves the same peak height');
  assert.ok(long.range[1]>short.range[1]+4*3600000,'8h still adds the later forecast');
  assert.ok(long.revoked.every(url=>!url.startsWith('blob:near:')),'switching views must not revoke shared images');

  // An interpolated time must retain the same source pair and blend weights too.
  test.run('reviewSelect(reviewPeak-150000)');
  await flushPromises();
  const longPair = test.snapshot();
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  const shortPair = test.snapshot();
  assert.deepEqual(shortPair.visible,longPair.visible);
  assert.deepEqual(shortPair.opacities,longPair.opacities);
  assert.equal(shortPair.level,longPair.level);
  assert.equal(shortPair.time,longPair.time);
  assert.deepEqual(shortPair.visible,['blob:near:25','blob:near:26']);
}

// The 15-minute product starts four minutes earlier than the 5-minute one.
// Just beyond the near bank, interpolate its own bracketing native long frames;
// never turn an 8h array index into a fictitious uniform timestamp or blend banks.
{
  const test = createHarness();
  test.run("const reviewWide=buildBuienradarForecastView(reviewNear,reviewLong,'8h'); displayBuienradarRadar(reviewWide)");
  await flushPromises();
  test.run('reviewSelect(reviewStart+175*60000+30000)');
  await flushPromises();
  const snapshot = test.snapshot();
  assert.deepEqual(snapshot.visible,['blob:long:11','blob:long:12']);
  assert.equal(snapshot.time,test.run('reviewStart+175*60000+30000'));
  assert.ok(Math.abs(snapshot.opacities[1]/.78-14.5/15)<1e-8,'crossfade uses native 15-minute interval');
  assert.ok(Math.abs(snapshot.level-.22)<1e-8,'local intensity uses the same long-product pair');
  const pairTimes = test.value("getDisplayedBuienradarImageRainSampleSeries(new Date(reviewStart+175*60000+30000)).samples.map(sample=>sample.time)");
  assert.deepEqual(pairTimes,test.value('[reviewStart+161*60000,reviewStart+176*60000]'));
  assert.ok(snapshot.sampleTimes.includes(test.run('reviewStart+176*60000')),'actual reader publishes the native long-frame time');
}

// Cache refresh alone must not silently change the already accepted forecast
// when zooming out and back. The accepted banks must remain owned and readable.
{
  const test = createHarness();
  test.run("displayBuienradarRadar(buildBuienradarForecastView(reviewNear,reviewLong,'8h'))");
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const accepted = test.snapshot();
  test.run("reviewRadar('new-near'); reviewRadar('new-long','8h',reviewStart-240000,34)");
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  assert.deepEqual(test.snapshot().visible,accepted.visible);
  assert.equal(test.snapshot().level,1);
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  assert.deepEqual(test.snapshot().visible,accepted.visible);
  test.run('reviewSelect(reviewStart+5*3600000)');
  await flushPromises();
  assert.ok(test.snapshot().visible.filter(Boolean).every(url=>url.startsWith('blob:long:')),'returning to8h retains the accepted extension');
  assert.ok(test.snapshot().revoked.every(url=>!url.startsWith('blob:near:')&&!url.startsWith('blob:long:')),'cache replacement retains both accepted source banks');
}

// Loading must compose both requested source banks. With only long-range data
// available, 3h is a crop of those real frames rather than invented 5-min images.
{
  const test = createHarness();
  const radar = await test.run("fetchBuienradarForecast('8h')");
  assert.equal(radar.modeId,'8h');
  assert.deepEqual(test.value('[...reviewFetchCalls].sort()'),['3h','8h']);
  assert.equal(radar.frameUrls[26],'blob:near:26');
  test.run("const reviewFallback=buildBuienradarForecastView(undefined,reviewLong,'3h')");
  const urls = test.value('reviewFallback.frameUrls');
  assert.ok(urls.length>1&&urls.length<34);
  assert.ok(urls.every(url=>url.startsWith('blob:long:')));
  const dates = test.value('getBuienradarFrameDates(reviewFallback).map(date=>date.getTime())');
  assert.ok(dates.at(-1)-dates[0]<=3*3600000,'fallback view is limited to the requested short horizon');
  assert.ok(dates.slice(1).every((time,index)=>time-dates[index]===15*60000),'fallback keeps its real 15-minute timing');
}

// A failed extension download leaves the accepted 3h state intact. A loaded
// extension with an unavailable future image must also retain the selected map
// and weather reading rather than moving the label ahead of the visible frame.
{
  const test = createHarness();
  test.run("displayBuienradarRadar(buildBuienradarForecastView(reviewNear,undefined,'3h')); buienradarRadarCache.delete('8h')");
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const previous = test.snapshot();
  test.run("console.warn=()=>{}; fetchBuienradarRadarMode=async()=>{throw new Error('extension unavailable')}");
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  const failed = test.snapshot();
  assert.equal(failed.mode,'3h');
  assert.equal(test.run('activeBuienradarRadarModeId'),'3h');
  assert.equal(test.run('isBuienradarRadarModeLoading'),false);
  assert.equal(failed.time,previous.time);
  assert.equal(failed.level,previous.level);
  assert.deepEqual(failed.visible,previous.visible);
  assert.deepEqual(failed.curve,previous.curve);
  assert.equal(failed.pending,false);
}
{
  const test = createHarness();
  test.run("reviewImageFailures.add('blob:long:20'); displayBuienradarRadar(buildBuienradarForecastView(reviewNear,reviewLong,'8h'))");
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const previous = test.snapshot();
  test.run('reviewSelect(reviewStart+5*3600000)');
  await flushPromises();
  const failed = test.snapshot();
  assert.equal(failed.time,previous.time,'failed future image cannot advance the selected timestamp');
  assert.equal(failed.level,previous.level);
  assert.deepEqual(failed.visible,previous.visible);
  assert.equal(failed.pending,false);
  assert.match(failed.status,/showing previous time/);
}

// A location change while the extension is downloading cannot publish frames
// or restore the old location's selected state after its display was cleared.
{
  const test = createHarness();
  test.run("displayBuienradarRadar(buildBuienradarForecastView(reviewNear,undefined,'3h')); buienradarRadarCache.delete('8h')");
  await flushPromises();
  test.run('let reviewResolveExtension; fetchBuienradarRadarMode=()=>new Promise(resolve=>reviewResolveExtension=resolve)');
  const pending = test.run('toggleBuienradarRadarMode()');
  await Promise.resolve();
  test.run('selectedLocation={...selectedLocation,lat:48.8566,lon:2.3522}; clearBuienradarRadar(); reviewResolveExtension(reviewLong)');
  await pending;
  await flushPromises();
  assert.deepEqual(test.value('buienradarFrameUrls'),[]);
  assert.deepEqual(test.value('buienradarCommittedFrameUrls'),[]);
  assert.deepEqual(test.snapshot().visible,[null,null]);
}

// The same guarantee applies after KNMI's two-hour window in the ordinary
// Netherlands hybrid display, which is where the reported 14:45 peak falls.
{
  const test = createHarness();
  test.run(`
    const reviewKnmi = {modeId:'knmi-2h',startDate:new Date(reviewStart),
      referenceDate:new Date(reviewStart),fetchedAt:Date.now(),
      frameUrls:Array.from({length:25},(_,index)=>'knmi:'+index),
      frameDates:Array.from({length:25},(_,index)=>new Date(reviewStart+index*300000))};
    knmiRadarCache=reviewKnmi;
    knmiLoadedFrameUrls=new Set(reviewKnmi.frameUrls);
    setKnmiImageLayer=(_layer,_key,index,opacity)=>({url:knmiFrameUrls[index],mymeteoFrameIndex:index,opacity});
    sampleKnmiRainFrame=async(run,index)=>({time:run.frameDates[index].getTime(),
      signal:0,exactSignal:0,intensitySignal:0,exactIntensitySignal:0,
      intensityRank:0,exactIntensityRank:0,chance:0});
    displayHybridRadar(reviewKnmi,buildBuienradarForecastView(reviewNear,reviewLong,'3h'));
  `);
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const short = test.snapshot();
  assert.equal(test.run('committedRadarSource'),'hybrid');
  assert.equal(short.level,1);
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  const long = test.snapshot();
  assert.equal(test.run('committedRadarSource'),'hybrid');
  assert.equal(long.time,short.time);
  assert.equal(long.level,1);
  assert.deepEqual(long.visible,short.visible);
  assert.ok(long.curve.some(([time,level])=>time===short.time&&level===1));
}

// Partial refreshes must not replace a complete accepted 8h forecast with
// either a truncated horizon or a different near-term interpretation.
for (const failedMode of ['3h','8h']) {
  const test = createHarness();
  test.run("displayBuienradarRadar(buildBuienradarForecastView(reviewNear,reviewLong,'8h'))");
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const previous = test.snapshot();
  test.run(`fetchBuienradarRadarMode=async mode=>{
    if(mode==='${failedMode}') throw new Error('fixture ${failedMode} unavailable');
    return mode==='3h'?reviewRadar('fresh-near'):reviewRadar('fresh-long','8h',reviewStart-240000,34);
  }`);
  await assert.rejects(test.run("fetchBuienradarForecast('8h',{forceRefresh:true})"),new RegExp(`fixture ${failedMode} unavailable`));
  await flushPromises();
  const after = test.snapshot();
  assert.equal(after.mode,'8h');
  assert.equal(after.time,previous.time);
  assert.deepEqual(after.visible,previous.visible);
  assert.deepEqual(after.curve,previous.curve);
  assert.deepEqual(after.range,previous.range);
  assert.equal(after.level,1);
  assert.ok(after.revoked.every(url=>!url.startsWith('blob:near:')&&!url.startsWith('blob:long:')));
}

// If no near-term run has ever been accepted, long-only fallback remains usable
// on cold load and on refresh; range changes retain those same native frames.
{
  const test = createHarness();
  test.run("fetchBuienradarRadarMode=async mode=>{if(mode==='3h') throw new Error('near unavailable'); return reviewLong}");
  await test.run("fetchBuienradarForecast('8h').then(radar=>displayBuienradarRadar(radar))");
  await flushPromises();
  assert.equal(test.run('Boolean(buienradarTimeline.nearRadar)'),false);
  assert.equal(test.run('getDisplayedBuienradarRadarModeId()'),'8h');
  test.run("const reviewFallbackRefresh=reviewRadar('fallback-refresh','8h',reviewStart-240000,34); fetchBuienradarRadarMode=async mode=>{if(mode==='3h') throw new Error('near still unavailable'); return reviewFallbackRefresh}");
  await test.run("fetchBuienradarForecast('8h',{forceRefresh:true}).then(radar=>displayBuienradarRadar(radar))");
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const wide = test.snapshot();
  assert.ok(wide.visible.filter(Boolean).every(url=>url.startsWith('blob:fallback-refresh:')));
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  const short = test.snapshot();
  assert.equal(short.mode,'3h');
  assert.equal(short.time,wide.time);
  assert.deepEqual(short.visible,wide.visible);
  assert.equal(short.level,wide.level);
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  assert.deepEqual(test.snapshot().visible,wide.visible);
  assert.deepEqual(test.snapshot().range,wide.range);
  assert.equal(test.run('Boolean(buienradarTimeline.nearRadar)'),false);
}

// A range click during an uncommitted replacement must start from the accepted
// source banks. Late image completion must not resurrect the pending refresh.
{
  const test = createHarness();
  test.run("displayBuienradarRadar(buildBuienradarForecastView(reviewNear,reviewLong,'3h'))");
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const accepted = test.snapshot();
  test.run(`
    const reviewPendingImages=new Map();
    const reviewNormalImageLoader=loadRadarSampleImage;
    loadRadarSampleImage=url=>url.startsWith('blob:pending-')
      ? new Promise(resolve=>reviewPendingImages.set(url,()=>resolve({url,width:4,height:4,naturalWidth:4,naturalHeight:4})))
      : reviewNormalImageLoader(url);
    const reviewPendingNear=reviewRadar('pending-near');
    const reviewPendingLong=reviewRadar('pending-long','8h',reviewStart-240000,34);
    displayBuienradarRadar(buildBuienradarForecastView(reviewPendingNear,reviewPendingLong,'8h'),{preserveSelection:true});
  `);
  await flushPromises();
  assert.equal(test.snapshot().pending,true);
  assert.deepEqual(test.snapshot().visible,accepted.visible);
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  const switched = test.snapshot();
  assert.equal(switched.mode,'8h');
  assert.equal(switched.pending,false);
  assert.equal(switched.time,accepted.time);
  assert.equal(switched.level,1);
  assert.deepEqual(switched.visible,accepted.visible);
  test.run('reviewPendingImages.forEach(resolve=>resolve())');
  await flushPromises();
  const late = test.snapshot();
  assert.equal(late.mode,'8h');
  assert.equal(late.time,accepted.time);
  assert.equal(late.level,1);
  assert.deepEqual(late.visible,accepted.visible);
  assert.equal(late.pending,false);
}

// Mismatched source runs cannot manufacture a continuous forecast or show a
// future image early. Keep the accepted short view and ask for a real refresh.
for (const offsetMinutes of [240, -600]) {
  const test = createHarness();
  test.run("displayBuienradarRadar(buildBuienradarForecastView(reviewNear,undefined,'3h'))");
  await flushPromises();
  test.run('reviewSelect(reviewPeak)');
  await flushPromises();
  const before = test.snapshot();
  test.run(`reviewRadar('mismatched','8h',reviewStart+${offsetMinutes}*60000,32)`);
  await test.run('toggleBuienradarRadarMode()');
  await flushPromises();
  const after = test.snapshot();
  assert.equal(after.mode,'3h');
  assert.equal(after.time,before.time);
  assert.equal(after.level,before.level);
  assert.deepEqual(after.visible,before.visible);
  assert.deepEqual(after.curve,before.curve);
  assert.match(after.status,/needs refresh/);
}

console.log('MyMeteo radar range consistency checks passed.');
