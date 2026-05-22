const DEFAULT_LOCATION = {
  name: "Amsterdam",
  label: "Amsterdam, North Holland, Netherlands",
  lat: 52.3676,
  lon: 4.9041,
  timezone: "Europe/Amsterdam",
};

const storedLocationKey = "mymeteo.location";
const libreWxrRadarUrl = "https://api.librewxr.net/public/weather-maps.json";
const buienradarAnimationBaseUrl = "https://image.buienradar.nl/2.0/image/animation";
const gifDecoderModuleUrl = "https://esm.sh/gifuct-js@2.1.2?bundle";
const weatherIconBasePath = "assets/weather-icons-mymeteo/";
const buienradarBounds = [
  [48.92249926375824, 0],
  [55.77657301866769, 11.25],
];
const buienradarRadarModes = {
  "3h": {
    imageType: "RadarMapRainWebmercatorNL",
    forecastSteps: 36,
    frameMinutes: 5,
    switchLabel: "3h",
  },
  "8h": {
    imageType: "RadarMapRainWebmercatorNLEighthour",
    forecastSteps: 32,
    frameMinutes: 15,
    switchLabel: "8h",
  },
};
const buienradarDefaultRadarModeId = "3h";
const buienradarDefaultTimeline = {
  frameCount: buienradarRadarModes[buienradarDefaultRadarModeId].forecastSteps,
  frameDurationMs: 1000,
};

const elements = {
  app: document.querySelector(".weather-app"),
  locationForm: document.querySelector("#locationForm"),
  locationInput: document.querySelector("#locationInput"),
  locationOptions: document.querySelector("#locationOptions"),
  locateButton: document.querySelector("#locateButton"),
  brandButton: document.querySelector("#brandButton"),
  refreshButton: document.querySelector("#refreshButton"),
  updatedAt: document.querySelector("#updatedAt"),
  nowPanel: document.querySelector(".now-panel"),
  currentTemp: document.querySelector("#currentTemp"),
  conditionLabel: document.querySelector("#conditionLabel"),
  maxTemp: document.querySelector("#maxTemp"),
  minTemp: document.querySelector("#minTemp"),
  rainTotal: document.querySelector("#rainTotal"),
  windText: document.querySelector("#windText"),
  windArrow: document.querySelector("#windArrow"),
  rainTab: document.querySelector("#rainTab"),
  forecastTab: document.querySelector("#forecastTab"),
  forecastPanel: document.querySelector("#forecastPanel"),
  forecastBody: document.querySelector("#forecastBody"),
  infoButton: document.querySelector("#infoButton"),
  infoDialog: document.querySelector("#infoDialog"),
  radarPanel: document.querySelector(".radar-panel"),
  radarMap: document.querySelector("#radarMap"),
  radarTime: document.querySelector("#radarTime"),
  radarSlider: document.querySelector("#radarSlider"),
  rainForecastBadge: document.querySelector("#rainForecastBadge"),
  sliderTimestamps: document.querySelector("#sliderTimestamps"),
};

const weatherCodes = {
  0: {
    label: "Clear sky",
    nightLabel: "Clear night",
    dayIcon: "clear-day",
    nightIcon: "clear-night",
    tone: "#f8de9c",
    ink: "#6d4b00",
    nightTone: "#ded9ed",
    nightInk: "#4e416f",
  },
  1: {
    label: "Mostly clear",
    dayIcon: "mostly-clear-day",
    nightIcon: "mostly-clear-night",
    tone: "#f8de9c",
    ink: "#6d4b00",
    nightTone: "#ded9ed",
    nightInk: "#4e416f",
  },
  2: {
    label: "Partly cloudy",
    dayIcon: "partly-cloudy-day",
    nightIcon: "partly-cloudy-night",
    tone: "#dceee6",
    ink: "#285c50",
    nightTone: "#ded9ed",
    nightInk: "#4e416f",
  },
  3: {
    label: "Overcast",
    dayIcon: "overcast-day",
    nightIcon: "overcast-night",
    tone: "#dbe0df",
    ink: "#3e4b48",
  },
  45: {
    label: "Fog",
    dayIcon: "fog-day",
    nightIcon: "fog-night",
    tone: "#e2ded4",
    ink: "#4c504b",
  },
  48: {
    label: "Rime fog",
    dayIcon: "fog-day",
    nightIcon: "fog-night",
    tone: "#dfe9e9",
    ink: "#4c504b",
  },
  51: { label: "Light drizzle", icon: "drizzle", tone: "#d6e9ea", ink: "#2f6170" },
  53: { label: "Drizzle", icon: "drizzle", tone: "#d6e9ea", ink: "#2f6170" },
  55: { label: "Heavy drizzle", icon: "drizzle", tone: "#d6e9ea", ink: "#2f6170" },
  56: {
    label: "Freezing drizzle",
    icon: "overcast-sleet",
    tone: "#d9eef4",
    ink: "#2f6170",
  },
  57: {
    label: "Freezing drizzle",
    icon: "overcast-sleet",
    tone: "#d9eef4",
    ink: "#2f6170",
  },
  61: { label: "Light rain", icon: "rain", tone: "#d4e5ef", ink: "#245a75" },
  63: { label: "Rain", icon: "rain", tone: "#d4e5ef", ink: "#245a75" },
  65: {
    label: "Heavy rain",
    icon: "overcast-rain",
    tone: "#c7ddeb",
    ink: "#245a75",
  },
  66: {
    label: "Freezing rain",
    icon: "overcast-sleet",
    tone: "#d9eef4",
    ink: "#245a75",
  },
  67: {
    label: "Freezing rain",
    icon: "overcast-sleet",
    tone: "#d9eef4",
    ink: "#245a75",
  },
  71: { label: "Light snow", icon: "snow", tone: "#eef3f1", ink: "#53636a" },
  73: { label: "Snow", icon: "snow", tone: "#eef3f1", ink: "#53636a" },
  75: { label: "Heavy snow", icon: "snow", tone: "#eef3f1", ink: "#53636a" },
  77: {
    label: "Snow grains",
    icon: "snowflake",
    tone: "#eef3f1",
    ink: "#53636a",
  },
  80: {
    label: "Light showers",
    dayIcon: "partly-cloudy-day-rain",
    nightIcon: "partly-cloudy-night-rain",
    tone: "#d4e5ef",
    ink: "#245a75",
  },
  81: {
    label: "Showers",
    dayIcon: "partly-cloudy-day-rain",
    nightIcon: "partly-cloudy-night-rain",
    tone: "#d4e5ef",
    ink: "#245a75",
  },
  82: {
    label: "Heavy showers",
    dayIcon: "partly-cloudy-day-rain",
    nightIcon: "partly-cloudy-night-rain",
    tone: "#c7ddeb",
    ink: "#245a75",
  },
  85: {
    label: "Snow showers",
    dayIcon: "partly-cloudy-day-snow",
    nightIcon: "partly-cloudy-night-snow",
    tone: "#eef3f1",
    ink: "#53636a",
  },
  86: {
    label: "Snow showers",
    dayIcon: "partly-cloudy-day-snow",
    nightIcon: "partly-cloudy-night-snow",
    tone: "#eef3f1",
    ink: "#53636a",
  },
  95: {
    label: "Thunderstorm",
    dayIcon: "thunderstorms-day-rain",
    nightIcon: "thunderstorms-night-rain",
    tone: "#ded9ed",
    ink: "#4e416f",
  },
  96: {
    label: "Storm with hail",
    dayIcon: "thunderstorms-day-hail",
    nightIcon: "thunderstorms-night-hail",
    tone: "#ded9ed",
    ink: "#4e416f",
  },
  99: {
    label: "Storm with hail",
    dayIcon: "thunderstorms-day-hail",
    nightIcon: "thunderstorms-night-hail",
    tone: "#ded9ed",
    ink: "#4e416f",
  },
};

const compassPoints = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

let map;
let libreWxrRadarLayers = new Map();
let buienradarLayer;
let buienradarLayerKey;
let buienradarNextLayer;
let buienradarNextLayerKey;
let buienradarFrameUrls = [];
let buienradarRadarCache = new Map();
let buienradarRadarRequests = new Map();
let buienradarStartDate;
let buienradarTimeline = buienradarDefaultTimeline;
let buienradarDisplayRequestId = 0;
let radarResizeObserver;
let buienradarModeControlContainer;
let buienradarModeButton;
let activeBuienradarRadarModeId = buienradarDefaultRadarModeId;
let loadedBuienradarRadarModeId = buienradarDefaultRadarModeId;
let isBuienradarRadarModeLoading = false;
let locationMarker;
let radarFrames = [];
let locationSearchResults = [];
let locationSearchTimer;
let locationSearchAbortController;
let sliderTimestampTimer;
let buienradarPreloadTimer;
let weatherData;
let activeRadarDate;
let activeMobileView = "rain";
let selectedLocation = loadStoredLocation() || DEFAULT_LOCATION;
let refreshTimer;

function init() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  renderLocation();
  initMap();
  bindEvents();
  syncForecastViewForViewport();
  loadAll();
  refreshTimer = window.setInterval(loadAll, 10 * 60 * 1000);
}

function bindEvents() {
  elements.locationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    selectTypedLocation();
  });
  elements.locationInput.addEventListener("input", handleLocationInput);
  elements.locationInput.addEventListener("change", selectMatchingLocation);
  elements.locationInput.addEventListener("focus", () => {
    selectLocationInputText();
    if (locationSearchResults.length) {
      renderLocationOptions();
    }
  });
  elements.locationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      selectTypedLocation();
    } else if (event.key === "Escape") {
      hideLocationOptions();
    }
  });
  document.addEventListener("click", (event) => {
    if (!elements.locationForm.contains(event.target)) {
      hideLocationOptions();
    }
  });
  elements.locateButton.addEventListener("click", useCurrentLocation);
  if (elements.brandButton) {
    elements.brandButton.addEventListener("click", openInfoDialog);
    elements.brandButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openInfoDialog();
      }
    });
  }
  elements.refreshButton.addEventListener("click", loadAll);
  elements.rainTab.addEventListener("click", () => setMobileView("rain"));
  elements.forecastTab.addEventListener("click", () => setMobileView("forecast"));
  if (elements.infoButton && elements.infoDialog) {
    elements.infoButton.addEventListener("click", openInfoDialog);
    elements.infoDialog.addEventListener("click", (event) => {
      if (event.target === elements.infoDialog) {
        elements.infoDialog.close();
      }
    });
  }
  elements.radarSlider.addEventListener("input", (event) => {
    handleRadarSliderInput(Number(event.target.value));
  });
  window.addEventListener("resize", () => {
    scheduleSliderTimestampsUpdate();
    resizeLocationInput(elements.locationInput.value);
    syncForecastViewForViewport();
  });
  if ("ResizeObserver" in window) {
    radarResizeObserver = new ResizeObserver(() => {
      refreshMapSize();
      scheduleSliderTimestampsUpdate();
    });
    radarResizeObserver.observe(elements.radarPanel);
    radarResizeObserver.observe(elements.radarMap);
  }
}

function renderLocation() {
  elements.locationInput.value = selectedLocation.name;
  elements.locationInput.title = selectedLocation.label || selectedLocation.name;
  resizeLocationInput(selectedLocation.name);
  document.title = "MyMeteo";
}

function openInfoDialog() {
  if (!elements.infoDialog) {
    return;
  }

  if (typeof elements.infoDialog.showModal === "function") {
    elements.infoDialog.showModal();
    return;
  }

  elements.infoDialog.setAttribute("open", "");
}

function setMobileView(view) {
  activeMobileView = view;
  syncForecastViewForViewport();
}

function syncForecastViewForViewport() {
  const isDesktop = window.matchMedia("(min-width: 760px)").matches;
  const showForecast = isDesktop || activeMobileView === "forecast";
  const showRadar = isDesktop || activeMobileView === "rain";

  elements.forecastPanel.hidden = !showForecast;
  elements.radarPanel.hidden = !showRadar;
  elements.nowPanel.hidden = false;
  updateMobileTabs();

  if (window.lucide) {
    window.lucide.createIcons();
  }

  if (showRadar) {
    refreshMapSize();
  }
}

function updateMobileTabs() {
  const rainActive = activeMobileView === "rain";
  const forecastActive = activeMobileView === "forecast";

  elements.rainTab.classList.toggle("is-active", rainActive);
  elements.forecastTab.classList.toggle("is-active", forecastActive);
  elements.rainTab.setAttribute("aria-selected", String(rainActive));
  elements.forecastTab.setAttribute("aria-selected", String(forecastActive));
  elements.rainTab.tabIndex = rainActive ? 0 : -1;
  elements.forecastTab.tabIndex = forecastActive ? 0 : -1;
}

function handleLocationInput() {
  const query = elements.locationInput.value.trim();
  window.clearTimeout(locationSearchTimer);
  resizeLocationInput(elements.locationInput.value);

  if (query.length < 2) {
    locationSearchResults = [];
    renderLocationOptions();
    return;
  }

  locationSearchTimer = window.setTimeout(() => {
    searchLocationSuggestions(query);
  }, 220);
}

function resizeLocationInput(value) {
  const hasValue = Boolean(value);
  const text = hasValue ? value : elements.locationInput.placeholder;
  const canvas = resizeLocationInput.canvas || document.createElement("canvas");
  const context = canvas.getContext("2d");
  const style = window.getComputedStyle(elements.locationInput);
  const formStyle = window.getComputedStyle(elements.locationForm);
  const buttonWidth = elements.locateButton.offsetWidth || 34;
  const formGap = Number.parseFloat(formStyle.columnGap || formStyle.gap) || 6;
  const locationBlockWidth = elements.locationForm.parentElement.getBoundingClientRect().width;
  const availableWidth = Math.max(44, locationBlockWidth - buttonWidth - formGap);
  resizeLocationInput.canvas = canvas;

  context.font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize,
    style.fontFamily,
  ].join(" ");

  const measuredWidth = context.measureText(text).width + 10;
  const placeholderWidth = context.measureText(elements.locationInput.placeholder).width + 12;
  const minWidth = hasValue ? 42 : placeholderWidth;
  const maxWidth = Math.min(420, availableWidth);
  const width = Math.min(Math.max(measuredWidth, minWidth), maxWidth);
  elements.locationForm.style.setProperty("--location-input-width", `${Math.ceil(width)}px`);
}

function selectLocationInputText() {
  window.requestAnimationFrame(() => {
    elements.locationInput.select();
  });
}

function selectMatchingLocation() {
  const typedValue = elements.locationInput.value.trim();
  const match = locationSearchResults.find((result) => formatLocationResult(result) === typedValue);

  if (match) {
    applyLocation(locationFromResult(match));
  }
}

async function selectTypedLocation() {
  const typedValue = elements.locationInput.value.trim();

  if (typedValue.length < 2) {
    renderLocation();
    return;
  }

  const exactMatch = locationSearchResults.find((result) => formatLocationResult(result) === typedValue);
  if (exactMatch) {
    applyLocation(locationFromResult(exactMatch));
    return;
  }

  window.clearTimeout(locationSearchTimer);
  const results = await searchLocationSuggestions(typedValue);
  if (results[0]) {
    applyLocation(locationFromResult(results[0]));
  } else {
    elements.updatedAt.textContent = "Location not found";
    elements.updatedAt.classList.add("error");
  }
}

async function searchLocationSuggestions(query) {
  if (locationSearchAbortController) {
    locationSearchAbortController.abort();
  }

  locationSearchAbortController = new AbortController();
  const params = new URLSearchParams({
    name: query,
    count: "8",
    language: "en",
    format: "json",
  });

  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
      signal: locationSearchAbortController.signal,
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo geocoding responded with ${response.status}`);
    }

    const data = await response.json();
    locationSearchResults = data.results || [];
    renderLocationOptions();
    return locationSearchResults;
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
    }
    return [];
  }
}

function renderLocationOptions() {
  elements.locationInput.setAttribute("aria-expanded", String(locationSearchResults.length > 0));
  elements.locationOptions.hidden = locationSearchResults.length === 0;
  elements.locationOptions.replaceChildren(
    ...locationSearchResults.map((result, index) => {
      const item = document.createElement("li");
      const option = document.createElement("button");
      option.className = "location-option";
      option.type = "button";
      option.role = "option";
      option.id = `location-option-${index}`;
      option.textContent = formatLocationResult(result);
      option.addEventListener("click", () => {
        applyLocation(locationFromResult(result));
      });
      item.appendChild(option);
      return item;
    }),
  );
}

function hideLocationOptions() {
  elements.locationInput.setAttribute("aria-expanded", "false");
  elements.locationOptions.hidden = true;
}

function formatLocationResult(result) {
  const parts = [result.name, result.admin1, result.country].filter(Boolean);
  return [...new Set(parts)].join(", ");
}

function locationFromResult(result) {
  return {
    name: result.name,
    label: formatLocationResult(result),
    lat: result.latitude,
    lon: result.longitude,
    timezone: result.timezone || getBrowserTimezone(),
  };
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    elements.updatedAt.textContent = "Current location unavailable";
    elements.updatedAt.classList.add("error");
    return;
  }

  if (!window.isSecureContext) {
    elements.updatedAt.textContent = "Open via localhost for location";
    elements.updatedAt.classList.add("error");
    return;
  }

  elements.updatedAt.textContent = "Locating...";
  elements.updatedAt.classList.remove("error");
  elements.locateButton.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      applyLocation({
        name: "Current location",
        label: "Current location",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        timezone: getBrowserTimezone(),
      });
    },
    (error) => {
      console.error(error);
      elements.updatedAt.textContent = getGeolocationErrorMessage(error);
      elements.updatedAt.classList.add("error");
      elements.locateButton.disabled = false;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5 * 60 * 1000,
      timeout: 10 * 1000,
    },
  );
}

function getGeolocationErrorMessage(error) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission blocked";
  }

  if (error.code === error.TIMEOUT) {
    return "Location request timed out";
  }

  return "Current location unavailable";
}

function applyLocation(location) {
  selectedLocation = normalizeLocation(location);
  saveLocation(selectedLocation);
  hideLocationOptions();
  renderLocation();
  updateMapLocation();
  loadAll();
}

function updateMapLocation() {
  if (!map) {
    return;
  }

  const latLng = [selectedLocation.lat, selectedLocation.lon];
  locationMarker.setLatLng(latLng);
  map.setView(latLng, 7, { animate: false });
  refreshMapSize();
}

async function loadAll() {
  setLoading(true);
  elements.updatedAt.textContent = "Refreshing...";
  await Promise.all([loadWeather(), loadRadar()]);
  setLoading(false);
}

async function loadWeather() {
  const params = new URLSearchParams({
    latitude: selectedLocation.lat,
    longitude: selectedLocation.lon,
    current: [
      "temperature_2m",
      "is_day",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
    ].join(","),
    hourly: ["temperature_2m", "wind_speed_10m", "wind_direction_10m"].join(","),
    forecast_days: "6",
    timezone: selectedLocation.timezone,
    timeformat: "unixtime",
    wind_speed_unit: "kmh",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) {
      throw new Error(`Open-Meteo responded with ${response.status}`);
    }

    const data = await response.json();
    renderWeather(data);
  } catch (error) {
    console.error(error);
    elements.updatedAt.textContent = "Forecast unavailable";
    elements.updatedAt.classList.add("error");
    renderFiveDayForecast();
  }
}

function renderWeather(data) {
  weatherData = data;
  const current = data.current;
  const daily = data.daily;
  const condition = getCondition(current.weather_code, current.is_day);

  elements.conditionLabel.textContent = condition.label;
  renderConditionIcon(condition);
  elements.maxTemp.textContent = formatOptionalTemperature(daily.temperature_2m_max?.[0]);
  elements.minTemp.textContent = formatOptionalTemperature(daily.temperature_2m_min?.[0]);
  elements.rainTotal.textContent = formatOptionalRainChance(daily.precipitation_probability_max?.[0]);
  elements.updatedAt.textContent = `Checked ${formatClock(new Date())}`;
  elements.updatedAt.title = `Weather observation ${formatTime(current.time)}`;
  elements.updatedAt.classList.remove("error");

  renderFiveDayForecast(daily);
  renderTimedWeather(getActiveRadarDate() || new Date(current.time * 1000));
}

function renderTimedWeather(date) {
  if (!weatherData) {
    return;
  }

  const current = weatherData.current;
  const currentSnapshot = {
    temperature: current.temperature_2m,
    windDirection: current.wind_direction_10m,
    windSpeed: current.wind_speed_10m,
    time: current.time,
  };
  const currentDate = new Date(current.time * 1000);
  const isCurrentTime = !date || Math.abs(date - currentDate) < 30 * 60 * 1000;
  const snapshot = isCurrentTime ? currentSnapshot : getHourlyWeatherSnapshot(date, weatherData.hourly) || currentSnapshot;

  renderTemperatureAndWind(snapshot);
}

function getHourlyWeatherSnapshot(date, hourly) {
  if (!date || !hourly?.time?.length) {
    return undefined;
  }

  const index = getClosestTimeIndex(hourly.time, date.getTime() / 1000);
  if (index < 0) {
    return undefined;
  }

  return {
    temperature: hourly.temperature_2m?.[index],
    windDirection: hourly.wind_direction_10m?.[index],
    windSpeed: hourly.wind_speed_10m?.[index],
    time: hourly.time[index],
  };
}

function getClosestTimeIndex(times, targetTime) {
  if (!times?.length || !Number.isFinite(targetTime)) {
    return -1;
  }

  let closestIndex = 0;
  let closestDistance = Math.abs(times[0] - targetTime);

  for (let index = 1; index < times.length; index += 1) {
    const distance = Math.abs(times[index] - targetTime);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }

  return closestIndex;
}

function renderTemperatureAndWind({ temperature, windDirection, windSpeed, time }) {
  elements.currentTemp.textContent = formatOptionalTemperature(temperature);
  elements.currentTemp.title = time ? `Forecast for ${formatTime(time)}` : "";

  if (!Number.isFinite(windDirection) || !Number.isFinite(windSpeed)) {
    elements.windText.textContent = "--";
    elements.windText.title = "";
    elements.windArrow.style.transform = "";
    elements.windArrow.title = "";
    return;
  }

  const roundedWindSpeed = Math.round(windSpeed);
  const beaufort = kmhToBeaufort(roundedWindSpeed);
  const downwindDirection = (windDirection + 180) % 360;
  const timeLabel = time ? `, forecast for ${formatTime(time)}` : "";

  elements.windText.textContent = `${degreesToCompass(windDirection)} ${beaufort}`;
  elements.windText.title = `${roundedWindSpeed} km/h, blowing toward ${degreesToCompass(downwindDirection)}${timeLabel}`;
  elements.windArrow.style.transform = `rotate(${downwindDirection}deg)`;
  elements.windArrow.title = `Blowing toward ${degreesToCompass(downwindDirection)}${timeLabel}`;
}

function setActiveRadarDate(date) {
  activeRadarDate = date;
  renderTimedWeather(date);
}

function getActiveRadarDate() {
  if (activeRadarDate) {
    return activeRadarDate;
  }

  return getRadarDateForSlider(Number(elements.radarSlider.value) || 0);
}

function renderFiveDayForecast(daily) {
  const days = buildFiveDayForecast(daily);
  if (!days.length) {
    elements.forecastBody.innerHTML = '<tr><td class="forecast-empty" colspan="6">Forecast unavailable</td></tr>';
    return;
  }

  elements.forecastBody.replaceChildren(...days.map(createForecastRow));
}

function buildFiveDayForecast(daily) {
  if (!daily?.time?.length) {
    return [];
  }

  return daily.time.slice(1, 6).map((time, offset) => {
    const index = offset + 1;
    const windSpeed = daily.wind_speed_10m_max?.[index];
    const windDirection = daily.wind_direction_10m_dominant?.[index];
    const condition = getCondition(daily.weather_code?.[index], true);

    return {
      day: formatWeekday(time),
      condition,
      max: formatOptionalTemperature(daily.temperature_2m_max?.[index]),
      min: formatOptionalTemperature(daily.temperature_2m_min?.[index]),
      rain: formatOptionalRainChance(daily.precipitation_probability_max?.[index]),
      wind: formatOptionalWind(windDirection, windSpeed),
    };
  });
}

function createForecastRow(day) {
  const row = document.createElement("tr");
  row.append(
    createCell(day.day, "forecast-day"),
    createIconCell(day.condition),
    createCell(day.max, "temp-max"),
    createCell(day.min, "temp-min"),
    createCell(day.rain),
    createCell(day.wind, "forecast-wind"),
  );
  return row;
}

function createCell(text, className) {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) {
    cell.className = className;
  }
  return cell;
}

function createIconCell(condition) {
  const cell = document.createElement("td");
  const mark = document.createElement("span");
  const icon = createWeatherIcon(condition, "forecast-weather-icon");
  cell.className = "forecast-sky-cell";
  cell.title = condition.label;
  cell.setAttribute("aria-label", condition.label);
  mark.className = "forecast-condition-mark";
  mark.title = condition.label;
  mark.setAttribute("aria-hidden", "true");
  mark.appendChild(icon);
  cell.appendChild(mark);
  return cell;
}

function renderConditionIcon(condition) {
  const mark = document.querySelector(".condition-mark");
  const iconElement = createWeatherIcon(condition, "condition-icon", "eager");
  iconElement.id = "conditionIcon";
  mark.title = condition.label;
  mark.replaceChildren(iconElement);
}

function createWeatherIcon(condition, className, loading = "lazy") {
  const icon = document.createElement("img");
  icon.className = `weather-icon ${className}`;
  icon.src = `${weatherIconBasePath}${condition.icon}.svg`;
  icon.alt = "";
  icon.width = 64;
  icon.height = 64;
  icon.decoding = "async";
  icon.loading = loading;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function getCondition(code, isDay) {
  const fallback = {
    label: "Mixed conditions",
    dayIcon: "partly-cloudy-day",
    nightIcon: "partly-cloudy-night",
    tone: "#dceee6",
    ink: "#285c50",
    nightTone: "#ded9ed",
    nightInk: "#4e416f",
  };
  const condition = weatherCodes[code] || fallback;
  const dayTime = isDay !== 0 && isDay !== false;
  const icon = dayTime ? condition.dayIcon || condition.icon : condition.nightIcon || condition.dayIcon || condition.icon;

  return {
    ...condition,
    icon,
    label: !dayTime && condition.nightLabel ? condition.nightLabel : condition.label,
    tone: !dayTime && condition.nightTone ? condition.nightTone : condition.tone,
    ink: !dayTime && condition.nightInk ? condition.nightInk : condition.ink,
  };
}

function initMap() {
  map = L.map(elements.radarMap, {
    center: [selectedLocation.lat, selectedLocation.lon],
    zoom: 7,
    minZoom: 6,
    maxZoom: 11,
    zoomControl: false,
    attributionControl: true,
    dragging: true,
    touchZoom: true,
    doubleClickZoom: true,
    boxZoom: true,
    keyboard: true,
    scrollWheelZoom: true,
    tap: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    keepBuffer: 6,
    updateWhenIdle: false,
    updateWhenZooming: false,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  locationMarker = L.circleMarker([selectedLocation.lat, selectedLocation.lon], {
    radius: 5,
    weight: 2,
    color: "#17201b",
    fillColor: "#f2b84b",
    fillOpacity: 1,
  }).addTo(map);

  L.control.zoom({ position: "topright" }).addTo(map);
  createBuienradarModeControl().addTo(map);
  updateBuienradarModeControl();
  refreshMapSize();
}

function createBuienradarModeControl() {
  const control = L.control({ position: "topright" });

  control.onAdd = () => {
    buienradarModeControlContainer = L.DomUtil.create("div", "leaflet-control buienradar-mode-control");
    buienradarModeButton = L.DomUtil.create("button", "buienradar-mode-button", buienradarModeControlContainer);
    buienradarModeButton.type = "button";
    buienradarModeButton.addEventListener("click", toggleBuienradarRadarMode);
    L.DomEvent.disableClickPropagation(buienradarModeControlContainer);
    L.DomEvent.disableScrollPropagation(buienradarModeControlContainer);
    updateBuienradarModeControl();
    return buienradarModeControlContainer;
  };

  return control;
}

async function toggleBuienradarRadarMode(event) {
  event?.preventDefault();

  if (isBuienradarRadarModeLoading || !isInBuienradarBounds(selectedLocation) || !buienradarFrameUrls.length) {
    return;
  }

  const nextModeId = getNextBuienradarRadarModeId(getDisplayedBuienradarRadarModeId());
  const cachedRadar = buienradarRadarCache.get(nextModeId);
  activeBuienradarRadarModeId = nextModeId;

  if (cachedRadar) {
    buienradarDisplayRequestId += 1;
    displayBuienradarRadar(cachedRadar);
    scheduleInactiveBuienradarRadarPreload();
    updateBuienradarModeControl();
    return;
  }

  const requestId = buienradarDisplayRequestId + 1;
  buienradarDisplayRequestId = requestId;
  isBuienradarRadarModeLoading = true;
  updateBuienradarModeControl();
  setRefreshButtonWorking(true);

  try {
    const radar = await fetchBuienradarRadarMode(nextModeId);
    if (requestId === buienradarDisplayRequestId && activeBuienradarRadarModeId === nextModeId && isInBuienradarBounds(selectedLocation)) {
      displayBuienradarRadar(radar);
      scheduleInactiveBuienradarRadarPreload();
    }
  } catch (error) {
    activeBuienradarRadarModeId = getDisplayedBuienradarRadarModeId();
    console.warn(`Could not switch to the ${nextModeId} Buienradar mode.`, error);
  } finally {
    isBuienradarRadarModeLoading = false;
    setRefreshButtonWorking(false);
    updateBuienradarModeControl();
  }
}

function updateBuienradarModeControl() {
  if (!buienradarModeControlContainer || !buienradarModeButton) {
    return;
  }

  const isAvailable = isInBuienradarBounds(selectedLocation);
  buienradarModeControlContainer.hidden = !isAvailable;
  if (!isAvailable) {
    return;
  }

  const nextModeId = getNextBuienradarRadarModeId(getDisplayedBuienradarRadarModeId());
  const nextMode = getBuienradarRadarMode(nextModeId);
  buienradarModeButton.textContent = nextMode.switchLabel;
  buienradarModeButton.title = `Show ${nextMode.switchLabel} rain radar`;
  buienradarModeButton.setAttribute("aria-label", `Show ${nextMode.switchLabel} rain radar`);
  buienradarModeButton.disabled = isBuienradarRadarModeLoading || !buienradarFrameUrls.length;
  buienradarModeButton.classList.toggle("is-loading", isBuienradarRadarModeLoading);
  buienradarModeButton.toggleAttribute("aria-busy", isBuienradarRadarModeLoading);
}

function getDisplayedBuienradarRadarModeId() {
  return buienradarFrameUrls.length ? loadedBuienradarRadarModeId : activeBuienradarRadarModeId;
}

function getNextBuienradarRadarModeId(modeId) {
  return modeId === "3h" ? "8h" : "3h";
}

function getBuienradarRadarMode(modeId = activeBuienradarRadarModeId) {
  return buienradarRadarModes[modeId] || buienradarRadarModes[buienradarDefaultRadarModeId];
}

async function loadRadar() {
  updateBuienradarModeControl();

  if (isInBuienradarBounds(selectedLocation)) {
    try {
      await loadBuienradarRadar();
      updateBuienradarModeControl();
      return;
    } catch (error) {
      console.warn("Buienradar animation unavailable, falling back to LibreWXR tiles.", error);
    }
  }

  try {
    await loadLibreWxrRadar();
  } catch (error) {
    console.error(error);
    disableRadar("Radar unavailable");
  } finally {
    updateBuienradarModeControl();
  }
}

async function loadBuienradarRadar() {
  const radarModeId = activeBuienradarRadarModeId;
  const requestId = buienradarDisplayRequestId + 1;
  buienradarDisplayRequestId = requestId;
  const radar = await fetchBuienradarRadarMode(radarModeId, { forceRefresh: true });
  if (requestId !== buienradarDisplayRequestId || activeBuienradarRadarModeId !== radarModeId || !isInBuienradarBounds(selectedLocation)) {
    return;
  }

  displayBuienradarRadar(radar);
  scheduleInactiveBuienradarRadarPreload();
}

async function fetchBuienradarRadarMode(radarModeId, { forceRefresh = false } = {}) {
  const cachedRadar = buienradarRadarCache.get(radarModeId);
  if (!forceRefresh && cachedRadar) {
    return cachedRadar;
  }

  const existingRequest = buienradarRadarRequests.get(radarModeId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = downloadBuienradarRadarMode(radarModeId)
    .then((radar) => {
      cacheBuienradarRadar(radar);
      return radar;
    })
    .finally(() => {
      buienradarRadarRequests.delete(radarModeId);
    });

  buienradarRadarRequests.set(radarModeId, request);
  return request;
}

async function downloadBuienradarRadarMode(radarModeId) {
  const radarMode = getBuienradarRadarMode(radarModeId);
  const response = await fetch(buildBuienradarAnimationUrl(radarMode), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Buienradar responded with ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const imageType = response.headers.get("content-type") || "image/gif";
  const startDate = parseBuienradarStartDate(response.url) || roundToNextFiveMinutes(new Date());
  const timeline = parseGifTimeline(buffer);
  let frameUrls = await decodeBuienradarFrames(buffer, imageType);
  if (!frameUrls.length) {
    const stillFrameUrl = await decodeBuienradarStillFrame(buffer, imageType);
    frameUrls = stillFrameUrl ? [stillFrameUrl] : [];
  }

  if (!frameUrls.length) {
    throw new Error("Buienradar animation could not be decoded");
  }

  await preloadImage(frameUrls[0]);

  return {
    modeId: radarModeId,
    frameUrls,
    startDate,
    timeline,
  };
}

function displayBuienradarRadar(radar) {
  clearLibreWxrRadar();
  clearBuienradarLayers();
  radarFrames = [];

  const previousFrameUrls = buienradarFrameUrls;
  activeBuienradarRadarModeId = radar.modeId;
  buienradarStartDate = radar.startDate;
  loadedBuienradarRadarModeId = radar.modeId;
  buienradarTimeline = radar.timeline;
  elements.radarPanel.classList.add("is-animated");
  elements.radarSlider.min = "0";
  elements.radarSlider.value = "0";
  elements.radarTime.classList.remove("error");

  buienradarFrameUrls = radar.frameUrls;
  buienradarTimeline = {
    ...buienradarTimeline,
    frameCount: radar.frameUrls.length,
  };
  elements.radarSlider.disabled = radar.frameUrls.length < 2;
  elements.radarSlider.max = String(Math.max((buienradarTimeline.frameCount - 1) * 100, 0));
  elements.radarSlider.step = "1";
  setBuienradarFramePosition(0);
  updateSliderTimestamps();
  refreshMapSize();

  if (previousFrameUrls !== buienradarFrameUrls && !isBuienradarFrameUrlsCached(previousFrameUrls)) {
    previousFrameUrls.forEach(revokeFrameUrl);
  }
}

async function loadLibreWxrRadar() {
  const response = await fetch(libreWxrRadarUrl);
  if (!response.ok) {
    throw new Error(`Radar source responded with ${response.status}`);
  }

  const data = await response.json();
  const past = data.radar?.past || [];
  const nowcast = data.radar?.nowcast || [];
  const currentFrame = past[past.length - 1];
  radarFrames = [currentFrame, ...nowcast]
    .filter(Boolean)
    .map((frame) => ({
      ...frame,
      host: data.host,
    }));

  if (!radarFrames.length) {
    throw new Error("No radar frames available");
  }

  clearLibreWxrRadar();
  clearBuienradarRadar();
  const previousValue = Number(elements.radarSlider.value) || 0;
  const previousRatio = Number(elements.radarSlider.max) > 0 ? previousValue / Number(elements.radarSlider.max) : 0;
  const maxValue = Math.max((radarFrames.length - 1) * 100, 0);
  const nextValue = Math.round(Math.min(Math.max(previousRatio, 0), 1) * maxValue);
  createLibreWxrRadarLayers();
  elements.radarSlider.disabled = false;
  elements.radarSlider.min = "0";
  elements.radarSlider.max = String(maxValue);
  elements.radarSlider.step = "1";
  elements.radarSlider.value = String(nextValue);
  setLibreWxrRadarPosition(nextValue);
  updateSliderTimestamps();
  refreshMapSize();
}

function refreshMapSize() {
  window.requestAnimationFrame(() => {
    const invalidate = () => {
      if (!map) {
        return;
      }

      map.invalidateSize({ animate: false, pan: false });
    };

    invalidate();
    [80, 220, 600].forEach((delay) => {
      window.setTimeout(invalidate, delay);
    });
  });
}

function disableRadar(message) {
  clearLibreWxrRadar();
  clearBuienradarRadar();
  radarFrames = [];
  setActiveRadarDate(undefined);
  elements.radarSlider.disabled = true;
  elements.radarSlider.max = "0";
  elements.radarSlider.value = "0";
  elements.radarTime.textContent = message;
  elements.rainForecastBadge.textContent = message;
  elements.radarSlider.removeAttribute("aria-valuetext");
  updateSliderTimestamps();
  elements.radarTime.classList.add("error");
}

function setLibreWxrRadarPosition(value) {
  if (!radarFrames.length) {
    return;
  }

  const framePosition = Math.min(Math.max(value / 100, 0), radarFrames.length - 1);
  const lowerIndex = Math.floor(framePosition);
  const upperIndex = Math.min(lowerIndex + 1, radarFrames.length - 1);
  const progress = framePosition - lowerIndex;
  const lowerFrame = radarFrames[lowerIndex];
  const upperFrame = radarFrames[upperIndex];

  libreWxrRadarLayers.forEach((layer) => {
    layer.setOpacity(0);
  });

  const lowerLayer = libreWxrRadarLayers.get(lowerFrame.path);
  if (lowerLayer) {
    lowerLayer.setZIndex(20);
    lowerLayer.setOpacity(0.72 * (1 - progress));
  }

  if (upperFrame && upperFrame !== lowerFrame && progress > 0) {
    const upperLayer = libreWxrRadarLayers.get(upperFrame.path);
    if (upperLayer) {
      upperLayer.setZIndex(21);
      upperLayer.setOpacity(0.72 * progress);
    }
  }

  const displayTime = interpolateUnixTime(lowerFrame.time, upperFrame.time, progress);
  const displayDate = new Date(displayTime * 1000);
  const label = formatClock(displayDate);
  elements.radarTime.textContent = label;
  elements.rainForecastBadge.textContent = label;
  elements.radarSlider.setAttribute("aria-valuetext", label);
  elements.radarTime.classList.remove("error");
  setActiveRadarDate(displayDate);
}

function handleRadarSliderInput(value) {
  if (buienradarFrameUrls.length) {
    setBuienradarFramePosition(value);
    return;
  }

  setLibreWxrRadarPosition(value);
}

function setBuienradarFramePosition(value) {
  if (!buienradarFrameUrls.length) {
    return;
  }

  const framePosition = Math.min(Math.max(value / 100, 0), buienradarFrameUrls.length - 1);
  const lowerIndex = Math.floor(framePosition);
  const upperIndex = Math.min(lowerIndex + 1, buienradarFrameUrls.length - 1);
  const progress = framePosition - lowerIndex;

  buienradarLayer = setBuienradarImageLayer(
    buienradarLayer,
    buienradarLayerKey,
    lowerIndex,
    0.78 * (1 - progress),
    20,
    '<a href="https://www.buienradar.nl/">Buienradar</a>',
  );
  buienradarLayerKey = lowerIndex;

  if (upperIndex !== lowerIndex && progress > 0) {
    buienradarNextLayer = setBuienradarImageLayer(buienradarNextLayer, buienradarNextLayerKey, upperIndex, 0.78 * progress, 21, "");
    buienradarNextLayerKey = upperIndex;
  } else if (buienradarNextLayer) {
    map.removeLayer(buienradarNextLayer);
    buienradarNextLayer = undefined;
    buienradarNextLayerKey = undefined;
  }

  const displayIndex = Math.round(framePosition);
  const radarMode = getBuienradarRadarMode(loadedBuienradarRadarModeId);
  const frameDate = new Date(buienradarStartDate.getTime() + displayIndex * radarMode.frameMinutes * 60 * 1000);
  const label = formatClock(frameDate, DEFAULT_LOCATION.timezone);
  elements.radarTime.textContent = label;
  elements.rainForecastBadge.textContent = label;
  elements.radarSlider.value = String(Math.round(framePosition * 100));
  elements.radarSlider.setAttribute("aria-valuetext", label);
  elements.radarTime.classList.remove("error");
  setActiveRadarDate(frameDate);
}

function getRadarDateForSlider(value) {
  return getBuienradarDateForSlider(value) || getLibreWxrDateForSlider(value);
}

function getRadarTimeRange() {
  const maxValue = Number(elements.radarSlider.max) || 0;
  const buienradarStart = getBuienradarDateForSlider(0, true);
  const buienradarEnd = getBuienradarDateForSlider(maxValue, true);
  if (buienradarStart && buienradarEnd) {
    return { start: buienradarStart, end: buienradarEnd };
  }

  const libreStart = getLibreWxrDateForSlider(0);
  const libreEnd = getLibreWxrDateForSlider(maxValue);
  return libreStart && libreEnd ? { start: libreStart, end: libreEnd } : undefined;
}

function getBuienradarDateForSlider(value, snapToFrame = false) {
  if (!buienradarFrameUrls.length || !buienradarStartDate) {
    return undefined;
  }

  const maxFramePosition = Math.max(buienradarFrameUrls.length - 1, 0);
  const framePosition = Math.min(Math.max(value / 100, 0), maxFramePosition);
  const displayPosition = snapToFrame ? Math.round(framePosition) : framePosition;
  const radarMode = getBuienradarRadarMode(loadedBuienradarRadarModeId);
  return new Date(buienradarStartDate.getTime() + displayPosition * radarMode.frameMinutes * 60 * 1000);
}

function getLibreWxrDateForSlider(value) {
  if (!radarFrames.length) {
    return undefined;
  }

  const framePosition = Math.min(Math.max(value / 100, 0), radarFrames.length - 1);
  const lowerIndex = Math.floor(framePosition);
  const upperIndex = Math.min(lowerIndex + 1, radarFrames.length - 1);
  const progress = framePosition - lowerIndex;
  const lowerFrame = radarFrames[lowerIndex];
  const upperFrame = radarFrames[upperIndex];
  return new Date(interpolateUnixTime(lowerFrame.time, upperFrame.time, progress) * 1000);
}

function scheduleSliderTimestampsUpdate() {
  window.clearTimeout(sliderTimestampTimer);
  sliderTimestampTimer = window.setTimeout(updateSliderTimestamps, 100);
}

function updateSliderTimestamps() {
  const range = getRadarTimeRange();
  if (!range || elements.radarSlider.disabled || range.end <= range.start) {
    elements.sliderTimestamps.hidden = true;
    elements.sliderTimestamps.replaceChildren();
    return;
  }

  const trackWidth = elements.radarSlider.getBoundingClientRect().width;
  const maxLabels = Math.max(2, Math.min(13, Math.floor(trackWidth / 58)));
  const dates = getSliderTimestampDates(range.start, range.end, maxLabels);
  const track = document.createElement("div");
  track.className = "slider-timestamps-track";

  dates.forEach((date) => {
    track.appendChild(createSliderTimestamp(date, range.start, range.end));
  });

  elements.sliderTimestamps.hidden = false;
  elements.sliderTimestamps.replaceChildren(track);
}

function getSliderTimestampDates(start, end, maxLabels) {
  const intervals = [15, 30, 60, 120];

  for (const interval of intervals) {
    const dates = buildAlignedSliderTimestampDates(start, end, interval);
    if (dates.length >= 2 && dates.length <= maxLabels) {
      return dates;
    }
  }

  return buildAlignedSliderTimestampDates(start, end, intervals[intervals.length - 1]);
}

function buildAlignedSliderTimestampDates(start, end, intervalMinutes) {
  const intervalMs = intervalMinutes * 60 * 1000;
  const dates = [];
  let cursor = ceilDateToMinuteInterval(start, intervalMinutes);

  while (cursor <= end) {
    dates.push(cursor);
    cursor = new Date(cursor.getTime() + intervalMs);
  }

  return dates;
}

function createSliderTimestamp(date, start, end) {
  const timestamp = document.createElement("span");
  const position = ((date - start) / (end - start)) * 100;
  timestamp.className = "slider-timestamp";
  timestamp.style.left = `${position}%`;
  timestamp.textContent = formatClock(date);

  if (position < 0.5) {
    timestamp.classList.add("is-start");
  } else if (position > 99.5) {
    timestamp.classList.add("is-end");
  }

  return timestamp;
}

function ceilDateToMinuteInterval(date, intervalMinutes) {
  const intervalMs = intervalMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / intervalMs) * intervalMs);
}

function createLibreWxrRadarLayers() {
  radarFrames.forEach((frame, index) => {
    const layer = L.tileLayer(`${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
      tileSize: 256,
      opacity: 0,
      maxNativeZoom: 7,
      maxZoom: 11,
      keepBuffer: 4,
      updateWhenIdle: false,
      updateWhenZooming: false,
      attribution: '<a href="https://librewxr.net/">LibreWXR</a>',
    }).addTo(map);

    layer.setZIndex(20 + index);
    libreWxrRadarLayers.set(frame.path, layer);
  });
}

function scheduleInactiveBuienradarRadarPreload() {
  window.clearTimeout(buienradarPreloadTimer);

  if (!isInBuienradarBounds(selectedLocation)) {
    return;
  }

  const nextModeId = getNextBuienradarRadarModeId(getDisplayedBuienradarRadarModeId());
  if (buienradarRadarCache.has(nextModeId) || buienradarRadarRequests.has(nextModeId)) {
    return;
  }

  buienradarPreloadTimer = window.setTimeout(() => {
    preloadBuienradarRadarMode(nextModeId);
  }, 600);
}

async function preloadBuienradarRadarMode(radarModeId) {
  if (!isInBuienradarBounds(selectedLocation)) {
    return;
  }

  try {
    await fetchBuienradarRadarMode(radarModeId);
    updateBuienradarModeControl();
  } catch (error) {
    console.warn(`Could not preload the ${radarModeId} Buienradar mode.`, error);
  }
}

function cacheBuienradarRadar(radar) {
  const previousRadar = buienradarRadarCache.get(radar.modeId);
  buienradarRadarCache.set(radar.modeId, radar);

  if (previousRadar && previousRadar.frameUrls !== radar.frameUrls && previousRadar.frameUrls !== buienradarFrameUrls) {
    revokeBuienradarRadar(previousRadar);
  }
}

function isBuienradarFrameUrlsCached(frameUrls) {
  return Array.from(buienradarRadarCache.values()).some((radar) => radar.frameUrls === frameUrls);
}

function revokeBuienradarRadar(radar) {
  radar.frameUrls.forEach(revokeFrameUrl);
}

function setBuienradarImageLayer(layer, currentKey, frameIndex, opacity, zIndex, attribution) {
  if (layer && currentKey === frameIndex) {
    layer.setOpacity(opacity);
    return layer;
  }

  if (layer) {
    map.removeLayer(layer);
  }

  const nextLayer = L.imageOverlay(buienradarFrameUrls[frameIndex], buienradarBounds, {
    opacity,
    attribution,
  }).addTo(map);

  nextLayer.once("load", refreshMapSize);
  nextLayer.setZIndex(zIndex);
  return nextLayer;
}

function clearLibreWxrRadar() {
  libreWxrRadarLayers.forEach((layer) => {
    map.removeLayer(layer);
  });
  libreWxrRadarLayers.clear();
}

function clearBuienradarLayers() {
  if (buienradarLayer) {
    map.removeLayer(buienradarLayer);
    buienradarLayer = undefined;
    buienradarLayerKey = undefined;
  }

  if (buienradarNextLayer) {
    map.removeLayer(buienradarNextLayer);
    buienradarNextLayer = undefined;
    buienradarNextLayerKey = undefined;
  }
}

function clearBuienradarRadar() {
  buienradarDisplayRequestId += 1;
  window.clearTimeout(buienradarPreloadTimer);
  elements.radarPanel.classList.remove("is-animated");
  buienradarTimeline = buienradarDefaultTimeline;
  clearBuienradarLayers();

  buienradarRadarCache.forEach(revokeBuienradarRadar);
  buienradarRadarCache.clear();
  buienradarFrameUrls = [];
  buienradarStartDate = undefined;
}

function buildBuienradarAnimationUrl(radarMode = getBuienradarRadarMode()) {
  const params = new URLSearchParams({
    height: "512",
    width: "512",
    extension: "gif",
    renderBackground: "False",
    renderBranding: "False",
    renderText: "False",
    history: "0",
    forecast: String(radarMode.forecastSteps),
    skip: "0",
    cache: String(Math.floor(Date.now() / 300000)),
  });

  return `${buienradarAnimationBaseUrl}/${radarMode.imageType}?${params}`;
}

function isInBuienradarBounds(location) {
  const [[south, west], [north, east]] = buienradarBounds;
  return location.lat >= south && location.lat <= north && location.lon >= west && location.lon <= east;
}

function parseBuienradarStartDate(url) {
  const match = url.match(/\/Animation\/(\d{12})__/);
  if (!match) {
    return undefined;
  }

  const value = match[1];
  return new Date(Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
    Number(value.slice(8, 10)),
    Number(value.slice(10, 12)),
  ));
}

function parseGifTimeline(buffer) {
  const bytes = new Uint8Array(buffer);
  const delays = [];

  for (let index = 0; index < bytes.length - 7; index += 1) {
    const isGraphicControlExtension = bytes[index] === 0x21 && bytes[index + 1] === 0xf9 && bytes[index + 2] === 0x04;
    if (isGraphicControlExtension) {
      const delayMs = (bytes[index + 4] | (bytes[index + 5] << 8)) * 10;
      delays.push(delayMs);
    }
  }

  if (!delays.length) {
    return buienradarDefaultTimeline;
  }

  const totalDelayMs = delays.reduce((total, delay) => total + delay, 0);
  return {
    frameCount: delays.length,
    frameDurationMs: Math.max(Math.round(totalDelayMs / delays.length), 100),
  };
}

async function decodeBuienradarFrames(buffer, type) {
  const imageDecoderFrames = await decodeBuienradarFramesWithImageDecoder(buffer, type);
  if (imageDecoderFrames.length > 1) {
    return imageDecoderFrames;
  }

  imageDecoderFrames.forEach(revokeFrameUrl);
  return decodeBuienradarFramesWithGifuct(buffer);
}

async function decodeBuienradarFramesWithImageDecoder(buffer, type) {
  if (!("ImageDecoder" in window)) {
    return [];
  }

  let decoder;
  const frameUrls = [];
  try {
    decoder = new ImageDecoder({ data: buffer.slice(0), type });
    await decoder.tracks.ready;

    const frameCount = decoder.tracks.selectedTrack?.frameCount || 0;
    if (frameCount < 2 || frameCount > 80) {
      return [];
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return [];
    }

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const { image } = await decoder.decode({ frameIndex });
      canvas.width = image.displayWidth;
      canvas.height = image.displayHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      image.close();

      const frameBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });
      if (frameBlob) {
        frameUrls.push(URL.createObjectURL(frameBlob));
      }
    }

    return frameUrls;
  } catch (error) {
    frameUrls.forEach(revokeFrameUrl);
    console.warn("Could not decode Buienradar animation frames.", error);
    return [];
  } finally {
    decoder?.close?.();
  }
}

async function decodeBuienradarFramesWithGifuct(buffer) {
  const frameUrls = [];

  try {
    const { parseGIF, decompressFrames } = await import(gifDecoderModuleUrl);
    const gif = parseGIF(buffer.slice(0));
    const frames = decompressFrames(gif, true);
    if (frames.length < 2 || frames.length > 80) {
      return [];
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return [];
    }

    canvas.width = gif.lsd.width;
    canvas.height = gif.lsd.height;

    let previousFrame;
    let restoreImageData;
    frames.forEach((frame) => {
      if (previousFrame?.disposalType === 2) {
        context.clearRect(
          previousFrame.dims.left,
          previousFrame.dims.top,
          previousFrame.dims.width,
          previousFrame.dims.height,
        );
      } else if (previousFrame?.disposalType === 3 && restoreImageData) {
        context.putImageData(restoreImageData, 0, 0);
      }

      restoreImageData = frame.disposalType === 3 ? context.getImageData(0, 0, canvas.width, canvas.height) : undefined;
      const imageData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
      context.putImageData(imageData, frame.dims.left, frame.dims.top);
      previousFrame = frame;
      frameUrls.push(canvas.toDataURL("image/png"));
    });

    return frameUrls;
  } catch (error) {
    frameUrls.forEach(revokeFrameUrl);
    console.warn("Could not decode Buienradar frames with GIF fallback.", error);
    return [];
  }
}

function revokeFrameUrl(url) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function preloadImage(url) {
  if (!url) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = url;
  });
}

async function decodeBuienradarStillFrame(buffer, type) {
  if (!("createImageBitmap" in window)) {
    return undefined;
  }

  try {
    const image = await createImageBitmap(new Blob([buffer.slice(0)], { type }));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      image.close();
      return undefined;
    }

    canvas.width = image.width;
    canvas.height = image.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    image.close();

    const frameBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    return frameBlob ? URL.createObjectURL(frameBlob) : undefined;
  } catch (error) {
    console.warn("Could not decode a static Buienradar frame.", error);
    return undefined;
  }
}

function roundToNextFiveMinutes(date) {
  const next = new Date(date);
  const minutes = next.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 5) * 5;
  next.setMinutes(roundedMinutes, 0, 0);
  return next;
}

function interpolateUnixTime(start, end, progress) {
  if (!end || end === start) {
    return start;
  }

  return start + (end - start) * progress;
}

function setLoading(isLoading) {
  elements.app.classList.toggle("is-loading", isLoading);
  elements.refreshButton.disabled = isLoading;
  elements.locationInput.disabled = isLoading;
  elements.locateButton.disabled = isLoading;
  elements.refreshButton.title = isLoading ? "Refreshing weather and radar data" : "Refresh weather and radar data";
}

function setRefreshButtonWorking(isWorking) {
  elements.refreshButton.classList.toggle("is-working", isWorking);
}

function formatTemperature(value) {
  return `${Math.round(value)}°`;
}

function formatOptionalTemperature(value) {
  return Number.isFinite(value) ? formatTemperature(value) : "--°";
}

function formatOptionalRainChance(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : "--%";
}

function formatOptionalWind(direction, speed) {
  if (!Number.isFinite(direction) || !Number.isFinite(speed)) {
    return "--";
  }

  return `${degreesToCompass(direction)} ${kmhToBeaufort(Math.round(speed))}`;
}

function formatWeekday(value) {
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(`${value}T12:00:00`);

  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: selectedLocation.timezone,
    }).format(date);
  } catch (error) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: DEFAULT_LOCATION.timezone,
    }).format(date);
  }
}

function formatTime(value) {
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);

  return formatClock(date);
}

function formatClock(date, timezone = selectedLocation.timezone) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  } catch (error) {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DEFAULT_LOCATION.timezone,
    }).format(date);
  }
}

function degreesToCompass(degrees) {
  const index = Math.round(degrees / 45) % compassPoints.length;
  return compassPoints[index];
}

function kmhToBeaufort(kmh) {
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const beaufort = thresholds.findIndex((threshold) => kmh < threshold);
  return beaufort === -1 ? 12 : beaufort;
}

function normalizeLocation(location) {
  return {
    name: location.name || "Selected location",
    label: location.label || location.name || "Selected location",
    lat: Number(location.lat),
    lon: Number(location.lon),
    timezone: location.timezone || getBrowserTimezone(),
  };
}

function saveLocation(location) {
  try {
    window.localStorage.setItem(storedLocationKey, JSON.stringify(location));
  } catch (error) {
    console.warn("Could not save location", error);
  }
}

function loadStoredLocation() {
  try {
    const storedLocation = JSON.parse(window.localStorage.getItem(storedLocationKey));
    if (!storedLocation || !Number.isFinite(storedLocation.lat) || !Number.isFinite(storedLocation.lon)) {
      return null;
    }

    return normalizeLocation(storedLocation);
  } catch (error) {
    return null;
  }
}

function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_LOCATION.timezone;
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("beforeunload", () => {
  window.clearInterval(refreshTimer);
  window.clearTimeout(buienradarPreloadTimer);
  buienradarRadarCache.forEach(revokeBuienradarRadar);
});
