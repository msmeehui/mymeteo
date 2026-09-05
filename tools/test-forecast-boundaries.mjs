import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");
const hourSeconds = 60 * 60;
const daySeconds = 24 * hourSeconds;
const unix = (value) => Date.parse(value) / 1000;
const plain = (value) => JSON.parse(JSON.stringify(value));

function loadRules() {
  const formatterConstructions = [];
  const intl = Object.create(Intl);
  intl.DateTimeFormat = new Proxy(Intl.DateTimeFormat, {
    construct(target, args) {
      const formatter = Reflect.construct(target, args);
      formatterConstructions.push(args);
      return formatter;
    },
  });
  const element = {
    textContent: "", title: "", value: "0", dataset: {},
    classList: { contains: () => false },
    removeAttribute() {},
  };
  const document = { querySelector: () => element, querySelectorAll: () => [] };
  const window = {
    location: { origin: "http://localhost", hostname: "localhost", search: "" },
    localStorage: { getItem: () => null },
    addEventListener() {},
    setTimeout,
    clearTimeout,
  };
  const context = {
    AbortController, DOMException, URLSearchParams, console, document, window,
    Intl: intl,
    navigator: {},
    async fetch(url) {
      context.lastRequestUrl = String(url);
      return { ok: true, status: 200, json: async () => context.responseData };
    },
  };
  vm.createContext(context);
  vm.runInContext(`${appSource}
let __renderedDays;
const __originalRainAdjustment = getActiveRainSourceAdjustmentForForecastTime;
const __originalBasePrecipitation = buildBasePrecipitationChance;
renderFiveDayForecast = (data) => { __renderedDays = buildFiveDayForecast(data); };
renderSelectedWeather = () => {};
renderPrecipitationTimeline = () => {};
renderWeatherForRadarBlend = () => {};
setForecastStatusMessage = () => {};
getActiveRadarDate = () => new Date();
prepareBuienradarPointRainForLocation = async () => {};
prepareKnmiPointRainForLocation = async () => {};
globalThis.rules = {
  normalizeForecastCalendarDates,
  formatWeekday,
  formatClock: (time, timezone) => formatClock(new Date(time * 1000), timezone),
  getDateParts: (time, timezone) => getDateParts(new Date(time * 1000), timezone),
  getDeviceDateParts: (time) => getFormattedDateParts(new Date(time * 1000)),
  getBrowserTimezone,
  clearFormatterCache: () => dateTimeFormatterCache.clear(),
  getFormatterCacheSize: () => dateTimeFormatterCache.size,
  formatterCacheLimit: dateTimeFormatterCacheLimit,
  isPrecipitationDisplayDry,
  getPrecipitationDisplayValue,
  getHourlyWeatherSnapshot: (time) => getHourlyWeatherSnapshot(new Date(time * 1000), weatherData.hourly),
  getDailyForecastIndex: (key) => getDailyForecastIndex(weatherData.daily, key),
  buildCurrentDayPrecipitation: () => buildCurrentDayPrecipitation(weatherData),
  buildCurrentDayTemperatureRange: () => buildCurrentDayTemperatureRange(weatherData),
  buildSelectedDayPrecipitation: (time) => buildSelectedDayPrecipitation(weatherData, new Date(time * 1000), {}),
  buildSelectedDayTemperatureRange: (time) => buildSelectedDayTemperatureRange(weatherData, new Date(time * 1000), {}),
  getForecastHourEntries: (key, options) => getForecastHourEntries(weatherData.hourly, key, options),
  getSelectedTimePrecipitation: (time) => getSelectedTimePrecipitation(new Date(time * 1000)),
  buildHourlyModelPrecipitation: (index) => buildHourlyModelPrecipitation(weatherData.hourly, index),
  buildHourlyPrecipitation: (index, options) => buildHourlyPrecipitation(weatherData.hourly, index, options),
  buildDays: () => buildFiveDayForecast(weatherData),
  setData(data, timezone = "Asia/Tokyo") {
    // Keep real radar caches empty; use deterministic model fixtures in these checks.
    selectedLocation = { name: "Fixture", lat: 35.68, lon: 139.76, timezone };
    weatherData = normalizeForecastCalendarDates(data);
    return weatherData;
  },
  async loadThroughRequest(data, timezone = "Asia/Tokyo") {
    selectedLocation = { name: "Fixture", lat: 35.68, lon: 139.76, timezone };
    const context = createDataLoadContext();
    await loadWeather(context);
    return { data: weatherData, days: __renderedDays };
  },
  captureHourlyArguments(index, options) {
    let model;
    let radar;
    buildBasePrecipitationChance = (args) => { model = args; return __originalBasePrecipitation(args); };
    getActiveRainSourceAdjustmentForForecastTime = (time, args) => { radar = { time, ...args }; };
    try { buildHourlyPrecipitation(weatherData.hourly, index, options); }
    finally {
      buildBasePrecipitationChance = __originalBasePrecipitation;
      getActiveRainSourceAdjustmentForForecastTime = __originalRainAdjustment;
    }
    return { model, radar };
  },
  selectedWithWetRadar(time) {
    getActiveRainSourceAdjustmentForForecastTime = () => ({
      source: "knmi-point", chance: 100, intensityRank: 2, intensitySignal: 0.5,
      signal: 0.5, weight: 1, horizonHours: 0,
    });
    try { return getSelectedTimePrecipitation(new Date(time * 1000)); }
    finally { getActiveRainSourceAdjustmentForForecastTime = __originalRainAdjustment; }
  },
};`, context, { filename: "app.js" });
  return { rules: context.rules, context, formatterConstructions };
}

function forecastFixture({ date = "2026-09-05", offset = 9 * hourSeconds, days = 6, currentTime } = {}) {
  // Match Open-Meteo's fixed daily offset contract, keeping hourly epochs real instants.
  const start = unix(`${date}T00:00:00Z`) - offset;
  const time = Array.from({ length: days * 24 }, (_, index) => start + index * hourSeconds);
  const fillHours = (value) => time.map(() => value);
  const fillDays = (value) => Array(days).fill(value);
  return {
    utc_offset_seconds: offset,
    current: {
      time: currentTime ?? start + 12 * hourSeconds,
      temperature_2m: 20, weather_code: 3, is_day: 1,
      wind_speed_10m: 10, wind_direction_10m: 90,
    },
    hourly: {
      time, temperature_2m: fillHours(20), weather_code: fillHours(3), is_day: fillHours(1),
      precipitation_probability: fillHours(0), rain: fillHours(0), showers: fillHours(0), snowfall: fillHours(0),
      cape: fillHours(0), wind_speed_10m: fillHours(10), wind_direction_10m: fillHours(90),
    },
    minutely_15: { time: [start], weather_code: [3], cape: [0], lightning_potential: [0] },
    daily: {
      time: Array.from({ length: days }, (_, index) => start + index * daySeconds),
      weather_code: fillDays(3), temperature_2m_max: Array.from({ length: days }, (_, index) => 20 + index),
      temperature_2m_min: fillDays(10), precipitation_probability_max: fillDays(0),
      rain_sum: fillDays(0), showers_sum: fillDays(0), snowfall_sum: fillDays(0),
      wind_speed_10m_max: fillDays(10), wind_direction_10m_dominant: fillDays(90),
    },
  };
}

function wetIntervalEndingAt(data, time, chance = 100, rain = 2) {
  const index = data.hourly.time.indexOf(time);
  assert.notEqual(index, -1, "fixture contains its explicit interval endpoint");
  data.hourly.precipitation_probability[index] = chance;
  data.hourly.rain[index] = rain;
  return index;
}

const { rules, context, formatterConstructions } = loadRules();

// The last hour belongs to today, despite its accumulation timestamp being tomorrow.
const midnight = forecastFixture({ currentTime: unix("2026-09-05T23:00:00+09:00") });
wetIntervalEndingAt(midnight, unix("2026-09-06T00:00:00+09:00"));
midnight.daily.precipitation_probability_max[0] = 100;
midnight.daily.rain_sum[0] = 2;
rules.setData(midnight);
let days = rules.buildDays();
assert.equal(days[0].precipitation.chance, 100, "today includes rain before midnight");
assert.equal(days[0].hours[0].time, "23:00");
assert.equal(days[0].hours[0].precipitation.chance, 100);
assert.equal(days[1].hours[0].precipitation.chance, 0, "tomorrow excludes yesterday's last interval");
assert.equal(days[1].precipitation.chance, 0);
assert.equal(rules.getSelectedTimePrecipitation(midnight.current.time).chance, 100);
assert.equal(rules.buildCurrentDayPrecipitation().chance, 100);
assert.equal(rules.buildSelectedDayPrecipitation(midnight.current.time).chance, 100);

// At an hour boundary an ended shower no longer inflates the remaining-day forecast.
const ended = forecastFixture({ currentTime: midnight.current.time });
wetIntervalEndingAt(ended, ended.current.time);
ended.daily.precipitation_probability_max[0] = 100;
rules.setData(ended);
assert.equal(rules.buildDays()[0].precipitation.chance, 0);
assert.equal(rules.buildCurrentDayPrecipitation().chance, 0);
assert.equal(rules.buildSelectedDayPrecipitation(ended.current.time).chance, 0);
assert.equal(rules.getSelectedTimePrecipitation(ended.current.time).chance, 0);

// Shift accumulated/probability fields only; instantaneous fields and radar valid time stay put.
const fields = forecastFixture();
const fieldIndex = 16;
fields.hourly.temperature_2m[fieldIndex] = -2;
fields.hourly.temperature_2m[fieldIndex + 1] = 35;
fields.hourly.weather_code[fieldIndex] = 71;
fields.hourly.weather_code[fieldIndex + 1] = 95;
fields.hourly.is_day[fieldIndex] = 0;
fields.hourly.is_day[fieldIndex + 1] = 1;
fields.hourly.wind_speed_10m[fieldIndex] = 15;
fields.hourly.wind_speed_10m[fieldIndex + 1] = 75;
fields.hourly.wind_direction_10m[fieldIndex] = 45;
fields.hourly.wind_direction_10m[fieldIndex + 1] = 270;
fields.hourly.cape[fieldIndex] = 100;
fields.hourly.cape[fieldIndex + 1] = 2500;
fields.hourly.precipitation_probability[fieldIndex + 1] = 85;
fields.hourly.rain[fieldIndex + 1] = 0.2;
fields.hourly.showers[fieldIndex + 1] = 0.3;
fields.hourly.snowfall[fieldIndex + 1] = 1;
rules.setData(fields);
const radarTime = fields.hourly.time[fieldIndex] + 15 * 60;
const args = rules.captureHourlyArguments(fieldIndex, { radarTime, radarSampleMode: "hourly", includeIntensity: true });
assert.deepEqual(plain({ chance: args.model.chance, rain: args.model.rainAmount, showers: args.model.showersAmount, snow: args.model.snowfallAmount }),
  { chance: 85, rain: 0.2, showers: 0.3, snow: 1 });
assert.equal(args.model.weatherCode, 71);
assert.equal(args.model.temperature, -2);
assert.equal(args.model.stormSignal.cape, 100);
assert.equal(args.model.stormSignal.hasThunderstormCode, false);
assert.deepEqual(plain(args.radar), { time: radarTime, radarSampleMode: "hourly", allowImageFallback: true });
const snapshot = rules.getHourlyWeatherSnapshot(fields.hourly.time[fieldIndex]);
assert.deepEqual(plain({ temperature: snapshot.temperature, wind: snapshot.windSpeed, direction: snapshot.windDirection, day: snapshot.isDaytime, code: snapshot.weatherCode }),
  { temperature: -2, wind: 15, direction: 45, day: false, code: 71 });
assert.equal(rules.buildHourlyModelPrecipitation(fieldIndex).chance, 85);

// Run the real forecast request/ingestion path and protect the fifth day's terminal interval.
const terminal = forecastFixture();
wetIntervalEndingAt(terminal, unix("2026-09-10T00:00:00+09:00"));
context.responseData = terminal;
const loaded = await rules.loadThroughRequest(terminal);
assert.equal(new URL(context.lastRequestUrl).searchParams.get("forecast_days"), "6",
  "request includes the next day's interval endpoint without exposing a sixth forecast row");
assert.equal(loaded.days.length, 5);
assert.equal(loaded.days[4].key, "2026-09-09");
assert.equal(loaded.days[4].hours.at(-1).time, "23:00");
assert.equal(loaded.days[4].hours.at(-1).precipitation.chance, 100);
assert.equal(loaded.days[4].precipitation.chance, 100);
assert.equal(loaded.data.hourly, terminal.hourly, "ingestion leaves hourly instants untouched");
assert.equal(loaded.data.current, terminal.current);
assert.equal(loaded.data.minutely_15, terminal.minutely_15);
assert.equal(typeof terminal.daily.time[0], "number", "ingestion does not mutate the provider response");
assert.equal(loaded.data.daily.time[0], "2026-09-05");
assert.deepEqual(plain(rules.normalizeForecastCalendarDates(loaded.data).daily.time), plain(loaded.data.daily.time),
  "normalization also accepts already normalized data");

// A genuinely absent future interval is unavailable; do not copy the last past interval.
const missing = forecastFixture();
for (const key of Object.keys(missing.hourly)) missing.hourly[key] = missing.hourly[key].slice(0, 2);
missing.hourly.precipitation_probability[1] = 100;
missing.hourly.rain[1] = 8;
rules.setData(missing);
const unavailable = rules.buildHourlyPrecipitation(1);
assert.equal(unavailable.chance, undefined);
assert.equal(rules.getPrecipitationDisplayValue(unavailable), "--%");
assert.equal(rules.isPrecipitationDisplayDry(unavailable), false);
assert.equal(rules.getSelectedTimePrecipitation(missing.hourly.time[1]).chance, undefined);
assert.ok(rules.selectedWithWetRadar(missing.hourly.time[1]).chance > 0,
  "actual radar remains usable when its model precipitation interval is absent");

// Amsterdam's fall-back day has two distinct 02:00 instants and all 25 hourly rows.
const autumn = forecastFixture({ date: "2025-10-24", offset: 2 * hourSeconds });
rules.setData(autumn, "Europe/Amsterdam");
days = rules.buildDays();
assert.deepEqual(plain(days.map(({ key, day }) => [key, day])), [
  ["2025-10-24", "Fri"], ["2025-10-25", "Sat"], ["2025-10-26", "Sun"],
  ["2025-10-27", "Mon"], ["2025-10-28", "Tue"],
]);
assert.equal(new Set(days.map((day) => day.key)).size, 5);
assert.equal(days[2].hours.length, 25);
assert.equal(days[2].hours.filter((hour) => hour.time === "02:00").length, 2);
assert.equal(days[2].hours.at(-1).time, "23:00");
assert.equal(days[3].max, "23°", "Monday's daily summary stays on Monday");
assert.equal(rules.getDailyForecastIndex("2025-10-27"), 3);
const noHourly = { ...autumn, hourly: undefined };
rules.setData(noHourly, "Europe/Amsterdam");
assert.equal(rules.buildSelectedDayTemperatureRange(unix("2025-10-27T12:00:00+01:00")).max, "23°",
  "selected-day fallback uses the same normalized calendar keys");

// Once the second 02:00 is current, the first occurrence must no longer affect summaries.
const secondHour = unix("2025-10-26T02:15:00+01:00");
autumn.current.time = secondHour;
const firstHourIndex = autumn.hourly.time.indexOf(unix("2025-10-26T02:00:00+02:00"));
autumn.hourly.temperature_2m[firstHourIndex] = 40;
wetIntervalEndingAt(autumn, unix("2025-10-26T02:00:00+01:00"));
rules.setData(autumn, "Europe/Amsterdam");
const remaining = rules.getForecastHourEntries("2025-10-26", { currentTime: secondHour, isToday: true });
assert.equal(remaining.length, 22);
assert.equal(remaining[0].time, unix("2025-10-26T02:00:00+01:00"));
assert.equal(rules.buildCurrentDayTemperatureRange().max, "20°");
assert.equal(rules.buildSelectedDayTemperatureRange(secondHour).max, "20°");
assert.equal(rules.buildDays()[2].hours.length, 22);
assert.equal(rules.buildDays()[2].precipitation.chance, 0);
assert.equal(rules.buildCurrentDayPrecipitation().chance, 0);

// The spring day has 23 hours: no invented 02:00, no omitted final hour.
const spring = forecastFixture({ date: "2026-03-27", offset: hourSeconds });
rules.setData(spring, "Europe/Amsterdam");
days = rules.buildDays();
assert.deepEqual(plain(days.map((day) => day.key)), ["2026-03-27", "2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"]);
assert.equal(days[2].hours.length, 23);
assert.equal(days[2].hours.some((hour) => hour.time === "02:00"), false);
assert.equal(days[2].hours.at(-1).time, "23:00");

// Calendar labels must remain stable across distant device/location zones, including half hours.
const originalTimezone = process.env.TZ;
try {
  for (const deviceTimezone of ["Pacific/Kiritimati", "Etc/GMT+12"]) {
    process.env.TZ = deviceTimezone;
    for (const [timezone, offset] of [
      ["Pacific/Kiritimati", 14 * hourSeconds],
      ["Etc/GMT+12", -12 * hourSeconds],
      ["Asia/Kolkata", 5.5 * hourSeconds],
    ]) {
      rules.setData(forecastFixture({ offset }), timezone);
      const locationDays = rules.buildDays();
      assert.deepEqual(plain(locationDays.map(({ key, day }) => [key, day])), [
        ["2026-09-05", "Sat"], ["2026-09-06", "Sun"], ["2026-09-07", "Mon"],
        ["2026-09-08", "Tue"], ["2026-09-09", "Wed"],
      ], `${timezone} dates are independent of device timezone ${deviceTimezone}`);
      assert.equal(locationDays[1].hours.length, 24);
      assert.equal(locationDays[1].hours[0].time, "00:00");
      assert.equal(locationDays[1].hours.at(-1).time, "23:00");
    }
  }
} finally {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
}

// Reusing formatter objects must never reuse a location's offset or a previously formatted date.
const formatInstant = unix("2026-09-05T23:30:00Z");
for (const [timezone, clock, calendarDay, weekday, longWeekday] of [
  ["Europe/Amsterdam", "01:30", "06", "Sun", "Sunday"],
  ["America/Los_Angeles", "16:30", "05", "Sat", "Saturday"],
  ["Asia/Tokyo", "08:30", "06", "Sun", "Sunday"],
  ["Asia/Kolkata", "05:00", "06", "Sun", "Sunday"],
  ["Europe/Amsterdam", "01:30", "06", "Sun", "Sunday"],
]) {
  rules.setData(forecastFixture(), timezone);
  assert.equal(rules.formatClock(formatInstant), clock, "selected location controls the cached clock formatter");
  assert.deepEqual(plain(rules.getDateParts(formatInstant)), {
    year: "2026", month: "09", day: calendarDay, hour: clock.slice(0, 2), minute: clock.slice(3),
  });
  assert.equal(rules.formatWeekday(formatInstant), weekday);
  assert.equal(rules.formatWeekday(formatInstant, "long"), longWeekday);
  assert.equal(rules.formatWeekday("2026-09-05"), "Sat", "daily date strings retain UTC calendar formatting");
}

// Invalid timezone attempts must still use Amsterdam, without retaining invalid configurations.
rules.setData(forecastFixture(), "Invalid/Timezone");
const validCacheSize = rules.getFormatterCacheSize();
for (let repeat = 0; repeat < 3; repeat += 1) {
  assert.equal(rules.formatClock(formatInstant), "01:30");
  assert.deepEqual(plain(rules.getDateParts(formatInstant)), {
    year: "2026", month: "09", day: "06", hour: "01", minute: "30",
  });
  assert.equal(rules.formatWeekday(formatInstant), "Sun");
  assert.equal(rules.formatWeekday(formatInstant, "long"), "Sunday");
  assert.equal(rules.formatWeekday("2026-09-05"), "Sat");
}
assert.equal(rules.getFormatterCacheSize(), validCacheSize, "failed timezone construction is not cached");

// The same cached formatter must resolve both DST offsets from each actual instant.
rules.setData(forecastFixture(), "Europe/Amsterdam");
for (const [instant, expectedClock] of [
  ["2025-10-26T00:15:00Z", "02:15"],
  ["2025-10-26T01:15:00Z", "02:15"],
  ["2025-10-26T02:15:00Z", "03:15"],
  ["2026-03-29T00:15:00Z", "01:15"],
  ["2026-03-29T01:15:00Z", "03:15"],
]) {
  const time = unix(instant);
  assert.equal(rules.formatClock(time), expectedClock);
  assert.equal(rules.getDateParts(time).hour, expectedClock.slice(0, 2));
  assert.equal(rules.formatWeekday(time, "long"), "Sunday");
}

// Measure the intended work reduction directly, without wall-clock timing thresholds.
rules.clearFormatterCache();
const beforeReuse = formatterConstructions.length;
for (let repeat = 0; repeat < 20; repeat += 1) {
  const time = formatInstant + repeat * hourSeconds;
  rules.formatClock(time);
  rules.getDateParts(time);
  rules.formatWeekday("2026-09-05", "short");
  rules.formatWeekday("2026-09-05", "long");
}
assert.equal(formatterConstructions.length - beforeReuse, 4,
  "repeated dates reuse one formatter per locale/options combination");
assert.equal(rules.getFormatterCacheSize(), 4);

// Visiting many locations must not retain an unbounded set of native Intl objects.
rules.clearFormatterCache();
const formatterZones = [
  "UTC", "Europe/Amsterdam", "Europe/Paris", "Europe/London", "America/New_York",
  "America/Los_Angeles", "America/Chicago", "America/Anchorage", "Pacific/Honolulu",
  "Pacific/Kiritimati", "Pacific/Auckland", "Australia/Sydney", "Australia/Adelaide",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Asia/Kathmandu", "Asia/Dubai",
  "Africa/Johannesburg", "Africa/Cairo",
];
assert.ok(formatterZones.length > rules.formatterCacheLimit, "fixture exceeds the bounded cache capacity");
for (const timezone of formatterZones) {
  const expected = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: timezone,
  }).format(new Date(formatInstant * 1000));
  assert.equal(rules.formatClock(formatInstant, timezone), expected);
  assert.ok(rules.getFormatterCacheSize() <= rules.formatterCacheLimit);
}
assert.equal(rules.getFormatterCacheSize(), rules.formatterCacheLimit);
const beforeEvictedZone = formatterConstructions.length;
assert.equal(rules.formatClock(formatInstant, "UTC"), "23:30");
assert.equal(formatterConstructions.length, beforeEvictedZone + 1, "evicted configurations are recreated correctly");
assert.equal(rules.getFormatterCacheSize(), rules.formatterCacheLimit);

// Implicit device timezone discovery and formatting remain live when the system zone changes.
const browserTimezoneBefore = process.env.TZ;
const cacheSizeBeforeDeviceChanges = rules.getFormatterCacheSize();
try {
  for (const [timezone, day, hour] of [
    ["Asia/Tokyo", "06", "08"],
    ["America/Los_Angeles", "05", "16"],
    ["Asia/Tokyo", "06", "08"],
  ]) {
    process.env.TZ = timezone;
    assert.equal(rules.getBrowserTimezone(), timezone);
    assert.deepEqual(plain(rules.getDeviceDateParts(formatInstant)), {
      year: "2026", month: "09", day, hour, minute: "30",
    });
    assert.equal(rules.getFormatterCacheSize(), cacheSizeBeforeDeviceChanges,
      "implicit device timezone formatters are not retained");
  }
} finally {
  if (browserTimezoneBefore === undefined) delete process.env.TZ;
  else process.env.TZ = browserTimezoneBefore;
}

console.log("MyMeteo forecast interval, calendar, DST and formatter reuse checks passed.");
