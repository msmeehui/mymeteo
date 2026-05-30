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
const buienradarRadarCacheMaxAgeMs = 9 * 60 * 1000;
const currentLocationSource = "current";
const currentLocationRefreshCooldownMs = 60 * 1000;
const compactLocationLabelMediaQuery = "(max-width: 480px)";
const desktopLayoutMediaQuery = "(min-width: 900px)";
const reverseGeocodingTimeoutMs = 5 * 1000;
const analyticsMeasurementId = "G-WLC2VP6GKK";
const analyticsHostnames = new Set(["mymeteo.nl", "www.mymeteo.nl"]);
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
  temperatureRange: document.querySelector(".temperature-range"),
  maxTemp: document.querySelector("#maxTemp"),
  minTemp: document.querySelector("#minTemp"),
  currentPrecipMetric: document.querySelector(".current-rain"),
  currentPrecipLabel: document.querySelector(".current-rain dt"),
  currentPrecipitationValue: document.querySelector(".current-precipitation-value"),
  rainTotal: document.querySelector("#rainTotal"),
  currentWind: document.querySelector(".current-wind"),
  windText: document.querySelector("#windText"),
  windArrow: document.querySelector("#windArrow"),
  rainTab: document.querySelector("#rainTab"),
  forecastTab: document.querySelector("#forecastTab"),
  forecastPanel: document.querySelector("#forecastPanel"),
  forecastBody: document.querySelector("#forecastBody"),
  forecastPrecipHeader: document.querySelector(".forecast-table th:nth-child(4)"),
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

const snowWeatherCodes = new Set([71, 73, 75, 77, 85, 86]);
// Near-even rain/snow totals should read as snow in the compact label.
const snowCloseSplitRatio = 0.85;
const meaningfulPrecipitationChanceThreshold = 5;
const precipitationChanceDisplayStep = 5;
const precipitationIntensityChanceThreshold = precipitationChanceDisplayStep;
const precipitationIntensityThresholds = {
  rain: { moderate: 1, heavy: 4 },
  snow: { moderate: 0.5, heavy: 2 },
};
const freezingTemperatureThreshold = 0;
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
let hourlyForecastLayoutFrame;
let buienradarPreloadTimer;
let weatherData;
let activeRadarDate;
let activeMobileView = "rain";
let shouldCenterMapWhenShown = false;
let expandedForecastDayKey;
let selectedLocation = loadStoredLocation() || DEFAULT_LOCATION;
let currentLocationRefreshState = isCurrentLocation(selectedLocation) ? "stale" : "idle";
let currentLocationRefreshPromise;
let lastCurrentLocationRefreshAttemptAt = 0;
let statusMessage = elements.updatedAt.textContent || "Loading forecast...";
let statusTitle = elements.updatedAt.title || "";
let statusIsError = elements.updatedAt.classList.contains("error");
let refreshTimer;

function init() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  initAnalytics();
  renderLocation();
  initMap();
  bindEvents();
  syncForecastViewForViewport();
  hydrateStoredCurrentLocationName();
  loadInitialWeather();
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
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshCurrentLocationOnResume();
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      refreshCurrentLocationOnResume();
    }
  });
  if (elements.brandButton) {
    elements.brandButton.addEventListener("click", openInfoDialog);
    elements.brandButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openInfoDialog();
      }
    });
  }
  elements.refreshButton.addEventListener("click", () => {
    trackAnalyticsEvent("refresh");
    loadAll();
  });
  elements.rainTab.addEventListener("click", () => {
    trackAnalyticsEvent("rain_tab");
    setMobileView("rain");
  });
  elements.forecastTab.addEventListener("click", () => {
    trackAnalyticsEvent("forecast_tab");
    setMobileView("forecast");
  });
  if (elements.infoButton && elements.infoDialog) {
    elements.infoButton.addEventListener("click", openInfoDialog);
    elements.infoDialog.addEventListener("click", (event) => {
      if (event.target === elements.infoDialog) {
        elements.infoDialog.close();
      }
    });
    bindInfoAccordion();
  }
  elements.radarSlider.addEventListener("input", (event) => {
    handleRadarSliderInput(Number(event.target.value));
  });
  window.addEventListener("resize", () => {
    scheduleSliderTimestampsUpdate();
    scheduleHourlyForecastLayout();
    if (document.activeElement === elements.locationInput) {
      resizeLocationInput(elements.locationInput.value);
      renderStatusLine();
    } else {
      renderLocation();
    }
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

function initAnalytics() {
  if (!shouldEnableAnalytics() || window.gtag) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", analyticsMeasurementId, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsMeasurementId)}`;
  document.head.appendChild(script);
}

function shouldEnableAnalytics() {
  return analyticsHostnames.has(window.location.hostname.toLowerCase());
}

function trackAnalyticsEvent(eventName) {
  if (!shouldEnableAnalytics() || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName);
}

function renderLocation() {
  const displayName = getLocationDisplayName(selectedLocation);
  elements.locationInput.value = displayName;
  elements.locationInput.title = getLocationTitle(selectedLocation);
  const locateButtonLabel = getLocateButtonLabel();
  elements.locateButton.setAttribute("aria-label", locateButtonLabel);
  elements.locateButton.title = locateButtonLabel;
  resizeLocationInput(displayName);
  renderStatusLine();
  document.title = "MyMeteo";
}

function getLocationDisplayName(location) {
  if (isCompactLocationLabel()) {
    return getCompactLocationDisplayName(location);
  }

  if (!isCurrentLocation(location)) {
    return location.name;
  }

  if (currentLocationRefreshState === "refreshing") {
    return "Updating current location...";
  }

  const placeName = getCurrentLocationPlaceName(location);
  const prefix = currentLocationRefreshState === "verified" ? "Current location" : "Last known location";
  return `${prefix}: ${placeName}`;
}

function getCompactLocationDisplayName(location) {
  if (!isCurrentLocation(location)) {
    return location.name;
  }

  return getCurrentLocationPlaceName(location);
}

function getLocationTitle(location) {
  if (!isCurrentLocation(location)) {
    return location.label || location.name;
  }

  if (currentLocationRefreshState === "refreshing") {
    return "Updating current location";
  }

  const placeLabel = getCurrentLocationPlaceLabel(location);
  const prefix = currentLocationRefreshState === "verified" ? "Current location" : "Last known location";
  return `${prefix}: ${placeLabel}`;
}

function getLocateButtonLabel() {
  if (currentLocationRefreshState === "refreshing") {
    return "Updating current location";
  }

  return isCurrentLocation(selectedLocation) ? "Update current location" : "Use current location";
}

function getCurrentLocationStatusLabel() {
  if (!isCurrentLocation(selectedLocation)) {
    return "";
  }

  if (currentLocationRefreshState === "refreshing") {
    return "";
  }

  return currentLocationRefreshState === "verified" ? "Current location" : "Last known location";
}

function getCurrentLocationPlaceName(location) {
  if (!hasGenericCurrentLocationName(location)) {
    return location.name;
  }

  return formatCoordinates(location);
}

function getCurrentLocationPlaceLabel(location) {
  if (location.label && !isGenericCurrentLocationText(location.label)) {
    return location.label;
  }

  return getCurrentLocationPlaceName(location);
}

function hasGenericCurrentLocationName(location) {
  return !location?.name || isGenericCurrentLocationText(location.name);
}

function isGenericCurrentLocationText(value) {
  return String(value || "").trim().toLowerCase() === "current location";
}

function isLegacyCurrentLocation(location) {
  return isGenericCurrentLocationText(location?.name) || isGenericCurrentLocationText(location?.label);
}

function isCurrentLocation(location) {
  return location?.source === currentLocationSource || isLegacyCurrentLocation(location);
}

function formatCoordinates(location) {
  return `${Number(location.lat).toFixed(3)}, ${Number(location.lon).toFixed(3)}`;
}

function isCompactLocationLabel() {
  return window.matchMedia(compactLocationLabelMediaQuery).matches;
}

function setStatusMessage(message, { title = "", isError = false } = {}) {
  statusMessage = message;
  statusTitle = title;
  statusIsError = isError;
  renderStatusLine();
}

function renderStatusLine() {
  const compactLocationStatus = isCompactLocationLabel() ? getCurrentLocationStatusLabel() : "";
  const statusParts = [compactLocationStatus, statusMessage].filter(Boolean);
  const titleParts = [compactLocationStatus, statusTitle].filter(Boolean);

  elements.updatedAt.textContent = statusParts.join(" · ");
  elements.updatedAt.title = titleParts.join(" · ");
  elements.updatedAt.classList.toggle("error", statusIsError);
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

function bindInfoAccordion() {
  const sections = Array.from(elements.infoDialog.querySelectorAll(".info-section"));
  sections.forEach((section) => {
    section.addEventListener("toggle", () => {
      if (!section.open) {
        return;
      }

      sections.forEach((otherSection) => {
        if (otherSection !== section) {
          otherSection.open = false;
        }
      });
    });
  });
}

function setMobileView(view) {
  activeMobileView = view;
  syncForecastViewForViewport();
}

function syncForecastViewForViewport() {
  const isDesktop = window.matchMedia(desktopLayoutMediaQuery).matches;
  const showForecast = isDesktop || activeMobileView === "forecast";
  const showRadar = isDesktop || activeMobileView === "rain";
  const showCurrentWeather = isDesktop || activeMobileView === "rain";

  elements.forecastPanel.hidden = !showForecast;
  elements.radarPanel.hidden = !showRadar;
  elements.nowPanel.hidden = !showCurrentWeather;
  updateMobileTabs();

  if (window.lucide) {
    window.lucide.createIcons();
  }

  if (showRadar) {
    if (shouldCenterMapWhenShown) {
      shouldCenterMapWhenShown = false;
      centerMapOnSelectedLocation();
    } else {
      refreshMapSize();
    }
  }

  if (showForecast) {
    scheduleHourlyForecastLayout();
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
  if (typedValue === getLocationDisplayName(selectedLocation)) {
    return;
  }

  const match = locationSearchResults.find((result) => formatLocationResult(result) === typedValue);

  if (match) {
    applyLocation(locationFromResult(match), "location_search");
  }
}

async function selectTypedLocation() {
  const typedValue = elements.locationInput.value.trim();

  if (typedValue === getLocationDisplayName(selectedLocation)) {
    renderLocation();
    return;
  }

  if (typedValue.length < 2) {
    renderLocation();
    return;
  }

  const exactMatch = locationSearchResults.find((result) => formatLocationResult(result) === typedValue);
  if (exactMatch) {
    applyLocation(locationFromResult(exactMatch), "location_search");
    return;
  }

  window.clearTimeout(locationSearchTimer);
  const results = await searchLocationSuggestions(typedValue);
  if (results[0]) {
    applyLocation(locationFromResult(results[0]), "location_search");
  } else {
    setStatusMessage("Location not found", { isError: true });
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
        applyLocation(locationFromResult(result), "location_search");
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

async function useCurrentLocation() {
  await requestCurrentLocation({
    analyticsEventName: "current_location_used",
  });
}

async function loadInitialWeather() {
  const didAttemptCurrentLocationRefresh = await refreshCurrentLocationIfAllowed({
    analyticsEventName: "current_location_auto_refreshed",
    loadWeatherOnFailure: true,
  });

  if (!didAttemptCurrentLocationRefresh) {
    loadAll();
  }
}

async function refreshCurrentLocationOnResume() {
  if (!isCurrentLocation(selectedLocation)) {
    return;
  }

  if (Date.now() - lastCurrentLocationRefreshAttemptAt < currentLocationRefreshCooldownMs) {
    return;
  }

  await refreshCurrentLocationIfAllowed({
    analyticsEventName: "current_location_resume_refreshed",
  });
}

async function refreshCurrentLocationIfAllowed({ analyticsEventName, loadWeatherOnFailure = false } = {}) {
  if (!isCurrentLocation(selectedLocation) || currentLocationRefreshPromise) {
    return false;
  }

  const permissionState = await getGeolocationPermissionState();
  if (permissionState !== "granted") {
    currentLocationRefreshState = "stale";
    renderLocation();
    return false;
  }

  currentLocationRefreshPromise = requestCurrentLocation({
    analyticsEventName,
    isAutoRefresh: true,
    loadWeatherOnFailure,
  }).finally(() => {
    currentLocationRefreshPromise = undefined;
  });

  await currentLocationRefreshPromise;
  return true;
}

async function requestCurrentLocation({ analyticsEventName, isAutoRefresh = false, loadWeatherOnFailure = false } = {}) {
  if (!navigator.geolocation) {
    setCurrentLocationErrorMessage("Current location unavailable");
    return false;
  }

  if (!window.isSecureContext) {
    setCurrentLocationErrorMessage("Open via localhost for location");
    return false;
  }

  lastCurrentLocationRefreshAttemptAt = Date.now();
  currentLocationRefreshState = "refreshing";
  renderLocation();
  setStatusMessage(isAutoRefresh ? "Updating current location..." : "Locating...");
  elements.locateButton.disabled = true;

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: 5 * 60 * 1000,
      timeout: 10 * 1000,
    });
    const location = await currentLocationFromPosition(position);
    currentLocationRefreshState = "verified";
    applyLocation(location, analyticsEventName);
    return true;
  } catch (error) {
    console.error(error);
    currentLocationRefreshState = isCurrentLocation(selectedLocation) ? "stale" : "idle";
    renderLocation();
    setCurrentLocationErrorMessage(getGeolocationErrorMessage(error));

    if (loadWeatherOnFailure) {
      loadAll();
    }

    return false;
  } finally {
    if (!elements.app.classList.contains("is-loading")) {
      elements.locateButton.disabled = false;
    }
  }
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) {
    return "unknown";
  }

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state;
  } catch (error) {
    return "unknown";
  }
}

function setCurrentLocationErrorMessage(message) {
  setStatusMessage(message, { isError: true });
}

function getGeolocationErrorMessage(error) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access is off";
  }

  if (error.code === error.TIMEOUT) {
    return "Location request timed out";
  }

  return "Current location unavailable";
}

async function currentLocationFromPosition(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const fallbackLocation = { lat, lon };
  const fallbackName = isNearbyLocation(selectedLocation, fallbackLocation)
    ? getCurrentLocationPlaceName(selectedLocation)
    : formatCoordinates(fallbackLocation);
  const place = await reverseGeocodeLocation({ lat, lon }).catch((error) => {
    console.warn("Could not name current location.", error);
    return null;
  });
  const name = place?.name || fallbackName;

  return {
    name,
    label: place?.label || name,
    lat,
    lon,
    timezone: getBrowserTimezone(),
    source: currentLocationSource,
    locatedAt: Date.now(),
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : undefined,
  };
}

async function hydrateStoredCurrentLocationName() {
  if (!isCurrentLocation(selectedLocation) || !hasGenericCurrentLocationName(selectedLocation)) {
    return;
  }

  const originalLocation = selectedLocation;
  const place = await reverseGeocodeLocation(originalLocation).catch((error) => {
    console.warn("Could not name stored current location.", error);
    return null;
  });

  if (!place || selectedLocation !== originalLocation) {
    return;
  }

  selectedLocation = normalizeLocation({
    ...selectedLocation,
    name: place.name,
    label: place.label,
    source: currentLocationSource,
  });
  saveLocation(selectedLocation);
  renderLocation();
}

async function reverseGeocodeLocation(location) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), reverseGeocodingTimeoutMs);
  const params = new URLSearchParams({
    lat: String(location.lat),
    lon: String(location.lon),
    format: "jsonv2",
    zoom: "10",
    addressdetails: "1",
    "accept-language": "en",
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`OpenStreetMap reverse geocoding responded with ${response.status}`);
    }

    const data = await response.json();
    return placeFromReverseGeocoding(data, location);
  } finally {
    window.clearTimeout(timeout);
  }
}

function placeFromReverseGeocoding(data, fallbackLocation) {
  const address = data?.address || {};
  const name = data?.name
    || address.city
    || address.town
    || address.village
    || address.municipality
    || address.county
    || address.state
    || formatCoordinates(fallbackLocation);
  const labelParts = [
    name,
    address.state,
    address.country,
  ].filter(Boolean);
  const label = [...new Set(labelParts)].join(", ");

  return {
    name,
    label: label || name,
  };
}

function isNearbyLocation(location, nextLocation) {
  if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lon)) {
    return false;
  }

  return getLocationDistanceKm(location, nextLocation) < 2;
}

function getLocationDistanceKm(location, nextLocation) {
  const earthRadiusKm = 6371;
  const lat1 = degreesToRadians(location.lat);
  const lat2 = degreesToRadians(nextLocation.lat);
  const deltaLat = degreesToRadians(nextLocation.lat - location.lat);
  const deltaLon = degreesToRadians(nextLocation.lon - location.lon);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function applyLocation(location, analyticsEventName) {
  if (analyticsEventName) {
    trackAnalyticsEvent(analyticsEventName);
  }

  const nextLocation = normalizeLocation(location);
  currentLocationRefreshState = isCurrentLocation(nextLocation) ? currentLocationRefreshState : "idle";
  selectedLocation = nextLocation;
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
  if (elements.radarPanel.hidden) {
    shouldCenterMapWhenShown = true;
    return;
  }

  centerMapOnSelectedLocation();
}

function centerMapOnSelectedLocation() {
  const center = () => {
    if (!map) {
      return;
    }

    map.invalidateSize({ animate: false });
    map.setView([selectedLocation.lat, selectedLocation.lon], 7, { animate: false });
  };

  center();
  window.requestAnimationFrame(() => {
    center();
    [80, 220, 600].forEach((delay) => {
      window.setTimeout(center, delay);
    });
  });
}

async function loadAll() {
  setLoading(true);
  setStatusMessage("Refreshing...");
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
      "rain_sum",
      "showers_sum",
      "snowfall_sum",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
    ].join(","),
    hourly: [
      "temperature_2m",
      "weather_code",
      "precipitation_probability",
      "rain",
      "showers",
      "snowfall",
      "wind_speed_10m",
      "wind_direction_10m",
      "is_day",
    ].join(","),
    forecast_days: "5",
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
    setStatusMessage("Forecast unavailable", { isError: true });
    renderFiveDayForecast();
  }
}

function renderWeather(data) {
  weatherData = data;
  const current = data.current;
  setStatusMessage(`Checked ${formatClock(new Date())}`, {
    title: `Weather observation ${formatTime(current.time)}`,
  });

  renderFiveDayForecast(data);
  renderSelectedWeather();
}

function renderCurrentTemperatureRange(temperatureRange) {
  elements.maxTemp.textContent = temperatureRange.max;
  elements.minTemp.textContent = temperatureRange.min;
  elements.maxTemp.title = temperatureRange.maxTitle;
  elements.minTemp.title = temperatureRange.minTitle;
  elements.temperatureRange.setAttribute("aria-label", temperatureRange.ariaLabel);
}

function renderCurrentPrecipitation(precipitation) {
  const scopeLabel = precipitation.scopeLabel || "Remaining today";
  elements.currentPrecipLabel.textContent = precipitation.label;
  elements.rainTotal.textContent = precipitation.value;
  elements.rainTotal.title = precipitation.ariaLabel;
  elements.currentPrecipMetric.setAttribute("aria-label", `${scopeLabel} ${precipitation.ariaLabel.toLowerCase()}`);
  renderCurrentPrecipitationIcon(precipitation);
}

function renderSelectedWeather(date = getSelectedWeatherDate()) {
  if (!weatherData) {
    return;
  }

  const current = weatherData.current;
  const currentSnapshot = getCurrentWeatherSnapshot(current);
  const currentDate = new Date(current.time * 1000);
  const isCurrentTime = !date || Math.abs(date - currentDate) < 30 * 60 * 1000;
  const snapshot = isCurrentTime ? currentSnapshot : getHourlyWeatherSnapshot(date, weatherData.hourly) || currentSnapshot;
  const summaryDate = date || currentDate;

  renderCurrentTemperatureRange(buildSelectedDayTemperatureRange(weatherData, summaryDate, snapshot));
  renderCurrentPrecipitation(buildSelectedDayPrecipitation(weatherData, summaryDate, snapshot));

  renderTimedCondition(snapshot.condition);
  renderTemperatureAndWind(snapshot);
}

function getSelectedWeatherDate() {
  return getActiveRadarDate() || (weatherData?.current?.time ? new Date(weatherData.current.time * 1000) : undefined);
}

function getCurrentWeatherSnapshot(current = {}) {
  return {
    condition: getCondition(current.weather_code, current.is_day),
    temperature: current.temperature_2m,
    windDirection: current.wind_direction_10m,
    windSpeed: current.wind_speed_10m,
    time: current.time,
  };
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
    condition: getCondition(hourly.weather_code?.[index], hourly.is_day?.[index] ?? isForecastHourDaytime(hourly.time[index])),
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

function renderTimedCondition(condition) {
  elements.conditionLabel.textContent = condition.label;
  renderConditionIcon(condition);
}

function renderTemperatureAndWind({ temperature, windDirection, windSpeed, time }) {
  elements.currentTemp.textContent = formatOptionalTemperature(temperature);
  elements.currentTemp.title = time ? `Forecast for ${formatTime(time)}` : "";

  if (!Number.isFinite(windDirection) || !Number.isFinite(windSpeed)) {
    elements.windText.textContent = "--";
    elements.windText.title = "";
    elements.currentWind.setAttribute("aria-label", "Wind unavailable");
    elements.windArrow.style.transform = "";
    elements.windArrow.title = "";
    return;
  }

  const roundedWindSpeed = Math.round(windSpeed);
  const beaufort = kmhToBeaufort(roundedWindSpeed);
  const downwindDirection = (windDirection + 180) % 360;
  const timeLabel = time ? `, forecast for ${formatTime(time)}` : "";

  elements.windText.textContent = `${degreesToCompass(windDirection)} ${beaufort}`;
  elements.currentWind.setAttribute("aria-label", `Wind ${degreesToCompass(windDirection)} ${beaufort}`);
  elements.windText.title = `${roundedWindSpeed} km/h, blowing toward ${degreesToCompass(downwindDirection)}${timeLabel}`;
  elements.windArrow.style.transform = `rotate(${downwindDirection}deg)`;
  elements.windArrow.title = `Blowing toward ${degreesToCompass(downwindDirection)}${timeLabel}`;
}

function setActiveRadarDate(date) {
  activeRadarDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : undefined;
  renderSelectedWeather(activeRadarDate);
}

function getActiveRadarDate() {
  if (activeRadarDate) {
    return activeRadarDate;
  }

  return getRadarDateForSlider(Number(elements.radarSlider.value) || 0);
}

function renderFiveDayForecast(data) {
  const days = buildFiveDayForecast(data);
  renderDailyPrecipitationHeader(days);

  if (!days.length) {
    expandedForecastDayKey = undefined;
    elements.forecastBody.innerHTML = '<tr><td class="forecast-empty" colspan="5">Forecast unavailable</td></tr>';
    return;
  }

  if (expandedForecastDayKey && !days.some((day) => day.key === expandedForecastDayKey)) {
    expandedForecastDayKey = undefined;
  }

  const rows = days.flatMap((day) => {
    const isExpanded = day.key === expandedForecastDayKey;
    const dayRow = createForecastRow(day, isExpanded);
    return isExpanded ? [dayRow, createHourlyForecastRow(day)] : [dayRow];
  });

  elements.forecastBody.replaceChildren(...rows);
  scheduleHourlyForecastLayout();
}

function renderDailyPrecipitationHeader(days) {
  if (elements.forecastPrecipHeader) {
    elements.forecastPrecipHeader.textContent = getDominantPrecipitationLabel(days.map((day) => day.precipitation));
  }
}

function buildCurrentDayTemperatureRange(data) {
  const { todayKey, currentHour } = getForecastTiming(data);
  const hourlyTemperatures = getForecastHourEntries(data?.hourly, todayKey, {
    currentHour,
    isToday: true,
  })
    .map(({ index }) => data.hourly.temperature_2m?.[index])
    .filter(Number.isFinite);
  const temperatures = [...hourlyTemperatures];

  if (Number.isFinite(data?.current?.temperature_2m)) {
    temperatures.push(data.current.temperature_2m);
  }

  if (!temperatures.length) {
    return buildDailyTemperatureRange(data?.daily, 0, true);
  }

  return buildTemperatureRange(Math.max(...temperatures), Math.min(...temperatures), true);
}

function buildSelectedDayTemperatureRange(data, date, snapshot) {
  const dailyIndex = getDailyForecastIndex(data?.daily, formatDateKey(date));
  const temperatures = getRemainingForecastHourEntries(data?.hourly, date)
    .map(({ index }) => data.hourly.temperature_2m?.[index])
    .filter(Number.isFinite);

  if (Number.isFinite(snapshot?.temperature)) {
    temperatures.push(snapshot.temperature);
  }

  if (!temperatures.length) {
    return buildDailyTemperatureRange(data?.daily, dailyIndex >= 0 ? dailyIndex : 0, "restOfDay");
  }

  return buildTemperatureRange(Math.max(...temperatures), Math.min(...temperatures), "restOfDay");
}

function buildDailyTemperatureRange(daily, index, isRemainingToday = false) {
  return buildTemperatureRange(daily?.temperature_2m_max?.[index], daily?.temperature_2m_min?.[index], isRemainingToday);
}

function buildTemperatureRange(maxTemperature, minTemperature, isRemainingToday = false) {
  const max = formatOptionalTemperature(maxTemperature);
  const min = formatOptionalTemperature(minTemperature);
  const prefix = isRemainingToday === "restOfDay"
    ? "Rest of day"
    : isRemainingToday
      ? "Remaining today"
      : "Daily";

  return {
    max,
    min,
    maxTitle: `${prefix} max ${max}`,
    minTitle: `${prefix} min ${min}`,
    ariaLabel: `${prefix} temperature range, max ${max}, min ${min}`,
  };
}

function buildCurrentDayPrecipitation(data) {
  const current = data?.current || {};
  const dailyPrecipitation = buildDailyPrecipitation(data?.daily, 0, current.temperature_2m);
  const { todayKey, currentHour } = getForecastTiming(data);
  const hours = buildHourlyForecastForDay(data?.hourly, todayKey, {
    currentHour,
    isToday: true,
  });

  return withHourlyPrecipitationChance(
    dailyPrecipitation,
    hours.map((hour) => hour.precipitation),
  );
}

function buildSelectedDayPrecipitation(data, date, snapshot) {
  const dailyIndex = getDailyForecastIndex(data?.daily, formatDateKey(date));
  const fallbackPrecipitation = buildDailyPrecipitation(
    data?.daily,
    dailyIndex >= 0 ? dailyIndex : 0,
    snapshot?.temperature,
  );
  const hours = buildHourlyForecastEntries(data?.hourly, getRemainingForecastHourEntries(data?.hourly, date));
  const hourlyPrecipitations = hours.map((hour) => hour.precipitation);
  const typedPrecipitation = withPrecipitationType(
    fallbackPrecipitation,
    getDominantPrecipitationType(hourlyPrecipitations, {
      fallbackType: fallbackPrecipitation.type,
    }),
  );

  return {
    ...withHourlyPrecipitationChance(typedPrecipitation, hourlyPrecipitations),
    scopeLabel: "Rest of day",
  };
}

function buildDailyPrecipitation(daily, index, temperature) {
  return buildPrecipitationChance({
    chance: daily?.precipitation_probability_max?.[index],
    weatherCode: daily?.weather_code?.[index],
    rainAmount: daily?.rain_sum?.[index],
    showersAmount: daily?.showers_sum?.[index],
    snowfallAmount: daily?.snowfall_sum?.[index],
    temperature,
  });
}

function getDailyForecastIndex(daily, dayKey) {
  if (!daily?.time?.length || !dayKey) {
    return -1;
  }

  return daily.time.findIndex((time) => formatDateKey(time) === dayKey);
}

function getForecastTiming(data) {
  const currentTime = data?.current?.time ?? Date.now() / 1000;

  return {
    todayKey: formatDateKey(currentTime),
    currentHour: getDatePart(toForecastDate(currentTime), "hour") || 0,
  };
}

function buildFiveDayForecast(data) {
  const daily = data?.daily;
  const hourly = data?.hourly;

  if (!daily?.time?.length) {
    return [];
  }

  const { todayKey, currentHour } = getForecastTiming(data);

  return daily.time.slice(0, 5).map((time, index) => {
    const dailyPrecipitation = buildDailyPrecipitation(daily, index, daily.temperature_2m_max?.[index]);
    const key = formatDateKey(time);
    const isToday = key === todayKey;
    const temperatureRange = isToday
      ? buildCurrentDayTemperatureRange(data)
      : buildDailyTemperatureRange(daily, index);

    const hours = buildHourlyForecastForDay(hourly, key, {
      currentHour,
      isToday,
    });
    const condition = buildDailyCondition(hours, daily.weather_code?.[index]);
    const hourlyPrecipitations = hours.map((hour) => hour.precipitation);
    const typedPrecipitation = withPrecipitationType(
      dailyPrecipitation,
      getDominantPrecipitationType(hourlyPrecipitations, {
        fallbackType: dailyPrecipitation.type,
      }),
    );
    const precipitation = withHourlyPrecipitationChance(typedPrecipitation, hourlyPrecipitations);
    const wind = buildDailyWind(hours, {
      fallbackDirection: daily.wind_direction_10m_dominant?.[index],
      fallbackSpeed: daily.wind_speed_10m_max?.[index],
    });

    return {
      key,
      day: formatWeekday(time),
      fullDay: formatWeekday(time, "long"),
      condition,
      max: temperatureRange.max,
      min: temperatureRange.min,
      temperatureAriaLabel: temperatureRange.ariaLabel,
      precipitation,
      wind: formatOptionalWind(wind.direction, wind.speed),
      hours,
      hourlyPrecipitationLabel: getDominantPrecipitationLabel(hourlyPrecipitations, {
        fallbackType: precipitation.type,
        minimumChance: meaningfulPrecipitationChanceThreshold,
      }),
    };
  });
}

function buildDailyCondition(hours, fallbackWeatherCode) {
  const summaryHours = getDailyConditionHours(hours);
  const weatherCode = getDominantWeatherCode(summaryHours, fallbackWeatherCode);
  const hasDaylightHours = summaryHours.some((hour) => hour.isDaytime);
  const isDay = hasDaylightHours || !summaryHours.length;

  return getCondition(weatherCode, isDay);
}

function getDailyConditionHours(hours) {
  if (!Array.isArray(hours) || !hours.length) {
    return [];
  }

  const daylightHours = hours.filter((hour) => hour.isDaytime);

  if (daylightHours.length) {
    return daylightHours;
  }

  return hours;
}

function getDominantWeatherCode(hours, fallbackWeatherCode) {
  const weatherCodeScores = new Map();

  hours.forEach((hour, index) => {
    if (!Number.isFinite(hour.weatherCode)) {
      return;
    }

    const score = weatherCodeScores.get(hour.weatherCode) || {
      count: 0,
      firstIndex: index,
      severity: getWeatherCodeSeverity(hour.weatherCode),
      precipitationChance: 0,
    };
    score.count += 1;
    score.precipitationChance += Number.isFinite(hour.precipitation?.chance) ? hour.precipitation.chance : 0;
    weatherCodeScores.set(hour.weatherCode, score);
  });

  if (!weatherCodeScores.size) {
    return fallbackWeatherCode;
  }

  return [...weatherCodeScores.entries()].sort(([, a], [, b]) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    if (b.precipitationChance !== a.precipitationChance) {
      return b.precipitationChance - a.precipitationChance;
    }

    if (b.severity !== a.severity) {
      return b.severity - a.severity;
    }

    return a.firstIndex - b.firstIndex;
  })[0][0];
}

function getWeatherCodeSeverity(code) {
  const severityByCode = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    45: 4,
    48: 4,
    51: 5,
    53: 6,
    55: 7,
    56: 7,
    57: 8,
    61: 7,
    63: 8,
    65: 9,
    66: 8,
    67: 9,
    71: 7,
    73: 8,
    75: 9,
    77: 7,
    80: 7,
    81: 8,
    82: 9,
    85: 8,
    86: 9,
    95: 10,
    96: 11,
    99: 11,
  };

  return severityByCode[code] ?? 0;
}

function buildDailyWind(hours, { fallbackDirection, fallbackSpeed } = {}) {
  const windEntries = Array.isArray(hours)
    ? hours
        .map((hour) => ({
          direction: hour.windDirection,
          speed: hour.windSpeed,
        }))
        .filter(({ direction, speed }) => Number.isFinite(direction) && Number.isFinite(speed))
    : [];

  if (!windEntries.length) {
    return {
      direction: fallbackDirection,
      speed: fallbackSpeed,
    };
  }

  const directionGroups = windEntries.reduce((groups, entry) => {
    const directionIndex = getCompassIndex(entry.direction);
    const group = groups.get(directionIndex) || {
      directionIndex,
      speeds: [],
      totalSpeed: 0,
    };
    group.speeds.push(entry.speed);
    group.totalSpeed += entry.speed;
    groups.set(directionIndex, group);
    return groups;
  }, new Map());
  const dominantGroup = [...directionGroups.values()].sort((a, b) => {
    if (b.speeds.length !== a.speeds.length) {
      return b.speeds.length - a.speeds.length;
    }

    return b.totalSpeed - a.totalSpeed;
  })[0];

  return {
    direction: dominantGroup.directionIndex * 45,
    speed: getMedian(dominantGroup.speeds),
  };
}

function createForecastRow(day, isExpanded) {
  const row = document.createElement("tr");
  row.className = "forecast-day-row";
  row.dataset.forecastDay = day.key;
  row.title = `${isExpanded ? "Hide" : "Show"} hourly forecast for ${day.fullDay}`;
  row.classList.toggle("is-expanded", isExpanded);
  row.addEventListener("click", () => {
    toggleForecastDay(day.key);
  });
  row.append(
    createDayCell(day, isExpanded),
    createIconCell(day.condition),
    createForecastTemperatureCell(day),
    createPrecipitationCell(day.precipitation),
    createCell(day.wind, "forecast-wind"),
  );
  return row;
}

function createDayCell(day, isExpanded) {
  const cell = document.createElement("td");
  const button = document.createElement("button");
  const chevron = document.createElement("span");
  const label = document.createElement("span");

  cell.className = "forecast-day";
  button.className = "forecast-day-button";
  button.type = "button";
  button.setAttribute("aria-expanded", String(isExpanded));
  button.setAttribute("aria-controls", getForecastDetailsId(day.key));
  button.setAttribute("aria-label", `${isExpanded ? "Hide" : "Show"} hourly forecast for ${day.fullDay}`);
  chevron.className = "forecast-chevron";
  chevron.setAttribute("aria-hidden", "true");
  label.textContent = day.day;
  button.append(chevron, label);
  cell.appendChild(button);

  return cell;
}

function createCell(text, className) {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) {
    cell.className = className;
  }
  return cell;
}

function createForecastTemperatureCell(day) {
  const cell = document.createElement("td");
  const value = document.createElement("span");
  const max = document.createElement("span");
  const separator = document.createElement("span");
  const min = document.createElement("span");

  cell.className = "forecast-temp-cell";
  cell.setAttribute("aria-label", day.temperatureAriaLabel || `Max ${day.max}, min ${day.min}`);
  value.className = "forecast-temp-value";
  max.className = "temp-max";
  max.textContent = day.max;
  separator.className = "forecast-temp-separator";
  separator.setAttribute("aria-hidden", "true");
  separator.textContent = "/";
  min.className = "temp-min";
  min.textContent = day.min;
  value.append(max, separator, min);
  cell.appendChild(value);

  return cell;
}

function createPrecipitationCell(precipitation) {
  const cell = document.createElement("td");
  const value = document.createElement("span");
  const amount = document.createElement("span");

  cell.className = "forecast-rain-cell";
  cell.title = precipitation.ariaLabel;
  cell.setAttribute("aria-label", precipitation.ariaLabel);
  value.className = "forecast-precipitation-value";
  value.setAttribute("aria-hidden", "true");
  amount.textContent = precipitation.value;
  value.append(createPrecipitationIcon(precipitation), amount);
  cell.appendChild(value);

  return cell;
}

function renderCurrentPrecipitationIcon(precipitation) {
  const icon = createPrecipitationIcon(precipitation, "current-precipitation-icon");
  const existingIcon = elements.currentPrecipitationValue.querySelector("svg");

  if (existingIcon) {
    existingIcon.replaceWith(icon);
    return;
  }

  elements.currentPrecipitationValue.prepend(icon);
}

function createPrecipitationIcon(precipitation, className = "forecast-precipitation-icon") {
  return precipitation.type === "snow" ? createSnowIcon(className) : createDropletIcon(className);
}

function createDropletIcon(className = "forecast-precipitation-icon") {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  icon.classList.add(className);
  icon.setAttribute("viewBox", "0 0 12 22");
  icon.setAttribute("fill", "#238fc7");
  icon.setAttribute("aria-hidden", "true");
  path.setAttribute(
    "d",
    "M6 1.7C3.9 4.6 2.2 7.4 1.5 10.6c-.4 1.4-.5 3-.5 4.5 0 3.1 2.25 5.3 5 5.3s5-2.2 5-5.3c0-1.5-.1-3.1-.5-4.5C9.8 7.4 8.1 4.6 6 1.7Z",
  );
  icon.appendChild(path);

  return icon;
}

function createSnowIcon(className = "forecast-precipitation-icon") {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const paths = [
    "M8 2.4v11.2",
    "M3.2 5.2l9.6 5.6",
    "M12.8 5.2l-9.6 5.6",
    "M5.7 3.8 8 5.2l2.3-1.4",
    "M5.7 12.2 8 10.8l2.3 1.4",
  ];

  icon.classList.add(className, "precipitation-icon--snow");
  icon.setAttribute("viewBox", "0 0 16 16");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "#238fc7");
  icon.setAttribute("stroke-width", "1.8");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.setAttribute("aria-hidden", "true");

  paths.forEach((d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    icon.appendChild(path);
  });

  return icon;
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

function toggleForecastDay(dayKey) {
  expandedForecastDayKey = expandedForecastDayKey === dayKey ? undefined : dayKey;
  renderFiveDayForecast(weatherData);

  const button = elements.forecastBody.querySelector(`[data-forecast-day="${dayKey}"] .forecast-day-button`);
  button?.focus({ preventScroll: true });
}

function getForecastDetailsId(dayKey) {
  return `forecast-hours-${dayKey}`;
}

function createHourlyForecastRow(day) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  const panel = document.createElement("div");
  const grid = document.createElement("div");

  row.className = "forecast-hourly-row";
  row.id = getForecastDetailsId(day.key);
  cell.className = "forecast-hourly-cell";
  cell.colSpan = 5;
  panel.className = "hourly-forecast";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", `Hourly forecast for ${day.fullDay}`);
  grid.className = "hourly-grid";
  grid.setAttribute("role", "table");
  grid.setAttribute("aria-label", `Hourly forecast for ${day.fullDay}`);

  if (day.hours.length) {
    grid.appendChild(createHourlyHeaderRow(day.hourlyPrecipitationLabel));
    day.hours.forEach((hour) => {
      grid.appendChild(createHourlyDataRow(hour));
    });
    panel.appendChild(grid);
  } else {
    const empty = document.createElement("div");
    empty.className = "hourly-empty";
    empty.textContent = "Hourly forecast unavailable";
    panel.appendChild(empty);
  }

  cell.appendChild(panel);
  row.appendChild(cell);

  return row;
}

function scheduleHourlyForecastLayout() {
  if (hourlyForecastLayoutFrame) {
    window.cancelAnimationFrame(hourlyForecastLayoutFrame);
  }

  hourlyForecastLayoutFrame = window.requestAnimationFrame(() => {
    hourlyForecastLayoutFrame = undefined;
    updateHourlyForecastLayouts();
  });
}

function updateHourlyForecastLayouts() {
  document.querySelectorAll(".hourly-grid").forEach(updateHourlyForecastLayout);
}

function updateHourlyForecastLayout(grid) {
  const rows = Array.from(grid.querySelectorAll(".hourly-row:not(.hourly-head-row)"));

  if (!rows.length || grid.getBoundingClientRect().width <= 0) {
    return;
  }

  const rainCells = rows
    .map((row) => row.querySelector(".hourly-rain"))
    .filter(Boolean);
  const rainValues = rows
    .map((row) => row.querySelector(".hourly-precipitation-value"))
    .filter(Boolean);
  const tempCells = rows
    .map((row) => row.querySelector(".hourly-temp"))
    .filter(Boolean);
  const windCells = rows
    .map((row) => row.querySelector(".hourly-wind"))
    .filter(Boolean);

  if (!rainCells.length || !rainValues.length || !tempCells.length || !windCells.length) {
    return;
  }

  const gridWidth = grid.getBoundingClientRect().width;
  const tempRight = Math.max(...tempCells.map((cell) => cell.getBoundingClientRect().right));
  const rainLeft = Math.min(...rainCells.map((cell) => cell.getBoundingClientRect().left));
  const windRects = windCells.map((cell) => cell.getBoundingClientRect());
  const windLeft = Math.min(...windRects.map((rect) => rect.left));
  const narrowestWindCell = Math.min(...windRects.map((rect) => rect.width));
  const widestRainValue = Math.max(...rainValues.map((value) => value.getBoundingClientRect().width));
  const widestWindValue = Math.max(...windCells.map(getElementTextWidth));
  const preferredGap = clampNumber(gridWidth * 0.075, 24, 32);
  const minimumGap = 14;
  const windRightCushion = clampNumber(gridWidth * 0.015, 5, 8);
  const availableRainSpace = windLeft - tempRight - widestRainValue;
  const balancedRainGap = Math.max(minimumGap, availableRainSpace / 2);
  const balancedRainInset = Math.max(0, balancedRainGap - (rainLeft - tempRight));
  const maximumRainInset = Math.max(0, windLeft - rainLeft - widestRainValue - minimumGap);
  const rainInset = Math.min(balancedRainInset, maximumRainInset);
  const gapAfterRainInset = windLeft - rainLeft - rainInset - widestRainValue;
  const maximumWindInset = Math.max(0, narrowestWindCell - widestWindValue - windRightCushion);
  const windInset = gapAfterRainInset < preferredGap
    ? Math.min(preferredGap - gapAfterRainInset, maximumWindInset)
    : 0;

  grid.style.setProperty("--hourly-rain-inset", `${Math.round(rainInset)}px`);
  grid.style.setProperty("--hourly-wind-inset", `${Math.round(windInset)}px`);
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getElementTextWidth(element) {
  const canvas = getElementTextWidth.canvas || document.createElement("canvas");
  const context = canvas.getContext("2d");
  const style = window.getComputedStyle(element);

  getElementTextWidth.canvas = canvas;

  if (!context) {
    return 0;
  }

  context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return context.measureText(element.textContent.trim()).width;
}

function createHourlyHeaderRow(precipitationLabel) {
  const row = document.createElement("div");
  row.className = "hourly-row hourly-head-row";
  row.setAttribute("role", "row");
  row.append(
    createHourlyTextCell("Time", "hourly-time", "columnheader"),
    createHourlyTextCell("Sky", "hourly-sky", "columnheader"),
    createHourlyTextCell("Temp", "hourly-temp", "columnheader"),
    createHourlyTextCell(precipitationLabel, "hourly-rain", "columnheader"),
    createHourlyTextCell("Wind", "hourly-wind", "columnheader"),
  );
  return row;
}

function createHourlyDataRow(hour) {
  const row = document.createElement("div");
  row.className = "hourly-row";
  row.setAttribute("role", "row");
  row.setAttribute(
    "aria-label",
    `${hour.time}, ${hour.condition.label}, ${hour.temperature}, ${hour.precipitation.ariaLabel}, wind ${hour.wind}`,
  );
  row.append(
    createHourlyTextCell(hour.time, "hourly-time"),
    createHourlyIconCell(hour.condition),
    createHourlyTextCell(hour.temperature, "hourly-temp"),
    createHourlyPrecipitationCell(hour.precipitation),
    createHourlyTextCell(hour.wind, "hourly-wind"),
  );
  return row;
}

function createHourlyTextCell(text, className, role = "cell") {
  const cell = document.createElement("span");
  cell.className = className;
  cell.setAttribute("role", role);
  cell.textContent = text;
  return cell;
}

function createHourlyPrecipitationCell(precipitation) {
  const cell = document.createElement("span");
  const value = document.createElement("span");
  const amount = document.createElement("span");

  cell.className = "hourly-rain";
  cell.setAttribute("role", "cell");
  cell.setAttribute("aria-label", precipitation.ariaLabel);
  cell.title = precipitation.ariaLabel;
  value.className = "hourly-precipitation-value";
  value.setAttribute("aria-hidden", "true");
  amount.textContent = precipitation.value;
  value.append(createPrecipitationIcon(precipitation, "hourly-precipitation-icon"), amount);

  if (precipitation.intensity) {
    const intensity = document.createElement("span");

    intensity.className = "hourly-precipitation-intensity";
    intensity.textContent = precipitation.intensity;
    value.appendChild(intensity);
  }

  cell.appendChild(value);

  return cell;
}

function createHourlyIconCell(condition) {
  const cell = document.createElement("span");
  const mark = document.createElement("span");
  const icon = createWeatherIcon(condition, "hourly-weather-icon");

  cell.className = "hourly-sky";
  cell.setAttribute("role", "cell");
  cell.setAttribute("aria-label", condition.label);
  mark.className = "hourly-condition-mark";
  mark.title = condition.label;
  mark.setAttribute("aria-hidden", "true");
  mark.appendChild(icon);
  cell.appendChild(mark);

  return cell;
}

function buildHourlyForecastForDay(hourly, dayKey, { currentHour, isToday } = {}) {
  if (!hourly?.time?.length) {
    return [];
  }

  return buildHourlyForecastEntries(hourly, getForecastHourEntries(hourly, dayKey, { currentHour, isToday }).slice(0, 24));
}

function buildHourlyForecastEntries(hourly, entries) {
  if (!hourly?.time?.length || !Array.isArray(entries)) {
    return [];
  }

  return entries.map(({ time, index }) => {
    const isDay = hourly.is_day?.[index] ?? isForecastHourDaytime(time);
    const weatherCode = hourly.weather_code?.[index];
    const windDirection = hourly.wind_direction_10m?.[index];
    const windSpeed = hourly.wind_speed_10m?.[index];
    return {
      time: formatTime(time),
      weatherCode,
      isDaytime: isDay !== 0 && isDay !== false,
      condition: getCondition(weatherCode, isDay),
      temperature: formatOptionalTemperature(hourly.temperature_2m?.[index]),
      precipitation: buildPrecipitationChance({
        chance: hourly.precipitation_probability?.[index],
        weatherCode,
        rainAmount: hourly.rain?.[index],
        showersAmount: hourly.showers?.[index],
        snowfallAmount: hourly.snowfall?.[index],
        temperature: hourly.temperature_2m?.[index],
        includeIntensity: true,
      }),
      windDirection,
      windSpeed,
      wind: formatOptionalWind(windDirection, windSpeed),
    };
  });
}

function getForecastHourEntries(hourly, dayKey, { currentHour, isToday } = {}) {
  if (!hourly?.time?.length) {
    return [];
  }

  return hourly.time
    .map((time, index) => ({ time, index }))
    .filter(({ time }) => formatDateKey(time) === dayKey)
    .filter(({ time }) => !isToday || getDatePart(toForecastDate(time), "hour") >= currentHour);
}

function getRemainingForecastHourEntries(hourly, date) {
  if (!hourly?.time?.length || !date) {
    return [];
  }

  const dayKey = formatDateKey(date);
  const startTime = date.getTime() / 1000;
  const hourLookbackSeconds = 60 * 60;

  return hourly.time
    .map((time, index) => ({ time, index }))
    .filter(({ time }) => formatDateKey(time) === dayKey)
    .filter(({ time }) => time >= startTime - hourLookbackSeconds);
}

function isForecastHourDaytime(time) {
  const date = toForecastDate(time);
  const hour = getDatePart(date, "hour");
  return hour >= 6 && hour < 20;
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
  map.attributionControl.setPrefix(false);

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

  L.control.zoom({ position: "bottomright" }).addTo(map);
  createBuienradarModeControl().addTo(map);
  updateBuienradarModeControl();
  refreshMapSize();
}

function createBuienradarModeControl() {
  const control = L.control({ position: "bottomright" });

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
  const cachedRadar = getFreshBuienradarRadarCache(nextModeId);
  activeBuienradarRadarModeId = nextModeId;

  if (cachedRadar) {
    buienradarDisplayRequestId += 1;
    displayBuienradarRadar(cachedRadar);
    trackAnalyticsEvent(`radar_${nextModeId}`);
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
      trackAnalyticsEvent(`radar_${nextModeId}`);
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
  const cachedRadar = getFreshBuienradarRadarCache(radarModeId);
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
    fetchedAt: Date.now(),
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

      map.invalidateSize({ animate: false });
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
  setRainForecastBadgeText(message);
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
  setRainForecastBadgeText(label, displayDate);
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
  setRainForecastBadgeText(label, frameDate, DEFAULT_LOCATION.timezone);
  elements.radarSlider.value = String(Math.round(framePosition * 100));
  elements.radarSlider.setAttribute("aria-valuetext", label);
  elements.radarTime.classList.remove("error");
  setActiveRadarDate(frameDate);
}

function setRainForecastBadgeText(text, date, timezone = selectedLocation.timezone) {
  const isClockLabel = /^\d{1,2}:\d{2}$/.test(text);
  elements.rainForecastBadge.classList.toggle("is-message", !isClockLabel);

  if (!isClockLabel) {
    elements.rainForecastBadge.textContent = text;
    elements.rainForecastBadge.removeAttribute("datetime");
    return;
  }

  const timeLabel = document.createElement("span");
  timeLabel.className = "rain-forecast-time";
  timeLabel.textContent = `At ${text}`;
  elements.rainForecastBadge.replaceChildren(timeLabel);

  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    elements.rainForecastBadge.dateTime = date.toISOString();
  } else {
    elements.rainForecastBadge.removeAttribute("datetime");
  }

  const dayContext = getRainForecastDayContext(date, timezone);
  if (dayContext) {
    const dayLabel = document.createElement("span");
    dayLabel.className = "rain-forecast-day";
    dayLabel.textContent = dayContext;
    elements.rainForecastBadge.append(dayLabel);
  }
}

function getRainForecastDayContext(date, timezone = selectedLocation.timezone) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const selectedDateKey = formatDateKey(date, timezone);
  const todayDateKey = formatDateKey(new Date(), timezone);
  return selectedDateKey > todayDateKey ? "Tomorrow" : "";
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
  if (getFreshBuienradarRadarCache(nextModeId) || buienradarRadarRequests.has(nextModeId)) {
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

function getFreshBuienradarRadarCache(radarModeId) {
  const radar = buienradarRadarCache.get(radarModeId);
  return radar && isFreshBuienradarRadar(radar) ? radar : undefined;
}

function isFreshBuienradarRadar(radar) {
  return Number.isFinite(radar.fetchedAt) && Date.now() - radar.fetchedAt < buienradarRadarCacheMaxAgeMs;
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

function roundRainChanceForDisplay(value) {
  return Math.round(value / precipitationChanceDisplayStep) * precipitationChanceDisplayStep;
}

function formatOptionalRainChance(value) {
  return Number.isFinite(value) ? `${roundRainChanceForDisplay(value)}%` : "--%";
}

function buildPrecipitationChance({
  chance,
  weatherCode,
  rainAmount,
  showersAmount,
  snowfallAmount,
  temperature,
  includeIntensity = false,
}) {
  const type = getPrecipitationType({
    weatherCode,
    rainAmount,
    showersAmount,
    snowfallAmount,
    temperature,
  });
  const label = getPrecipitationLabel(type);
  const value = formatOptionalRainChance(chance);
  const displayChance = Number.isFinite(chance) ? roundRainChanceForDisplay(chance) : undefined;
  const amount = getPrecipitationAmount({
    type,
    rainAmount,
    showersAmount,
    snowfallAmount,
  });
  const intensity = includeIntensity ? getPrecipitationIntensity(type, amount, displayChance) : undefined;
  const ariaLabel = `${label} chance ${value}${intensity ? `, ${intensity}` : ""}`;

  return {
    type,
    label,
    value,
    chance,
    amount,
    intensity,
    ariaLabel,
  };
}

function withHourlyPrecipitationChance(precipitation, hourlyPrecipitations) {
  const hourlyChance = getMaxPrecipitationChance(hourlyPrecipitations);

  if (!Number.isFinite(hourlyChance)) {
    return precipitation;
  }

  return withPrecipitationChance(precipitation, hourlyChance);
}

function withPrecipitationChance(precipitation, chance) {
  const value = formatOptionalRainChance(chance);

  return {
    ...precipitation,
    value,
    chance,
    ariaLabel: `${precipitation.label} chance ${value}`,
  };
}

function withPrecipitationType(precipitation, type) {
  const normalizedType = type === "snow" ? "snow" : "rain";

  if (precipitation.type === normalizedType) {
    return precipitation;
  }

  const label = getPrecipitationLabel(normalizedType);

  return {
    ...precipitation,
    type: normalizedType,
    label,
    ariaLabel: `${label} chance ${precipitation.value}`,
  };
}

function getDominantPrecipitationType(precipitations, { fallbackType = "rain", minimumChance = 0 } = {}) {
  const totals = precipitations.reduce(
    (scores, precipitation) => {
      if (!precipitation) {
        return scores;
      }

      const chance = Number.isFinite(precipitation.chance) ? precipitation.chance : 0;
      if (Number.isFinite(precipitation.chance) && chance < minimumChance) {
        return scores;
      }

      const key = precipitation.type === "snow" ? "snow" : "rain";
      scores[`${key}Count`] += 1;
      scores[`${key}Chance`] += chance;
      return scores;
    },
    {
      rainChance: 0,
      snowChance: 0,
      rainCount: 0,
      snowCount: 0,
    },
  );
  const hasChance = totals.rainChance > 0 || totals.snowChance > 0;
  const hasPrecipitationSignal = totals.rainCount > 0 || totals.snowCount > 0;

  if (!hasPrecipitationSignal) {
    return fallbackType === "snow" ? "snow" : "rain";
  }

  const rainScore = hasChance ? totals.rainChance : totals.rainCount;
  const snowScore = hasChance ? totals.snowChance : totals.snowCount;

  return snowScore > 0 && snowScore >= rainScore * snowCloseSplitRatio ? "snow" : "rain";
}

function getDominantPrecipitationLabel(precipitations, options = {}) {
  return getPrecipitationLabel(getDominantPrecipitationType(precipitations, options));
}

function getMaxPrecipitationChance(precipitations) {
  if (!Array.isArray(precipitations)) {
    return undefined;
  }

  const chances = precipitations
    .map((precipitation) => precipitation?.chance)
    .filter(Number.isFinite);

  return chances.length ? Math.max(...chances) : undefined;
}

function getPrecipitationLabel(type) {
  return type === "snow" ? "Snow" : "Rain";
}

function getPrecipitationIntensity(type, amount, displayChance) {
  if (
    !Number.isFinite(displayChance) ||
    displayChance < precipitationIntensityChanceThreshold
  ) {
    return undefined;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return "light";
  }

  const thresholds = precipitationIntensityThresholds[type === "snow" ? "snow" : "rain"];

  if (amount >= thresholds.heavy) {
    return "heavy";
  }

  if (amount >= thresholds.moderate) {
    return "moderate";
  }

  return "light";
}

function getPrecipitationAmount({ type, rainAmount, showersAmount, snowfallAmount }) {
  if (type === "snow") {
    return Number.isFinite(snowfallAmount) ? snowfallAmount : undefined;
  }

  return sumFiniteValues(rainAmount, showersAmount);
}

function getPrecipitationType({ weatherCode, rainAmount, showersAmount, snowfallAmount, temperature }) {
  const rainTotal = sumFiniteValues(rainAmount, showersAmount);
  const snowTotal = Number.isFinite(snowfallAmount) ? snowfallAmount : 0;
  const isFreezing = Number.isFinite(temperature) && temperature <= freezingTemperatureThreshold;

  if (snowWeatherCodes.has(Number(weatherCode))) {
    return "snow";
  }

  if (rainTotal > 0 || snowTotal > 0) {
    if (isFreezing) {
      return "snow";
    }

    return snowTotal > 0 && (rainTotal <= 0 || snowTotal >= rainTotal * snowCloseSplitRatio)
      ? "snow"
      : "rain";
  }

  return isFreezing ? "snow" : "rain";
}

function sumFiniteValues(...values) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function formatOptionalWind(direction, speed) {
  if (!Number.isFinite(direction) || !Number.isFinite(speed)) {
    return "--";
  }

  return `${degreesToCompass(direction)} ${kmhToBeaufort(Math.round(speed))}`;
}

function getMedian(values) {
  const sortedValues = values.filter(Number.isFinite).sort((a, b) => a - b);

  if (!sortedValues.length) {
    return undefined;
  }

  const middle = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
}

function formatWeekday(value, weekday = "short") {
  const date = toForecastDate(value);

  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday,
      timeZone: selectedLocation.timezone,
    }).format(date);
  } catch (error) {
    return new Intl.DateTimeFormat("en-US", {
      weekday,
      timeZone: DEFAULT_LOCATION.timezone,
    }).format(date);
  }
}

function formatTime(value) {
  const date = toForecastDate(value);

  return formatClock(date);
}

function toForecastDate(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value * 1000);
  }

  if (typeof value === "string" && value.includes("T")) {
    return new Date(value);
  }

  return new Date(`${value}T12:00:00`);
}

function formatDateKey(value, timezone = selectedLocation.timezone) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parts = getDateParts(toForecastDate(value), timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getDatePart(date, part, timezone = selectedLocation.timezone) {
  return Number(getDateParts(date, timezone)[part]);
}

function getDateParts(date, timezone = selectedLocation.timezone) {
  try {
    return getFormattedDateParts(date, timezone);
  } catch (error) {
    return getFormattedDateParts(date, DEFAULT_LOCATION.timezone);
  }
}

function getFormattedDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return values;
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
  return compassPoints[getCompassIndex(degrees)];
}

function getCompassIndex(degrees) {
  return Math.round(normalizeDegrees(degrees) / 45) % compassPoints.length;
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function kmhToBeaufort(kmh) {
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const beaufort = thresholds.findIndex((threshold) => kmh < threshold);
  return beaufort === -1 ? 12 : beaufort;
}

function normalizeLocation(location) {
  const source = location.source || (isLegacyCurrentLocation(location) ? currentLocationSource : undefined);
  const locatedAt = Number(location.locatedAt);
  const accuracy = Number(location.accuracy);
  return {
    name: location.name || "Selected location",
    label: location.label || location.name || "Selected location",
    lat: Number(location.lat),
    lon: Number(location.lon),
    timezone: location.timezone || getBrowserTimezone(),
    source,
    locatedAt: Number.isFinite(locatedAt) ? locatedAt : undefined,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
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
