const DEFAULT_LOCATION = {
  name: "Amsterdam",
  label: "Amsterdam, North Holland, Netherlands",
  lat: 52.3676,
  lon: 4.9041,
  timezone: "Europe/Amsterdam",
};

const storedLocationKey = "mymeteo.location";
const libreWxrRadarUrl = "https://api.librewxr.net/public/weather-maps.json";
const buienradarAnimationUrl = "https://image.buienradar.nl/2.0/image/animation/RadarMapRainWebmercatorNL";
const gifDecoderModuleUrl = "https://esm.sh/gifuct-js@2.1.2?bundle";
const buienradarBounds = [
  [48.92249926375824, 0],
  [55.77657301866769, 11.25],
];
const buienradarForecastSteps = 36;
const buienradarFrameMinutes = 5;
const buienradarDefaultTimeline = {
  frameCount: buienradarForecastSteps,
  frameDurationMs: 1000,
};

const elements = {
  app: document.querySelector(".weather-app"),
  locationForm: document.querySelector("#locationForm"),
  locationInput: document.querySelector("#locationInput"),
  locationOptions: document.querySelector("#locationOptions"),
  locateButton: document.querySelector("#locateButton"),
  refreshButton: document.querySelector("#refreshButton"),
  updatedAt: document.querySelector("#updatedAt"),
  currentTemp: document.querySelector("#currentTemp"),
  conditionLabel: document.querySelector("#conditionLabel"),
  conditionIcon: document.querySelector("#conditionIcon"),
  maxTemp: document.querySelector("#maxTemp"),
  minTemp: document.querySelector("#minTemp"),
  rainTotal: document.querySelector("#rainTotal"),
  windText: document.querySelector("#windText"),
  windArrow: document.querySelector("#windArrow"),
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
  0: { label: "Clear sky", icon: "sun", tone: "#f8de9c", ink: "#6d4b00" },
  1: { label: "Mostly clear", icon: "cloud-sun", tone: "#f8de9c", ink: "#6d4b00" },
  2: { label: "Partly cloudy", icon: "cloud-sun", tone: "#dceee6", ink: "#285c50" },
  3: { label: "Cloudy", icon: "cloud", tone: "#dbe0df", ink: "#3e4b48" },
  45: { label: "Fog", icon: "cloud-fog", tone: "#e2ded4", ink: "#4c504b" },
  48: { label: "Rime fog", icon: "cloud-fog", tone: "#e2ded4", ink: "#4c504b" },
  51: { label: "Light drizzle", icon: "cloud-drizzle", tone: "#d6e9ea", ink: "#2f6170" },
  53: { label: "Drizzle", icon: "cloud-drizzle", tone: "#d6e9ea", ink: "#2f6170" },
  55: { label: "Heavy drizzle", icon: "cloud-drizzle", tone: "#d6e9ea", ink: "#2f6170" },
  56: { label: "Freezing drizzle", icon: "cloud-drizzle", tone: "#d9eef4", ink: "#2f6170" },
  57: { label: "Freezing drizzle", icon: "cloud-drizzle", tone: "#d9eef4", ink: "#2f6170" },
  61: { label: "Light rain", icon: "cloud-rain", tone: "#d4e5ef", ink: "#245a75" },
  63: { label: "Rain", icon: "cloud-rain", tone: "#d4e5ef", ink: "#245a75" },
  65: { label: "Heavy rain", icon: "cloud-rain", tone: "#c7ddeb", ink: "#245a75" },
  66: { label: "Freezing rain", icon: "cloud-rain", tone: "#d9eef4", ink: "#245a75" },
  67: { label: "Freezing rain", icon: "cloud-rain", tone: "#d9eef4", ink: "#245a75" },
  71: { label: "Light snow", icon: "cloud-snow", tone: "#eef3f1", ink: "#53636a" },
  73: { label: "Snow", icon: "cloud-snow", tone: "#eef3f1", ink: "#53636a" },
  75: { label: "Heavy snow", icon: "cloud-snow", tone: "#eef3f1", ink: "#53636a" },
  77: { label: "Snow grains", icon: "cloud-snow", tone: "#eef3f1", ink: "#53636a" },
  80: { label: "Light showers", icon: "cloud-rain", tone: "#d4e5ef", ink: "#245a75" },
  81: { label: "Showers", icon: "cloud-rain", tone: "#d4e5ef", ink: "#245a75" },
  82: { label: "Heavy showers", icon: "cloud-rain", tone: "#c7ddeb", ink: "#245a75" },
  85: { label: "Snow showers", icon: "cloud-snow", tone: "#eef3f1", ink: "#53636a" },
  86: { label: "Snow showers", icon: "cloud-snow", tone: "#eef3f1", ink: "#53636a" },
  95: { label: "Thunderstorm", icon: "cloud-lightning", tone: "#ded9ed", ink: "#4e416f" },
  96: { label: "Storm with hail", icon: "cloud-lightning", tone: "#ded9ed", ink: "#4e416f" },
  99: { label: "Storm with hail", icon: "cloud-lightning", tone: "#ded9ed", ink: "#4e416f" },
};

const compassPoints = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

let map;
let radarLayer;
let radarLayerKey;
let radarNextLayer;
let radarNextLayerKey;
let buienradarLayer;
let buienradarLayerKey;
let buienradarNextLayer;
let buienradarNextLayerKey;
let buienradarFrameUrls = [];
let buienradarStartDate;
let buienradarTimeline = buienradarDefaultTimeline;
let locationMarker;
let radarFrames = [];
let locationSearchResults = [];
let locationSearchTimer;
let locationSearchAbortController;
let sliderTimestampTimer;
let selectedLocation = loadStoredLocation() || DEFAULT_LOCATION;
let refreshTimer;

function init() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  renderLocation();
  initMap();
  bindEvents();
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
  elements.refreshButton.addEventListener("click", loadAll);
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
  });
}

function renderLocation() {
  elements.locationInput.value = selectedLocation.name;
  elements.locationInput.title = selectedLocation.label || selectedLocation.name;
  resizeLocationInput(selectedLocation.name);
  document.title = `MyMeteo ${selectedLocation.name}`;
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
    daily: ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"].join(","),
    forecast_days: "1",
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
  }
}

function renderWeather(data) {
  const current = data.current;
  const daily = data.daily;
  const condition = getCondition(current.weather_code, current.is_day);
  const windDirection = current.wind_direction_10m;
  const windSpeed = Math.round(current.wind_speed_10m);
  const beaufort = kmhToBeaufort(windSpeed);
  const downwindDirection = (windDirection + 180) % 360;

  elements.currentTemp.textContent = formatTemperature(current.temperature_2m);
  elements.conditionLabel.textContent = condition.label;
  renderConditionIcon(condition.icon);
  elements.maxTemp.textContent = formatOptionalTemperature(daily.temperature_2m_max?.[0]);
  elements.minTemp.textContent = formatOptionalTemperature(daily.temperature_2m_min?.[0]);
  elements.rainTotal.textContent = formatOptionalRain(daily.precipitation_sum?.[0]);
  elements.windText.textContent = `${degreesToCompass(windDirection)} Bft ${beaufort}`;
  elements.windText.title = `${windSpeed} km/h, blowing toward ${degreesToCompass(downwindDirection)}`;
  elements.windArrow.style.transform = `rotate(${downwindDirection}deg)`;
  elements.windArrow.title = `Blowing toward ${degreesToCompass(downwindDirection)}`;
  elements.updatedAt.textContent = `Checked ${formatClock(new Date())}`;
  elements.updatedAt.title = `Weather observation ${formatTime(current.time)}`;
  elements.updatedAt.classList.remove("error");

  const mark = document.querySelector(".condition-mark");
  mark.style.background = condition.tone;
  mark.style.color = condition.ink;
}

function renderConditionIcon(icon) {
  const mark = document.querySelector(".condition-mark");
  const iconElement = document.createElement("i");
  iconElement.id = "conditionIcon";
  iconElement.dataset.lucide = icon;
  iconElement.setAttribute("aria-hidden", "true");
  mark.replaceChildren(iconElement);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getCondition(code, isDay) {
  const fallback = { label: "Mixed conditions", icon: "cloud-sun", tone: "#dceee6", ink: "#285c50" };
  const condition = weatherCodes[code] || fallback;

  if (!isDay && condition.icon === "sun") {
    return { ...condition, icon: "moon", label: "Clear night", tone: "#ded9ed", ink: "#4e416f" };
  }

  if (!isDay && condition.icon === "cloud-sun") {
    return { ...condition, icon: "cloud-moon", tone: "#ded9ed", ink: "#4e416f" };
  }

  return condition;
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
  refreshMapSize();
}

async function loadRadar() {
  if (isInBuienradarBounds(selectedLocation)) {
    try {
      await loadBuienradarRadar();
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
  }
}

async function loadBuienradarRadar() {
  const response = await fetch(buildBuienradarAnimationUrl(), { cache: "no-store" });
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

  clearLibreWxrRadar();
  clearBuienradarRadar();
  radarFrames = [];

  buienradarStartDate = startDate;
  buienradarTimeline = timeline;
  elements.radarPanel.classList.add("is-animated");
  elements.radarSlider.min = "0";
  elements.radarSlider.value = "0";
  elements.radarTime.classList.remove("error");

  buienradarFrameUrls = frameUrls;
  buienradarTimeline = {
    ...buienradarTimeline,
    frameCount: frameUrls.length,
  };
  elements.radarSlider.disabled = frameUrls.length < 2;
  elements.radarSlider.max = String(Math.max((buienradarTimeline.frameCount - 1) * 100, 0));
  elements.radarSlider.step = "1";
  setBuienradarFramePosition(0);
  updateSliderTimestamps();
  refreshMapSize();
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

  clearBuienradarRadar();
  const previousValue = Number(elements.radarSlider.value) || 0;
  const previousRatio = Number(elements.radarSlider.max) > 0 ? previousValue / Number(elements.radarSlider.max) : 0;
  const maxValue = Math.max((radarFrames.length - 1) * 100, 0);
  const nextValue = Math.round(Math.min(Math.max(previousRatio, 0), 1) * maxValue);
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
    map.invalidateSize({ animate: false, pan: false });
  });
}

function disableRadar(message) {
  clearLibreWxrRadar();
  clearBuienradarRadar();
  radarFrames = [];
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

  radarLayer = setLibreWxrTileLayer(radarLayer, radarLayerKey, lowerFrame, 0.72 * (1 - progress), 20);
  radarLayerKey = lowerFrame.path;

  if (upperFrame && upperFrame !== lowerFrame && progress > 0) {
    radarNextLayer = setLibreWxrTileLayer(radarNextLayer, radarNextLayerKey, upperFrame, 0.72 * progress, 21);
    radarNextLayerKey = upperFrame.path;
  } else if (radarNextLayer) {
    map.removeLayer(radarNextLayer);
    radarNextLayer = undefined;
    radarNextLayerKey = undefined;
  }

  const displayTime = interpolateUnixTime(lowerFrame.time, upperFrame.time, progress);
  const label = formatUnixTime(displayTime);
  elements.radarTime.textContent = label;
  elements.rainForecastBadge.textContent = label;
  elements.radarSlider.setAttribute("aria-valuetext", label);
  elements.radarTime.classList.remove("error");
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
  const frameDate = new Date(buienradarStartDate.getTime() + displayIndex * buienradarFrameMinutes * 60 * 1000);
  const label = formatClock(frameDate, DEFAULT_LOCATION.timezone);
  elements.radarTime.textContent = label;
  elements.rainForecastBadge.textContent = label;
  elements.radarSlider.value = String(Math.round(framePosition * 100));
  elements.radarSlider.setAttribute("aria-valuetext", label);
  elements.radarTime.classList.remove("error");
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
  return new Date(buienradarStartDate.getTime() + displayPosition * buienradarFrameMinutes * 60 * 1000);
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

function setLibreWxrTileLayer(layer, currentKey, frame, opacity, zIndex) {
  if (layer && currentKey === frame.path) {
    layer.setOpacity(opacity);
    return layer;
  }

  if (layer) {
    map.removeLayer(layer);
  }

  const nextLayer = L.tileLayer(`${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
    tileSize: 256,
    opacity,
    maxNativeZoom: 7,
    maxZoom: 11,
    attribution: '<a href="https://librewxr.net/">LibreWXR</a>',
  }).addTo(map);

  nextLayer.setZIndex(zIndex);
  return nextLayer;
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

  nextLayer.setZIndex(zIndex);
  return nextLayer;
}

function clearLibreWxrRadar() {
  if (radarLayer) {
    map.removeLayer(radarLayer);
    radarLayer = undefined;
    radarLayerKey = undefined;
  }

  if (radarNextLayer) {
    map.removeLayer(radarNextLayer);
    radarNextLayer = undefined;
    radarNextLayerKey = undefined;
  }
}

function clearBuienradarRadar() {
  elements.radarPanel.classList.remove("is-animated");
  buienradarTimeline = buienradarDefaultTimeline;

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

  buienradarFrameUrls.forEach(revokeFrameUrl);
  buienradarFrameUrls = [];
}

function buildBuienradarAnimationUrl() {
  const params = new URLSearchParams({
    height: "512",
    width: "512",
    extension: "gif",
    renderBackground: "False",
    renderBranding: "False",
    renderText: "False",
    history: "0",
    forecast: String(buienradarForecastSteps),
    skip: "0",
    cache: String(Math.floor(Date.now() / 300000)),
  });

  return `${buienradarAnimationUrl}?${params}`;
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

function formatTemperature(value) {
  return `${Math.round(value)}°`;
}

function formatOptionalTemperature(value) {
  return Number.isFinite(value) ? formatTemperature(value) : "--°";
}

function formatOptionalRain(value) {
  return Number.isFinite(value) ? `${Math.round(value)} mm` : "-- mm";
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

function formatUnixTime(value) {
  return formatClock(new Date(value * 1000));
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
window.addEventListener("beforeunload", () => window.clearInterval(refreshTimer));
