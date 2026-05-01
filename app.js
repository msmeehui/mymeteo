const AMSTERDAM = {
  lat: 52.3676,
  lon: 4.9041,
  timezone: "Europe/Amsterdam",
};

const elements = {
  app: document.querySelector(".weather-app"),
  refreshButton: document.querySelector("#refreshButton"),
  updatedAt: document.querySelector("#updatedAt"),
  currentTemp: document.querySelector("#currentTemp"),
  conditionLabel: document.querySelector("#conditionLabel"),
  conditionIcon: document.querySelector("#conditionIcon"),
  maxTemp: document.querySelector("#maxTemp"),
  windText: document.querySelector("#windText"),
  windArrow: document.querySelector("#windArrow"),
  rainAmount: document.querySelector("#rainAmount"),
  radarMap: document.querySelector("#radarMap"),
  radarTime: document.querySelector("#radarTime"),
  radarSlider: document.querySelector("#radarSlider"),
  rainForecastBadge: document.querySelector("#rainForecastBadge"),
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

const compassPoints = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const rainForecastStepMinutes = 15;
const rainForecastStepCount = 13;
const rainForecastPoints = createRainForecastPoints();

let map;
let radarLayer;
let rainForecastLayer;
let rainForecastFrames = [];
let forecastBaseTime;
let refreshTimer;

function init() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  initMap();
  bindEvents();
  loadAll();
  refreshTimer = window.setInterval(loadAll, 10 * 60 * 1000);
}

function bindEvents() {
  elements.refreshButton.addEventListener("click", loadAll);
  elements.radarSlider.addEventListener("input", (event) => {
    setRainForecastFrame(Number(event.target.value));
  });
}

async function loadAll() {
  setLoading(true);
  elements.updatedAt.textContent = "Refreshing...";
  await Promise.all([loadWeather(), loadRadar(), loadRainForecast()]);
  setLoading(false);
}

async function loadWeather() {
  const params = new URLSearchParams({
    latitude: AMSTERDAM.lat,
    longitude: AMSTERDAM.lon,
    current: [
      "temperature_2m",
      "is_day",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    daily: ["temperature_2m_max", "precipitation_sum"].join(","),
    forecast_days: "1",
    timezone: AMSTERDAM.timezone,
    timeformat: "unixtime",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
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

async function loadRainForecast() {
  const params = new URLSearchParams({
    latitude: rainForecastPoints.map((point) => point.lat).join(","),
    longitude: rainForecastPoints.map((point) => point.lon).join(","),
    minutely_15: "precipitation",
    forecast_minutely_15: String(rainForecastStepCount),
    timezone: AMSTERDAM.timezone,
    timeformat: "unixtime",
    precipitation_unit: "mm",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) {
      throw new Error(`Open-Meteo rain forecast responded with ${response.status}`);
    }

    const data = await response.json();
    renderRainForecast(Array.isArray(data) ? data : [data]);
  } catch (error) {
    console.error(error);
    disableRainForecast("Rain forecast unavailable");
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
  elements.conditionIcon.dataset.lucide = condition.icon;
  elements.maxTemp.textContent = formatTemperature(daily.temperature_2m_max[0]);
  elements.windText.textContent = `${degreesToCompass(windDirection)} Bft ${beaufort}`;
  elements.windText.title = `${windSpeed} km/h, blowing toward ${degreesToCompass(downwindDirection)}`;
  elements.windArrow.style.transform = `rotate(${downwindDirection}deg)`;
  elements.windArrow.title = `Blowing toward ${degreesToCompass(downwindDirection)}`;
  elements.rainAmount.textContent = `${formatNumber(daily.precipitation_sum[0], 1)} mm`;
  elements.updatedAt.textContent = `Checked ${formatClock(new Date())}`;
  elements.updatedAt.title = `Weather observation ${formatTime(current.time)}`;
  elements.updatedAt.classList.remove("error");

  const mark = document.querySelector(".condition-mark");
  mark.style.background = condition.tone;
  mark.style.color = condition.ink;

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
    center: [AMSTERDAM.lat, AMSTERDAM.lon],
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
    scrollWheelZoom: false,
    tap: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  L.circleMarker([AMSTERDAM.lat, AMSTERDAM.lon], {
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
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!response.ok) {
      throw new Error(`RainViewer responded with ${response.status}`);
    }

    const data = await response.json();
    const past = data.radar?.past || [];
    const frame = past[past.length - 1];

    if (!frame) {
      throw new Error("No radar frames available");
    }

    setRadarFrame({ ...frame, host: data.host });
    refreshMapSize();
  } catch (error) {
    console.error(error);
    elements.radarTime.textContent = "Radar unavailable";
    elements.radarTime.classList.add("error");
  }
}

function refreshMapSize() {
  window.requestAnimationFrame(() => {
    map.invalidateSize({ animate: false, pan: false });
  });
}

function renderRainForecast(locations) {
  if (!locations.length) {
    disableRainForecast("Rain forecast unavailable");
    return;
  }

  forecastBaseTime = locations[0].minutely_15?.time?.[0] ?? Math.floor(Date.now() / 900) * 900;
  rainForecastFrames = Array.from({ length: rainForecastStepCount }, (_, stepIndex) => ({
    offsetMinutes: stepIndex * rainForecastStepMinutes,
    time: locations[0].minutely_15?.time?.[stepIndex],
    points: locations.map((location, pointIndex) => ({
      lat: rainForecastPoints[pointIndex]?.lat ?? location.latitude,
      lon: rainForecastPoints[pointIndex]?.lon ?? location.longitude,
      precipitation: location.minutely_15?.precipitation?.[stepIndex] ?? 0,
    })),
  }));

  if (!rainForecastFrames.length) {
    disableRainForecast("Rain forecast unavailable");
    return;
  }

  const previousIndex = Number(elements.radarSlider.value) || 0;
  const selectedIndex = Math.min(previousIndex, rainForecastFrames.length - 1);

  elements.radarSlider.disabled = false;
  elements.radarSlider.min = "0";
  elements.radarSlider.max = String(rainForecastStepCount - 1);
  elements.radarSlider.value = String(selectedIndex);
  setRainForecastFrame(selectedIndex);
}

function disableRainForecast(message) {
  rainForecastFrames = [];
  elements.radarSlider.disabled = true;
  elements.radarSlider.max = "0";
  elements.radarSlider.value = "0";
  elements.radarTime.textContent = message;
  elements.rainForecastBadge.textContent = message;
  elements.radarSlider.removeAttribute("aria-valuetext");
  elements.radarTime.classList.add("error");
}

function setRainForecastFrame(index) {
  const frame = rainForecastFrames[index];
  if (!frame) {
    return;
  }

  if (rainForecastLayer) {
    map.removeLayer(rainForecastLayer);
  }

  const label = formatForecastLabel(frame.offsetMinutes);
  const clockLabel = formatForecastClock(frame);
  const wetPoints = frame.points.filter((point) => point.precipitation > 0);

  rainForecastLayer = L.layerGroup(
    wetPoints.map((point) => {
      const intensity = getRainIntensity(point.precipitation);

      return L.circle([point.lat, point.lon], {
        radius: intensity.radius,
        stroke: true,
        color: intensity.color,
        weight: 1,
        opacity: intensity.opacity,
        fillColor: intensity.color,
        fillOpacity: intensity.fillOpacity,
      });
    }),
  ).addTo(map);

  elements.radarTime.textContent = clockLabel;
  elements.rainForecastBadge.textContent = clockLabel;
  elements.radarSlider.setAttribute("aria-valuetext", `${clockLabel}, ${label}`);
  elements.radarTime.classList.remove("error");
}

function setRadarFrame(frame) {
  if (!frame) {
    return;
  }

  if (radarLayer) {
    map.removeLayer(radarLayer);
  }

  radarLayer = L.tileLayer(`${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
    tileSize: 256,
    opacity: 0.72,
    maxNativeZoom: 7,
    maxZoom: 11,
    attribution: '<a href="https://www.rainviewer.com/api.html">RainViewer</a>',
  }).addTo(map);

  radarLayer.setZIndex(20);
  elements.radarTime.textContent = formatUnixTime(frame.time);
  elements.radarTime.classList.remove("error");
}

function setLoading(isLoading) {
  elements.app.classList.toggle("is-loading", isLoading);
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.title = isLoading ? "Refreshing weather and radar data" : "Refresh weather and radar data";
}

function formatTemperature(value) {
  return `${Math.round(value)}°`;
}

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits,
  }).format(value);
}

function formatTime(value) {
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);

  return formatClock(date);
}

function formatClock(date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: AMSTERDAM.timezone,
  }).format(date);
}

function formatUnixTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: AMSTERDAM.timezone,
  }).format(new Date(value * 1000));
}

function formatForecastLabel(offsetMinutes) {
  if (offsetMinutes === 0) {
    return "Now";
  }

  if (offsetMinutes < 60) {
    return `+${offsetMinutes} min`;
  }

  const hours = Math.floor(offsetMinutes / 60);
  const minutes = offsetMinutes % 60;

  return minutes ? `+${hours}h ${minutes}` : `+${hours}h`;
}

function formatForecastClock(frame) {
  const unixTime = frame.time ?? forecastBaseTime + frame.offsetMinutes * 60;
  return formatClock(new Date(unixTime * 1000));
}

function degreesToCompass(degrees) {
  const index = Math.round(degrees / 22.5) % compassPoints.length;
  return compassPoints[index];
}

function kmhToBeaufort(kmh) {
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const beaufort = thresholds.findIndex((threshold) => kmh < threshold);
  return beaufort === -1 ? 12 : beaufort;
}

function getRainIntensity(amount) {
  if (amount < 0.5) {
    return { color: "#2f7f9f", radius: 24000, opacity: 0.7, fillOpacity: 0.16 };
  }

  if (amount < 2) {
    return { color: "#286ca3", radius: 32000, opacity: 0.78, fillOpacity: 0.24 };
  }

  return { color: "#7b4ca0", radius: 42000, opacity: 0.88, fillOpacity: 0.32 };
}

function createRainForecastPoints() {
  const latitudes = [50.9, 51.4, 51.9, 52.4, 52.9, 53.4, 53.9];
  const longitudes = [2.8, 3.5, 4.2, 4.9, 5.6, 6.3, 7.0];

  return latitudes.flatMap((lat) => longitudes.map((lon) => ({ lat, lon })));
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("beforeunload", () => window.clearInterval(refreshTimer));
