import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Run outside the Codex command sandbox on this Mac. Playwright launches Chrome
// with its own disposable profile. These are controlled image fixtures, not an
// assessment of a provider's live rain prediction or yesterday's weather.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = String.raw`
const fixtureStart = Date.parse('2026-09-28T10:35:00Z');
const fixturePeak = Date.parse('2026-09-28T12:45:00Z');
const fixtureImages = new Map();
function fixtureImage(color, name) {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  if (color) { const context = canvas.getContext('2d'); context.fillStyle=color; context.fillRect(0,0,64,64); }
  const binary=atob(canvas.toDataURL('image/png').split(',')[1]);
  const url=URL.createObjectURL(new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:'image/png'}));
  fixtureImages.set(url,name); return url;
}
function fixtureRadar(id,modeId,start,count) {
  const frameMinutes=getBuienradarRadarMode(modeId).frameMinutes;
  return {modeId,startDate:new Date(start),fetchedAt:Date.now(),timeline:{frameCount:count},
    frameUrls:Array.from({length:count},(_,index)=>fixtureImage(id==='near'
      ? (index===26?'rgb(230,40,90)':index===25||index===27?'rgb(120,180,240)':undefined)
      : 'rgb(190,205,220)',id+':'+index))};
}
const fixtureNear=fixtureRadar('near','3h',fixtureStart,36);
const fixtureLong=fixtureRadar('long','8h',fixtureStart-240000,34);
const fixtureKnmi={modeId:'knmi-2h',startDate:new Date(fixtureStart),referenceDate:new Date(fixtureStart),
  frameDates:Array.from({length:25},(_,index)=>new Date(fixtureStart+index*300000)),
  frameUrls:Array.from({length:25},(_,index)=>fixtureImage(undefined,'knmi:'+index)),fetchedAt:Date.now(),timeline:{frameCount:25}};
cacheBuienradarRadar(fixtureNear); cacheBuienradarRadar(fixtureLong);
fetchBuienradarRadarMode=async mode=>mode==='3h'?fixtureNear:fixtureLong;
loadRadar=async()=>{displayHybridRadar(fixtureKnmi,buildBuienradarForecastView(fixtureNear,fixtureLong,'3h'));updateBuienradarModeControl();};
loadWeather=async context=>{
  const hourly={time:Array.from({length:144},(_,i)=>Date.parse('2026-09-28T00:00:00Z')/1000+i*3600)};
  for (const [key,value] of Object.entries({temperature_2m:21,weather_code:3,precipitation_probability:60,rain:1,showers:0,snowfall:0,cape:0,wind_speed_10m:10,wind_direction_10m:270,is_day:1})) hourly[key]=Array(144).fill(value);
  const daily={time:Array.from({length:6},(_,i)=>new Date(Date.parse('2026-09-28T00:00:00Z')+i*86400000).toISOString().slice(0,10))};
  for (const [key,value] of Object.entries({weather_code:3,temperature_2m_max:21,temperature_2m_min:17,precipitation_probability_max:60,rain_sum:1,showers_sum:0,snowfall_sum:0,wind_speed_10m_max:10,wind_direction_10m_dominant:270})) daily[key]=Array(6).fill(value);
  renderWeather({current:{time:Date.now()/1000,temperature_2m:21,weather_code:3,is_day:1,wind_speed_10m:10,wind_direction_10m:270},hourly,daily,utc_offset_seconds:7200},context);
};
window.rangeFixture={
  select(time){const slider=elements.radarSlider; slider.value=String(getRadarSliderValueForDate(new Date(time))); slider.dispatchEvent(new Event('input',{bubbles:true}));},
  snapshot(){
    const p=getSelectedTimePrecipitation(activeRadarDate);
    const peak=precipitationTimelineSamples.find(sample=>sample.date.getTime()===fixturePeak);
    return {time:activeRadarDate?.getTime(),mode:getDisplayedBuienradarRadarModeId(),source:p?.radarAdjustment?.source,
      intensity:p?.intensity,level:getPrecipitationTimelineLevel(p),peak:peak&&{level:peak.level,x:peak.position,y:getPrecipitationTimelineY(peak.level)},
      curve:precipitationTimelineSamples.map(sample=>[sample.date.getTime(),sample.level]),
      mapImages:[...document.querySelectorAll('#radarMap .leaflet-image-layer')].map(image=>({name:fixtureImages.get(image.src),opacity:Number(image.style.opacity),loaded:image.complete&&image.naturalWidth>0})),
      layers:[buienradarLayer,buienradarNextLayer].map(layer=>layer&&{name:fixtureImages.get(layer.getElement().src),opacity:layer.options.opacity}),
      knmiLayers:[knmiLayer,knmiNextLayer].map(layer=>layer&&{name:fixtureImages.get(layer.getElement().src),opacity:layer.options.opacity}),
      card:elements.currentPrecipMetric.getAttribute('aria-label'),area:elements.precipitationTimelineArea.getAttribute('d'),
      range:[getRadarTimeRange()?.start.getTime(),getRadarTimeRange()?.end.getTime()],
      pending:!!radarDisplayReplacement,overflow:document.documentElement.scrollWidth>innerWidth,
      marker:elements.precipitationTimelineMarker?.getAttribute('style'),status:elements.radarMapStatus.textContent};
  }
};
`;

const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'};
const app=await readFile(path.join(root,'app.js'),'utf8');
const leaflet = await Promise.all(['js','css'].map(async extension=>{
  const response=await fetch(`https://unpkg.com/leaflet@1.9.4/dist/leaflet.${extension}`);
  assert.ok(response.ok); return response.text();
}));
const server=http.createServer(async(request,response)=>{
  try {
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const relative=pathname==='/'?'index.html':pathname.slice(1);
    const filename=path.resolve(root,relative);
    if(!filename.startsWith(root+path.sep)) { response.writeHead(403);response.end();return; }
    let body=relative==='app.js'?app+'\n'+fixture:await readFile(filename);
    response.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'}); response.end(body);
  } catch { response.writeHead(404);response.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
let browser;
const results=[];
try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
    const context=await browser.newContext({viewport,timezoneId:'Europe/Amsterdam',reducedMotion:'reduce'});
    const page=await context.newPage(); const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.addInitScript(()=>{
      const NativeDate=Date; const fixed=NativeDate.parse('2026-09-28T10:38:00Z');
      window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
    });
    await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({contentType:'text/javascript',body:leaflet[0]}));
    await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({contentType:'text/css',body:leaflet[1]}));
    await page.route('https://scripts.simpleanalyticscdn.com/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
    await page.route('https://*.tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e5e7dc"/><path d="M0 128H256M128 0V256" stroke="#cad1c7"/></svg>'}));
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.rangeFixture&&activeRadarDate&&!radarDisplayReplacement&&!elements.radarSlider.disabled);
    const select=async time=>{
      await page.evaluate(value=>window.rangeFixture.select(value),time);
      await page.waitForFunction(value=>activeRadarDate?.getTime()===value&&!radarDisplayReplacement,time);
      await page.waitForFunction(()=>precipitationTimelineSamples.length>1);
      return page.evaluate(()=>window.rangeFixture.snapshot());
    };
    const peak=Date.parse('2026-09-28T12:45:00Z');
    const short=await select(peak);
    assert.equal(short.intensity,'heavy'); assert.equal(short.source,'radar-image');
    assert.ok(short.peak.level>=.85-1e-10,JSON.stringify({level:short.level,peak:short.peak,card:short.card,layers:short.layers})); assert.match(short.card,/heavy/i);
    assert.ok(short.mapImages.some(image=>image.name==='near:26'&&image.loaded));
    assert.equal(short.overflow,false);
    await page.screenshot({path:`/private/tmp/mymeteo-range-${viewport.width}-3h.png`,fullPage:true});
    await page.getByRole('button',{name:'Show 8h rain radar',exact:true}).click();
    await page.waitForFunction(()=>getDisplayedBuienradarRadarModeId()==='8h'&&!radarDisplayReplacement);
    const long=await page.evaluate(()=>window.rangeFixture.snapshot());
    assert.equal(long.time,short.time); assert.equal(long.intensity,short.intensity);
    assert.deepEqual(long.layers,short.layers); assert.deepEqual(long.peak?.y,short.peak.y);
    assert.ok(long.peak.x<short.peak.x); assert.ok(long.range[1]>short.range[1]+4*3600000);
    assert.equal(long.card,short.card); assert.equal(long.overflow,false);
    const longCurve = new Map(long.curve);
    // Native five-minute sample points are present in both curves; extra
    // evenly spaced display samples may differ when the overall range changes.
    for (const [time,level] of short.curve.filter(([time])=>time%300000===0)) {
      assert.ok(longCurve.has(time),'the wider graph keeps every native near-term frame time');
      assert.ok(Math.abs(longCurve.get(time)-level)<1e-10,'overlapping native samples keep their intensity');
    }
    assert.ok(long.area.includes(String(Number(long.peak.y.toFixed(2)))),'rendered SVG retains the measured peak height');
    await page.screenshot({path:`/private/tmp/mymeteo-range-${viewport.width}-8h.png`,fullPage:true});
    const interpolated=await select(peak-150000);
    await page.getByRole('button',{name:'Show 3h rain radar',exact:true}).click();
    await page.waitForFunction(()=>getDisplayedBuienradarRadarModeId()==='3h'&&!radarDisplayReplacement);
    const samePair=await page.evaluate(()=>window.rangeFixture.snapshot());
    assert.equal(samePair.time,interpolated.time); assert.deepEqual(samePair.layers,interpolated.layers); assert.equal(samePair.level,interpolated.level);
    const knmi=await select(Date.parse('2026-09-28T12:00:00Z'));
    assert.ok(knmi.mapImages.some(image=>image.name?.startsWith('knmi:')&&image.loaded));
    assert.equal(knmi.level,0);
    await page.getByRole('button',{name:'Show 8h rain radar',exact:true}).click();
    await page.waitForFunction(()=>getDisplayedBuienradarRadarModeId()==='8h'&&!radarDisplayReplacement);
    const sameKnmi=await page.evaluate(()=>window.rangeFixture.snapshot());
    assert.equal(sameKnmi.time,knmi.time);assert.equal(sameKnmi.level,0);assert.deepEqual(sameKnmi.knmiLayers,knmi.knmiLayers);
    const future=await select(Date.parse('2026-09-28T15:35:00Z'));
    assert.equal(future.intensity,'light');assert.ok(future.layers.every(layer=>!layer||layer.name.startsWith('long:')));
    assert.deepEqual(errors,[]);
    results.push({width:viewport.width,selectedTime:short.time,peakLevel:short.peak.level,peakY:short.peak.y,shortPeakX:short.peak.x,longPeakX:long.peak.x,mapPeak:short.layers,card:short.card,consoleErrors:errors.length,overflow:long.overflow});
    await context.close();
  }
  console.log(JSON.stringify({result:'passed',fixtures:'Synthetic native PNG frames; real Leaflet, image sampling, map/card/graph rendering and range controls',results},null,2));
} finally {
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
