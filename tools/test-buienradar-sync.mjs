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
    const reviewRequests = new Map();
    const reviewRevoked = [];
    const reviewLayers = [];
    const reviewRadars = new Map();
    const reviewRealSample = sampleBuienradarRainFrame;
    const reviewTimers = new Map();
    let reviewTimerId = 0;
    window.setTimeout = (callback, delay) => { reviewTimers.set(++reviewTimerId, {callback,delay}); return reviewTimerId; };
    window.clearTimeout = id => reviewTimers.delete(id);
    map = { removeLayer(layer) { reviewLayers.push(['remove',layer?.url]); } };
    setBuienradarImageLayer = (_layer,_key,index,opacity) => {
      const layer = { url: buienradarFrameUrls[index], mymeteoFrameIndex:index, opacity };
      reviewLayers.push(['buienradar',layer.url]); return layer;
    };
    setKnmiImageLayer = (_layer,_key,index,opacity) => {
      const layer = { url:knmiFrameUrls[index],mymeteoFrameIndex:index,opacity };
      reviewLayers.push(['knmi',layer.url]); return layer;
    };
    refreshMapSize = () => {};
    updateSliderTimestamps = () => {};
    renderFiveDayForecast = () => {};
    renderSelectedWeather = date => getSelectedTimePrecipitation(date);
    revokeFrameUrl = url => reviewRevoked.push(url);
    weatherDataLocationKey = getBuienradarSampleLocationKey(selectedLocation);
    weatherDataLoadRequestId = dataLoadRequestId;
    weatherData = { current: {time:reviewStart/1000}, hourly:{
      time:Array.from({length:10},(_,i)=>reviewStart/1000+i*3600),
      weather_code:Array(10).fill(61), precipitation_probability:Array(10).fill(90),
      rain:Array(10).fill(1), showers:Array(10).fill(0), snowfall:Array(10).fill(0),
      temperature_2m:Array(10).fill(15), cape:Array(10).fill(0), is_day:Array(10).fill(1)
    }};
    function reviewSample(radar,index,signal=0) {
      return {time:radar.startDate.getTime()+index*getBuienradarRadarMode(radar.modeId).frameMinutes*60000,
        signal,exactSignal:signal,intensitySignal:signal,exactIntensitySignal:signal,
        intensityRank:signal?1:0,exactIntensityRank:signal?1:0,chance:signal?70:0};
    }
    function reviewRadar(id,{seed=true,modeId='3h',count=7,start=reviewStart,signal=0}={}) {
      const radar={modeId,frameUrls:Array.from({length:count},(_,i)=>'blob:'+id+':'+i),
        startDate:new Date(start),fetchedAt:Date.now(),timeline:{frameCount:count}};
      reviewRadars.set(id,radar); cacheBuienradarRadar(radar);
      if(seed) buienradarRainSamples.set(modeId,{
        modeId,source:'radar-image',frameUrls:radar.frameUrls,locationKey:getBuienradarSampleLocationKey(selectedLocation),
        startDate:radar.startDate,fetchedAt:radar.fetchedAt,frameMinutes:getBuienradarRadarMode(modeId).frameMinutes,
        samples:radar.frameUrls.map((_,i)=>reviewSample(radar,i,signal))});
      return radar;
    }
    sampleBuienradarRainFrame = (run,index) => new Promise(resolve => reviewRequests.set(run.frameUrls[index],{resolve,run,index}));
    function reviewResolve(id,index,{imageLoaded=true,sampled=true,signal=0}={}) {
      const key='blob:'+id+':'+index; const request=reviewRequests.get(key);
      if(!request) throw new Error('No pending image '+key);
      reviewRequests.delete(key);
      request.resolve({imageLoaded,sample:imageLoaded&&sampled?reviewSample(request.run.radar,index,signal):undefined});
    }
    function reviewSnapshot() {
      const p=getSelectedTimePrecipitation(activeRadarDate);
      return {time:activeRadarDate?.getTime(),source:committedRadarSource,
        committed:[...buienradarCommittedFrameUrls],visible:[buienradarLayer?.url,buienradarNextLayer?.url],
        knmiVisible:knmiLayer?.url,knmiCommitted:[...knmiCommittedFrameUrls],
        chance:p?.chance,rainSource:p?.radarAdjustment?.source,slider:elements.radarSlider.value,
        curve:precipitationTimelineSamples.map(s=>[s.date.getTime(),s.level]),
        status:elements.radarMapStatus.textContent,mode:activeBuienradarRadarModeId,
        pending:!!radarDisplayReplacement,revoked:[...reviewRevoked]};
    }
    const reviewKnmiRadar={modeId:'knmi-2h',frameUrls:['knmi:0','knmi:1','knmi:2'],
      frameDates:[0,1,2].map(i=>new Date(reviewStart+i*300000)),startDate:new Date(reviewStart),
      referenceDate:new Date(reviewStart),fetchedAt:Date.now()};
    knmiLoadedFrameUrls=new Set(reviewKnmiRadar.frameUrls);
    sampleKnmiRainFrame=(run,index)=>Promise.resolve({...reviewSample({startDate:run.radar.startDate,modeId:'3h'},index),time:run.frameDates[index].getTime()});
  `);
  return { run, snapshot: () => JSON.parse(JSON.stringify(run('reviewSnapshot()'))) };
}

// A decoded GIF is not a completed local reading: keep the previous selected pair
// and curve until both frame samples needed by the crossfade have settled.
{
  const test=createHarness();
  test.run("displayBuienradarRadar(reviewRadar('a')); handleRadarSliderInput(450)");
  const previous=test.snapshot();
  assert.equal(previous.rainSource,'radar-image');
  test.run("displayBuienradarRadar(reviewRadar('b',{seed:false}),{preserveSelection:true})");
  await flushPromises();
  const pending=test.snapshot();
  assert.deepEqual(pending.committed,previous.committed);
  assert.deepEqual(pending.visible,previous.visible);
  assert.deepEqual(pending.curve,previous.curve);
  assert.equal(pending.time,previous.time);
  assert.equal(pending.chance,0);
  test.run("renderWeatherForRadarBlend(); reviewResolve('b',4)");
  await flushPromises();
  assert.deepEqual(test.snapshot().visible,previous.visible,'one ready endpoint cannot commit an interpolated pair');
  test.run("reviewResolve('b',5)");
  await flushPromises();
  const committed=test.snapshot();
  assert.equal(committed.time,previous.time);
  assert.deepEqual(committed.visible,['blob:b:4','blob:b:5']);
  assert.equal(committed.rainSource,'radar-image');
  assert.equal(committed.chance,0);
  assert.equal(committed.pending,false);
  assert.ok(previous.committed.every(url=>committed.revoked.includes(url)),'release the old GIF only after replacement commit');
}

// Cold display waits too; an actual canvas sampling failure is permitted to use
// fallback data only once the selected images themselves have loaded.
for(const sampled of [true,false]) {
  const test=createHarness();
  test.run("displayBuienradarRadar(reviewRadar('cold',{seed:false}))");
  await flushPromises();
  assert.deepEqual(test.snapshot().committed,[]);
  assert.deepEqual(test.snapshot().visible,[null,null]);
  test.run("reviewResolve('cold',0,{sampled:"+sampled+"})");
  await flushPromises();
  assert.deepEqual(test.snapshot().visible,['blob:cold:0',null]);
  assert.equal(test.snapshot().chance,sampled?0:90);
  assert.equal(test.snapshot().rainSource,sampled?'radar-image':undefined);
}

// Replacing both mode and time range must roll back the previous absolute time,
// layer generation, mode and samples if either required target image fails.
{
  const test=createHarness();
  test.run("displayBuienradarRadar(reviewRadar('a')); handleRadarSliderInput(250)");
  const previous=test.snapshot();
  test.run("activeBuienradarRadarModeId='8h'; displayBuienradarRadar(reviewRadar('bad',{seed:false,modeId:'8h',count:4}),{preserveSelection:true})");
  await flushPromises();
  test.run("reviewResolve('bad',0,{imageLoaded:false}); reviewResolve('bad',1)");
  await flushPromises();
  const restored=test.snapshot();
  assert.deepEqual(restored.committed,previous.committed);
  assert.deepEqual(restored.visible,previous.visible);
  assert.equal(restored.time,previous.time);
  assert.equal(restored.mode,'3h');
  assert.equal(restored.rainSource,'radar-image');
  assert.match(restored.status,/showing previous time/);
  assert.equal(restored.pending,false);
}

// Changing selection while a frame pair is pending invalidates its completion.
{
  const test=createHarness();
  test.run("displayBuienradarRadar(reviewRadar('a')); handleRadarSliderInput(200); displayBuienradarRadar(reviewRadar('b',{seed:false}),{preserveSelection:true})");
  await flushPromises();
  test.run("handleRadarSliderInput(600); reviewResolve('b',2)");
  await flushPromises();
  assert.equal(test.snapshot().visible[0],'blob:a:2');
  test.run("reviewResolve('b',6)");
  await flushPromises();
  assert.equal(test.snapshot().visible[0],'blob:b:6');
}

// A stale failed BR refresh must not roll back a newer refresh that shares the
// exact same retained KNMI frame-array identity.
{
  const test=createHarness();
  test.run("displayHybridRadar(reviewKnmiRadar,reviewRadar('a'))");
  await flushPromises();
  test.run("handleRadarSliderInput(450)");
  const old=test.snapshot();
  test.run("displayHybridRadar(reviewKnmiRadar,reviewRadar('b',{seed:false}),{preserveSelection:true})");
  await flushPromises();
  test.run("displayHybridRadar(reviewKnmiRadar,reviewRadar('c',{seed:false}),{preserveSelection:true})");
  await flushPromises();
  test.run("reviewResolve('b',4,{imageLoaded:false}); reviewResolve('b',5)");
  await flushPromises();
  assert.deepEqual(test.snapshot().visible,old.visible);
  assert.equal(test.snapshot().pending,true);
  assert.deepEqual(test.snapshot().revoked,[]);
  test.run("reviewResolve('c',4); reviewResolve('c',5)");
  await flushPromises();
  const latest=test.snapshot();
  assert.deepEqual(latest.visible,['blob:c:4','blob:c:5']);
  assert.deepEqual(latest.knmiCommitted,['knmi:0','knmi:1','knmi:2']);
  assert.equal(latest.source,'hybrid');
  assert.ok(latest.revoked.includes('blob:a:0'));
  assert.ok(latest.revoked.includes('blob:b:0'));
  assert.ok(!latest.revoked.includes('blob:c:0'));
}

// Requesting KNMI invalidates an earlier BR selection immediately, even if the
// KNMI image is also still loading; the old coherent picture remains visible.
{
  const test=createHarness();
  test.run("displayHybridRadar(reviewKnmiRadar,reviewRadar('a'))");
  await flushPromises();
  test.run("handleRadarSliderInput(450); displayHybridRadar(reviewKnmiRadar,reviewRadar('b',{seed:false}),{preserveSelection:true})");
  await flushPromises();
  const old=test.snapshot();
  test.run("knmiLoadedFrameUrls.delete('knmi:1'); let resolveKnmi; preloadKnmiFrameImage=()=>new Promise(resolve=>resolveKnmi=resolve); handleRadarSliderInput(100)");
  test.run("reviewResolve('b',4); reviewResolve('b',5)");
  await flushPromises();
  assert.deepEqual(test.snapshot().visible,old.visible);
  assert.equal(test.snapshot().time,old.time);
  test.run("knmiLoadedFrameUrls.add('knmi:1'); resolveKnmi(true)");
  await flushPromises();
  assert.equal(test.snapshot().knmiVisible,'knmi:1');
  assert.deepEqual(test.snapshot().visible,[null,null]);
}

// Location supersession blocks publication and image commits from old readers.
{
  const test=createHarness();
  test.run("displayBuienradarRadar(reviewRadar('a')); displayBuienradarRadar(reviewRadar('b',{seed:false}),{preserveSelection:true})");
  await flushPromises();
  test.run("selectedLocation={...selectedLocation,lat:48.8566,lon:2.3522}; clearBuienradarRadar(); reviewResolve('b',0)");
  await flushPromises();
  assert.deepEqual(test.snapshot().committed,[]);
  assert.deepEqual(test.snapshot().visible,[null,null]);
}

// Exercise the actual image reader's deadline and cleanup, rather than only a
// deferred sampling stub. An image timeout rolls back; late load cannot commit.
{
  const test=createHarness();
  test.run("displayBuienradarRadar(reviewRadar('a')); const reviewImages=[]; globalThis.Image=class {constructor(){reviewImages.push(this)}}; sampleBuienradarRainFrame=reviewRealSample; displayBuienradarRadar(reviewRadar('bad',{seed:false}),{preserveSelection:true})");
  await flushPromises();
  assert.equal(test.run('reviewTimers.size'),1);
  test.run("const [id,timer]=[...reviewTimers][0]; if(timer.delay!==10000) throw new Error('wrong deadline'); timer.callback(); reviewTimers.delete(id)");
  await flushPromises();
  assert.equal(test.snapshot().visible[0],'blob:a:0');
  assert.match(test.snapshot().status,/showing previous time/);
  assert.equal(test.run('reviewImages[0].src'),'');
  assert.equal(test.run('reviewImages[0].onload'),null);
  assert.equal(test.run('reviewImages[0].onerror'),null);
}

// Missing one local endpoint must not sneak back in as a nearest cached image
// through the generic forecast fallback, even if an unrelated 8h image is cached.
for (const withInactiveMode of [false,true]) {
  const test=createHarness();
  test.run("displayBuienradarRadar(reviewRadar('a')); handleRadarSliderInput(450)");
  if(withInactiveMode) test.run("reviewRadar('inactive',{modeId:'8h',count:4})");
  test.run("displayBuienradarRadar(reviewRadar('partial',{seed:false}),{preserveSelection:true})");
  await flushPromises();
  test.run("reviewResolve('partial',4); reviewResolve('partial',5,{sampled:false})");
  await flushPromises();
  assert.deepEqual(test.snapshot().visible,['blob:partial:4','blob:partial:5']);
  assert.equal(test.snapshot().chance,90,'one missing endpoint uses model fallback, not the other dry image sample');
  assert.equal(test.snapshot().rainSource,undefined);
  test.run("knmiPointRainCache.set(getBuienradarSampleLocationKey(selectedLocation),{modeId:'knmi-point',source:'knmi-point',pointWindow:true,locationKey:getBuienradarSampleLocationKey(selectedLocation),startDate:new Date(activeRadarDate),fetchedAt:Date.now(),frameMinutes:5,samples:[{time:activeRadarDate.getTime(),chance:70,signal:.3,intensitySignal:.2,intensityRank:1}]})");
  assert.equal(test.snapshot().rainSource,'knmi-point','point fallback remains available when a displayed sample failed');
  test.run("handleRadarSliderInput(400)");
  assert.equal(test.snapshot().chance,0,'an exact successfully sampled endpoint remains authoritative despite its failed neighbor');
  assert.equal(test.snapshot().rainSource,'radar-image');
}

console.log('MyMeteo Buienradar synchronization checks passed.');
