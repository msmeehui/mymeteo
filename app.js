const DEFAULT_LOCATION = {
  name: "Amsterdam",
  label: "Amsterdam, North Holland, Netherlands",
  lat: 52.3676,
  lon: 4.9041,
  timezone: "Europe/Amsterdam",
};

const storedLocationKey = "mymeteo.location";
const libreWxrRadarUrl = "https://api.librewxr.net/public/weather-maps.json";
const libreWxrRadarTimeoutMs = 6000;
const weatherForecastTimeoutMs = 10000;
const buienradarAnimationBaseUrl = "https://image.buienradar.nl/2.0/image/animation";
const buienradarPointRainBaseUrl = "https://gps.buienradar.nl/getrr.php";
const knmiWmsBaseUrl = window.location.origin && window.location.origin !== "null"
  ? `${window.location.origin}/api/knmi-wms.php`
  : "api/knmi-wms.php";
const gifDecoderModuleUrl = "https://esm.sh/gifuct-js@2.1.2?bundle";
const weatherIconBasePath = "assets/weather-icons-mymeteo/";
const outfitSceneBackgroundBasePath = "assets/outfit-scenes/v2/backgrounds/";
const outfitSceneCharacterBasePath = "assets/outfit-scenes/v2/characters/";
const outfitSceneAssetVersion = "20260826-01";
// Replace these files and bump this version when updating the Easter egg video.
const easterEggAssetVersion = "20260609-04";
const easterEggDanceVideo = {
  src: "assets/easter-eggs/marc-dancing-rain.mp4",
  poster: "assets/easter-eggs/marc-dancing-rain-poster.jpg",
};
const queryParams = new URLSearchParams(window.location.search);
const outfitDebugQueryParam = "debugOutfit";
const outfitSceneOverrideQueryParam = "outfitState";
const outfitTimeOverrideQueryParam = "outfitTime";
const rainDebugQueryParam = "debugRain";
const radarTimingDebugQueryParam = "debugRadar";
const rainSourceQueryParam = "rainSource";
const rainSourceCompareQueryValue = "compare";
const isOutfitDebugEnabled = queryParams.get(outfitDebugQueryParam) === "1";
const isRainDebugEnabled = queryParams.get(rainDebugQueryParam) === "1";
const isRadarTimingDebugEnabled = queryParams.get(radarTimingDebugQueryParam) === "1";
const isRainSourceCompareEnabled = queryParams.get(rainSourceQueryParam) === rainSourceCompareQueryValue;
const outfitScenePreloadInitialDelayMs = 1200;
const outfitScenePreloadStepDelayMs = 700;
const outfitScenePreloadIdleTimeoutMs = 1500;
const buienradarRadarCacheMaxAgeMs = 9 * 60 * 1000;
const buienradarRadarTimeoutMs = 10 * 1000;
const buienradarRadarReadyTimeoutMs = 20 * 1000;
const buienradarPointRainCacheMaxAgeMs = 4 * 60 * 1000;
const buienradarPointRainTimeoutMs = 3500;
const knmiRadarCacheMaxAgeMs = 4 * 60 * 1000;
const knmiPointRainCacheMaxAgeMs = 4 * 60 * 1000;
const knmiRadarMetadataTimeoutMs = 6000;
const knmiRadarImageLoadTimeoutMs = 8000;
const knmiRadarFramePreloadDelayMs = 45;
const knmiPreferredRadarWaitMs = 1500;
const knmiPointRainTimeoutMs = 5000;
const knmiPointRainConcurrentRequests = 2;
const knmiPointRainInitialSampleCount = 2;
const knmiPointRainRenderDelayMs = 150;
const knmiRadarDelayedThresholdMinutes = 15;
const radarNowPastToleranceMinutes = 10;
const radarNowFutureToleranceMinutes = 5;
const stormMinutelySampleCount = 12;
const currentLocationSource = "current";
const currentLocationRefreshCooldownMs = 60 * 1000;
const compactLocationLabelMediaQuery = "(max-width: 480px)";
const desktopLayoutMediaQuery = "(min-width: 900px)";
const reverseGeocodingTimeoutMs = 5 * 1000;
const analyticsHostnames = new Set(["mymeteo.nl", "www.mymeteo.nl"]);
const radarTimingHistoryLimit = 20;
const buienradarBounds = [
  [48.92249926375824, 0],
  [55.77657301866769, 11.25],
];
const webMercatorEarthRadiusMeters = 6378137;
const webMercatorMaxLatitude = 85.0511287798066;
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
const knmiRadarConfig = {
  dataset: "radar_forecast_2.0",
  layer: "precipitation_nowcast",
  mapCrs: "EPSG:3857",
  pointCrs: "EPSG:4326",
  style: "radar/nearest",
  modeId: "knmi-2h",
  frameMinutes: 5,
  maxLookaheadHours: 2,
  width: 700,
  height: 765,
  timeline: {
    frameDurationMs: 1000,
  },
};
const rainSourceModes = new Set(["current", "knmi", "compare"]);

const elements = {
  app: document.querySelector(".weather-app"),
  locationForm: document.querySelector("#locationForm"),
  locationInput: document.querySelector("#locationInput"),
  locationOptions: document.querySelector("#locationOptions"),
  locateButton: document.querySelector("#locateButton"),
  brandButton: document.querySelector("#brandButton"),
  refreshButton: document.querySelector("#refreshButton"),
  updatedAt: document.querySelector("#updatedAt"),
  nowPanel: document.querySelector("#radarWeatherCard"),
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
  iconLegend: document.querySelector("#iconLegend"),
  legendSection: document.querySelector("#legendSection"),
  outfitLegend: document.querySelector("#outfitLegend"),
  radarPanel: document.querySelector(".radar-panel"),
  radarMap: document.querySelector("#radarMap"),
  radarMapStatus: document.querySelector("#radarMapStatus"),
  radarTime: document.querySelector("#radarTime"),
  radarSlider: document.querySelector("#radarSlider"),
  precipitationTimeline: document.querySelector("#precipitationTimeline"),
  precipitationTimelineChart: document.querySelector(".precipitation-timeline-chart"),
  precipitationTimelineArea: document.querySelector("#precipitationTimelineArea"),
  precipitationTimelineMarker: document.querySelector("#precipitationTimelineMarker"),
  rainSourceDebugPanel: document.querySelector("#rainSourceDebugPanel"),
  rainSourceDebugGrid: document.querySelector("#rainSourceDebugGrid"),
  rainSourceModeButtons: [...document.querySelectorAll("[data-rain-source-mode]")],
  outfitModeToggle: document.querySelector("#outfitModeToggle"),
  outfitScene: document.querySelector("#outfitScene"),
  outfitSceneBackground: document.querySelector("#outfitSceneBackground"),
  outfitSceneCharacter: document.querySelector("#outfitSceneCharacter"),
  outfitDebugBadge: document.querySelector("#outfitDebugBadge"),
  easterEggScene: document.querySelector("#easterEggScene"),
  easterEggVideo: document.querySelector("#easterEggVideo"),
  easterEggFallback: document.querySelector("#easterEggFallback"),
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

const weatherIconLegendGroups = [
  {
    title: "Clear and Cloudy",
    items: [
      {
        label: "Clear sky",
        icons: ["clear-day", "clear-night"],
        description: "Sunny by day or clear overnight with little to no cloud cover.",
      },
      {
        label: "Mostly clear",
        icons: ["mostly-clear-day", "mostly-clear-night"],
        description: "Mostly bright or clear, with only a few clouds around.",
      },
      {
        label: "Partly cloudy",
        icons: ["partly-cloudy-day", "partly-cloudy-night"],
        description: "A mix of cloud and open sky.",
      },
      {
        label: "Overcast",
        icons: ["overcast-day", "overcast-night"],
        description: "Cloud cover dominates the sky.",
      },
    ],
  },
  {
    title: "Fog",
    items: [
      {
        label: "Fog",
        icons: ["fog-day", "fog-night"],
        description: "Fog, mist, or icy rime fog reducing visibility.",
      },
    ],
  },
  {
    title: "Rain",
    items: [
      {
        label: "Drizzle",
        icons: ["drizzle"],
        description: "Light, fine rain.",
      },
      {
        label: "Rain",
        icons: ["rain"],
        description: "Steady light or moderate rain.",
      },
      {
        label: "Heavy rain",
        icons: ["overcast-rain"],
        description: "Heavier rain from a cloudy sky.",
      },
      {
        label: "Freezing rain or sleet",
        icons: ["overcast-sleet"],
        description: "Cold precipitation that may freeze or fall mixed with ice.",
      },
      {
        label: "Showers",
        icons: ["partly-cloudy-day-rain", "partly-cloudy-night-rain"],
        description: "Intermittent rain showers.",
      },
    ],
  },
  {
    title: "Winter",
    items: [
      {
        label: "Snow",
        icons: ["snow"],
        description: "Light, moderate, or heavy snowfall.",
      },
      {
        label: "Snow grains",
        icons: ["snowflake"],
        description: "Very small snow or ice grains.",
      },
      {
        label: "Snow showers",
        icons: ["partly-cloudy-day-snow", "partly-cloudy-night-snow"],
        description: "Intermittent snow showers.",
      },
    ],
  },
  {
    title: "Storms",
    items: [
      {
        label: "Thunderstorm",
        icons: ["thunderstorms-day-rain", "thunderstorms-night-rain"],
        description: "Thunderstorms with rain.",
      },
      {
        label: "Storm with hail",
        icons: ["thunderstorms-day-hail", "thunderstorms-night-hail"],
        description: "Thunderstorms that may include hail.",
      },
    ],
  },
];

const outfitScenes = {
  "hot-sunny": {
    background: "hot-sunny.webp",
    nightBackground: "hot-sunny-night.webp",
    character: "hot-sunny.webp",
    nightCharacter: "hot-sunny-night.webp",
    label: "Hot-weather outfit",
    alt: "Suggested outfit for hot weather: shorts, T-shirt, sandals, and water bottle.",
    characterMaxWidth: "70%",
    characterMaxWidthWide: "62%",
    legendCharacterBottom: "-2px",
  },
  "warm-fair": {
    background: "warm-fair.webp",
    nightBackground: "warm-fair-night.webp",
    character: "warm-fair.webp",
    label: "Warm fair-weather outfit",
    alt: "Suggested outfit for warm dry weather: light shirt, light linen trousers, casual shoes, and a relaxed walking pose.",
    characterMaxWidth: "70%",
    characterMaxWidthWide: "62%",
  },
  "mild-cloudy": {
    background: "mild-cloudy.webp",
    nightBackground: "mild-cloudy-night.webp",
    character: "mild-cloudy.webp",
    label: "Mild cloudy outfit",
    alt: "Suggested outfit for mild cloudy weather: long trousers, a light jumper, and a relaxed hands-in-pockets stroll.",
    characterMaxWidth: "70%",
    characterMaxWidthWide: "62%",
  },
  "cool-dry": {
    background: "cool-dry.webp",
    nightBackground: "cool-dry-night.webp",
    character: "cool-dry.webp",
    label: "Cool dry outfit",
    alt: "Suggested outfit for cool dry weather: long trousers, sweater, light jacket, and a relaxed half-turn stroll.",
    characterMaxWidth: "72%",
    characterMaxWidthWide: "64%",
  },
  "cold-dry": {
    background: "cold-dry.webp",
    nightBackground: "cold-dry-night.webp",
    character: "cold-dry.webp",
    label: "Cold dry outfit",
    alt: "Suggested outfit for cold dry weather: warm coat, scarf, long trousers, and closed shoes.",
    characterMaxWidth: "74%",
    characterMaxWidthWide: "66%",
    legendCharacterBottom: "-2px",
  },
  "freezing-dry": {
    background: "freezing-dry.webp",
    nightBackground: "freezing-dry-night.webp",
    character: "freezing-dry.webp",
    label: "Freezing dry outfit",
    alt: "Suggested outfit for freezing dry weather: thick coat, scarf, gloves, beanie, and warm shoes.",
    characterMaxWidth: "76%",
    characterMaxWidthWide: "68%",
    legendCharacterBottom: "-2px",
  },
  fog: {
    background: "fog.webp",
    nightBackground: "fog-night.webp",
    character: "fog.webp",
    label: "Fog outfit",
    alt: "Suggested outfit for fog: long trousers, closed shoes, and a light jacket.",
    characterMaxWidth: "70%",
    characterMaxWidthWide: "62%",
    legendCharacterBottom: "-2px",
  },
  drizzle: {
    background: "drizzle.webp",
    character: "drizzle.webp",
    label: "Drizzle outfit",
    alt: "Suggested outfit for drizzle: long trousers, closed shoes, light rain jacket, and a palm-up drizzle check.",
    characterMaxWidth: "76%",
    characterMaxWidthWide: "66%",
  },
  "warm-drizzle": {
    background: "drizzle.webp",
    character: "warm-drizzle.webp",
    label: "Warm drizzle outfit",
    alt: "Suggested outfit for warm drizzle: T-shirt, shorts, sandals, and umbrella.",
    characterMaxWidth: "86%",
    characterMaxWidthMobile: "98%",
    characterMaxWidthWide: "76%",
  },
  rain: {
    background: "rain.webp",
    character: "rain.webp",
    label: "Rain outfit",
    alt: "Suggested outfit for rain: waterproof jacket, umbrella, long trousers, and closed shoes.",
    characterMaxWidth: "86%",
    characterMaxWidthMobile: "98%",
    characterMaxWidthWide: "76%",
    legendCharacterBottom: "-2px",
  },
  "warm-rain": {
    background: "rain.webp",
    character: "warm-rain.webp",
    label: "Warm rain outfit",
    alt: "Suggested outfit for warm rain: T-shirt, shorts, sandals, red umbrella, and a light rainy-day strut.",
    characterMaxWidth: "86%",
    characterMaxWidthMobile: "98%",
    characterMaxWidthWide: "76%",
    legendCharacterBottom: "-2px",
  },
  "heavy-rain": {
    background: "heavy-rain.webp",
    character: "heavy-rain.webp",
    label: "Heavy rain outfit",
    alt: "Suggested outfit for heavy rain: waterproof jacket, rain pants, sturdy shoes, and a two-hand umbrella grip.",
    characterMaxWidth: "86%",
    characterMaxWidthMobile: "98%",
    characterMaxWidthWide: "76%",
    legendCharacterBottom: "-2px",
  },
  "warm-heavy-rain": {
    background: "heavy-rain.webp",
    character: "warm-heavy-rain.webp",
    label: "Warm heavy-rain outfit",
    alt: "Suggested outfit for warm heavy rain: T-shirt, shorts, sandals, light poncho, and umbrella.",
    characterMaxWidth: "90%",
    characterMaxWidthMobile: "100%",
    characterMaxWidthWide: "80%",
  },
  snow: {
    background: "snow.webp",
    nightBackground: "snow-night.webp",
    character: "snow.webp",
    label: "Snow outfit",
    alt: "Suggested outfit for snow: winter coat, scarf, gloves, beanie, and boots.",
    characterMaxWidth: "72%",
    characterMaxWidthWide: "62%",
    legendCharacterBottom: "-2px",
  },
  "heavy-snow": {
    background: "heavy-snow.webp",
    nightBackground: "heavy-snow-night.webp",
    character: "heavy-snow.webp",
    label: "Heavy snow outfit",
    alt: "Suggested outfit for heavy snow: thick winter coat, scarf, gloves, beanie, and winter boots.",
    characterMaxWidth: "76%",
    characterMaxWidthWide: "68%",
  },
  thunderstorm: {
    background: "thunderstorm.webp",
    character: "thunderstorm.webp",
    label: "Thunderstorm outfit",
    alt: "Suggested outfit for a thunderstorm: hooded waterproof jacket, long trousers, and sturdy shoes.",
    backgroundPositionMobile: "18% center",
    characterMaxWidth: "76%",
    characterMaxWidthWide: "66%",
  },
  windy: {
    background: "windy.webp",
    nightBackground: "windy-night.webp",
    character: "windy.webp",
    label: "Windy outfit",
    alt: "Suggested outfit for windy weather: windbreaker, scarf, long trousers, closed shoes, and a braced leaning pose.",
    characterMaxWidth: "84%",
    characterMaxWidthMobile: "96%",
    characterMaxWidthWide: "72%",
    characterX: "48%",
  },
};

const outfitDefaultSceneId = "mild-cloudy";
const outfitSceneIds = Object.keys(outfitScenes);
function buildOutfitSceneAssetUrl(basePath, fileName) {
  return `${basePath}${fileName}?v=${outfitSceneAssetVersion}`;
}

const outfitLegendGroups = [
  {
    title: "Dry Temperature",
    items: [
      { sceneId: "hot-sunny", label: "Hot weather", description: "Shorts, T-shirt, sandals, and water bottle." },
      { sceneId: "warm-fair", label: "Warm fair", description: "Light shirt, light linen trousers, and casual shoes." },
      { sceneId: "mild-cloudy", label: "Mild cloudy", description: "Long trousers and a light jumper." },
      { sceneId: "cool-dry", label: "Cool dry", description: "Long trousers, sweater, and light jacket." },
      { sceneId: "cold-dry", label: "Cold dry", description: "Warm coat, scarf, long trousers, and closed shoes." },
      { sceneId: "freezing-dry", label: "Freezing dry", description: "Thick coat, scarf, gloves, beanie, and warm shoes." },
    ],
  },
  {
    title: "Warm Rain",
    items: [
      { sceneId: "warm-drizzle", label: "Warm drizzle", description: "T-shirt, shorts, sandals, and umbrella." },
      { sceneId: "warm-rain", label: "Warm rain", description: "T-shirt, shorts, sandals, and umbrella." },
      { sceneId: "warm-heavy-rain", label: "Warm heavy rain", description: "T-shirt, shorts, sandals, light poncho, and umbrella." },
    ],
  },
  {
    title: "Rain and Storms",
    items: [
      { sceneId: "drizzle", label: "Drizzle", description: "Long trousers, closed shoes, and a light rain jacket." },
      { sceneId: "rain", label: "Rain", description: "Waterproof jacket, umbrella, long trousers, and closed shoes." },
      { sceneId: "heavy-rain", label: "Heavy rain", description: "Waterproof jacket, rain pants, sturdy shoes, and a two-hand umbrella grip." },
      { sceneId: "thunderstorm", label: "Thunderstorm", description: "Hooded waterproof jacket, long trousers, and sturdy shoes." },
    ],
  },
  {
    title: "Snow and Winter",
    items: [
      { sceneId: "snow", label: "Snow", description: "Winter coat, scarf, gloves, beanie, and boots." },
      { sceneId: "heavy-snow", label: "Heavy snow", description: "Thick winter coat, scarf, gloves, beanie, and winter boots." },
    ],
  },
  {
    title: "Visibility and Wind",
    items: [
      { sceneId: "fog", label: "Fog", description: "Long trousers, closed shoes, and a light jacket." },
      { sceneId: "windy", label: "Windy", description: "Windbreaker, scarf, long trousers, and closed shoes." },
    ],
  },
];
const outfitTemperatureStates = [
  { id: "freezing-dry", min: -Infinity, max: 0 },
  { id: "cold-dry", min: 1, max: 7 },
  { id: "cool-dry", min: 8, max: 13 },
  { id: "mild-cloudy", min: 14, max: 19 },
  { id: "warm-fair", min: 20, max: 25 },
  { id: "hot-sunny", min: 26, max: Infinity },
];
const outfitThunderstormCodes = new Set([95, 96, 99]);
const outfitHeavySnowCodes = new Set([75, 86]);
const outfitSnowCodes = new Set([71, 73, 77, 85]);
const outfitHeavyRainCodes = new Set([65, 82]);
const outfitFreezingRainCodes = new Set([56, 57, 66, 67]);
const outfitRainCodes = new Set([61, 63, 80, 81]);
const outfitDrizzleCodes = new Set([51, 53, 55]);
const outfitFogCodes = new Set([45, 48]);
const outfitWindEnterKmh = 39;
const outfitWindLeaveKmh = 35;
const outfitPrecipitationEnterChance = 50;
const outfitPrecipitationLeaveChance = 40;
const outfitLightPrecipitationEnterChance = 30;
const outfitLightPrecipitationLeaveChance = 20;
const outfitTemperatureHysteresisC = 1;
const outfitWarmWetEnterTemperatureC = 24;
const outfitWarmWetLeaveTemperatureC = 22;

const snowWeatherCodes = new Set([71, 73, 75, 77, 85, 86]);
const thunderstormWeatherCodes = new Set([95, 96, 99]);
const precipitationWeatherCodes = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
// Near-even rain/snow totals should read as snow in the compact label.
const snowCloseSplitRatio = 0.85;
const meaningfulPrecipitationChanceThreshold = 5;
const precipitationChanceDisplayStep = 5;
const precipitationIntensityChanceThreshold = precipitationChanceDisplayStep;
const precipitationIntensityThresholds = {
  rain: { moderate: 1, heavy: 4 },
  snow: { moderate: 0.5, heavy: 2 },
};
const precipitationTimelineSampleIntervalMinutes = 5;
const precipitationTimelineMaxSampleCount = 97;
const precipitationTimelineSvgWidth = 100;
const precipitationTimelineBaselineY = 60;
const precipitationTimelineHeavyLineY = 10;
const precipitationTimelineHeavyLevel = 0.85;
const precipitationTimelinePeakY = precipitationTimelineBaselineY
  - ((precipitationTimelineBaselineY - precipitationTimelineHeavyLineY) / precipitationTimelineHeavyLevel);
const precipitationConditionChanceThreshold = 50;
const stormRainChanceThreshold = 70;
const stormCapeThreshold = 900;
const stormLightningPotentialThreshold = 1;
const buienradarBlendMaxLookaheadHours = 8;
const buienradarBlendFullWeightHours = 3;
const buienradarBlendMinimumWeight = 0.25;
const buienradarBlendFullWeight = 0.85;
const buienradarDrySignalThreshold = 0.02;
const buienradarRepresentativePeakWeight = 0.15;
const buienradarHourlyCoverageChanceBoost = 15;
const buienradarPointRainMaxLookaheadHours = 2;
const buienradarPointRainBlendWeight = 0.95;
const buienradarPointRainCurrentWindowMinutes = 30;
const buienradarPointRainHourlyLookbackMinutes = 0;
const buienradarPointRainHourlyWindowMinutes = 60;
const buienradarModerateFrameRatioThreshold = 0.35;
const buienradarHeavyFrameRatioThreshold = 0.4;
const buienradarSampleNearbyRadiusPx = 12;
const buienradarSampleAlphaThreshold = 18;
const knmiSampleAlphaThreshold = 18;
const buienradarHourlyLookbackMinutes = 10;
const buienradarHourlyWindowMinutes = 30;
const freezingTemperatureThreshold = 0;
const compassPoints = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

let map;
let isMapUnavailable = false;
let libreWxrRadarLayers = new Map();
let buienradarLayer;
let buienradarLayerKey;
let buienradarNextLayer;
let buienradarNextLayerKey;
let buienradarFrameUrls = [];
let buienradarRadarCache = new Map();
let buienradarRadarRequests = new Map();
let buienradarPointRainCache = new Map();
let buienradarPointRainRequests = new Map();
let buienradarRainSamples = new Map();
let buienradarRainSampleRuns = new Map();
let buienradarCommittedFrameUrls = [];
let buienradarCommittedModeId = buienradarDefaultRadarModeId;
let buienradarCommittedRainSamples;
let buienradarCommittedRainSampleRun;
let buienradarRetainedFrameUrlsToRevoke = new Set();
let rainDebugEntries = [];
let radarTimingHistory = [];
let buienradarStartDate;
let buienradarTimeline = buienradarDefaultTimeline;
let buienradarDisplayRequestId = 0;
let buienradarFrameRenderRequestId = 0;
let knmiRadarCache;
let knmiRadarRequest;
let knmiRadarMetadataCache;
let knmiRadarMetadataRequest;
let knmiPointRainCache = new Map();
let knmiPointRainRequests = new Map();
let knmiPointRainErrors = new Map();
let knmiPointRainRenderTimer;
let knmiLayer;
let knmiLayerKey;
let knmiNextLayer;
let knmiNextLayerKey;
let knmiFrameUrls = [];
let knmiLoadedFrameUrls = new Set();
let knmiFramePreloadRequests = new Map();
let knmiFrameDates = [];
let knmiStartDate;
let knmiReferenceDate;
let knmiRainSamples;
let knmiRainSampleRun;
let knmiCommittedFrameUrls = [];
let knmiCommittedRainSampleRun;
let knmiDisplayRequestId = 0;
let knmiFrameRenderRequestId = 0;
let hybridRadarStartDate;
let hybridRadarEndDate;
let hybridRadarKnmiEndDate;
let displayedRadarSource = "none";
let committedRadarSource = "none";
let committedRadarSliderMin = 0;
let radarDisplayReplacement;
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
let locationSearchRequestId = 0;
let locationSearchResultSetId = 0;
let activeLocationOptionIndex = -1;
let areLocationOptionsDismissed = false;
let isLocationInputComposing = false;
let sliderTimestampTimer;
let precipitationTimelineRange;
let precipitationTimelineSamples = [];
let hourlyForecastLayoutFrame;
let buienradarPreloadTimer;
let weatherData;
let weatherDataLocationKey;
let weatherDataLoadRequestId;
let activeRadarDate;
let activeMobileView = "rain";
let activeRainSourceMode = isRainSourceCompareEnabled ? "compare" : "current";
let isOutfitMode = false;
let activeOutfitSceneId;
let activeOutfitSceneVisualKey;
let isOutfitLegendRendered = false;
let preloadedOutfitSceneIds = new Set();
let outfitScenePreloadQueue = [];
let outfitScenePreloadTimer;
let outfitScenePreloadIdleHandle;
const outfitScenePreloadImages = new Map();
let isEasterEggActive = false;
let easterEggVideoSrcLoaded = false;
let shouldCenterMapWhenShown = false;
let expandedForecastDayKey;
let selectedLocation = loadStoredLocation() || DEFAULT_LOCATION;
let currentLocationRefreshState = isCurrentLocation(selectedLocation) ? "stale" : "idle";
let currentLocationRefreshPromise;
let locationIntentId = 0;
let currentLocationRequestId = 0;
let currentLocationStatusOwner;
let lastCurrentLocationRefreshAttemptAt = 0;
let statusMessage = elements.updatedAt.textContent || "Loading forecast...";
let statusTitle = elements.updatedAt.title || "";
let statusIsError = elements.updatedAt.classList.contains("error");
let statusMessageRevision = 0;
let refreshTimer;
let radarSliderWasAtStart = true;
let dataLoadRequestId = 0;
let activeForecastAbortController;
let radarLoadRequestId = 0;

function init() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  renderWeatherIconLegend();
  renderLocation();
  initRainSourceCompareMode();
  initMap();
  bindEvents();
  bindLegendTabs();
  syncForecastViewForViewport();
  hydrateStoredCurrentLocationName();
  loadInitialWeather();
  refreshTimer = window.setInterval(() => {
    loadAll({ radarTrigger: "automatic_refresh" });
  }, 10 * 60 * 1000);
}

function bindEvents() {
  elements.locationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isLocationInputComposing) {
      return;
    }
    selectTypedLocation();
  });
  elements.locationInput.addEventListener("input", handleLocationInput);
  elements.locationInput.addEventListener("compositionstart", () => {
    isLocationInputComposing = true;
  });
  elements.locationInput.addEventListener("compositionend", () => {
    isLocationInputComposing = false;
    handleLocationInput();
  });
  elements.locationInput.addEventListener("focus", () => {
    selectLocationInputText();
    if (locationSearchResults.length) {
      areLocationOptionsDismissed = false;
      activeLocationOptionIndex = 0;
      renderLocationOptions();
    }
  });
  elements.locationInput.addEventListener("keydown", handleLocationInputKeydown);
  document.addEventListener("click", (event) => {
    if (!elements.locationForm.contains(event.target)) {
      hideLocationOptions();
    }
  });
  elements.locateButton.addEventListener("click", () => {
    hideLocationOptions();
    useCurrentLocation();
  });
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
    loadAll({ radarTrigger: "manual_refresh" });
  });
  elements.outfitModeToggle.addEventListener("click", toggleOutfitMode);
  bindEasterEggEvents();
  elements.rainTab.addEventListener("click", () => {
    trackAnalyticsEvent("rain_tab");
    setMobileView("rain");
  });
  elements.forecastTab.addEventListener("click", () => {
    trackAnalyticsEvent("forecast_tab");
    setMobileView("forecast");
  });
  const weatherTabs = [elements.rainTab, elements.forecastTab];
  weatherTabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!direction) {
        return;
      }

      event.preventDefault();
      const nextTab = weatherTabs[(index + direction + weatherTabs.length) % weatherTabs.length];
      nextTab.focus();
      nextTab.click();
    });
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
  elements.rainSourceModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setRainSourceMode(button.dataset.rainSourceMode);
    });
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

function initRainSourceCompareMode() {
  if (!isRainSourceCompareEnabled) {
    return;
  }

  elements.rainSourceDebugPanel.hidden = false;
  syncRainSourceModeControls();
  renderRainSourceDebugPanel();
}

function setRainSourceMode(mode) {
  if (!isRainSourceCompareEnabled || !rainSourceModes.has(mode)) {
    return;
  }

  if (activeRainSourceMode === mode) {
    return;
  }

  activeRainSourceMode = mode;
  syncRainSourceModeControls();
  trackAnalyticsEvent(`rain_source_${mode}`);
  renderWeatherForRadarBlend();
  loadRadar({ trigger: "source_mode" });
}

function syncRainSourceModeControls() {
  if (!isRainSourceCompareEnabled) {
    return;
  }

  elements.rainSourceModeButtons.forEach((button) => {
    const isActive = button.dataset.rainSourceMode === activeRainSourceMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function shouldEnableAnalytics() {
  return analyticsHostnames.has(window.location.hostname.toLowerCase());
}

function trackAnalyticsEvent(eventName, metadata) {
  if (!shouldEnableAnalytics()) {
    return;
  }

  if (typeof window.sa_event === "function") {
    if (metadata) {
      window.sa_event(eventName, metadata);
    } else {
      window.sa_event(eventName);
    }
  }
}

function getRadarTimingNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function createRadarTimingSession() {
  return {
    durations: {},
    marks: {},
    paths: {},
    reported: false,
    statuses: {},
    startedAt: getRadarTimingNow(),
  };
}

function markRadarTiming(timing, key) {
  if (!timing || Number.isFinite(timing.marks[key])) {
    return;
  }

  timing.marks[key] = Math.max(getRadarTimingNow() - timing.startedAt, 0);
}

function markRadarTimingDuration(timing, key, startedAt) {
  if (!timing || Number.isFinite(timing.durations[key]) || !Number.isFinite(startedAt)) {
    return;
  }

  timing.durations[key] = Math.max(getRadarTimingNow() - startedAt, 0);
}

function setRadarTimingPath(timing, source, path) {
  if (!timing || timing.paths[source]) {
    return;
  }

  timing.paths[source] = path;
}

function setRadarTimingStatus(timing, source, status) {
  if (!timing || timing.statuses[source]) {
    return;
  }

  timing.statuses[source] = status;
}

function markFirstUsableRadar(context, source, { isFresh = true } = {}) {
  const timing = context?.radarTiming;
  if (!timing) {
    return;
  }

  if (!Number.isFinite(timing.marks.first_usable_ms)) {
    markRadarTiming(timing, "first_usable_ms");
    timing.firstSource = source;
  }

  if (isFresh) {
    markRadarTiming(timing, "first_fresh_ms");
  }
}

function markRetainedRadarUsable(context) {
  const timing = context?.radarTiming;
  if (!timing) {
    return;
  }

  timing.marks.first_usable_ms = 0;
  timing.firstSource = "retained";
}

function quantizeRadarTiming(value) {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return value > 0 ? clampNumber(Math.ceil(value / 100) * 100, 100, 60 * 1000) : undefined;
}

function reportRadarTiming(context, outcome) {
  const timing = context?.radarTiming;
  if (!timing || timing.reported || !isRadarLoadContextCurrent(context)) {
    return;
  }

  timing.reported = true;
  const metadata = {
    first_source: timing.firstSource || "none",
    outcome,
    radar_mode: context.radarModeId,
    trigger: context.trigger,
  };
  if (timing.firstSource === "retained") {
    metadata.retained_visible = true;
  }

  Object.entries({ ...timing.durations, ...timing.marks }).forEach(([key, value]) => {
    const quantizedValue = quantizeRadarTiming(value);
    if (Number.isFinite(quantizedValue)) {
      metadata[key] = quantizedValue;
    }
  });
  Object.entries(timing.paths).forEach(([source, path]) => {
    metadata[`${source}_path`] = path;
  });
  Object.entries(timing.statuses).forEach(([source, status]) => {
    metadata[`${source}_status`] = status;
  });

  radarTimingHistory.push(metadata);
  if (radarTimingHistory.length > radarTimingHistoryLimit) {
    radarTimingHistory = radarTimingHistory.slice(-radarTimingHistoryLimit);
  }
  window.mymeteoRadarTimings = radarTimingHistory;

  if (isRadarTimingDebugEnabled) {
    console.debug("MyMeteo radar timing", metadata);
  }
  trackAnalyticsEvent("radar_load_timing", metadata);
}

function renderLocation() {
  const displayName = getLocationDisplayName(selectedLocation);
  elements.locationInput.value = displayName;
  elements.locationInput.title = getLocationTitle(selectedLocation);
  updateLocateButtonLabel();
  resizeLocationInput(displayName);
  renderStatusLine();
  document.title = "MyMeteo";
}

function updateLocateButtonLabel() {
  const label = getLocateButtonLabel();
  elements.locateButton.setAttribute("aria-label", label);
  elements.locateButton.title = label;
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
  statusMessageRevision += 1;
  statusMessage = message;
  statusTitle = title;
  statusIsError = isError;
  renderStatusLine();
}

function getForecastStatusRevision() {
  if (currentLocationStatusOwner?.statusRevision === statusMessageRevision) {
    return currentLocationStatusOwner.previousStatus.revision;
  }

  return statusMessageRevision;
}

function setForecastStatusMessage(context, message, { title = "", isError = false } = {}) {
  if (
    currentLocationStatusOwner?.statusRevision === statusMessageRevision
    && context.statusRevision === currentLocationStatusOwner.previousStatus.revision
  ) {
    currentLocationStatusOwner.previousStatus = {
      isError,
      message,
      revision: context.statusRevision,
      title,
    };
    return;
  }

  if (context.statusRevision === statusMessageRevision) {
    setStatusMessage(message, { title, isError });
  }
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

      if (section === elements.legendSection && getActiveLegendTabId() === "outfits") {
        renderOutfitLegend();
      }

      sections.forEach((otherSection) => {
        if (otherSection !== section) {
          otherSection.open = false;
        }
      });
    });
  });
}

function bindLegendTabs() {
  const tabs = Array.from(elements.infoDialog?.querySelectorAll("[data-legend-tab]") || []);
  const panels = Array.from(elements.infoDialog?.querySelectorAll("[data-legend-panel]") || []);
  if (!tabs.length || !panels.length) {
    return;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setLegendTab(tab.dataset.legendTab);
    });
    tab.addEventListener("keydown", (event) => {
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!direction) {
        return;
      }

      event.preventDefault();
      const currentIndex = tabs.indexOf(tab);
      const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
      nextTab.focus();
      setLegendTab(nextTab.dataset.legendTab);
    });
  });

  setLegendTab(getActiveLegendTabId() || tabs[0].dataset.legendTab);
}

function setLegendTab(tabId) {
  const tabs = Array.from(elements.infoDialog?.querySelectorAll("[data-legend-tab]") || []);
  const panels = Array.from(elements.infoDialog?.querySelectorAll("[data-legend-panel]") || []);
  if (!tabs.length || !panels.length) {
    return;
  }

  const nextTabId = tabs.some((tab) => tab.dataset.legendTab === tabId) ? tabId : tabs[0].dataset.legendTab;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.legendTab === nextTabId;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.legendPanel !== nextTabId;
  });

  if (nextTabId === "outfits") {
    renderOutfitLegend();
  }
}

function getActiveLegendTabId() {
  return elements.infoDialog?.querySelector("[data-legend-tab].is-active")?.dataset.legendTab;
}

function renderWeatherIconLegend() {
  if (!elements.iconLegend) {
    return;
  }

  const intro = document.createElement("p");
  intro.className = "icon-legend-intro";
  intro.textContent = "Weather icons used in MyMeteo.";

  elements.iconLegend.replaceChildren(intro, ...weatherIconLegendGroups.map(createWeatherIconLegendGroup));
}

function createWeatherIconLegendGroup(group) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  const list = document.createElement("div");

  section.className = "icon-legend-group";
  heading.textContent = group.title;
  list.className = "icon-legend-list";
  list.setAttribute("role", "list");
  group.items.forEach((item) => list.appendChild(createWeatherIconLegendItem(item)));
  section.append(heading, list);

  return section;
}

function createWeatherIconLegendItem(item) {
  const row = document.createElement("div");
  const icons = document.createElement("span");
  const text = document.createElement("span");
  const label = document.createElement("span");
  const description = document.createElement("span");

  row.className = "icon-legend-item";
  row.setAttribute("role", "listitem");
  icons.className = "icon-legend-icons";
  icons.setAttribute("aria-hidden", "true");
  item.icons.forEach((iconName) => {
    icons.appendChild(createWeatherIcon({ icon: iconName }, "icon-legend-icon"));
  });

  text.className = "icon-legend-text";
  label.className = "icon-legend-label";
  label.textContent = item.label;
  description.className = "icon-legend-description";
  description.textContent = item.description;
  text.append(label, description);
  row.append(icons, text);

  return row;
}

function renderOutfitLegend() {
  if (!elements.outfitLegend || isOutfitLegendRendered) {
    return;
  }

  const intro = document.createElement("p");
  intro.className = "outfit-legend-intro";
  intro.textContent = "Outfit states used in MyMeteo.";

  elements.outfitLegend.replaceChildren(intro, ...outfitLegendGroups.map(createOutfitLegendGroup));
  isOutfitLegendRendered = true;
}

function createOutfitLegendGroup(group) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  const list = document.createElement("div");

  section.className = "outfit-legend-group";
  heading.textContent = group.title;
  list.className = "outfit-legend-list";
  list.setAttribute("role", "list");
  group.items.forEach((item) => {
    const legendItem = createOutfitLegendItem(item);
    if (legendItem) {
      list.appendChild(legendItem);
    }
  });
  section.append(heading, list);

  return section;
}

function createOutfitLegendItem(item) {
  const scene = outfitScenes[item.sceneId];
  if (!scene) {
    return undefined;
  }

  const row = document.createElement("div");
  const thumb = document.createElement("span");
  const background = document.createElement("img");
  const character = document.createElement("img");
  const text = document.createElement("span");
  const label = document.createElement("span");
  const description = document.createElement("span");

  row.className = "outfit-legend-item";
  row.setAttribute("role", "listitem");
  thumb.className = "outfit-legend-thumb";
  thumb.setAttribute("aria-hidden", "true");
  background.className = "outfit-legend-background";
  background.src = buildOutfitSceneAssetUrl(outfitSceneBackgroundBasePath, scene.background);
  background.width = 1920;
  background.height = 1200;
  background.alt = "";
  background.decoding = "async";
  background.loading = "lazy";
  background.style.objectPosition = scene.backgroundPositionMobile || scene.backgroundPosition || "center center";
  character.className = "outfit-legend-character";
  character.src = buildOutfitSceneAssetUrl(outfitSceneCharacterBasePath, scene.character);
  character.width = 1024;
  character.height = 1536;
  character.alt = "";
  character.decoding = "async";
  character.loading = "lazy";
  if (scene.characterX) {
    character.style.left = scene.characterX;
  }
  if (scene.legendCharacterBottom) {
    character.style.bottom = scene.legendCharacterBottom;
  }
  thumb.append(background, character);

  text.className = "outfit-legend-text";
  label.className = "outfit-legend-label";
  label.textContent = item.label;
  description.className = "outfit-legend-description";
  description.textContent = item.description;
  text.append(label, description);
  row.append(thumb, text);

  return row;
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
  if (!showRadar) {
    hideEasterEgg();
  }
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
  beginManualLocationIntent();
  const query = elements.locationInput.value.trim();
  areLocationOptionsDismissed = false;
  activeLocationOptionIndex = -1;
  invalidateLocationSearch();
  locationSearchResults = [];
  renderLocationOptions();
  resizeLocationInput(elements.locationInput.value);

  if (isLocationInputComposing || query.length < 2) {
    return;
  }

  locationSearchTimer = window.setTimeout(() => {
    searchLocationSuggestions(query);
  }, 220);
}

function handleLocationInputKeydown(event) {
  if (event.isComposing || event.keyCode === 229 || isLocationInputComposing) {
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (!locationSearchResults.length) {
      return;
    }

    event.preventDefault();
    if (elements.locationOptions.hidden) {
      areLocationOptionsDismissed = false;
      activeLocationOptionIndex = 0;
      renderLocationOptions();
      scrollActiveLocationOptionIntoView();
      return;
    }

    const direction = event.key === "ArrowDown" ? 1 : -1;
    setActiveLocationOption(activeLocationOptionIndex + direction, { scrollIntoView: true });
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectTypedLocation();
  } else if (event.key === "Escape") {
    event.preventDefault();
    hideLocationOptions();
  } else if (event.key === "Tab") {
    hideLocationOptions();
  }
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

async function selectTypedLocation() {
  if (commitActiveLocationOption()) {
    return;
  }

  const typedValue = elements.locationInput.value.trim();

  if (typedValue === getLocationDisplayName(selectedLocation)) {
    renderLocation();
    return;
  }

  if (typedValue.length < 2) {
    renderLocation();
    return;
  }

  const intentId = beginManualLocationIntent();
  const exactMatch = locationSearchResults.find((result) => formatLocationResult(result) === typedValue);
  if (exactMatch) {
    applyLocation(locationFromResult(exactMatch), "location_search", { intentId });
    return;
  }

  window.clearTimeout(locationSearchTimer);
  const results = await searchLocationSuggestions(typedValue);
  if (!isCurrentLocationIntent(intentId) || elements.locationInput.value.trim() !== typedValue) {
    return;
  }

  if (results[0]) {
    applyLocation(locationFromResult(results[0]), "location_search", { intentId });
  } else {
    setStatusMessage("Location not found", { isError: true });
  }
}

async function searchLocationSuggestions(query) {
  invalidateLocationSearch();
  const requestId = locationSearchRequestId;
  const controller = new AbortController();
  locationSearchAbortController = controller;
  const params = new URLSearchParams({
    name: query,
    count: "8",
    language: "en",
    format: "json",
  });

  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo geocoding responded with ${response.status}`);
    }

    const data = await response.json();
    if (
      requestId !== locationSearchRequestId
      || controller !== locationSearchAbortController
      || elements.locationInput.value.trim() !== query
    ) {
      return [];
    }

    locationSearchResults = data.results || [];
    locationSearchResultSetId = requestId;
    activeLocationOptionIndex = locationSearchResults.length && !areLocationOptionsDismissed ? 0 : -1;
    renderLocationOptions();
    return locationSearchResults;
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
    }
    return [];
  } finally {
    if (controller === locationSearchAbortController) {
      locationSearchAbortController = undefined;
    }
  }
}

function invalidateLocationSearch() {
  window.clearTimeout(locationSearchTimer);
  locationSearchTimer = undefined;
  locationSearchRequestId += 1;
  if (locationSearchAbortController) {
    locationSearchAbortController.abort();
    locationSearchAbortController = undefined;
  }
}

function beginLocationIntent() {
  locationIntentId += 1;
  return locationIntentId;
}

function beginManualLocationIntent() {
  const intentId = beginLocationIntent();
  if (currentLocationRefreshState === "refreshing") {
    currentLocationRefreshState = isCurrentLocation(selectedLocation) ? "stale" : "idle";
    updateLocateButtonLabel();
    restoreCurrentLocationOwnedStatus();
  }
  return intentId;
}

function isCurrentLocationIntent(intentId) {
  return intentId === locationIntentId;
}

function renderLocationOptions() {
  const shouldShowOptions = locationSearchResults.length > 0 && !areLocationOptionsDismissed;
  elements.locationInput.setAttribute("aria-expanded", String(shouldShowOptions));
  elements.locationOptions.hidden = !shouldShowOptions;

  if (!shouldShowOptions) {
    elements.locationInput.removeAttribute("aria-activedescendant");
    elements.locationOptions.replaceChildren();
    return;
  }

  if (activeLocationOptionIndex < 0 || activeLocationOptionIndex >= locationSearchResults.length) {
    activeLocationOptionIndex = 0;
  }

  elements.locationOptions.replaceChildren(
    ...locationSearchResults.map((result, index) => {
      const item = document.createElement("li");
      item.className = "location-option";
      item.id = `location-option-${locationSearchResultSetId}-${index}`;
      item.textContent = formatLocationResult(result);
      item.setAttribute("role", "option");
      item.addEventListener("pointermove", (event) => {
        if (event.pointerType === "mouse" && index !== activeLocationOptionIndex) {
          setActiveLocationOption(index);
        }
      });
      item.addEventListener("mousedown", (event) => {
        if (event.button === 0) {
          event.preventDefault();
        }
      });
      item.addEventListener("click", () => {
        commitLocationOption(index);
      });
      return item;
    }),
  );
  syncActiveLocationOption();
}

function setActiveLocationOption(index, { scrollIntoView = false } = {}) {
  if (!locationSearchResults.length || elements.locationOptions.hidden) {
    activeLocationOptionIndex = -1;
    syncActiveLocationOption();
    return;
  }

  activeLocationOptionIndex = Math.min(
    Math.max(index, 0),
    locationSearchResults.length - 1,
  );
  syncActiveLocationOption();
  if (scrollIntoView) {
    scrollActiveLocationOptionIntoView();
  }
}

function syncActiveLocationOption() {
  const optionElements = Array.from(elements.locationOptions.querySelectorAll('[role="option"]'));
  optionElements.forEach((option, index) => {
    const isActive = index === activeLocationOptionIndex;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-selected", String(isActive));
  });

  const activeOption = optionElements[activeLocationOptionIndex];
  if (activeOption && !elements.locationOptions.hidden) {
    elements.locationInput.setAttribute("aria-activedescendant", activeOption.id);
  } else {
    elements.locationInput.removeAttribute("aria-activedescendant");
  }
}

function scrollActiveLocationOptionIntoView() {
  const activeOption = elements.locationOptions.querySelector('[aria-selected="true"]');
  activeOption?.scrollIntoView({ block: "nearest" });
}

function commitActiveLocationOption() {
  if (elements.locationOptions.hidden || activeLocationOptionIndex < 0) {
    return false;
  }

  return commitLocationOption(activeLocationOptionIndex);
}

function commitLocationOption(index) {
  const result = locationSearchResults[index];
  if (!result) {
    return false;
  }

  locationSearchResults = [];
  hideLocationOptions();
  applyLocation(locationFromResult(result), "location_search");
  return true;
}

function hideLocationOptions() {
  areLocationOptionsDismissed = true;
  activeLocationOptionIndex = -1;
  renderLocationOptions();
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
  const loadRequestIdBeforeLocationRefresh = dataLoadRequestId;
  const didAttemptCurrentLocationRefresh = await refreshCurrentLocationIfAllowed({
    analyticsEventName: "current_location_auto_refreshed",
    loadWeatherOnFailure: true,
  });

  if (!didAttemptCurrentLocationRefresh && dataLoadRequestId === loadRequestIdBeforeLocationRefresh) {
    loadAll({ radarTrigger: "initial" });
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

  const intentId = locationIntentId;
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const permissionState = await getGeolocationPermissionState();
  if (
    !isCurrentLocationIntent(intentId)
    || !isCurrentLocation(selectedLocation)
    || locationKey !== getBuienradarSampleLocationKey(selectedLocation)
    || currentLocationRefreshPromise
  ) {
    return false;
  }

  if (permissionState !== "granted") {
    currentLocationRefreshState = "stale";
    renderLocation();
    return false;
  }

  const loadRequestIdBeforeRefresh = dataLoadRequestId;
  currentLocationRefreshPromise = requestCurrentLocation({
    analyticsEventName,
    isAutoRefresh: true,
    loadWeatherOnFailure,
  }).finally(() => {
    currentLocationRefreshPromise = undefined;
  });

  const didRefresh = await currentLocationRefreshPromise;
  if (!didRefresh && loadWeatherOnFailure && dataLoadRequestId === loadRequestIdBeforeRefresh) {
    loadAll({ radarTrigger: "location_refresh" });
  }
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

  const intentId = beginLocationIntent();
  const requestId = currentLocationRequestId + 1;
  currentLocationRequestId = requestId;
  const previousStatus = {
    isError: statusIsError,
    message: statusMessage,
    revision: statusMessageRevision,
    title: statusTitle,
  };
  lastCurrentLocationRefreshAttemptAt = Date.now();
  currentLocationRefreshState = "refreshing";
  renderLocation();
  setStatusMessage(isAutoRefresh ? "Updating current location..." : "Locating...");
  currentLocationStatusOwner = {
    previousStatus,
    requestId,
    statusRevision: statusMessageRevision,
  };
  setCurrentLocationRequestPending(true);

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: 5 * 60 * 1000,
      timeout: 10 * 1000,
    });
    if (!isCurrentLocationIntent(intentId)) {
      return false;
    }

    const location = await currentLocationFromPosition(position);
    if (!isCurrentLocationIntent(intentId)) {
      return false;
    }

    currentLocationRefreshState = "verified";
    clearCurrentLocationStatusOwner(requestId);
    applyLocation(location, analyticsEventName, { intentId });
    return true;
  } catch (error) {
    if (!isCurrentLocationIntent(intentId)) {
      return false;
    }

    console.error(error);
    currentLocationRefreshState = isCurrentLocation(selectedLocation) ? "stale" : "idle";
    renderLocation();
    clearCurrentLocationStatusOwner(requestId);
    setCurrentLocationErrorMessage(getGeolocationErrorMessage(error));

    if (loadWeatherOnFailure) {
      loadAll({ radarTrigger: "location_refresh" });
    }

    return false;
  } finally {
    if (requestId === currentLocationRequestId) {
      setCurrentLocationRequestPending(false);
    }
  }
}

function setCurrentLocationRequestPending(isPending) {
  elements.locateButton.disabled = isPending;
  elements.locateButton.toggleAttribute("aria-busy", isPending);
  if (!isPending) {
    updateLocateButtonLabel();
  }
}

function clearCurrentLocationStatusOwner(requestId) {
  if (currentLocationStatusOwner?.requestId === requestId) {
    currentLocationStatusOwner = undefined;
  }
}

function restoreCurrentLocationOwnedStatus() {
  const owner = currentLocationStatusOwner;
  currentLocationStatusOwner = undefined;
  if (!owner || owner.statusRevision !== statusMessageRevision) {
    renderStatusLine();
    return;
  }

  statusMessage = owner.previousStatus.message;
  statusTitle = owner.previousStatus.title;
  statusIsError = owner.previousStatus.isError;
  statusMessageRevision = owner.previousStatus.revision;
  renderStatusLine();
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
  const intentId = locationIntentId;
  const place = await reverseGeocodeLocation(originalLocation).catch((error) => {
    console.warn("Could not name stored current location.", error);
    return null;
  });

  if (
    !place
    || selectedLocation !== originalLocation
    || !isCurrentLocationIntent(intentId)
  ) {
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

function applyLocation(location, analyticsEventName, { intentId = beginManualLocationIntent() } = {}) {
  if (!isCurrentLocationIntent(intentId)) {
    return false;
  }

  if (analyticsEventName) {
    trackAnalyticsEvent(analyticsEventName);
  }

  const previousLocation = selectedLocation;
  const nextLocation = normalizeLocation(location);
  currentLocationRefreshState = isCurrentLocation(nextLocation) ? currentLocationRefreshState : "idle";
  selectedLocation = nextLocation;
  activeOutfitSceneId = undefined;
  activeOutfitSceneVisualKey = undefined;
  invalidateLocationSearch();
  locationSearchResults = [];
  saveLocation(selectedLocation);
  hideLocationOptions();
  renderWeatherLoadingState();
  if (isInBuienradarBounds(previousLocation) !== isInBuienradarBounds(selectedLocation)) {
    resetRadarDisplayForLocationChange();
  }
  renderLocation();
  updateMapLocation();
  loadAll({ forceRadarRefresh: false, radarTrigger: "location_change" });
  return true;
}

function renderWeatherLoadingState() {
  weatherData = undefined;
  weatherDataLocationKey = undefined;
  weatherDataLoadRequestId = undefined;
  window.clearTimeout(knmiPointRainRenderTimer);
  knmiPointRainRenderTimer = undefined;
  elements.nowPanel.setAttribute("aria-busy", "true");
  elements.conditionLabel.textContent = "Checking the sky";
  const loadingCondition = getCondition(2, true);
  renderConditionIcon(loadingCondition);
  document.querySelector(".condition-mark").title = "Weather updating";
  renderTemperatureAndWind({});
  renderCurrentTemperatureRange(buildTemperatureRange(undefined, undefined, "restOfDay"));
  renderCurrentPrecipitation({
    ariaLabel: "Rain chance unavailable",
    chance: undefined,
    label: "Rain",
    scopeLabel: "Rest of day",
    value: "--%",
  });
  elements.forecastPrecipHeader.textContent = "Rain";
  elements.forecastBody.innerHTML = '<tr><td class="forecast-empty" colspan="5">Updating forecast...</td></tr>';
  elements.outfitScene.hidden = true;
  hidePrecipitationTimeline();
  renderRainSourceDebugPanel();

  const sliderStart = getRadarSliderMin();
  elements.radarSlider.value = String(sliderStart);
  radarSliderWasAtStart = true;
  if (!elements.radarSlider.disabled) {
    handleRadarSliderInput(sliderStart);
  } else {
    setActiveRadarDate(undefined);
    setRainForecastBadgeCurrent();
  }
}

function resetRadarDisplayForLocationChange() {
  radarLoadRequestId += 1;
  buienradarDisplayRequestId += 1;
  knmiDisplayRequestId += 1;
  radarDisplayReplacement = undefined;
  isBuienradarRadarModeLoading = false;
  setRefreshButtonWorking(false);
  clearLibreWxrRadar();
  clearBuienradarLayers();
  clearKnmiLayers();
  buienradarCommittedFrameUrls = [];
  buienradarCommittedModeId = buienradarDefaultRadarModeId;
  buienradarCommittedRainSamples = undefined;
  buienradarCommittedRainSampleRun = undefined;
  radarFrames = [];
  displayedRadarSource = "none";
  committedRadarSource = "none";
  committedRadarSliderMin = 0;
  resetHybridRadarRange();
  elements.radarPanel.classList.remove("is-animated");
  elements.radarSlider.disabled = true;
  elements.radarSlider.min = "0";
  elements.radarSlider.max = "0";
  elements.radarSlider.value = "0";
  radarSliderWasAtStart = true;
  setActiveRadarDate(undefined);
  elements.radarTime.textContent = "Loading...";
  elements.radarTime.classList.remove("error");
  setRadarMapStatus("Loading rain forecast...");
  updateSliderTimestamps();
  updateBuienradarModeControl();
}

function updateMapLocation() {
  if (!map || !locationMarker) {
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
  if (!map) {
    return;
  }

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

function createDataLoadContext({ forceRadarRefresh = true, radarTrigger = "other" } = {}) {
  const requestId = dataLoadRequestId + 1;
  const location = { ...selectedLocation };
  dataLoadRequestId = requestId;
  return {
    requestId,
    location,
    locationKey: getBuienradarSampleLocationKey(location),
    forceRadarRefresh,
    radarTrigger,
    statusRevision: getForecastStatusRevision(),
  };
}

function isDataLoadContextCurrent(context) {
  return Boolean(
    context
    && context.requestId === dataLoadRequestId
    && context.locationKey === getBuienradarSampleLocationKey(selectedLocation),
  );
}

async function loadAll(options = {}) {
  const context = createDataLoadContext(options);
  if (activeForecastAbortController) {
    activeForecastAbortController.abort();
  }
  activeForecastAbortController = new AbortController();
  context.signal = activeForecastAbortController.signal;
  setLoading(true);
  if (currentLocationRefreshState !== "refreshing") {
    setStatusMessage("Refreshing...");
  }
  context.statusRevision = getForecastStatusRevision();

  try {
    await Promise.allSettled([
      loadWeather(context),
      loadRadar({
        forceRefresh: context.forceRadarRefresh,
        trigger: context.radarTrigger,
      }),
    ]);
  } finally {
    if (isDataLoadContextCurrent(context)) {
      activeForecastAbortController = undefined;
      setLoading(false);
    }
  }
}

async function loadWeather(context) {
  const requestLocation = context.location;
  const requestLocationKey = context.locationKey;
  const pointRainPromise = prepareBuienradarPointRainForLocation(requestLocation, {
    forceRefresh: context.forceRadarRefresh,
  }).catch((error) => {
    console.warn("Could not load Buienradar point rain data.", error);
  });
  const knmiPointRainPromise = prepareKnmiPointRainForLocation(requestLocation, {
    forceRefresh: context.forceRadarRefresh,
  }).catch((error) => {
    console.warn("Could not load KNMI point rain data.", error);
  });
  const params = new URLSearchParams({
    latitude: requestLocation.lat,
    longitude: requestLocation.lon,
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
      "cape",
      "wind_speed_10m",
      "wind_direction_10m",
      "is_day",
    ].join(","),
    minutely_15: [
      "weather_code",
      "lightning_potential",
      "cape",
      "rain",
      "showers",
    ].join(","),
    // The next day supplies the interval ending after the fifth day's final hour.
    forecast_days: "6",
    forecast_minutely_15: String(stormMinutelySampleCount),
    timezone: requestLocation.timezone,
    timeformat: "unixtime",
    wind_speed_unit: "kmh",
  });

  try {
    const { response, body: data } = await fetchBodyWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: context.signal,
      timeoutMs: weatherForecastTimeoutMs,
      timeoutMessage: "Forecast request timed out",
      readBody: (nextResponse) => nextResponse.json(),
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo responded with ${response.status}`);
    }

    if (!isDataLoadContextCurrent(context)) {
      return;
    }

    renderWeather(data, context);
    const renderEnrichedWeather = () => {
      renderWeatherForRadarBlend(requestLocationKey, context.requestId);
    };
    pointRainPromise.then(renderEnrichedWeather);
    knmiPointRainPromise.then(renderEnrichedWeather);
  } catch (error) {
    if (context.signal?.aborted || error?.name === "AbortError" || !isDataLoadContextCurrent(context)) {
      return;
    }

    console.error(error);
    elements.nowPanel.removeAttribute("aria-busy");
    setForecastStatusMessage(context, error?.name === "TimeoutError"
      ? "Forecast timed out · try refreshing"
      : "Forecast unavailable", { isError: true });
    renderFiveDayForecast();
  }
}

function renderWeather(data, context) {
  if (!isDataLoadContextCurrent(context)) {
    return;
  }

  data = normalizeForecastCalendarDates(data);
  weatherData = data;
  weatherDataLocationKey = context.locationKey;
  weatherDataLoadRequestId = context.requestId;
  elements.nowPanel.removeAttribute("aria-busy");
  const current = data.current;
  setForecastStatusMessage(context, `Checked ${formatClock(new Date())}`, {
    title: `Weather observation ${formatTime(current.time)}`,
  });

  if (!getActiveRadarDate()) {
    setRainForecastBadgeCurrent(new Date(current.time * 1000));
  }

  renderFiveDayForecast(data);
  renderSelectedWeather();
  renderPrecipitationTimeline();
}

function normalizeForecastCalendarDates(data) {
  if (!data?.daily?.time?.length || !Number.isFinite(data.utc_offset_seconds)) {
    return data;
  }

  // Daily epochs encode provider calendar dates with one response-wide offset.
  // Hourly/current epochs remain real instants, including during DST changes.
  return {
    ...data,
    daily: {
      ...data.daily,
      time: data.daily.time.map((time) => typeof time === "number"
        ? new Date((time + data.utc_offset_seconds) * 1000).toISOString().slice(0, 10)
        : time),
    },
  };
}

function renderCurrentTemperatureRange(temperatureRange) {
  elements.maxTemp.textContent = temperatureRange.max;
  elements.minTemp.textContent = temperatureRange.min;
  elements.maxTemp.title = temperatureRange.maxTitle;
  elements.minTemp.title = temperatureRange.minTitle;
  elements.temperatureRange.setAttribute("aria-label", temperatureRange.ariaLabel);
}

function renderCurrentPrecipitation(precipitation) {
  const scopeLabel = precipitation.scopeLabel || "Selected time";
  elements.currentPrecipLabel.textContent = precipitation.label;
  elements.currentPrecipitationValue.classList.toggle("is-dry", isPrecipitationDisplayDry(precipitation));
  elements.rainTotal.title = precipitation.ariaLabel;
  elements.currentPrecipMetric.setAttribute("aria-label", `${scopeLabel} ${precipitation.ariaLabel.toLowerCase()}`);
  elements.currentPrecipitationValue.replaceChildren(
    ...createPrecipitationDisplayParts(precipitation, "current", elements.rainTotal),
  );
}

function renderPrecipitationTimeline() {
  if (radarDisplayReplacement && !radarDisplayReplacement.isCommitting && committedRadarSource !== "none") {
    return;
  }
  if (
    !elements.precipitationTimeline
    || !elements.precipitationTimelineArea
  ) {
    return;
  }

  const range = getRadarTimeRange();
  if (
    !weatherData?.hourly?.time?.length
    || !range
    || !(range.start instanceof Date)
    || !(range.end instanceof Date)
    || range.end <= range.start
    || elements.radarSlider.disabled
  ) {
    hidePrecipitationTimeline();
    return;
  }

  const samples = buildPrecipitationTimelineSamples(range);
  if (samples.length < 2) {
    hidePrecipitationTimeline();
    return;
  }

  const points = samples.map((sample) => ({
    x: sample.position,
    y: getPrecipitationTimelineY(sample.level),
  }));
  const linePath = createPrecipitationTimelineLinePath(points);
  const areaPath = createPrecipitationTimelineAreaPath(points, linePath);
  const dominantType = getPrecipitationTimelineDominantType(samples);
  const isDry = samples.every((sample) => sample.level <= 0);

  precipitationTimelineRange = range;
  precipitationTimelineSamples = samples;
  elements.precipitationTimelineArea.setAttribute("d", areaPath);
  elements.precipitationTimeline.classList.toggle("is-snow", dominantType === "snow");
  elements.precipitationTimeline.classList.toggle("is-dry", isDry);
  elements.precipitationTimeline.hidden = false;

  const selectedDate = getSelectedWeatherDate();
  const selectedPrecipitation = getSelectedTimePrecipitation(selectedDate);
  const summary = getPrecipitationTimelineSummary(samples, range, selectedDate, selectedPrecipitation);
  elements.precipitationTimeline.setAttribute("aria-label", summary);
  elements.precipitationTimeline.title = summary;
  updatePrecipitationTimelineMarker(
    selectedDate,
    range,
    samples,
    selectedPrecipitation,
  );
}

function hidePrecipitationTimeline() {
  precipitationTimelineRange = undefined;
  precipitationTimelineSamples = [];

  if (!elements.precipitationTimeline) {
    return;
  }

  elements.precipitationTimeline.hidden = true;
  elements.precipitationTimeline.removeAttribute("title");
  if (elements.precipitationTimelineArea) {
    elements.precipitationTimelineArea.removeAttribute("d");
  }
}

function buildPrecipitationTimelineSamples(range) {
  const durationMs = range.end.getTime() - range.start.getTime();
  const sampleIntervalMs = precipitationTimelineSampleIntervalMinutes * 60 * 1000;
  const sampleCount = Math.min(
    Math.max(Math.floor(durationMs / sampleIntervalMs) + 1, 2),
    precipitationTimelineMaxSampleCount,
  );

  return Array.from({ length: sampleCount }, (_, index) => {
    const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
    const date = new Date(range.start.getTime() + durationMs * progress);
    return buildPrecipitationTimelineSample(date, range);
  }).filter(Boolean);
}

function buildPrecipitationTimelineSample(date, range) {
  const hourly = weatherData?.hourly;
  if (!hourly?.time?.length) {
    return undefined;
  }

  const precipitation = getSelectedTimePrecipitation(date);
  if (!precipitation) {
    return undefined;
  }
  const rangeDuration = range.end.getTime() - range.start.getTime();
  return {
    date,
    precipitation,
    level: getPrecipitationTimelineLevel(precipitation),
    position: rangeDuration > 0
      ? ((date.getTime() - range.start.getTime()) / rangeDuration) * precipitationTimelineSvgWidth
      : 0,
  };
}

function getPrecipitationTimelineRadarAdjustment(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return undefined;
  }

  const sampleSeries = getPrecipitationTimelineRadarSampleSeries(date);
  if (!sampleSeries) {
    return undefined;
  }

  return getBuienradarAdjustmentFromSampleSeries(
    sampleSeries,
    date,
    "instant",
    {
      maxLookaheadHours: sampleSeries.maxLookaheadHours || buienradarBlendMaxLookaheadHours,
      source: sampleSeries.source || "radar-image",
      weight: 1,
    },
  );
}

function getPrecipitationTimelineRadarSampleSeries(date) {
  if (committedRadarSource === "hybrid") {
    const retainedState = radarDisplayReplacement && !radarDisplayReplacement.isCommitting
      ? radarDisplayReplacement.previousState
      : undefined;
    const knmiEndDate = retainedState ? retainedState.hybridRadarKnmiEndDate : hybridRadarKnmiEndDate;
    if (knmiEndDate instanceof Date && date <= knmiEndDate) {
      return getDisplayedKnmiImageRainSampleSeries(date);
    }

    return getDisplayedBuienradarImageRainSampleSeries(date);
  }

  if (committedRadarSource === "knmi") {
    return getDisplayedKnmiImageRainSampleSeries(date);
  }

  if (committedRadarSource === "buienradar") {
    return getDisplayedBuienradarImageRainSampleSeries(date);
  }

  return undefined;
}

function buildRadarImageTimelinePrecipitation(precipitation, adjustment) {
  const shouldUseExactLocalSignal = (
    isRadarImageAdjustmentSource(adjustment.source)
    && Number.isFinite(adjustment.exactSignal)
  );
  const localWetSignal = shouldUseExactLocalSignal
    ? adjustment.exactSignal
    : adjustment.signal;
  const exactIntensitySignal = Number.isFinite(adjustment.exactIntensitySignal)
    ? adjustment.exactIntensitySignal
    : Number.isFinite(adjustment.exactIntensityRank)
      ? getBuienradarIntensitySignalForRank(adjustment.exactIntensityRank)
      : undefined;
  const radarIntensitySignal = shouldUseExactLocalSignal && Number.isFinite(exactIntensitySignal)
    ? exactIntensitySignal
    : (Number.isFinite(adjustment.intensitySignal) ? adjustment.intensitySignal : adjustment.signal);
  const isDry = (
    !Number.isFinite(localWetSignal)
    || localWetSignal <= buienradarDrySignalThreshold
    || getPrecipitationIntensityRank(getBuienradarPrecipitationIntensity(radarIntensitySignal)) <= 0
  );
  const localChance = shouldUseExactLocalSignal
    ? getBuienradarSignalChance({
      signal: adjustment.exactSignal,
      exactSignal: adjustment.exactSignal,
      nearbySignal: 0,
    })
    : adjustment.chance;
  const chance = isDry
    ? 0
    : clampNumber(Math.max(localChance, precipitationConditionChanceThreshold), 0, 100);
  const displayChance = roundRainChanceForDisplay(chance);
  const amount = isDry ? 0 : getBuienradarEquivalentPrecipitationAmount(radarIntensitySignal);
  const radarIntensity = isDry ? undefined : getBuienradarPrecipitationIntensity(radarIntensitySignal);
  const intensity = isDry
    ? undefined
    : getPrecipitationDisplayIntensity({
      ...precipitation,
      amount,
      intensity: radarIntensity,
    }, displayChance);
  const modelDisplayChance = Number.isFinite(precipitation.chance)
    ? roundRainChanceForDisplay(precipitation.chance)
    : undefined;
  const isRadarAdjusted = modelDisplayChance !== displayChance
    || intensity !== precipitation.intensity;
  const adjustedPrecipitation = {
    ...precipitation,
    value: formatOptionalRainChance(chance),
    chance,
    amount,
    intensity,
    hasRadarEvidence: true,
    isRadarAdjusted,
    radarAdjustment: {
      source: adjustment.source,
      locationKey: adjustment.locationKey,
      referenceTime: adjustment.referenceTime,
      fetchedAt: adjustment.fetchedAt,
      metadataFetchedAt: adjustment.metadataFetchedAt,
      proxyAgeSeconds: adjustment.proxyAgeSeconds,
      proxyCacheStatus: adjustment.proxyCacheStatus,
      proxyDiagnosticScope: adjustment.proxyDiagnosticScope,
      crs: adjustment.crs,
      chance,
      sourceChance: adjustment.chance,
      signal: localWetSignal,
      combinedSignal: adjustment.signal,
      intensitySignal: adjustment.intensitySignal,
      localIntensitySignal: radarIntensitySignal,
      intensityRank: adjustment.intensityRank,
      exactSignal: adjustment.exactSignal,
      exactIntensitySignal,
      nearbySignal: adjustment.nearbySignal,
      exactCoverage: adjustment.exactCoverage,
      nearbyCoverage: adjustment.nearbyCoverage,
      exactIntensityRank: adjustment.exactIntensityRank,
      nearbyIntensityRank: adjustment.nearbyIntensityRank,
      localWet: !isDry,
      intensity: radarIntensity,
      weight: adjustment.weight,
      sampleMode: adjustment.sampleMode,
      horizonHours: adjustment.horizonHours,
      value: adjustment.value,
      amount: adjustment.amount,
      averageValue: adjustment.averageValue,
      peakValue: adjustment.peakValue,
      averageAmount: adjustment.averageAmount,
      peakAmount: adjustment.peakAmount,
      averageSignal: adjustment.averageSignal,
      peakSignal: adjustment.peakSignal,
      heavyFrameRatio: adjustment.heavyFrameRatio,
      moderateFrameRatio: adjustment.moderateFrameRatio,
      rainFrameRatio: adjustment.rainFrameRatio,
      sampleCount: adjustment.sampleCount,
      wetSampleCount: adjustment.wetSampleCount,
      time: adjustment.time,
    },
  };
  adjustedPrecipitation.ariaLabel = getPrecipitationAriaLabel(adjustedPrecipitation);

  return adjustedPrecipitation;
}

function getPrecipitationTimelineLevel(precipitation) {
  if (!precipitation) {
    return 0;
  }

  if (
    isRadarImageAdjustmentSource(precipitation.radarAdjustment?.source)
    && Number.isFinite(precipitation.radarAdjustment.exactSignal)
    && precipitation.radarAdjustment.exactSignal <= buienradarDrySignalThreshold
  ) {
    return 0;
  }

  if (
    precipitation.radarAdjustment
    && getPrecipitationIntensityRank(precipitation.radarAdjustment.intensity) <= 0
    && Number.isFinite(precipitation.radarAdjustment.signal)
    && precipitation.radarAdjustment.signal <= buienradarDrySignalThreshold
  ) {
    return 0;
  }

  const radarIntensitySignal = isRadarImageAdjustmentSource(precipitation.radarAdjustment?.source)
    ? (
      precipitation.radarAdjustment?.localIntensitySignal
      ?? precipitation.radarAdjustment?.exactIntensitySignal
      ?? precipitation.radarAdjustment?.intensitySignal
    )
    : precipitation.radarAdjustment?.intensitySignal;
  if (Number.isFinite(radarIntensitySignal) && radarIntensitySignal > 0) {
    return clampNumber(radarIntensitySignal, 0.14, 1);
  }

  if (isPrecipitationDisplayDry(precipitation)) {
    return 0;
  }

  const rank = getPrecipitationIntensityRank(precipitation.intensity);
  const amount = precipitation.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return rank >= 3 ? 0.85 : rank >= 2 ? 0.55 : 0.26;
  }

  const thresholds = precipitationIntensityThresholds[precipitation.type === "snow" ? "snow" : "rain"];
  if (amount >= thresholds.heavy) {
    return clampNumber(0.72 + ((amount - thresholds.heavy) / thresholds.heavy) * 0.24, 0.72, 1);
  }

  if (amount >= thresholds.moderate) {
    return clampNumber(
      0.42 + ((amount - thresholds.moderate) / (thresholds.heavy - thresholds.moderate)) * 0.26,
      0.42,
      0.68,
    );
  }

  return clampNumber(0.16 + (amount / thresholds.moderate) * 0.2, 0.16, 0.36);
}

function isRadarImageAdjustmentSource(source) {
  return source === "knmi-image" || source === "radar-image";
}

function getPrecipitationTimelineY(level) {
  const safeLevel = clampNumber(Number(level) || 0, 0, 1);
  return precipitationTimelineBaselineY - (precipitationTimelineBaselineY - precipitationTimelinePeakY) * safeLevel;
}

function createPrecipitationTimelineLinePath(points) {
  if (!points.length) {
    return "";
  }

  const commands = [`M ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`];
  points.slice(1).forEach((point) => {
    commands.push(`L ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`);
  });
  return commands.join(" ");
}

function createPrecipitationTimelineAreaPath(points, linePath) {
  if (!points.length || !linePath) {
    return "";
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  return [
    linePath,
    `L ${formatSvgNumber(lastPoint.x)} ${formatSvgNumber(precipitationTimelineBaselineY)}`,
    `L ${formatSvgNumber(firstPoint.x)} ${formatSvgNumber(precipitationTimelineBaselineY)}`,
    "Z",
  ].join(" ");
}

function updatePrecipitationTimelineMarker(
  date = getSelectedWeatherDate(),
  range = precipitationTimelineRange,
  samples = precipitationTimelineSamples,
  selectedPrecipitation,
) {
  if (
    !elements.precipitationTimeline
    || elements.precipitationTimeline.hidden
    || !elements.precipitationTimelineMarker
    || !range
    || range.end <= range.start
  ) {
    return;
  }

  const selectedDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : range.start;
  const clampedTime = clampNumber(selectedDate.getTime(), range.start.getTime(), range.end.getTime());
  const sliderProgress = getRadarSliderProgressForDate(new Date(clampedTime), range);
  const position = getPrecipitationTimelineMarkerPosition(sliderProgress);

  elements.precipitationTimelineMarker.setAttribute("x1", formatSvgNumber(position));
  elements.precipitationTimelineMarker.setAttribute("x2", formatSvgNumber(position));

  const chartBounds = elements.precipitationTimelineChart?.getBoundingClientRect();
  if (chartBounds?.height > 0) {
    const sliderBounds = elements.radarSlider.getBoundingClientRect();
    const thumbTop = sliderBounds.top + (sliderBounds.height - getRadarSliderThumbSize()) / 2;
    const markerBottom = ((thumbTop - chartBounds.top) / chartBounds.height) * precipitationTimelineBaselineY;
    elements.precipitationTimelineMarker.setAttribute("y2", formatSvgNumber(markerBottom));
  }

  const precipitation = selectedPrecipitation || getSelectedTimePrecipitation(new Date(clampedTime));

  const nearestSample = getClosestPrecipitationTimelineSample(new Date(clampedTime), samples);
  if (nearestSample) {
    const summary = getPrecipitationTimelineSummary(
      samples,
      range,
      new Date(clampedTime),
      precipitation,
    );
    elements.precipitationTimeline.setAttribute("aria-label", summary);
    elements.precipitationTimeline.title = summary;
  }
}

function getPrecipitationTimelineMarkerPosition(progress) {
  return clampNumber(progress, 0, 1) * precipitationTimelineSvgWidth;
}

function getRadarSliderThumbSize() {
  const value = Number.parseFloat(window.getComputedStyle(elements.radarSlider).getPropertyValue("--radar-slider-thumb-size"));
  return Number.isFinite(value) && value > 0 ? value : 41;
}

function getClosestPrecipitationTimelineSample(date, samples = precipitationTimelineSamples) {
  if (!(date instanceof Date) || !samples?.length) {
    return undefined;
  }

  return samples
    .map((sample) => ({
      sample,
      distance: Math.abs(sample.date.getTime() - date.getTime()),
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.sample;
}

function getPrecipitationTimelineDominantType(samples) {
  return getDominantPrecipitationType(
    samples.map((sample) => sample.precipitation).filter(Boolean),
    { minimumChance: meaningfulPrecipitationChanceThreshold },
  );
}

function getPrecipitationTimelineSummary(samples, range, selectedDate, selectedPrecipitation) {
  const dominantType = getPrecipitationTimelineDominantType(samples);
  const wetSamples = samples.filter((sample) => sample.level > 0);
  const peakSample = samples.reduce((peak, sample) => (sample.level > peak.level ? sample : peak), samples[0]);
  const hasExactSelectedDate = selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime());
  const selectedSample = hasExactSelectedDate && selectedPrecipitation
    ? {
      date: selectedDate,
      precipitation: selectedPrecipitation,
      level: getPrecipitationTimelineLevel(selectedPrecipitation),
    }
    : getClosestPrecipitationTimelineSample(selectedDate, samples) || samples[0];
  const rangeLabel = `${formatClock(range.start)} to ${formatClock(range.end)}`;
  const selectedLabel = selectedSample
    ? `${formatClock(selectedSample.date)} ${getPrecipitationTimelineSampleLabel(selectedSample)}`
    : "selected time unavailable";

  if (!wetSamples.length) {
    return `Precipitation timeline from ${rangeLabel}: dry. Selected time ${selectedLabel}.`;
  }

  const peakIntensity = getPrecipitationTimelineSampleLabel(peakSample);
  return `${capitalizeWord(dominantType)} timeline from ${rangeLabel}: peak ${peakIntensity}. Selected time ${selectedLabel}.`;
}

function getPrecipitationTimelineSampleLabel(sample) {
  if (!sample?.precipitation || sample.level <= 0 || isPrecipitationDisplayDry(sample.precipitation)) {
    return "dry";
  }

  const type = sample.precipitation.type === "snow" ? "snow" : "rain";
  const intensity = sample.precipitation.intensity || getPrecipitationIntensityByRank(Math.round(sample.level * 3)) || "light";
  return `${intensity} ${type}`;
}

function formatSvgNumber(value) {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "0";
}

function renderRainSourceDebugPanel({ date = getSelectedWeatherDate(), precipitation } = {}) {
  if (!isRainSourceCompareEnabled || !elements.rainSourceDebugPanel || !elements.rainSourceDebugGrid) {
    return;
  }

  elements.rainSourceDebugPanel.hidden = false;
  syncRainSourceModeControls();

  if (!weatherData || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    elements.rainSourceDebugGrid.replaceChildren(
      createRainSourceDebugItem("Status", "Loading", "Waiting for weather data"),
    );
    return;
  }

  const effectiveDate = getEffectiveBuienradarForecastDate(date, "instant");
  const modelPrecipitation = getClosestHourlyModelPrecipitation(date);
  const buienradarPointAdjustment = getBuienradarPointAdjustmentForDate(effectiveDate, "instant");
  const buienradarImageAdjustment = getBuienradarImageAdjustmentForDate(effectiveDate, "instant");
  const knmiAdjustment = getKnmiAdjustmentForDate(effectiveDate, "instant");
  const knmiImageAdjustment = getBuienradarAdjustmentFromSampleSeries(
    getBestKnmiImageRainSampleSeries(effectiveDate),
    effectiveDate,
    "instant",
    {
      maxLookaheadHours: knmiRadarConfig.maxLookaheadHours,
      source: "knmi-image",
      weight: 1,
    },
  );
  const rows = [
    createRainSourceDebugItem(
      "Selected final",
      ...getRainSourcePrecipitationSummary(precipitation),
    ),
    createRainSourceDebugItem(
      `Timeline marker ${formatClock(date)}`,
      ...getRainSourcePrecipitationSummary(precipitation, "Timeline selection unavailable"),
    ),
    createRainSourceDebugItem(
      "Open-Meteo",
      ...getRainSourcePrecipitationSummary(modelPrecipitation, "Selected precipitation interval"),
    ),
  ];

  if (activeRainSourceMode === "current" || activeRainSourceMode === "compare") {
    rows.push(
      createRainSourceDebugItem(
        "Buienradar point",
        ...getRainSourceAdjustmentSummary(buienradarPointAdjustment, "No point sample"),
      ),
      createRainSourceDebugItem(
        "Buienradar image",
        ...getRainSourceAdjustmentSummary(buienradarImageAdjustment, "No image sample"),
      ),
    );
  }

  if (activeRainSourceMode === "knmi" || activeRainSourceMode === "compare") {
    rows.push(
      createRainSourceDebugItem(
        "KNMI point",
        ...getRainSourceAdjustmentSummary(knmiAdjustment, "No KNMI sample", getKnmiPointRainFallbackMeta()),
      ),
      createRainSourceDebugItem(
        "KNMI image",
        ...getRainSourceAdjustmentSummary(knmiImageAdjustment, "No KNMI image sample"),
      ),
    );
  }

  elements.rainSourceDebugGrid.replaceChildren(...rows);
}

function createRainSourceDebugItem(label, value, meta = "") {
  const item = document.createElement("article");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("span");
  const metaElement = document.createElement("span");

  item.className = "rain-source-debug-item";
  labelElement.className = "rain-source-debug-label";
  valueElement.className = "rain-source-debug-value";
  metaElement.className = "rain-source-debug-meta";
  labelElement.textContent = label;
  valueElement.textContent = value;
  metaElement.textContent = meta;
  metaElement.title = meta;
  item.append(labelElement, valueElement, metaElement);

  return item;
}

function getClosestHourlyModelPrecipitation(date) {
  const hourly = weatherData?.hourly;
  if (!hourly?.time?.length || !(date instanceof Date)) {
    return undefined;
  }

  return buildSelectedTimeModelPrecipitation(hourly, date);
}

function getRainSourcePrecipitationSummary(precipitation, fallbackMeta = "") {
  if (!precipitation) {
    return ["--", fallbackMeta || "No precipitation data"];
  }

  const isDry = isPrecipitationDisplayDry(precipitation);
  const value = isDry ? "Dry" : precipitation.value;
  const amount = isDry ? "" : formatRainSourceAmount(precipitation.amount, "mm");
  const meta = [
    precipitation.intensity || (isDry ? "dry" : "light"),
    amount,
    precipitation.radarAdjustment?.source,
    formatRainSourceLocality(precipitation.radarAdjustment),
    formatRainSourceTimestamp(precipitation.radarAdjustment?.time, "valid"),
    formatRainSourceTimestamp(precipitation.radarAdjustment?.referenceTime, "run"),
  ].filter(Boolean).join(" · ");

  return [value, meta || fallbackMeta];
}

function getRainSourceAdjustmentSummary(adjustment, fallbackValue, fallbackMeta = getRainSourceLoadingHint()) {
  if (!adjustment) {
    return [fallbackValue, fallbackMeta];
  }

  const value = roundRainChanceForDisplay(adjustment.chance) <= 0 ? "Dry" : formatOptionalRainChance(adjustment.chance);
  const amount = formatRainSourceAmount(
    adjustment.amount ?? adjustment.averageAmount ?? adjustment.peakAmount,
    adjustment.source === "knmi-point" ? "mm/h" : "mm",
  );
  const meta = [
    adjustment.intensity || getPrecipitationIntensityByRank(adjustment.intensityRank) || "dry",
    amount,
    Number.isFinite(adjustment.sampleCount) ? `${adjustment.wetSampleCount || 0}/${adjustment.sampleCount} wet` : "",
    formatRainSourceLocality(adjustment),
    formatRainSourceTimestamp(adjustment.time, "valid"),
    formatRainSourceTimestamp(adjustment.referenceTime, "run"),
    formatRainSourceAge(adjustment.fetchedAt, "fetched"),
    adjustment.proxyCacheStatus
      ? `proxy ${adjustment.proxyDiagnosticScope || "source"} ${adjustment.proxyCacheStatus}`
      : "",
    Number.isFinite(adjustment.proxyAgeSeconds)
      ? `proxy ${adjustment.proxyDiagnosticScope || "source"} age ${Math.round(adjustment.proxyAgeSeconds)}s`
      : "",
    adjustment.crs,
  ].filter(Boolean).join(" · ");

  return [value, meta];
}

function formatRainSourceTimestamp(value, label) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return `${label} ${formatClock(new Date(value), selectedLocation.timezone)}`;
}

function formatRainSourceAge(value, label, now = Date.now()) {
  if (!Number.isFinite(value) || !Number.isFinite(now)) {
    return "";
  }

  const ageMinutes = Math.max(0, Math.round((now - value) / (60 * 1000)));
  return `${label} ${ageMinutes}m ago`;
}

function formatRainSourceLocality(adjustment) {
  if (!Number.isFinite(adjustment?.exactSignal) && !Number.isFinite(adjustment?.nearbySignal)) {
    return "";
  }

  const exact = Number.isFinite(adjustment.exactSignal)
    ? `exact ${Math.round(adjustment.exactSignal * 100)}%`
    : "";
  const nearby = Number.isFinite(adjustment.nearbySignal)
    ? `nearby ${Math.round(adjustment.nearbySignal * 100)}%`
    : "";
  return [exact, nearby].filter(Boolean).join(" / ");
}

function formatRainSourceAmount(value, unit) {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (value <= 0) {
    return `0 ${unit}`;
  }

  if (value < 0.1) {
    return `<0.1 ${unit}`;
  }

  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${unit}`;
}

function getRainSourceLoadingHint() {
  return isInBuienradarBounds(selectedLocation) ? "Waiting for source" : "Outside NL source area";
}

function getKnmiPointRainFallbackMeta() {
  if (!isInBuienradarBounds(selectedLocation)) {
    return "Outside NL source area";
  }

  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  if (knmiPointRainRequests.has(locationKey)) {
    return "Loading KNMI source";
  }

  const error = knmiPointRainErrors.get(locationKey);
  if (error && Date.now() - error.fetchedAt < knmiPointRainCacheMaxAgeMs) {
    return error.message;
  }

  return "Waiting for source";
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
  const precipitation = getSelectedTimePrecipitation(summaryDate) || {
    ...buildBasePrecipitationChance({
      weatherCode: snapshot.weatherCode,
      temperature: snapshot.temperature,
      includeIntensity: true,
    }),
    scopeLabel: "Selected time",
  };
  const adjustedWeatherCode = getRadarAdjustedSnapshotWeatherCode(snapshot, precipitation);

  renderCurrentTemperatureRange(buildSelectedDayTemperatureRange(weatherData, summaryDate, snapshot));
  renderCurrentPrecipitation(precipitation);

  renderTimedCondition(getCondition(adjustedWeatherCode, snapshot.isDaytime));
  renderTemperatureAndWind(snapshot);
  renderRainSourceDebugPanel({ date: summaryDate, precipitation });
  if (isOutfitMode) {
    renderOutfitScene(snapshot, precipitation, adjustedWeatherCode);
    elements.outfitScene.hidden = false;
  }

  return precipitation;
}

function getSelectedWeatherDate() {
  return getActiveRadarDate() || (weatherData?.current?.time ? new Date(weatherData.current.time * 1000) : undefined);
}

function getCurrentWeatherSnapshot(current = {}) {
  return {
    condition: getCondition(current.weather_code, current.is_day),
    weatherCode: current.weather_code,
    isDaytime: current.is_day !== 0 && current.is_day !== false,
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

  const weatherCode = hourly.weather_code?.[index];
  const isDay = hourly.is_day?.[index] ?? isForecastHourDaytime(hourly.time[index]);

  return {
    condition: getCondition(weatherCode, isDay),
    weatherCode,
    isDaytime: isDay !== 0 && isDay !== false,
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

function getRadarAdjustedSnapshotWeatherCode(snapshot, precipitation) {
  return getPrecipitationAdjustedWeatherCode(snapshot.weatherCode, precipitation);
}

function getSelectedTimePrecipitation(date) {
  if (!date || !weatherData?.hourly?.time?.length) {
    return undefined;
  }

  return buildSelectedTimePrecipitation(weatherData.hourly, date);
}

function buildSelectedTimePrecipitation(hourly, date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime()) || !hourly?.time?.length) {
    return undefined;
  }

  const forecastTime = date.getTime() / 1000;
  const precipitation = buildSelectedTimeModelPrecipitation(hourly, date);
  if (!precipitation) {
    return undefined;
  }
  const radarAdjustment = getPrecipitationTimelineRadarAdjustment(date);
  const adjustedPrecipitation = radarAdjustment
    ? buildRadarImageTimelinePrecipitation(precipitation, radarAdjustment)
    : withBuienradarPrecipitationAdjustment(precipitation, forecastTime, {
      includeIntensity: true,
      radarSampleMode: "instant",
      allowImageFallback: !hasMissingDisplayedBuienradarSample(date),
    });

  return {
    ...adjustedPrecipitation,
    scopeLabel: "Selected time",
  };
}

function buildSelectedTimeModelPrecipitation(hourly, date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime()) || !hourly?.time?.length) {
    return undefined;
  }

  const forecastTime = date.getTime() / 1000;
  const weatherIndex = getClosestTimeIndex(hourly.time, forecastTime);
  const precipitationIndex = getPrecipitationIntervalTimeIndex(hourly.time, forecastTime);
  if (weatherIndex < 0) {
    return undefined;
  }

  return buildBasePrecipitationChance({
    chance: hourly.precipitation_probability?.[precipitationIndex],
    weatherCode: hourly.weather_code?.[weatherIndex],
    rainAmount: hourly.rain?.[precipitationIndex],
    showersAmount: hourly.showers?.[precipitationIndex],
    snowfallAmount: hourly.snowfall?.[precipitationIndex],
    temperature: hourly.temperature_2m?.[weatherIndex],
    stormSignal: getStormSignalForForecastTime(forecastTime, { hourly, index: weatherIndex }),
    includeIntensity: true,
  });
}

function buildTimelineHourlyPrecipitation(hourly, index, date) {
  return buildSelectedTimePrecipitation(hourly, date);
}

function getPrecipitationIntervalTimeIndex(times, targetTime) {
  if (!times?.length || !Number.isFinite(targetTime)) {
    return -1;
  }

  return times.findIndex((time) => time > targetTime);
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
  if (activeRadarDate) {
    committedRadarSliderMin = getRadarSliderMin();
  }
  const precipitation = renderSelectedWeather(activeRadarDate);
  updatePrecipitationTimelineMarker(activeRadarDate, precipitationTimelineRange, precipitationTimelineSamples, precipitation);
}

function getActiveRadarDate() {
  if (activeRadarDate) {
    return activeRadarDate;
  }

  return getRadarDateForSlider(Number(elements.radarSlider.value) || 0);
}

function toggleOutfitMode() {
  setOutfitMode(!isOutfitMode);
  trackAnalyticsEvent(isOutfitMode ? "outfit_mode" : "radar_mode");
}

function setOutfitMode(enabled) {
  isOutfitMode = Boolean(enabled);
  elements.radarPanel.classList.toggle("is-outfit-mode", isOutfitMode);
  elements.outfitModeToggle.setAttribute("aria-pressed", String(isOutfitMode));
  updateOutfitModeToggle();

  if (isOutfitMode) {
    renderSelectedWeather();
    scheduleOutfitScenePreload();
  } else {
    elements.outfitScene.hidden = true;
    cancelOutfitScenePreload();
    refreshMapSize();
  }
}

function bindEasterEggEvents() {
  if (!elements.currentTemp || !elements.easterEggScene || !elements.easterEggVideo || !elements.easterEggFallback) {
    return;
  }

  elements.currentTemp.addEventListener("click", handleEasterEggTemperatureClick);
  elements.easterEggScene.addEventListener("click", hideEasterEgg);
  elements.easterEggVideo.addEventListener("ended", hideEasterEgg);
}

function handleEasterEggTemperatureClick() {
  if (isEasterEggActive) {
    hideEasterEgg();
  } else {
    showEasterEgg();
  }
}

function showEasterEgg() {
  if (isEasterEggActive) {
    return;
  }

  isEasterEggActive = true;
  elements.radarPanel.classList.add("is-easter-egg-active");
  elements.easterEggScene.hidden = false;
  elements.easterEggVideo.poster = buildEasterEggAssetUrl(easterEggDanceVideo.poster);
  elements.easterEggFallback.src = buildEasterEggAssetUrl(easterEggDanceVideo.poster);
  elements.easterEggVideo.currentTime = 0;

  if (shouldUseEasterEggFallback()) {
    elements.easterEggVideo.hidden = true;
    elements.easterEggFallback.hidden = false;
    trackAnalyticsEvent("easter_egg_rain_dance_fallback");
    return;
  }

  elements.easterEggFallback.hidden = true;
  elements.easterEggVideo.hidden = false;

  if (!easterEggVideoSrcLoaded) {
    elements.easterEggVideo.src = buildEasterEggAssetUrl(easterEggDanceVideo.src);
    easterEggVideoSrcLoaded = true;
  }

  const playPromise = elements.easterEggVideo.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {
      elements.easterEggVideo.hidden = true;
      elements.easterEggFallback.hidden = false;
    });
  }
  trackAnalyticsEvent("easter_egg_rain_dance");
}

function hideEasterEgg() {
  if (!elements.easterEggScene || !isEasterEggActive) {
    return;
  }

  isEasterEggActive = false;
  elements.radarPanel.classList.remove("is-easter-egg-active");
  elements.easterEggVideo.pause();
  elements.easterEggVideo.currentTime = 0;
  elements.easterEggScene.hidden = true;
}

function buildEasterEggAssetUrl(path) {
  return `${path}?v=${easterEggAssetVersion}`;
}

function shouldUseEasterEggFallback() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  return Boolean(prefersReducedMotion || connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType));
}

function updateOutfitModeToggle() {
  const label = isOutfitMode ? "Show rain radar" : "Show outfit suggestion";
  const iconName = isOutfitMode ? "map" : "shirt";
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", iconName);
  icon.setAttribute("aria-hidden", "true");
  elements.outfitModeToggle.title = label;
  elements.outfitModeToggle.setAttribute("aria-label", label);
  elements.outfitModeToggle.replaceChildren(icon);
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderOutfitScene(snapshot, precipitation, weatherCode) {
  const overrideSceneId = getOutfitSceneOverrideId();
  const sceneId = overrideSceneId || getOutfitSceneId(snapshot, precipitation, weatherCode);
  const scene = outfitScenes[sceneId] || outfitScenes[outfitDefaultSceneId];

  if (!scene) {
    updateOutfitDebugBadge();
    return;
  }

  const timeOverride = getOutfitTimeOverride(overrideSceneId);
  const timeOfDay = timeOverride || getOutfitSceneTimeOfDay(snapshot);
  const assets = resolveOutfitSceneAssets(scene, timeOfDay);
  const visualKey = [sceneId, assets.background, assets.character].join("|");
  activeOutfitSceneId = sceneId;

  if (activeOutfitSceneVisualKey !== visualKey) {
    activeOutfitSceneVisualKey = visualKey;
    elements.outfitSceneBackground.src = buildOutfitSceneAssetUrl(outfitSceneBackgroundBasePath, assets.background);
    elements.outfitSceneCharacter.src = buildOutfitSceneAssetUrl(outfitSceneCharacterBasePath, assets.character);
    setOutfitSceneProperty("--outfit-background-position", scene.backgroundPosition);
    setOutfitSceneProperty("--outfit-background-position-mobile", scene.backgroundPositionMobile);
    setOutfitSceneProperty("--outfit-background-position-wide", scene.backgroundPositionWide);
    setOutfitSceneProperty("--outfit-character-height", scene.characterHeight);
    setOutfitSceneProperty("--outfit-character-height-mobile", scene.characterHeightMobile);
    setOutfitSceneProperty("--outfit-character-height-wide", scene.characterHeightWide);
    setOutfitSceneProperty("--outfit-character-max-width", scene.characterMaxWidth);
    setOutfitSceneProperty("--outfit-character-max-width-mobile", scene.characterMaxWidthMobile);
    setOutfitSceneProperty("--outfit-character-max-width-wide", scene.characterMaxWidthWide);
    setOutfitSceneProperty("--outfit-character-x", scene.characterX);
  }

  elements.outfitSceneCharacter.alt = scene.alt;
  elements.outfitSceneCharacter.title = scene.label;
  elements.outfitScene.dataset.outfitScene = sceneId;
  elements.outfitScene.dataset.outfitTime = timeOfDay;
  elements.outfitScene.setAttribute("aria-label", scene.label);
  updateOutfitDebugBadge(overrideSceneId, scene, timeOverride);
}

function getOutfitSceneTimeOfDay(snapshot = {}) {
  return snapshot.isDaytime === false || snapshot.isDaytime === 0 ? "night" : "day";
}

function resolveOutfitSceneAssets(scene, timeOfDay) {
  const isNight = timeOfDay === "night";

  return {
    background: isNight && scene.nightBackground ? scene.nightBackground : scene.background,
    character: isNight && scene.nightCharacter ? scene.nightCharacter : scene.character,
  };
}

function setOutfitSceneProperty(property, value) {
  if (value) {
    elements.outfitScene.style.setProperty(property, value);
  } else {
    elements.outfitScene.style.removeProperty(property);
  }
}

function getOutfitSceneOverrideId() {
  if (!isOutfitDebugEnabled) {
    return undefined;
  }

  const sceneId = queryParams.get(outfitSceneOverrideQueryParam);
  return outfitScenes[sceneId] ? sceneId : undefined;
}

function getOutfitTimeOverride(sceneId) {
  if (!isOutfitDebugEnabled || !sceneId) {
    return undefined;
  }

  const timeOfDay = queryParams.get(outfitTimeOverrideQueryParam);
  return timeOfDay === "day" || timeOfDay === "night" ? timeOfDay : undefined;
}

function updateOutfitDebugBadge(sceneId, scene, timeOverride) {
  if (!elements.outfitDebugBadge) {
    return;
  }

  if (isOutfitDebugEnabled && sceneId && scene) {
    elements.outfitDebugBadge.hidden = false;
    elements.outfitDebugBadge.textContent = `Forced outfit: ${sceneId}${timeOverride ? ` · ${timeOverride}` : ""}`;
    elements.outfitDebugBadge.title = scene.label;
    return;
  }

  elements.outfitDebugBadge.hidden = true;
  elements.outfitDebugBadge.textContent = "";
  elements.outfitDebugBadge.title = "";
}

function getOutfitSceneId(snapshot = {}, precipitation, weatherCode = snapshot.weatherCode) {
  const code = Number(weatherCode);
  const chance = Number.isFinite(precipitation?.chance) ? precipitation.chance : undefined;
  const type = precipitation?.type === "snow" ? "snow" : "rain";
  const isSnow = type === "snow";
  const isRain = type === "rain";
  const hasRainCode = isRainOutfitWeatherCode(code);
  const hasSnowCode = isSnowOutfitWeatherCode(code);
  const isWarmWet = isWarmWetOutfitTemperature(snapshot.temperature, activeOutfitSceneId);
  const heavyPrecipitationThreshold = isHeavyOutfitScene(activeOutfitSceneId)
    ? outfitPrecipitationLeaveChance
    : outfitPrecipitationEnterChance;
  const precipitationThreshold = isPrecipitationOutfitScene(activeOutfitSceneId)
    ? outfitPrecipitationLeaveChance
    : outfitPrecipitationEnterChance;
  const lightPrecipitationThreshold = activeOutfitSceneId === "drizzle" || activeOutfitSceneId === "warm-drizzle"
    ? outfitLightPrecipitationLeaveChance
    : outfitLightPrecipitationEnterChance;

  if (outfitThunderstormCodes.has(code)) {
    return "thunderstorm";
  }

  if (
    outfitHeavySnowCodes.has(code)
    || (
      hasSnowCode
      && isSnow
      && precipitation?.intensity === "heavy"
      && isChanceAtLeast(chance, heavyPrecipitationThreshold)
    )
  ) {
    return "heavy-snow";
  }

  if (
    outfitSnowCodes.has(code)
    || (hasSnowCode && isSnow && isChanceAtLeast(chance, lightPrecipitationThreshold))
  ) {
    return "snow";
  }

  if (
    outfitHeavyRainCodes.has(code)
    || (
      hasRainCode
      && isRain
      && precipitation?.intensity === "heavy"
      && isChanceAtLeast(chance, heavyPrecipitationThreshold)
    )
  ) {
    return isWarmWet ? "warm-heavy-rain" : "heavy-rain";
  }

  if (outfitFreezingRainCodes.has(code)) {
    return "heavy-rain";
  }

  if (
    outfitRainCodes.has(code)
    || (hasRainCode && isRain && isChanceAtLeast(chance, precipitationThreshold))
  ) {
    return isWarmWet ? "warm-rain" : "rain";
  }

  if (
    outfitDrizzleCodes.has(code)
    || (
      hasRainCode
      && isRain
      && precipitation?.intensity !== "heavy"
      && isChanceAtLeast(chance, lightPrecipitationThreshold)
    )
  ) {
    return isWarmWet ? "warm-drizzle" : "drizzle";
  }

  if (outfitFogCodes.has(code)) {
    return "fog";
  }

  if (Number.isFinite(snapshot.windSpeed)) {
    const windThreshold = activeOutfitSceneId === "windy" ? outfitWindLeaveKmh : outfitWindEnterKmh;
    if (snapshot.windSpeed >= windThreshold) {
      return "windy";
    }
  }

  return getTemperatureOutfitSceneId(snapshot.temperature, activeOutfitSceneId);
}

function getTemperatureOutfitSceneId(temperature, previousSceneId) {
  if (!Number.isFinite(temperature)) {
    return outfitDefaultSceneId;
  }

  const previousState = outfitTemperatureStates.find((state) => state.id === previousSceneId);
  if (
    previousState
    && temperature >= previousState.min - outfitTemperatureHysteresisC
    && temperature <= previousState.max + outfitTemperatureHysteresisC
  ) {
    return previousState.id;
  }

  return outfitTemperatureStates.find((state) => temperature >= state.min && temperature <= state.max)?.id || outfitDefaultSceneId;
}

function isWarmWetOutfitTemperature(temperature, previousSceneId) {
  if (!Number.isFinite(temperature)) {
    return false;
  }

  const threshold = isWarmWetOutfitScene(previousSceneId)
    ? outfitWarmWetLeaveTemperatureC
    : outfitWarmWetEnterTemperatureC;
  return temperature >= threshold;
}

function isChanceAtLeast(chance, threshold) {
  return Number.isFinite(chance) && chance >= threshold;
}

function isRainOutfitWeatherCode(code) {
  return outfitHeavyRainCodes.has(code)
    || outfitFreezingRainCodes.has(code)
    || outfitRainCodes.has(code)
    || outfitDrizzleCodes.has(code);
}

function isSnowOutfitWeatherCode(code) {
  return outfitHeavySnowCodes.has(code) || outfitSnowCodes.has(code);
}

function isPrecipitationOutfitScene(sceneId) {
  return ["drizzle", "rain", "heavy-rain", "warm-drizzle", "warm-rain", "warm-heavy-rain", "snow", "heavy-snow"].includes(sceneId);
}

function isHeavyOutfitScene(sceneId) {
  return sceneId === "heavy-rain" || sceneId === "warm-heavy-rain" || sceneId === "heavy-snow";
}

function isWarmWetOutfitScene(sceneId) {
  return sceneId === "warm-drizzle" || sceneId === "warm-rain" || sceneId === "warm-heavy-rain";
}

function scheduleOutfitScenePreload() {
  if (!shouldPreloadOutfitScenes() || outfitScenePreloadTimer || outfitScenePreloadIdleHandle || outfitScenePreloadQueue.length) {
    return;
  }

  outfitScenePreloadQueue = [...new Set([activeOutfitSceneId, ...outfitSceneIds])]
    .filter((sceneId) => sceneId && !preloadedOutfitSceneIds.has(sceneId));
  scheduleNextOutfitScenePreload(outfitScenePreloadInitialDelayMs);
}

function shouldPreloadOutfitScenes() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  return isOutfitMode && !(connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType));
}

function scheduleNextOutfitScenePreload(delayMs = outfitScenePreloadStepDelayMs) {
  if (!shouldPreloadOutfitScenes() || !outfitScenePreloadQueue.length) {
    return;
  }

  outfitScenePreloadTimer = window.setTimeout(() => {
    outfitScenePreloadTimer = undefined;

    if (!shouldPreloadOutfitScenes()) {
      return;
    }

    if ("requestIdleCallback" in window) {
      outfitScenePreloadIdleHandle = window.requestIdleCallback(preloadNextOutfitScene, {
        timeout: outfitScenePreloadIdleTimeoutMs,
      });
    } else {
      preloadNextOutfitScene();
    }
  }, delayMs);
}

function preloadNextOutfitScene() {
  outfitScenePreloadIdleHandle = undefined;

  if (!shouldPreloadOutfitScenes()) {
    return;
  }

  const sceneId = outfitScenePreloadQueue.shift();
  if (!sceneId) {
    return;
  }

  preloadOutfitSceneImages(sceneId);
  scheduleNextOutfitScenePreload();
}

function preloadOutfitSceneImages(sceneId) {
  const scene = outfitScenes[sceneId];
  if (!scene || preloadedOutfitSceneIds.has(sceneId)) {
    return;
  }

  preloadedOutfitSceneIds.add(sceneId);
  const assetSpecs = [
    [outfitSceneBackgroundBasePath, scene.background],
    [outfitSceneBackgroundBasePath, scene.nightBackground],
    [outfitSceneCharacterBasePath, scene.character],
    [outfitSceneCharacterBasePath, scene.nightCharacter],
  ];
  const seenUrls = new Set();
  const images = assetSpecs.flatMap(([basePath, fileName]) => {
    if (!fileName) {
      return [];
    }

    const url = buildOutfitSceneAssetUrl(basePath, fileName);
    if (seenUrls.has(url)) {
      return [];
    }

    seenUrls.add(url);
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    return [image];
  });
  outfitScenePreloadImages.set(sceneId, images);
}

function cancelOutfitScenePreload() {
  window.clearTimeout(outfitScenePreloadTimer);
  outfitScenePreloadTimer = undefined;
  outfitScenePreloadQueue = [];

  if (outfitScenePreloadIdleHandle && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(outfitScenePreloadIdleHandle);
  }

  outfitScenePreloadIdleHandle = undefined;
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
  const { todayKey, currentTime } = getForecastTiming(data);
  const hourlyTemperatures = getForecastHourEntries(data?.hourly, todayKey, {
    currentTime,
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
  const { todayKey, currentTime } = getForecastTiming(data);
  const hours = buildHourlyForecastForDay(data?.hourly, todayKey, {
    currentTime,
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
    currentTime,
  };
}

function buildFiveDayForecast(data) {
  const daily = data?.daily;
  const hourly = data?.hourly;

  if (!daily?.time?.length) {
    return [];
  }

  const { todayKey, currentTime } = getForecastTiming(data);

  return daily.time.slice(0, 5).map((time, index) => {
    const dailyPrecipitation = buildDailyPrecipitation(daily, index, daily.temperature_2m_max?.[index]);
    const key = formatDateKey(time);
    const isToday = key === todayKey;
    const temperatureRange = isToday
      ? buildCurrentDayTemperatureRange(data)
      : buildDailyTemperatureRange(daily, index);

    const hours = buildHourlyForecastForDay(hourly, key, {
      currentTime,
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

  cell.className = "forecast-rain-cell";
  cell.title = precipitation.ariaLabel;
  cell.setAttribute("aria-label", precipitation.ariaLabel);
  value.className = "forecast-precipitation-value";
  value.classList.toggle("is-dry", isPrecipitationDisplayDry(precipitation));
  value.setAttribute("aria-hidden", "true");
  value.append(...createPrecipitationDisplayParts(precipitation, "forecast"));
  cell.appendChild(value);

  return cell;
}

function createPrecipitationDisplayParts(precipitation, context = "forecast", amountElement) {
  const amount = amountElement || document.createElement("span");
  amount.classList.add("precipitation-display-text");
  amount.textContent = getPrecipitationDisplayValue(precipitation);

  if (shouldShowPrecipitationIntensityMeter(precipitation)) {
    return [createPrecipitationIntensityMeter(precipitation, context), amount];
  }

  return [amount];
}

function createPrecipitationIntensityMeter(precipitation, context = "forecast") {
  const meter = document.createElement("span");
  const rank = getPrecipitationIntensityRank(precipitation.intensity);
  const type = precipitation.type === "snow" ? "snow" : "rain";

  meter.className = `precipitation-intensity-meter precipitation-intensity-meter--${context} precipitation-intensity-meter--${type}`;
  meter.title = `${capitalizeWord(precipitation.intensity)} ${type} intensity`;
  meter.setAttribute("aria-hidden", "true");

  for (let index = 1; index <= 3; index += 1) {
    const segment = document.createElement("span");

    segment.className = "precipitation-intensity-segment";
    segment.classList.toggle("is-active", index <= rank);
    meter.appendChild(segment);
  }

  return meter;
}

function shouldShowPrecipitationIntensityMeter(precipitation) {
  return !isPrecipitationDisplayDry(precipitation) && getPrecipitationIntensityRank(precipitation?.intensity) > 0;
}

function getPrecipitationDisplayValue(precipitation) {
  return isPrecipitationDisplayDry(precipitation) ? "Dry" : precipitation?.value || "--%";
}

function isPrecipitationDisplayDry(precipitation) {
  if (!Number.isFinite(precipitation?.chance)) {
    return false;
  }

  return roundRainChanceForDisplay(precipitation.chance) <= 0;
}

function capitalizeWord(value) {
  return typeof value === "string" && value.length
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : "";
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

  cell.className = "hourly-rain";
  cell.setAttribute("role", "cell");
  cell.setAttribute("aria-label", precipitation.ariaLabel);
  cell.title = precipitation.ariaLabel;
  value.className = "hourly-precipitation-value";
  value.classList.toggle("is-dry", isPrecipitationDisplayDry(precipitation));
  value.setAttribute("aria-hidden", "true");
  value.append(...createPrecipitationDisplayParts(precipitation, "hourly"));

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

function buildHourlyForecastForDay(hourly, dayKey, { currentTime, isToday } = {}) {
  if (!hourly?.time?.length) {
    return [];
  }

  return buildHourlyForecastEntries(hourly, getForecastHourEntries(hourly, dayKey, { currentTime, isToday }));
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
    const precipitation = buildHourlyPrecipitation(hourly, index, {
      includeIntensity: true,
    });
    const adjustedWeatherCode = getPrecipitationAdjustedWeatherCode(weatherCode, precipitation);
    return {
      time: formatTime(time),
      weatherCode: adjustedWeatherCode,
      isDaytime: isDay !== 0 && isDay !== false,
      condition: getCondition(adjustedWeatherCode, isDay),
      temperature: formatOptionalTemperature(hourly.temperature_2m?.[index]),
      precipitation,
      windDirection,
      windSpeed,
      wind: formatOptionalWind(windDirection, windSpeed),
    };
  });
}

function buildHourlyPrecipitation(hourly, index, { includeIntensity = false, radarSampleMode = "hourly", radarTime } = {}) {
  const weatherCode = hourly?.weather_code?.[index];
  const precipitationIndex = getPrecipitationIntervalTimeIndex(hourly?.time, hourly?.time?.[index]);
  const forecastTime = radarTime ?? hourly?.time?.[index];

  return buildPrecipitationChance({
    chance: hourly?.precipitation_probability?.[precipitationIndex],
    weatherCode,
    rainAmount: hourly?.rain?.[precipitationIndex],
    showersAmount: hourly?.showers?.[precipitationIndex],
    snowfallAmount: hourly?.snowfall?.[precipitationIndex],
    temperature: hourly?.temperature_2m?.[index],
    stormSignal: getStormSignalForForecastTime(forecastTime, { hourly, index }),
    forecastTime,
    radarSampleMode,
    includeIntensity,
  });
}

function buildHourlyModelPrecipitation(hourly, index, { includeIntensity = true } = {}) {
  const weatherCode = hourly?.weather_code?.[index];
  const precipitationIndex = getPrecipitationIntervalTimeIndex(hourly?.time, hourly?.time?.[index]);

  return buildBasePrecipitationChance({
    chance: hourly?.precipitation_probability?.[precipitationIndex],
    weatherCode,
    rainAmount: hourly?.rain?.[precipitationIndex],
    showersAmount: hourly?.showers?.[precipitationIndex],
    snowfallAmount: hourly?.snowfall?.[precipitationIndex],
    temperature: hourly?.temperature_2m?.[index],
    stormSignal: getStormSignalForForecastTime(hourly?.time?.[index], { hourly, index }),
    includeIntensity,
  });
}

function getStormSignalForForecastTime(forecastTime, { hourly, index } = {}) {
  if (forecastTime === undefined || forecastTime === null) {
    return undefined;
  }

  const forecastDate = toForecastDate(forecastTime);
  if (!(forecastDate instanceof Date) || Number.isNaN(forecastDate.getTime())) {
    return undefined;
  }

  const hourlyCape = Number(hourly?.cape?.[index]);
  const hourlyWeatherCode = Number(hourly?.weather_code?.[index]);
  const minutely = weatherData?.minutely_15;
  const minutelyIndex = getClosestStormMinutelyIndex(minutely, forecastDate);
  const minutelyCape = Number(minutely?.cape?.[minutelyIndex]);
  const lightningPotential = Number(minutely?.lightning_potential?.[minutelyIndex]);
  const minutelyWeatherCode = Number(minutely?.weather_code?.[minutelyIndex]);
  const cape = getMaxFiniteValue(hourlyCape, minutelyCape);
  const hasThunderstormCode = thunderstormWeatherCodes.has(hourlyWeatherCode) || thunderstormWeatherCodes.has(minutelyWeatherCode);

  if (
    !hasThunderstormCode
    && !Number.isFinite(cape)
    && !Number.isFinite(lightningPotential)
  ) {
    return undefined;
  }

  return {
    cape,
    lightningPotential: Number.isFinite(lightningPotential) ? lightningPotential : undefined,
    hasThunderstormCode,
  };
}

function getClosestStormMinutelyIndex(minutely, forecastDate) {
  if (!minutely?.time?.length) {
    return -1;
  }

  const index = getClosestTimeIndex(minutely.time, forecastDate.getTime() / 1000);
  if (index < 0) {
    return -1;
  }

  const distanceSeconds = Math.abs(minutely.time[index] - forecastDate.getTime() / 1000);
  return distanceSeconds <= 45 * 60 ? index : -1;
}

function getMaxFiniteValue(...values) {
  const finiteValues = values.filter(Number.isFinite);
  return finiteValues.length ? Math.max(...finiteValues) : undefined;
}

function getForecastHourEntries(hourly, dayKey, { currentTime, isToday } = {}) {
  if (!hourly?.time?.length) {
    return [];
  }

  return hourly.time
    .map((time, index) => ({ time, index }))
    .filter(({ time }) => formatDateKey(time) === dayKey)
    // Compare instants so the first repeated autumn hour is not kept after it ends.
    .filter(({ time }) => !isToday || time > currentTime - 60 * 60);
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
    .filter(({ time }) => time > startTime - hourLookbackSeconds);
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
  try {
    if (typeof L === "undefined" || typeof L.map !== "function") {
      throw new Error("Map library unavailable");
    }

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
    isMapUnavailable = false;
    return true;
  } catch (error) {
    console.warn("Map unavailable; continuing with the forecast.", error);
    isMapUnavailable = true;
    try {
      map?.remove?.();
    } catch (cleanupError) {
      console.warn("Could not finish map cleanup.", cleanupError);
    }
    map = undefined;
    locationMarker = undefined;
    buienradarModeControlContainer = undefined;
    buienradarModeButton = undefined;
    // A failed constructor or control may leave a partially built map behind.
    elements.radarMap.replaceChildren();
    elements.radarMap.removeAttribute("tabindex");
    elements.radarMap.classList.remove("leaflet-container", "leaflet-grab");
    disableRadar("Map unavailable");
    return false;
  }
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

  if (isMapUnavailable || isBuienradarRadarModeLoading || !isInBuienradarBounds(selectedLocation) || !buienradarFrameUrls.length) {
    return;
  }

  radarLoadRequestId += 1;
  const radarRequestId = radarLoadRequestId;
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const nextModeId = getNextBuienradarRadarModeId(getDisplayedBuienradarRadarModeId());
  const cachedRadar = getFreshBuienradarRadarCache(nextModeId);
  activeBuienradarRadarModeId = nextModeId;

  if (cachedRadar) {
    buienradarDisplayRequestId += 1;
    displayBuienradarModeRadar(cachedRadar);
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
    if (
      radarRequestId === radarLoadRequestId
      && locationKey === getBuienradarSampleLocationKey(selectedLocation)
      && requestId === buienradarDisplayRequestId
      && activeBuienradarRadarModeId === nextModeId
      && isInBuienradarBounds(selectedLocation)
    ) {
      displayBuienradarModeRadar(radar);
      trackAnalyticsEvent(`radar_${nextModeId}`);
      scheduleInactiveBuienradarRadarPreload();
    }
  } catch (error) {
    if (
      radarRequestId === radarLoadRequestId
      && locationKey === getBuienradarSampleLocationKey(selectedLocation)
    ) {
      activeBuienradarRadarModeId = getDisplayedBuienradarRadarModeId();
      console.warn(`Could not switch to the ${nextModeId} Buienradar mode.`, error);
    }
  } finally {
    if (radarRequestId === radarLoadRequestId) {
      isBuienradarRadarModeLoading = false;
      setRefreshButtonWorking(false);
      updateBuienradarModeControl();
    }
  }
}

function updateBuienradarModeControl() {
  if (!buienradarModeControlContainer || !buienradarModeButton) {
    return;
  }

  const isAvailable = isInBuienradarBounds(selectedLocation) && displayedRadarSource !== "knmi";
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

function isKnmiPrimaryRadarModeActive() {
  return !isRainSourceCompareEnabled || activeRainSourceMode === "compare";
}

function displayBuienradarModeRadar(radar) {
  if (displayedRadarSource === "hybrid" && knmiRadarCache && isKnmiPrimaryRadarModeActive()) {
    displayHybridRadar(knmiRadarCache, radar);
    return;
  }

  displayBuienradarRadar(radar);
}

function createRadarLoadContext({ forceRefresh = true, trigger = "other" } = {}) {
  const requestId = radarLoadRequestId + 1;
  const location = { ...selectedLocation };
  radarLoadRequestId = requestId;
  if (isBuienradarRadarModeLoading) {
    isBuienradarRadarModeLoading = false;
    setRefreshButtonWorking(false);
  }
  return {
    requestId,
    location,
    locationKey: getBuienradarSampleLocationKey(location),
    isInNetherlandsRadarBounds: isInBuienradarBounds(location),
    radarModeId: activeBuienradarRadarModeId,
    rainSourceMode: activeRainSourceMode,
    forceRefresh,
    trigger,
    radarTiming: createRadarTimingSession(),
  };
}

function hasUsableRadarDisplay() {
  return Boolean(
    displayedRadarSource !== "none"
    && (radarFrames.length || knmiFrameUrls.length || buienradarFrameUrls.length),
  );
}

function isRadarLoadContextCurrent(context) {
  return Boolean(
    context
    && context.requestId === radarLoadRequestId
    && context.locationKey === getBuienradarSampleLocationKey(selectedLocation)
    && context.radarModeId === activeBuienradarRadarModeId
    && context.rainSourceMode === activeRainSourceMode,
  );
}

async function loadRadar(options = {}) {
  if (isMapUnavailable) {
    disableRadar("Map unavailable");
    return;
  }

  const context = createRadarLoadContext(options);
  const hadUsableRadar = hasUsableRadarDisplay();
  if (hadUsableRadar) {
    markRetainedRadarUsable(context);
  }
  setRadarMapStatus(hadUsableRadar ? "Updating rain forecast..." : "Loading rain forecast...");
  updateBuienradarModeControl();
  let didAttemptBuienradar = false;

  if (context.isInNetherlandsRadarBounds) {
    if (isRainSourceCompareEnabled && context.rainSourceMode === "current") {
      try {
        didAttemptBuienradar = true;
        await loadBuienradarRadar(context);
        if (!isRadarLoadContextCurrent(context)) {
          return;
        }
        updateBuienradarModeControl();
        return;
      } catch (error) {
        if (!isRadarLoadContextCurrent(context)) {
          return;
        }
        console.warn("Buienradar animation unavailable, falling back to LibreWXR tiles.", error);
      }
    } else if (isRainSourceCompareEnabled && context.rainSourceMode === "knmi") {
      try {
        await loadKnmiRadar(context);
        if (!isRadarLoadContextCurrent(context)) {
          return;
        }
        updateBuienradarModeControl();
        return;
      } catch (error) {
        if (!isRadarLoadContextCurrent(context)) {
          return;
        }
        console.warn("KNMI radar unavailable, falling back to Buienradar animation.", error);
      }
    } else {
      try {
        didAttemptBuienradar = true;
        await loadHybridRadar(context);
        if (!isRadarLoadContextCurrent(context)) {
          return;
        }
        updateBuienradarModeControl();
        return;
      } catch (error) {
        if (!isRadarLoadContextCurrent(context)) {
          return;
        }
        console.warn("KNMI radar unavailable, falling back to Buienradar animation.", error);
      }
    }

    if (!didAttemptBuienradar) {
      try {
        await loadBuienradarRadar(context);
        if (!isRadarLoadContextCurrent(context)) {
          return;
        }
        updateBuienradarModeControl();
        return;
      } catch (error) {
        if (!isRadarLoadContextCurrent(context)) {
          return;
        }
        console.warn("Buienradar animation unavailable, falling back to LibreWXR tiles.", error);
      }
    }
  }

  try {
    await loadLibreWxrRadar(context);
    if (isRadarLoadContextCurrent(context) && context.isInNetherlandsRadarBounds) {
      markFirstUsableRadar(context, "librewxr");
      reportRadarTiming(context, "librewxr_fallback");
    }
  } catch (error) {
    if (!isRadarLoadContextCurrent(context)) {
      return;
    }
    console.error(error);
    if (context.isInNetherlandsRadarBounds) {
      reportRadarTiming(context, hadUsableRadar ? "retained" : "unavailable");
    }
    if (hadUsableRadar) {
      setRadarMapStatus("Radar update delayed", { isError: true });
    } else {
      disableRadar("Radar unavailable");
    }
  } finally {
    if (isRadarLoadContextCurrent(context)) {
      updateBuienradarModeControl();
    }
  }
}

async function loadBuienradarRadar(context) {
  const radarModeId = context.radarModeId;
  const requestId = buienradarDisplayRequestId + 1;
  buienradarDisplayRequestId = requestId;
  const radar = await fetchBuienradarRadarMode(radarModeId, { forceRefresh: context.forceRefresh });
  if (
    !isRadarLoadContextCurrent(context)
    || requestId !== buienradarDisplayRequestId
    || activeBuienradarRadarModeId !== radarModeId
  ) {
    return;
  }

  displayBuienradarRadar(radar);
  scheduleInactiveBuienradarRadarPreload();
}

async function loadHybridRadar(context) {
  const radarModeId = context.radarModeId;
  const knmiRequestId = knmiDisplayRequestId + 1;
  const buienradarRequestId = buienradarDisplayRequestId + 1;
  knmiDisplayRequestId = knmiRequestId;
  buienradarDisplayRequestId = buienradarRequestId;

  const state = {};
  const request = {
    buienradarRequestId,
    context,
    knmiRequestId,
    radarModeId,
    retainedSources: captureRetainedHybridRadarSources(radarModeId),
    state,
  };
  const knmiResultPromise = settleHybridRadarRequest(
    context,
    "knmi",
    fetchKnmiRadar({ forceRefresh: context.forceRefresh, timing: context.radarTiming }),
    state,
  );
  const buienradarResultPromise = settleHybridRadarRequest(
    context,
    "buienradar",
    fetchBuienradarRadarMode(radarModeId, { forceRefresh: context.forceRefresh, timing: context.radarTiming }),
    state,
  );
  request.resultPromises = [knmiResultPromise, buienradarResultPromise];

  if (hasUsableRadarDisplay()) {
    void refreshRetainedHybridRadar(request).catch((error) => {
      if (!isHybridRadarRequestCurrent(request)) {
        return;
      }

      console.warn("Could not update the Netherlands radar.", error);
      setRadarMapStatus("Radar update delayed", { isError: true });
    });
    return;
  }

  const firstResult = await waitForPreferredHybridRadar(request);
  if (!isHybridRadarRequestCurrent(request)) {
    return;
  }

  if (!firstResult) {
    throw state.knmi?.reason
      || state.buienradar?.reason
      || new Error("No Netherlands radar source available");
  }

  if (hasBothFreshHybridSources(state)) {
    displayHybridRadar(state.knmi.radar, state.buienradar.radar, { preserveSelection: false });
    markFirstUsableRadar(context, "hybrid");
    markRadarTiming(context.radarTiming, "hybrid_ready_ms");
    scheduleInactiveBuienradarRadarPreload();
    reportRadarTiming(context, "hybrid");
    return;
  }

  displayFreshRadarResult(firstResult, { preserveSelection: false });
  markFirstUsableRadar(context, firstResult.source);
  if (firstResult.source === "buienradar") {
    scheduleInactiveBuienradarRadarPreload();
  }

  void finishProgressiveHybridRadar(request).catch((error) => {
    if (isHybridRadarRequestCurrent(request)) {
      console.warn("Could not complete the hybrid radar.", error);
    }
  });
}

function settleHybridRadarRequest(context, source, promise, state) {
  return promise.then(
    (radar) => {
      const result = { radar, source, status: "fulfilled" };
      state[source] = result;
      markRadarTiming(context.radarTiming, `${source}_ready_ms`);
      markRadarTiming(context.radarTiming, `${source}_settled_ms`);
      setRadarTimingStatus(context.radarTiming, source, "success");
      return result;
    },
    (reason) => {
      const result = { reason, source, status: "rejected" };
      state[source] = result;
      markRadarTiming(context.radarTiming, `${source}_settled_ms`);
      setRadarTimingStatus(context.radarTiming, source, "failure");
      return result;
    },
  );
}

function isHybridRadarRequestCurrent(request) {
  return Boolean(
    request
    && isRadarLoadContextCurrent(request.context)
    && request.knmiRequestId === knmiDisplayRequestId
    && request.buienradarRequestId === buienradarDisplayRequestId
    && request.radarModeId === activeBuienradarRadarModeId
    && isKnmiPrimaryRadarModeActive()
    && isInBuienradarBounds(selectedLocation),
  );
}

function waitForRadarPreferenceDelay(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve({ source: "deadline", status: "deadline" }), delayMs);
  });
}

async function waitForPreferredHybridRadar(request) {
  const [knmiResultPromise, buienradarResultPromise] = request.resultPromises;
  const preferredResult = await Promise.race([
    knmiResultPromise,
    waitForRadarPreferenceDelay(knmiPreferredRadarWaitMs),
  ]);

  if (preferredResult.status === "fulfilled") {
    return preferredResult;
  }

  if (preferredResult.status === "rejected") {
    return waitForFirstSuccessfulRadar([buienradarResultPromise]);
  }

  if (request.state.buienradar?.status === "fulfilled") {
    return request.state.buienradar;
  }

  return waitForFirstSuccessfulRadar(request.resultPromises);
}

function waitForFirstSuccessfulRadar(resultPromises) {
  return new Promise((resolve) => {
    let remaining = resultPromises.length;
    let isResolved = false;

    resultPromises.forEach((resultPromise) => {
      resultPromise.then((result) => {
        if (isResolved) {
          return;
        }

        if (result.status === "fulfilled") {
          isResolved = true;
          resolve(result);
          return;
        }

        remaining -= 1;
        if (remaining <= 0) {
          isResolved = true;
          resolve(undefined);
        }
      });
    });
  });
}

function hasBothFreshHybridSources(state) {
  return state.knmi?.status === "fulfilled" && state.buienradar?.status === "fulfilled";
}

function displayFreshRadarResult(result, { preserveSelection = true } = {}) {
  if (result.source === "knmi") {
    displayKnmiRadar(result.radar, { preserveSelection });
    return;
  }

  displayBuienradarRadar(result.radar, { preserveSelection });
}

async function finishProgressiveHybridRadar(request) {
  await Promise.all(request.resultPromises);
  if (!isHybridRadarRequestCurrent(request)) {
    return;
  }

  const { context, state } = request;
  if (hasBothFreshHybridSources(state)) {
    displayHybridRadar(state.knmi.radar, state.buienradar.radar, { preserveSelection: true });
    markRadarTiming(context.radarTiming, "hybrid_ready_ms");
    scheduleInactiveBuienradarRadarPreload();
    reportRadarTiming(context, "hybrid");
    updateBuienradarModeControl();
    return;
  }

  reportRadarTiming(
    context,
    state.knmi?.status === "fulfilled" ? "knmi_only" : "buienradar_only",
  );
  updateBuienradarModeControl();
}

function captureRetainedHybridRadarSources(radarModeId) {
  const retainedSources = {};
  if (
    (displayedRadarSource === "hybrid" || displayedRadarSource === "knmi")
    && knmiFrameUrls.length
    && knmiFrameDates.length
  ) {
    retainedSources.knmi = {
      modeId: knmiRadarConfig.modeId,
      frameUrls: knmiFrameUrls,
      frameDates: knmiFrameDates,
      referenceDate: knmiReferenceDate,
      startDate: knmiStartDate,
      timeline: {
        ...knmiRadarConfig.timeline,
        frameCount: knmiFrameUrls.length,
      },
    };
  }

  if (
    (displayedRadarSource === "hybrid" || displayedRadarSource === "buienradar")
    && buienradarFrameUrls.length
    && loadedBuienradarRadarModeId === radarModeId
  ) {
    retainedSources.buienradar = {
      modeId: loadedBuienradarRadarModeId,
      frameUrls: buienradarFrameUrls,
      startDate: buienradarStartDate,
      timeline: { ...buienradarTimeline },
    };
  }

  return retainedSources;
}

function displayAvailableRetainedRadar(request) {
  const { retainedSources, state } = request;
  const freshKnmiRadar = state.knmi?.status === "fulfilled" ? state.knmi.radar : undefined;
  const freshBuienradarRadar = state.buienradar?.status === "fulfilled" ? state.buienradar.radar : undefined;
  const availableKnmiRadar = freshKnmiRadar || retainedSources.knmi;
  const availableBuienradarRadar = freshBuienradarRadar || retainedSources.buienradar;

  if (availableKnmiRadar && availableBuienradarRadar) {
    displayHybridRadar(availableKnmiRadar, availableBuienradarRadar, {
      keepRadarStatusOnCommit: !(freshKnmiRadar && freshBuienradarRadar),
      prepareBuienradarSamples: Boolean(freshBuienradarRadar),
      prepareKnmiSamples: Boolean(freshKnmiRadar),
      preserveSelection: true,
    });
    return freshKnmiRadar && freshBuienradarRadar ? "fresh_hybrid" : "retained_hybrid";
  }

  if (freshKnmiRadar) {
    displayKnmiRadar(freshKnmiRadar, {
      keepRadarStatusOnCommit: true,
      preserveSelection: true,
    });
    return "knmi";
  }

  if (freshBuienradarRadar) {
    displayBuienradarRadar(freshBuienradarRadar, { preserveSelection: true });
    return "buienradar";
  }

  return "retained";
}

function getRetainedRadarTimingOutcome(request) {
  const { retainedSources, state } = request;
  if (hasBothFreshHybridSources(state)) {
    return "hybrid";
  }
  if (state.knmi?.status === "fulfilled") {
    return retainedSources.buienradar ? "knmi_fresh_retained_buienradar" : "knmi_only";
  }
  if (state.buienradar?.status === "fulfilled") {
    return retainedSources.knmi ? "buienradar_fresh_retained_knmi" : "buienradar_only";
  }
  return "retained";
}

async function refreshRetainedHybridRadar(request) {
  const firstResult = await waitForFirstSuccessfulRadar(request.resultPromises);
  if (!isHybridRadarRequestCurrent(request)) {
    return;
  }

  const { context, state } = request;
  if (!firstResult) {
    setRadarMapStatus("Radar update delayed", { isError: true });
    reportRadarTiming(context, "retained");
    updateBuienradarModeControl();
    return;
  }

  const firstDisplay = displayAvailableRetainedRadar(request);
  markFirstUsableRadar(context, firstResult.source);
  if (!state.knmi || !state.buienradar) {
    setRadarMapStatus("Updating rain forecast...");
  } else if (!hasBothFreshHybridSources(state)) {
    setRadarMapStatus("Radar update delayed", { isError: true });
  }

  await Promise.all(request.resultPromises);
  if (!isHybridRadarRequestCurrent(request)) {
    return;
  }

  if (hasBothFreshHybridSources(state)) {
    if (firstDisplay !== "fresh_hybrid") {
      displayHybridRadar(state.knmi.radar, state.buienradar.radar, { preserveSelection: true });
    }
    markRadarTiming(context.radarTiming, "hybrid_ready_ms");
  }
  if (!hasBothFreshHybridSources(state)) {
    setRadarMapStatus("Radar update delayed", { isError: true });
  }

  if (state.buienradar?.status === "fulfilled") {
    scheduleInactiveBuienradarRadarPreload();
  }

  reportRadarTiming(context, getRetainedRadarTimingOutcome(request));
  updateBuienradarModeControl();
}

async function fetchBuienradarRadarMode(radarModeId, { forceRefresh = false, timing } = {}) {
  const cachedRadar = getFreshBuienradarRadarCache(radarModeId);
  if (!forceRefresh && cachedRadar) {
    setRadarTimingPath(timing, "buienradar", "cache");
    return cachedRadar;
  }

  const existingRequest = buienradarRadarRequests.get(radarModeId);
  if (existingRequest) {
    setRadarTimingPath(timing, "buienradar", "inflight");
    return existingRequest;
  }

  setRadarTimingPath(timing, "buienradar", "network");
  const request = downloadBuienradarRadarMode(radarModeId, timing)
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

async function downloadBuienradarRadarMode(radarModeId, timing) {
  const radarMode = getBuienradarRadarMode(radarModeId);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort(new Error("Buienradar radar timed out"));
  }, buienradarRadarReadyTimeoutMs);
  let frameUrls = [];

  try {
    const downloadStartedAt = getRadarTimingNow();
    let response;
    let buffer;
    try {
      ({ response, body: buffer } = await fetchBodyWithTimeout(buildBuienradarAnimationUrl(radarMode), {
        cache: "no-store",
        signal: controller.signal,
        timeoutMs: buienradarRadarTimeoutMs,
        readBody: (nextResponse) => nextResponse.arrayBuffer(),
      }));
      if (!response.ok) {
        throw new Error(`Buienradar responded with ${response.status}`);
      }
    } finally {
      markRadarTimingDuration(timing, "buienradar_download_ms", downloadStartedAt);
    }

    const imageType = response.headers.get("content-type") || "image/gif";
    const startDate = parseBuienradarStartDate(response.url) || roundToNextFiveMinutes(new Date());
    const decodeStartedAt = getRadarTimingNow();
    let timeline;
    try {
      timeline = parseGifTimeline(buffer);
      frameUrls = await waitForAbortableResult(
        decodeBuienradarFrames(buffer, imageType, { signal: controller.signal }),
        controller.signal,
        (urls) => urls.forEach(revokeFrameUrl),
      );
      if (!frameUrls.length) {
        const stillFrameUrl = await waitForAbortableResult(
          decodeBuienradarStillFrame(buffer, imageType, { signal: controller.signal }),
          controller.signal,
          (url) => { if (url) revokeFrameUrl(url); },
        );
        frameUrls = stillFrameUrl ? [stillFrameUrl] : [];
      }

      if (!frameUrls.length) {
        throw new Error("Buienradar animation could not be decoded");
      }
    } finally {
      markRadarTimingDuration(timing, "buienradar_decode_ms", decodeStartedAt);
    }

    const isReady = await waitForAbortableResult(
      preloadImage(frameUrls[0], { signal: controller.signal }),
      controller.signal,
    );
    if (!isReady) {
      throw new Error("Buienradar radar first frame did not load");
    }

    return {
      modeId: radarModeId,
      frameUrls,
      startDate,
      timeline,
      fetchedAt: Date.now(),
    };
  } catch (error) {
    frameUrls.forEach(revokeFrameUrl);
    if (error?.name === "AbortError") {
      throw new Error("Buienradar radar timed out");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadKnmiRadar(context) {
  const requestId = knmiDisplayRequestId + 1;
  knmiDisplayRequestId = requestId;
  const radar = await fetchKnmiRadar({ forceRefresh: context.forceRefresh });
  if (
    !isRadarLoadContextCurrent(context)
    || requestId !== knmiDisplayRequestId
    || activeRainSourceMode !== "knmi"
  ) {
    return;
  }

  displayKnmiRadar(radar);
}

async function fetchKnmiRadar({ forceRefresh = false, timing } = {}) {
  if (!forceRefresh && isFreshKnmiRadar(knmiRadarCache)) {
    setRadarTimingPath(timing, "knmi", "cache");
    return knmiRadarCache;
  }

  if (knmiRadarRequest) {
    setRadarTimingPath(timing, "knmi", "inflight");
    return knmiRadarRequest;
  }

  setRadarTimingPath(timing, "knmi", "network");
  knmiRadarRequest = downloadKnmiRadar({
    forceMetadataRefresh: forceRefresh,
    timing,
  })
    .then((radar) => {
      knmiRadarCache = radar;
      return radar;
    })
    .finally(() => {
      knmiRadarRequest = undefined;
    });

  return knmiRadarRequest;
}

async function downloadKnmiRadar({ forceMetadataRefresh = false, timing } = {}) {
  const metadata = await fetchKnmiRadarMetadata({
    forceRefresh: forceMetadataRefresh,
    timing,
  });
  const frameDates = getKnmiRadarFrameDates(metadata.referenceDate, metadata.endDate);
  const frameUrls = frameDates.map((date) => buildKnmiRadarImageUrl(date, metadata.referenceDate));

  if (!frameUrls.length) {
    throw new Error("KNMI radar returned no usable frames");
  }

  const isFirstFrameLoaded = await preloadKnmiFrameImage(frameUrls[0], { timeoutMs: knmiRadarImageLoadTimeoutMs });
  if (!isFirstFrameLoaded) {
    throw new Error("KNMI radar first frame did not load");
  }
  markRadarTiming(timing, "knmi_first_frame_ready_ms");
  queueKnmiFramePreload(frameUrls);

  return {
    modeId: knmiRadarConfig.modeId,
    frameUrls,
    frameDates,
    referenceDate: metadata.referenceDate,
    metadataFetchedAt: metadata.fetchedAt,
    proxyAgeSeconds: metadata.proxyAgeSeconds,
    proxyCacheStatus: metadata.proxyCacheStatus,
    proxyDiagnosticScope: metadata.proxyDiagnosticScope,
    crs: knmiRadarConfig.mapCrs,
    startDate: frameDates[0],
    timeline: {
      ...knmiRadarConfig.timeline,
      frameCount: frameUrls.length,
    },
    fetchedAt: Date.now(),
  };
}

async function fetchKnmiRadarMetadata({ forceRefresh = false, timing } = {}) {
  if (!forceRefresh && isFreshKnmiRadarMetadata(knmiRadarMetadataCache)) {
    setRadarTimingPath(timing, "knmi_metadata", "cache");
    return knmiRadarMetadataCache;
  }

  if (knmiRadarMetadataRequest) {
    setRadarTimingPath(timing, "knmi_metadata", "inflight");
    return knmiRadarMetadataRequest;
  }

  setRadarTimingPath(timing, "knmi_metadata", "network");
  knmiRadarMetadataRequest = downloadKnmiRadarMetadata(timing)
    .then((metadata) => {
      knmiRadarMetadataCache = metadata;
      return metadata;
    })
    .finally(() => {
      knmiRadarMetadataRequest = undefined;
    });

  return knmiRadarMetadataRequest;
}

async function downloadKnmiRadarMetadata(timing) {
  const metadataStartedAt = getRadarTimingNow();
  try {
    return await downloadKnmiRadarMetadataResponse();
  } finally {
    markRadarTimingDuration(timing, "knmi_metadata_ms", metadataStartedAt);
  }
}

async function downloadKnmiRadarMetadataResponse() {
  let response;
  let text;
  try {
    ({ response, body: text } = await fetchBodyWithTimeout(buildKnmiWmsUrl({
      dataset: knmiRadarConfig.dataset,
      service: "WMS",
      request: "GetCapabilities",
    }), {
      cache: "no-store",
      timeoutMs: knmiRadarMetadataTimeoutMs,
      readBody: (nextResponse) => nextResponse.text(),
    }));
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("KNMI radar capabilities timed out");
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error(`KNMI radar capabilities responded with ${response.status}`);
  }

  const documentXml = new DOMParser().parseFromString(text, "application/xml");
  const dimensions = getXmlElementsByLocalName(documentXml, "Dimension");
  const timeDimension = dimensions.find((dimension) => dimension.getAttribute("name") === "time");
  const referenceDimension = dimensions.find((dimension) => dimension.getAttribute("name") === "reference_time");
  if (!timeDimension || !referenceDimension || getXmlElementsByLocalName(documentXml, "parsererror").length) {
    throw new Error("KNMI radar capabilities returned invalid XML");
  }

  const referenceDate = parseIsoDate(referenceDimension?.getAttribute("default")) || roundDateToPreviousFiveMinutes(new Date());
  const endDate = parseIsoDate(timeDimension?.getAttribute("default"))
    || new Date(referenceDate.getTime() + knmiRadarConfig.maxLookaheadHours * 60 * 60 * 1000);
  const proxyCacheDiagnostics = getKnmiProxyCacheDiagnostics(response, "metadata");

  return {
    referenceDate,
    endDate,
    fetchedAt: Date.now(),
    ...proxyCacheDiagnostics,
  };
}

function getKnmiProxyCacheDiagnostics(response, scope) {
  const proxyAgeHeader = response?.headers?.get?.("Age");
  const proxyAgeSeconds = proxyAgeHeader === null || proxyAgeHeader === undefined || proxyAgeHeader === ""
    ? undefined
    : Number(proxyAgeHeader);
  const proxyCacheStatus = response?.headers?.get?.("X-MyMeteo-KNMI-Cache") || undefined;

  return {
    proxyAgeSeconds: Number.isFinite(proxyAgeSeconds) && proxyAgeSeconds >= 0
      ? proxyAgeSeconds
      : undefined,
    proxyCacheStatus,
    proxyDiagnosticScope: proxyAgeSeconds !== undefined || proxyCacheStatus ? scope : undefined,
  };
}

function isFreshKnmiRadarMetadata(metadata) {
  return Boolean(
    metadata?.referenceDate instanceof Date
    && !Number.isNaN(metadata.referenceDate.getTime())
    && metadata?.endDate instanceof Date
    && !Number.isNaN(metadata.endDate.getTime())
    && Number.isFinite(metadata.fetchedAt)
    && Date.now() - metadata.fetchedAt < knmiRadarCacheMaxAgeMs,
  );
}

// Module imports and browser decoders may finish after cancellation. Discard their
// late results and release resources instead of resuming an abandoned radar load.
function waitForAbortableResult(promise, signal, disposeLateResult) {
  if (!signal) {
    return Promise.resolve(promise);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason || Object.assign(new Error("Request aborted"), { name: "AbortError" }));
    };
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    Promise.resolve(promise).then((value) => {
      if (settled) {
        disposeLateResult?.(value);
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      resolve(value);
    }, (error) => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(error);
    });
  });
}

async function fetchBodyWithTimeout(url, { readBody, timeoutMs, timeoutMessage, signal, ...options } = {}) {
  const hasTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0;
  const controller = hasTimeout ? new AbortController() : undefined;
  const forwardAbort = () => controller?.abort(signal.reason);
  let didTimeOut = false;
  if (controller && signal) {
    if (signal.aborted) {
      forwardAbort();
    } else {
      signal.addEventListener("abort", forwardAbort, { once: true });
    }
  }
  const timeout = controller
    ? window.setTimeout(() => {
      didTimeOut = true;
      controller.abort();
    }, timeoutMs)
    : undefined;
  const requestSignal = controller?.signal || signal;

  try {
    const response = await waitForAbortableResult(fetch(url, {
      ...options,
      ...(requestSignal ? { signal: requestSignal } : {}),
    }), requestSignal);
    const body = response.ok && typeof readBody === "function"
      ? await waitForAbortableResult(readBody(response), requestSignal)
      : undefined;
    return { response, body };
  } catch (error) {
    if (didTimeOut && timeoutMessage && !signal?.aborted) {
      throw Object.assign(new Error(timeoutMessage), { name: "TimeoutError" });
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", forwardAbort);
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
    }
  }
}

function getXmlElementsByLocalName(documentXml, localName) {
  return Array.from(documentXml.getElementsByTagName("*"))
    .filter((element) => element.localName === localName);
}

function parseIsoDate(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getKnmiRadarFrameDates(startDate, endDate) {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return [];
  }

  const latestAllowedEnd = new Date(startDate.getTime() + knmiRadarConfig.maxLookaheadHours * 60 * 60 * 1000);
  const safeEndDate = endDate instanceof Date && !Number.isNaN(endDate.getTime())
    ? new Date(Math.min(endDate.getTime(), latestAllowedEnd.getTime()))
    : latestAllowedEnd;
  const dates = [];
  let cursor = new Date(startDate);

  while (cursor <= safeEndDate) {
    dates.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + knmiRadarConfig.frameMinutes * 60 * 1000);
  }

  return dates;
}

function captureRadarDisplaySelection(shouldPreserveSelection) {
  if (!shouldPreserveSelection) {
    return undefined;
  }

  const sliderValue = Number(elements.radarSlider.value) || 0;
  const selectedDate = getRadarDateForSlider(sliderValue);
  return {
    selectedDate: selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime())
      ? new Date(selectedDate)
      : undefined,
    wasAtStart: radarSliderWasAtStart !== false,
  };
}

function captureRadarDisplayState() {
  return {
    displayedRadarSource,
    radarFrames,
    knmiFrameUrls,
    knmiFrameDates,
    knmiStartDate,
    knmiReferenceDate,
    knmiRainSamples,
    knmiRainSampleRun,
    knmiLayerKey,
    knmiNextLayerKey,
    buienradarFrameUrls,
    buienradarStartDate,
    buienradarTimeline,
    activeBuienradarRadarModeId,
    loadedBuienradarRadarModeId,
    buienradarLayerKey,
    buienradarNextLayerKey,
    buienradarRainSampleRun: getCurrentBuienradarRainSampleRun(),
    buienradarSampleSeries: buienradarRainSamples.get(loadedBuienradarRadarModeId),
    hybridRadarStartDate,
    hybridRadarEndDate,
    hybridRadarKnmiEndDate,
    retainedBuienradarFrameUrls: new Set(buienradarRetainedFrameUrlsToRevoke),
    radarPanelIsAnimated: elements.radarPanel.classList.contains("is-animated"),
    radarTimeHasError: elements.radarTime.classList.contains("error"),
    radarSliderWasAtStart,
    slider: {
      disabled: elements.radarSlider.disabled,
      min: elements.radarSlider.min,
      max: elements.radarSlider.max,
      step: elements.radarSlider.step,
      value: elements.radarSlider.value,
      ariaValueText: elements.radarSlider.getAttribute("aria-valuetext"),
    },
  };
}

function stageRadarDisplayReplacement(targetKnmiFrameUrls, { keepRadarStatusOnCommit = false } = {}) {
  radarDisplayReplacement = {
    previousState: radarDisplayReplacement?.previousState || captureRadarDisplayState(),
    keepRadarStatusOnCommit,
    targetKnmiFrameUrls,
  };
}

function commitRadarDisplayReplacement(targetKnmiFrameUrls) {
  if (radarDisplayReplacement?.targetKnmiFrameUrls === targetKnmiFrameUrls) {
    radarDisplayReplacement = undefined;
  }
}

function restoreRadarDisplayReplacement(targetKnmiFrameUrls = knmiFrameUrls) {
  const replacement = radarDisplayReplacement;
  if (!replacement || replacement.targetKnmiFrameUrls !== targetKnmiFrameUrls) {
    return false;
  }

  radarDisplayReplacement = undefined;
  knmiFrameRenderRequestId += 1;
  buienradarFrameRenderRequestId += 1;
  if (!isBuienradarFrameUrlsCached(buienradarFrameUrls)) {
    buienradarFrameUrls.forEach((url) => buienradarRetainedFrameUrlsToRevoke.add(url));
  }
  const retainedBuienradarFrameUrls = new Set([
    ...replacement.previousState.retainedBuienradarFrameUrls,
    ...buienradarRetainedFrameUrlsToRevoke,
  ]);
  const state = replacement.previousState;
  displayedRadarSource = state.displayedRadarSource;
  radarFrames = state.radarFrames;
  knmiFrameUrls = state.knmiFrameUrls;
  knmiFrameDates = state.knmiFrameDates;
  knmiStartDate = state.knmiStartDate;
  knmiReferenceDate = state.knmiReferenceDate;
  knmiRainSamples = state.knmiRainSamples;
  knmiRainSampleRun = state.knmiRainSampleRun;
  knmiLayerKey = state.knmiLayerKey;
  knmiNextLayerKey = state.knmiNextLayerKey;
  buienradarFrameUrls = state.buienradarFrameUrls;
  buienradarStartDate = state.buienradarStartDate;
  buienradarTimeline = state.buienradarTimeline;
  activeBuienradarRadarModeId = state.buienradarFrameUrls.length
    ? state.loadedBuienradarRadarModeId : state.activeBuienradarRadarModeId;
  loadedBuienradarRadarModeId = state.loadedBuienradarRadarModeId;
  if (state.buienradarRainSampleRun) {
    buienradarRainSampleRuns.set(loadedBuienradarRadarModeId, state.buienradarRainSampleRun);
    publishBuienradarRainSampleRun(state.buienradarRainSampleRun);
    Promise.resolve(state.buienradarRainSampleRun.backgroundPromise).then(() => {
      if (getCurrentBuienradarRainSampleRun() === state.buienradarRainSampleRun) {
        prepareBuienradarRainSamples(state.buienradarRainSampleRun.radar);
      }
    });
  } else {
    buienradarRainSampleRuns.delete(loadedBuienradarRadarModeId);
    if (state.buienradarSampleSeries) {
      buienradarRainSamples.set(loadedBuienradarRadarModeId, state.buienradarSampleSeries);
    } else {
      buienradarRainSamples.delete(loadedBuienradarRadarModeId);
    }
  }
  buienradarLayerKey = state.buienradarLayerKey;
  buienradarNextLayerKey = state.buienradarNextLayerKey;
  hybridRadarStartDate = state.hybridRadarStartDate;
  hybridRadarEndDate = state.hybridRadarEndDate;
  hybridRadarKnmiEndDate = state.hybridRadarKnmiEndDate;
  buienradarRetainedFrameUrlsToRevoke = retainedBuienradarFrameUrls;
  elements.radarPanel.classList.toggle("is-animated", state.radarPanelIsAnimated);
  elements.radarTime.classList.toggle("error", state.radarTimeHasError);
  radarSliderWasAtStart = state.radarSliderWasAtStart;
  elements.radarSlider.disabled = state.slider.disabled;
  elements.radarSlider.min = state.slider.min;
  elements.radarSlider.max = state.slider.max;
  elements.radarSlider.step = state.slider.step;
  elements.radarSlider.value = state.slider.value;
  if (state.slider.ariaValueText === null) {
    elements.radarSlider.removeAttribute("aria-valuetext");
  } else {
    elements.radarSlider.setAttribute("aria-valuetext", state.slider.ariaValueText);
  }
  if (knmiRainSampleRun) {
    publishKnmiRainSampleRun(knmiRainSampleRun, { render: false });
  }
  releaseRetainedBuienradarFrameUrls();
  return true;
}

function restoreRadarDisplaySelection(selection, renderPosition) {
  let sliderValue = getDefaultRadarSliderValue();
  if (selection && !selection.wasAtStart && selection.selectedDate) {
    const mappedValue = getRadarSliderValueForDate(selection.selectedDate);
    if (Number.isFinite(mappedValue)) {
      sliderValue = clampNumber(
        mappedValue,
        getRadarSliderMin(),
        Number(elements.radarSlider.max) || 0,
      );
    }
  }

  sliderValue = Math.round(sliderValue);
  elements.radarSlider.value = String(sliderValue);
  radarSliderWasAtStart = isRadarSliderAtStart(sliderValue);
  renderPosition(sliderValue);
}

function alignRadarSliderStartWithCurrentTime(now = new Date()) {
  const range = getRadarTimeRange();
  if (
    !range
    || !(now instanceof Date)
    || Number.isNaN(now.getTime())
    || now < range.start
    || now > range.end
  ) {
    return;
  }

  const nowValue = getRadarSliderValueForDate(now);
  if (!Number.isFinite(nowValue)) {
    return;
  }

  const maxValue = Number(elements.radarSlider.max) || 0;
  elements.radarSlider.min = String(clampNumber(Math.ceil(nowValue), 0, maxValue));
}

function getDefaultRadarSliderValue(now = new Date()) {
  const range = getRadarTimeRange();
  if (
    range
    && now instanceof Date
    && !Number.isNaN(now.getTime())
    && range.end < now
  ) {
    return Number(elements.radarSlider.max) || 0;
  }

  return getRadarSliderMin();
}

function displayKnmiRadar(radar, {
  keepRadarStatusOnCommit = false,
  preserveSelection = false,
} = {}) {
  const selection = captureRadarDisplaySelection(preserveSelection);
  stageRadarDisplayReplacement(radar.frameUrls, { keepRadarStatusOnCommit });
  prepareKnmiLayersForReplacement();
  radarFrames = [];
  resetHybridRadarRange();
  displayedRadarSource = "knmi";
  knmiFrameUrls = radar.frameUrls;
  knmiFrameDates = radar.frameDates;
  knmiStartDate = radar.startDate;
  knmiReferenceDate = radar.referenceDate;
  elements.radarPanel.classList.add("is-animated");
  elements.radarSlider.disabled = radar.frameUrls.length < 2;
  elements.radarSlider.min = "0";
  elements.radarSlider.max = String(Math.max((radar.frameUrls.length - 1) * 100, 0));
  elements.radarSlider.step = "1";
  elements.radarTime.classList.remove("error");
  alignRadarSliderStartWithCurrentTime();
  prepareKnmiRainSamples(radar);
  restoreRadarDisplaySelection(selection, setKnmiFramePosition);
  refreshMapSize();
}

function displayHybridRadar(knmiRadar, buienradarRadar, {
  keepRadarStatusOnCommit = false,
  prepareBuienradarSamples = true,
  prepareKnmiSamples = true,
  preserveSelection = false,
} = {}) {
  const selection = captureRadarDisplaySelection(preserveSelection);
  stageRadarDisplayReplacement(knmiRadar.frameUrls, { keepRadarStatusOnCommit });
  const previousFrameUrls = buienradarFrameUrls;
  if (previousFrameUrls !== buienradarRadar.frameUrls) {
    prepareBuienradarLayersForReplacement();
    if (!isBuienradarFrameUrlsCached(previousFrameUrls)) {
      previousFrameUrls.forEach((url) => buienradarRetainedFrameUrlsToRevoke.add(url));
    }
  }
  prepareKnmiLayersForReplacement();
  radarFrames = [];
  displayedRadarSource = "hybrid";

  activeBuienradarRadarModeId = buienradarRadar.modeId;
  loadedBuienradarRadarModeId = buienradarRadar.modeId;
  buienradarStartDate = buienradarRadar.startDate;
  buienradarFrameUrls = buienradarRadar.frameUrls;
  buienradarTimeline = {
    ...buienradarRadar.timeline,
    frameCount: buienradarRadar.frameUrls.length,
  };

  knmiFrameUrls = knmiRadar.frameUrls;
  knmiFrameDates = knmiRadar.frameDates;
  knmiStartDate = knmiRadar.startDate;
  knmiReferenceDate = knmiRadar.referenceDate;
  hybridRadarStartDate = knmiRadar.startDate || buienradarRadar.startDate;
  hybridRadarKnmiEndDate = knmiFrameDates[knmiFrameDates.length - 1];
  hybridRadarEndDate = getLatestDate(hybridRadarKnmiEndDate, getBuienradarRadarEndDate());

  const maxValue = getHybridRadarSliderMaxValue();
  elements.radarPanel.classList.add("is-animated");
  elements.radarSlider.disabled = maxValue <= 0;
  elements.radarSlider.min = "0";
  elements.radarSlider.max = String(maxValue);
  elements.radarSlider.step = "1";
  elements.radarTime.classList.remove("error");
  alignRadarSliderStartWithCurrentTime();
  if (prepareKnmiSamples) {
    prepareKnmiRainSamples(knmiRadar);
  }
  if (prepareBuienradarSamples) {
    prepareBuienradarRainSamples(buienradarRadar);
  }
  restoreRadarDisplaySelection(selection, setHybridRadarPosition);
  refreshMapSize();
}

function displayBuienradarRadar(radar, { keepRadarStatusOnCommit = false, preserveSelection = false } = {}) {
  const selection = captureRadarDisplaySelection(preserveSelection);
  stageRadarDisplayReplacement(radar.frameUrls, { keepRadarStatusOnCommit });
  prepareBuienradarLayersForReplacement();
  prepareKnmiLayersForReplacement();
  radarFrames = [];
  resetHybridRadarRange();
  displayedRadarSource = "buienradar";

  const previousFrameUrls = buienradarFrameUrls;
  if (previousFrameUrls !== radar.frameUrls && !isBuienradarFrameUrlsCached(previousFrameUrls)) {
    previousFrameUrls.forEach((url) => buienradarRetainedFrameUrlsToRevoke.add(url));
  }
  activeBuienradarRadarModeId = radar.modeId;
  buienradarStartDate = radar.startDate;
  loadedBuienradarRadarModeId = radar.modeId;
  buienradarTimeline = radar.timeline;
  elements.radarPanel.classList.add("is-animated");
  elements.radarSlider.min = "0";
  elements.radarTime.classList.remove("error");

  buienradarFrameUrls = radar.frameUrls;
  buienradarTimeline = {
    ...buienradarTimeline,
    frameCount: radar.frameUrls.length,
  };
  elements.radarSlider.disabled = radar.frameUrls.length < 2;
  elements.radarSlider.max = String(Math.max((buienradarTimeline.frameCount - 1) * 100, 0));
  elements.radarSlider.step = "1";
  alignRadarSliderStartWithCurrentTime();
  prepareBuienradarRainSamples(radar);
  restoreRadarDisplaySelection(selection, setBuienradarFramePosition);
  refreshMapSize();
}

async function loadLibreWxrRadar(context) {
  let response;
  let data;
  try {
    ({ response, body: data } = await fetchBodyWithTimeout(libreWxrRadarUrl, {
      timeoutMs: libreWxrRadarTimeoutMs,
      readBody: (nextResponse) => nextResponse.json(),
    }));
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("LibreWXR radar timed out");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Radar source responded with ${response.status}`);
  }

  const past = data.radar?.past || [];
  const nowcast = data.radar?.nowcast || [];
  const currentFrame = past[past.length - 1];
  const nextRadarFrames = [currentFrame, ...nowcast]
    .filter(Boolean)
    .map((frame) => ({
      ...frame,
      host: data.host,
    }));

  if (!nextRadarFrames.length) {
    throw new Error("No radar frames available");
  }

  if (!isRadarLoadContextCurrent(context)) {
    return;
  }

  radarDisplayReplacement = undefined;
  clearLibreWxrRadar();
  clearBuienradarRadar();
  clearKnmiRadar();
  radarFrames = nextRadarFrames;
  displayedRadarSource = "librewxr";
  committedRadarSource = "librewxr";
  const previousMin = getRadarSliderMin();
  const previousValue = Number(elements.radarSlider.value) || previousMin;
  const previousMax = Number(elements.radarSlider.max) || 0;
  const previousRatio = previousMax > previousMin
    ? (previousValue - previousMin) / (previousMax - previousMin)
    : 0;
  const maxValue = Math.max((radarFrames.length - 1) * 100, 0);
  const nextValue = Math.round(Math.min(Math.max(previousRatio, 0), 1) * maxValue);
  createLibreWxrRadarLayers();
  elements.radarSlider.disabled = false;
  elements.radarSlider.min = "0";
  elements.radarSlider.max = String(maxValue);
  elements.radarSlider.step = "1";
  elements.radarSlider.value = String(nextValue);
  radarSliderWasAtStart = isRadarSliderAtStart(nextValue);
  setLibreWxrRadarPosition(nextValue);
  updateSliderTimestamps();
  renderPrecipitationTimeline();
  clearRadarMapStatus();
  refreshMapSize();
}

function refreshMapSize() {
  if (!map) {
    return;
  }

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

function setRadarMapStatus(message, { isError = false } = {}) {
  elements.radarMapStatus.textContent = message;
  elements.radarMapStatus.hidden = false;
  elements.radarMapStatus.classList.toggle("is-error", isError);
}

function clearRadarMapStatus() {
  elements.radarMapStatus.hidden = true;
  elements.radarMapStatus.classList.remove("is-error");
}

function updateKnmiRadarFreshnessStatus(now = new Date()) {
  if (isKnmiRadarReferenceDelayed(knmiReferenceDate, now)) {
    setRadarMapStatus("Radar update delayed", { isError: true });
    return;
  }

  clearRadarMapStatus();
}

function isKnmiRadarReferenceDelayed(referenceDate, now = new Date()) {
  if (
    !(referenceDate instanceof Date)
    || Number.isNaN(referenceDate.getTime())
    || !(now instanceof Date)
    || Number.isNaN(now.getTime())
  ) {
    return false;
  }

  return now.getTime() - referenceDate.getTime() > knmiRadarDelayedThresholdMinutes * 60 * 1000;
}

function disableRadar(message) {
  radarDisplayReplacement = undefined;
  clearLibreWxrRadar();
  clearBuienradarRadar();
  clearKnmiRadar();
  radarFrames = [];
  displayedRadarSource = "none";
  committedRadarSource = "none";
  committedRadarSliderMin = 0;
  setActiveRadarDate(undefined);
  elements.radarSlider.disabled = true;
  elements.radarSlider.min = "0";
  elements.radarSlider.max = "0";
  elements.radarSlider.value = "0";
  radarSliderWasAtStart = true;
  elements.radarTime.textContent = message;
  setRainForecastBadgeCurrent();
  setRadarMapStatus(message, { isError: true });
  elements.radarSlider.removeAttribute("aria-valuetext");
  updateSliderTimestamps();
  hidePrecipitationTimeline();
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
  const isCurrentPosition = isRadarSliderAtStart(value) && isRadarDateCurrent(displayDate);
  elements.radarTime.textContent = label;
  setRainForecastBadgeText(label, displayDate, selectedLocation.timezone, { isCurrentPosition });
  elements.radarSlider.setAttribute("aria-valuetext", label);
  elements.radarTime.classList.remove("error");
  setActiveRadarDate(displayDate);
}

function handleRadarSliderInput(value) {
  if (isMapUnavailable) {
    return;
  }

  const rebased = rebaseRadarSliderForInteraction(value);
  const sliderValue = rebased.value;

  if (displayedRadarSource === "hybrid") {
    setHybridRadarPosition(sliderValue);
  } else if (displayedRadarSource === "knmi") {
    setKnmiFramePosition(sliderValue);
  } else if (buienradarFrameUrls.length) {
    setBuienradarFramePosition(sliderValue);
  } else {
    setLibreWxrRadarPosition(sliderValue);
  }

  radarSliderWasAtStart = isRadarSliderAtStart(sliderValue);

  if (
    rebased.didRebase
    && displayedRadarSource !== "knmi"
    && displayedRadarSource !== "hybrid"
    && displayedRadarSource !== "buienradar"
  ) {
    updateSliderTimestamps();
    renderPrecipitationTimeline();
  }
}

function rebaseRadarSliderForInteraction(value) {
  const previousValue = Number(value) || 0;
  if (radarSliderWasAtStart === false || isRadarSliderAtStart(previousValue)) {
    return { value: previousValue, didRebase: false };
  }

  const minValue = getRadarSliderMin();
  const maxValue = Number(elements.radarSlider.max) || 0;
  if (maxValue <= minValue) {
    return { value: previousValue, didRebase: false };
  }

  const nowValue = getRadarSliderValueForDate(new Date());
  if (!Number.isFinite(nowValue)) {
    return { value: previousValue, didRebase: false };
  }

  const nextMinValue = clampNumber(Math.ceil(nowValue), minValue, maxValue);
  if (nextMinValue <= minValue || nextMinValue >= maxValue) {
    return { value: previousValue, didRebase: false };
  }

  const previousProgress = clampNumber((previousValue - minValue) / (maxValue - minValue), 0, 1);
  const nextValue = Math.round(nextMinValue + previousProgress * (maxValue - nextMinValue));
  elements.radarSlider.min = String(nextMinValue);
  elements.radarSlider.value = String(nextValue);

  return { value: nextValue, didRebase: true };
}

function setBuienradarFramePosition(value) {
  if (!buienradarFrameUrls.length) {
    return;
  }

  const framePosition = getBuienradarFramePositionForSliderValue(value);
  const frameDate = getBuienradarDateForSlider(value);
  renderBuienradarFramePosition(framePosition, {
    onCommit({ keepRadarStatusOnCommit }) {
      clearKnmiLayers();
      committedRadarSource = "buienradar";
      updateRadarTimeDisplay(frameDate, value, DEFAULT_LOCATION.timezone);
      updateSliderTimestamps();
      renderPrecipitationTimeline();
      if (!keepRadarStatusOnCommit) clearRadarMapStatus();
    },
  });
}

function renderBuienradarFramePosition(framePosition, { onCommit } = {}) {
  const frameUrls = buienradarFrameUrls;
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const safePosition = clampNumber(framePosition, 0, Math.max(frameUrls.length - 1, 0));
  const lowerIndex = Math.floor(safePosition);
  const upperIndex = Math.min(lowerIndex + 1, frameUrls.length - 1);
  const progress = safePosition - lowerIndex;
  const frameIndexes = getKnmiFrameIndexesForPosition(safePosition, frameUrls.length);
  const sampleRun = getCurrentBuienradarRainSampleRun();
  const renderRequestId = ++buienradarFrameRenderRequestId;
  knmiFrameRenderRequestId += 1;
  const replacementKey = displayedRadarSource === "hybrid" ? knmiFrameUrls : frameUrls;
  const isCurrentRequest = () => (
    renderRequestId === buienradarFrameRenderRequestId
    && frameUrls === buienradarFrameUrls
    && locationKey === getBuienradarSampleLocationKey(selectedLocation)
    && (!sampleRun || sampleRun === getCurrentBuienradarRainSampleRun())
    && (displayedRadarSource === "buienradar" || displayedRadarSource === "hybrid")
  );
  const fail = () => {
    if (!isCurrentRequest()) return;
    restoreRadarDisplayReplacement(replacementKey);
    handleKnmiFrameSelectionFailure();
  };
  const commit = () => {
    if (!isCurrentRequest()) return;
    if (sampleRun && frameIndexes.some((index) => !sampleRun.loadedImageIndexes.has(index))) {
      fail();
      return;
    }
    buienradarLayer = setBuienradarImageLayer(
      buienradarLayer, buienradarLayerKey, lowerIndex, 0.78 * (1 - progress), 20,
      '<a href="https://www.buienradar.nl/">Buienradar</a>',
    );
    buienradarLayerKey = lowerIndex;
    if (upperIndex !== lowerIndex && progress > 0) {
      buienradarNextLayer = setBuienradarImageLayer(
        buienradarNextLayer, buienradarNextLayerKey, upperIndex, 0.78 * progress, 21, "",
      );
      buienradarNextLayerKey = upperIndex;
    } else if (buienradarNextLayer) {
      map.removeLayer(buienradarNextLayer);
      buienradarNextLayer = undefined;
      buienradarNextLayerKey = undefined;
    }
    const keepRadarStatusOnCommit = Boolean(radarDisplayReplacement?.keepRadarStatusOnCommit);
    if (radarDisplayReplacement) radarDisplayReplacement.isCommitting = true;
    commitBuienradarFrameGeneration();
    clearLibreWxrRadar();
    onCommit?.({ keepRadarStatusOnCommit });
    commitRadarDisplayReplacement(replacementKey);
    releaseRetainedBuienradarFrameUrls();
  };

  if (!sampleRun || frameIndexes.every((index) => sampleRun.loadedImageIndexes.has(index))) {
    commit();
    return;
  }
  ensureBuienradarRainSamplesForFrameIndexes(sampleRun, frameIndexes, { retryImageFailures: true })
    .then(commit, fail);
}

function setKnmiFramePosition(value) {
  if (!knmiFrameUrls.length) {
    return;
  }

  const framePosition = getKnmiFramePositionForSliderValue(value);
  const sliderValue = Math.round(framePosition * 100);
  renderKnmiFramePosition(framePosition, {
    onCommit(frameDate, { keepRadarStatusOnCommit = false } = {}) {
      clearBuienradarLayers();
      committedRadarSource = displayedRadarSource === "hybrid" ? "hybrid" : "knmi";
      updateRadarTimeDisplay(frameDate, sliderValue, DEFAULT_LOCATION.timezone);
      updateSliderTimestamps();
      renderPrecipitationTimeline();
      if (!keepRadarStatusOnCommit) {
        updateKnmiRadarFreshnessStatus();
      }
    },
    onFailure() {
      handleKnmiFrameSelectionFailure();
    },
  });
}

function handleKnmiFrameSelectionFailure() {
  restoreRadarDisplayReplacement();
  const restoredPreviousTime = restoreRadarSliderToCommittedDate();
  updateBuienradarModeControl();
  setRadarMapStatus(
    restoredPreviousTime
      ? "Radar frame unavailable · showing previous time"
      : "Radar frame unavailable",
    { isError: true },
  );
}

function restoreRadarSliderToCommittedDate() {
  if (!(activeRadarDate instanceof Date) || Number.isNaN(activeRadarDate.getTime())) {
    return false;
  }

  const mappedValue = getRadarSliderValueForDate(activeRadarDate);
  if (!Number.isFinite(mappedValue)) {
    return false;
  }

  const restoredMin = Math.max(0, Math.min(
    Number.isFinite(committedRadarSliderMin) ? committedRadarSliderMin : getRadarSliderMin(),
    Math.floor(mappedValue),
  ));
  elements.radarSlider.min = String(restoredMin);
  const sliderValue = Math.round(clampNumber(
    mappedValue,
    restoredMin,
    Number(elements.radarSlider.max) || 0,
  ));
  elements.radarSlider.value = String(sliderValue);
  radarSliderWasAtStart = isRadarSliderAtStart(sliderValue);
  updateSliderTimestamps();
  renderPrecipitationTimeline();
  return true;
}

function getKnmiFrameIndexesForPosition(framePosition, frameCount = knmiFrameUrls.length) {
  const safeFramePosition = clampNumber(framePosition, 0, Math.max(frameCount - 1, 0));
  const lowerIndex = Math.floor(safeFramePosition);
  const upperIndex = Math.min(lowerIndex + 1, Math.max(frameCount - 1, 0));
  const progress = safeFramePosition - lowerIndex;

  return upperIndex !== lowerIndex && progress > 0
    ? [lowerIndex, upperIndex]
    : [lowerIndex];
}

function renderKnmiFramePosition(framePosition, { onCommit, onFailure } = {}) {
  buienradarFrameRenderRequestId += 1;
  const safeFramePosition = clampNumber(framePosition, 0, Math.max(knmiFrameUrls.length - 1, 0));
  const lowerIndex = Math.floor(safeFramePosition);
  const upperIndex = Math.min(lowerIndex + 1, knmiFrameUrls.length - 1);
  const progress = safeFramePosition - lowerIndex;
  const frameUrls = knmiFrameUrls;
  const frameDate = getKnmiDateForFramePosition(safeFramePosition) || knmiFrameDates[Math.round(safeFramePosition)];
  const renderRequestId = knmiFrameRenderRequestId + 1;
  knmiFrameRenderRequestId = renderRequestId;
  const requiredFrameIndexes = getKnmiFrameIndexesForPosition(safeFramePosition, frameUrls.length);
  const sampleRun = getCurrentKnmiRainSampleRun(frameUrls);
  const unloadedFrameUrls = [...new Set(
    requiredFrameIndexes
      .map((index) => frameUrls[index])
      .filter((url) => url && !knmiLoadedFrameUrls.has(url)),
  )];

  const isCurrentRequest = () => (
    renderRequestId === knmiFrameRenderRequestId
    && frameUrls === knmiFrameUrls
    && (!sampleRun || sampleRun === knmiRainSampleRun)
    && (displayedRadarSource === "knmi" || displayedRadarSource === "hybrid")
  );

  const fail = () => {
    if (!isCurrentRequest()) {
      return;
    }
    if (typeof onFailure === "function") {
      onFailure(frameDate);
    }
  };

  const commit = () => {
    if (!isCurrentRequest()) {
      return undefined;
    }

    knmiLayer = setKnmiImageLayer(
      knmiLayer,
      knmiLayerKey,
      lowerIndex,
      0.78 * (1 - progress),
      20,
      '<a href="https://www.knmi.nl/">KNMI</a>',
    );
    knmiLayerKey = knmiLayer?.mymeteoFrameIndex;

    if (upperIndex !== lowerIndex && progress > 0) {
      knmiNextLayer = setKnmiImageLayer(knmiNextLayer, knmiNextLayerKey, upperIndex, 0.78 * progress, 21, "");
      knmiNextLayerKey = knmiNextLayer?.mymeteoFrameIndex;
    } else if (knmiNextLayer) {
      map.removeLayer(knmiNextLayer);
      knmiNextLayer = undefined;
      knmiNextLayerKey = undefined;
    }

    if (radarDisplayReplacement) radarDisplayReplacement.isCommitting = true;
    commitKnmiFrameGeneration(frameUrls, sampleRun);
    clearLibreWxrRadar();
    const keepRadarStatusOnCommit = Boolean(
      radarDisplayReplacement?.targetKnmiFrameUrls === frameUrls
      && radarDisplayReplacement.keepRadarStatusOnCommit,
    );
    if (typeof onCommit === "function") {
      onCommit(frameDate, { keepRadarStatusOnCommit });
    }
    commitRadarDisplayReplacement(frameUrls);
    return frameDate;
  };

  const samplesAreReady = !sampleRun || areKnmiRainSamplesSettled(sampleRun, requiredFrameIndexes);
  if (!unloadedFrameUrls.length && samplesAreReady) {
    return commit();
  }

  const imageReadiness = unloadedFrameUrls.length
    ? Promise.all(
      unloadedFrameUrls.map((url) => preloadKnmiFrameImage(url, { timeoutMs: knmiRadarImageLoadTimeoutMs })),
    )
    : Promise.resolve([]);
  const sampleReadiness = samplesAreReady
    ? Promise.resolve()
    : ensureKnmiRainSamplesForFrameIndexes(sampleRun, requiredFrameIndexes);

  Promise.all([imageReadiness, sampleReadiness]).then(([imageResults]) => {
    if (imageResults.some((isLoaded) => !isLoaded)) {
      fail();
      return;
    }
    commit();
  }).catch(fail);

  return frameDate;
}

function setHybridRadarPosition(value) {
  const sliderValue = clampNumber(Number(value) || 0, 0, Number(elements.radarSlider.max) || 0);
  const displayDate = getHybridDateForSlider(sliderValue);
  if (!displayDate) {
    return;
  }

  if (shouldUseKnmiForHybridDate(displayDate)) {
    renderKnmiFramePosition(getKnmiFramePositionForDate(displayDate), {
      onCommit(frameDate, { keepRadarStatusOnCommit = false } = {}) {
        commitBuienradarFrameGeneration();
        clearBuienradarLayers();
        committedRadarSource = "hybrid";
        updateRadarTimeDisplay(frameDate, sliderValue, DEFAULT_LOCATION.timezone);
        updateSliderTimestamps();
        renderPrecipitationTimeline();
        if (!keepRadarStatusOnCommit) {
          updateKnmiRadarFreshnessStatus();
        }
      },
      onFailure() {
        handleKnmiFrameSelectionFailure();
      },
    });
  } else {
    renderBuienradarFramePosition(getBuienradarFramePositionForDate(displayDate), {
      onCommit({ keepRadarStatusOnCommit }) {
        hideKnmiLayers();
        commitKnmiFrameGeneration();
        committedRadarSource = "hybrid";
        updateRadarTimeDisplay(displayDate, sliderValue, DEFAULT_LOCATION.timezone);
        updateSliderTimestamps();
        renderPrecipitationTimeline();
        if (!keepRadarStatusOnCommit) clearRadarMapStatus();
      },
    });
  }
}

function updateRadarTimeDisplay(frameDate, sliderValue, timezone = selectedLocation.timezone) {
  if (!(frameDate instanceof Date) || Number.isNaN(frameDate.getTime())) {
    return;
  }

  const label = formatClock(frameDate, timezone);
  const isCurrentPosition = isRadarSliderAtStart(sliderValue) && isRadarDateCurrent(frameDate);
  elements.radarTime.textContent = label;
  setRainForecastBadgeText(label, frameDate, timezone, { isCurrentPosition });
  elements.radarSlider.value = String(Math.round(sliderValue));
  elements.radarSlider.setAttribute("aria-valuetext", label);
  elements.radarTime.classList.remove("error");
  setActiveRadarDate(frameDate);
}

function isRadarDateCurrent(date, now = new Date()) {
  if (
    !(date instanceof Date)
    || Number.isNaN(date.getTime())
    || !(now instanceof Date)
    || Number.isNaN(now.getTime())
  ) {
    return false;
  }

  const offsetMinutes = (date.getTime() - now.getTime()) / (60 * 1000);
  return offsetMinutes >= -radarNowPastToleranceMinutes
    && offsetMinutes <= radarNowFutureToleranceMinutes;
}

function getBuienradarFramePositionForSliderValue(value) {
  return clampNumber((Number(value) || 0) / 100, 0, Math.max(buienradarFrameUrls.length - 1, 0));
}

function getKnmiFramePositionForSliderValue(value) {
  return clampNumber((Number(value) || 0) / 100, 0, Math.max(knmiFrameUrls.length - 1, 0));
}

function getKnmiFramePositionForDate(date) {
  if (!knmiFrameDates.length || !knmiStartDate || !(date instanceof Date)) {
    return 0;
  }

  const frameDurationMs = knmiRadarConfig.frameMinutes * 60 * 1000;
  return clampNumber((date.getTime() - knmiStartDate.getTime()) / frameDurationMs, 0, Math.max(knmiFrameDates.length - 1, 0));
}

function getBuienradarFramePositionForDate(date) {
  if (!buienradarFrameUrls.length || !buienradarStartDate || !(date instanceof Date)) {
    return 0;
  }

  const radarMode = getBuienradarRadarMode(loadedBuienradarRadarModeId);
  const frameDurationMs = radarMode.frameMinutes * 60 * 1000;
  return clampNumber((date.getTime() - buienradarStartDate.getTime()) / frameDurationMs, 0, Math.max(buienradarFrameUrls.length - 1, 0));
}

function shouldUseKnmiForHybridDate(date) {
  return Boolean(
    knmiFrameUrls.length
    && hybridRadarKnmiEndDate instanceof Date
    && date <= hybridRadarKnmiEndDate,
  );
}

function isRadarSliderAtStart(value) {
  return Math.abs((Number(value) || 0) - getRadarSliderMin()) < 0.5;
}

function getRadarSliderMin() {
  return Number(elements.radarSlider.min) || 0;
}

function setRainForecastBadgeText(text, date, timezone = selectedLocation.timezone, { isCurrentPosition = false } = {}) {
  const isClockLabel = /^\d{1,2}:\d{2}$/.test(text);
  elements.rainForecastBadge.classList.toggle("is-message", !isClockLabel);

  if (!isClockLabel) {
    elements.rainForecastBadge.textContent = text;
    elements.rainForecastBadge.removeAttribute("datetime");
    elements.rainForecastBadge.title = "";
    elements.rainForecastBadge.removeAttribute("aria-label");
    return;
  }

  const timeLabel = document.createElement("span");
  timeLabel.className = "rain-forecast-time";
  timeLabel.textContent = isCurrentPosition ? "Now" : `At ${text}`;
  elements.rainForecastBadge.replaceChildren(timeLabel);

  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    elements.rainForecastBadge.dateTime = date.toISOString();
  } else {
    elements.rainForecastBadge.removeAttribute("datetime");
  }

  const dayContext = isCurrentPosition ? "" : getRainForecastDayContext(date, timezone);
  if (dayContext) {
    const dayLabel = document.createElement("span");
    dayLabel.className = "rain-forecast-day";
    dayLabel.textContent = dayContext;
    elements.rainForecastBadge.append(dayLabel);
  }

  elements.rainForecastBadge.title = isCurrentPosition ? `Radar time ${text}` : "";
  elements.rainForecastBadge.setAttribute("aria-label", [isCurrentPosition ? `Now, radar time ${text}` : `At ${text}`, dayContext].filter(Boolean).join(", "));
}

function setRainForecastBadgeCurrent(date) {
  const fallbackTime = weatherData?.current?.time;
  const displayDate = date || (Number.isFinite(fallbackTime) ? new Date(fallbackTime * 1000) : undefined);

  elements.rainForecastBadge.classList.remove("is-message");
  elements.rainForecastBadge.textContent = "Now";
  elements.rainForecastBadge.title = "";
  elements.rainForecastBadge.setAttribute("aria-label", "Now");

  if (displayDate instanceof Date && !Number.isNaN(displayDate.getTime())) {
    elements.rainForecastBadge.dateTime = displayDate.toISOString();
  } else {
    elements.rainForecastBadge.removeAttribute("datetime");
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
  if (displayedRadarSource === "hybrid") {
    return getHybridDateForSlider(value);
  }

  if (displayedRadarSource === "knmi") {
    return getKnmiDateForSlider(value);
  }

  return getBuienradarDateForSlider(value) || getLibreWxrDateForSlider(value);
}

function getRadarSliderProgressForDate(date, range = getRadarTimeRange()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 0;
  }

  const minValue = getRadarSliderMin();
  const maxValue = Number(elements.radarSlider.max) || 0;
  if (maxValue > minValue) {
    const sliderValue = getRadarSliderValueForDate(date);
    if (Number.isFinite(sliderValue)) {
      return clampNumber((sliderValue - minValue) / (maxValue - minValue), 0, 1);
    }
  }

  if (!range || !(range.start instanceof Date) || !(range.end instanceof Date) || range.end <= range.start) {
    return 0;
  }

  return clampNumber((date.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime()), 0, 1);
}

function getRadarSliderValueForDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return undefined;
  }

  const maxValue = Number(elements.radarSlider.max) || 0;
  if (maxValue <= 0) {
    return undefined;
  }

  if (displayedRadarSource === "hybrid" && hybridRadarStartDate) {
    const frameDurationMs = knmiRadarConfig.frameMinutes * 60 * 1000;
    return clampNumber(((date.getTime() - hybridRadarStartDate.getTime()) / frameDurationMs) * 100, 0, maxValue);
  }

  if (displayedRadarSource === "knmi" && knmiFrameDates.length) {
    return clampNumber(getKnmiFramePositionForDate(date) * 100, 0, maxValue);
  }

  if (buienradarFrameUrls.length && buienradarStartDate) {
    return clampNumber(getBuienradarFramePositionForDate(date) * 100, 0, maxValue);
  }

  if (radarFrames.length) {
    return getLibreWxrSliderValueForDate(date, maxValue);
  }

  return undefined;
}

function getRadarTimeRange() {
  const minValue = getRadarSliderMin();
  const maxValue = Number(elements.radarSlider.max) || 0;
  if (displayedRadarSource === "hybrid") {
    const hybridStart = getHybridDateForSlider(minValue);
    const hybridEnd = getHybridDateForSlider(maxValue);
    return hybridStart && hybridEnd ? { start: hybridStart, end: hybridEnd } : undefined;
  }

  if (displayedRadarSource === "knmi") {
    const knmiStart = getKnmiDateForSlider(minValue);
    const knmiEnd = getKnmiDateForSlider(maxValue);
    return knmiStart && knmiEnd ? { start: knmiStart, end: knmiEnd } : undefined;
  }

  const buienradarStart = getBuienradarDateForSlider(minValue);
  const buienradarEnd = getBuienradarDateForSlider(maxValue);
  if (buienradarStart && buienradarEnd) {
    return { start: buienradarStart, end: buienradarEnd };
  }

  const libreStart = getLibreWxrDateForSlider(minValue);
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

function getHybridDateForSlider(value) {
  if (!hybridRadarStartDate || !hybridRadarEndDate) {
    return undefined;
  }

  const frameDurationMs = knmiRadarConfig.frameMinutes * 60 * 1000;
  const offsetMs = getHybridRadarFramePosition(value) * frameDurationMs;
  return new Date(Math.min(hybridRadarStartDate.getTime() + offsetMs, hybridRadarEndDate.getTime()));
}

function getHybridRadarFramePosition(value) {
  return clampNumber((Number(value) || 0) / 100, 0, getHybridRadarSliderMaxValue() / 100);
}

function getHybridRadarSliderMaxValue() {
  if (!hybridRadarStartDate || !hybridRadarEndDate || hybridRadarEndDate <= hybridRadarStartDate) {
    return 0;
  }

  const frameDurationMs = knmiRadarConfig.frameMinutes * 60 * 1000;
  return Math.max(Math.ceil((hybridRadarEndDate.getTime() - hybridRadarStartDate.getTime()) / frameDurationMs) * 100, 0);
}

function getBuienradarRadarEndDate() {
  if (!buienradarFrameUrls.length || !buienradarStartDate) {
    return undefined;
  }

  const radarMode = getBuienradarRadarMode(loadedBuienradarRadarModeId);
  return new Date(buienradarStartDate.getTime() + Math.max(buienradarFrameUrls.length - 1, 0) * radarMode.frameMinutes * 60 * 1000);
}

function getLatestDate(...dates) {
  return dates
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((left, right) => right - left)[0];
}

function resetHybridRadarRange() {
  hybridRadarStartDate = undefined;
  hybridRadarEndDate = undefined;
  hybridRadarKnmiEndDate = undefined;
}

function getKnmiDateForSlider(value) {
  if (!knmiFrameDates.length || !knmiStartDate) {
    return undefined;
  }

  return getKnmiDateForFramePosition(getKnmiFramePositionForSliderValue(value));
}

function getKnmiDateForFramePosition(framePosition) {
  if (!knmiFrameDates.length) {
    return undefined;
  }

  const maxFramePosition = Math.max(knmiFrameDates.length - 1, 0);
  const safeFramePosition = clampNumber(framePosition, 0, maxFramePosition);
  const lowerIndex = Math.floor(safeFramePosition);
  const upperIndex = Math.min(lowerIndex + 1, maxFramePosition);
  const progress = safeFramePosition - lowerIndex;
  const lowerDate = knmiFrameDates[lowerIndex];
  const upperDate = knmiFrameDates[upperIndex];
  if (!upperDate || upperDate === lowerDate) {
    return lowerDate;
  }

  return new Date(lowerDate.getTime() + (upperDate.getTime() - lowerDate.getTime()) * progress);
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

function getLibreWxrSliderValueForDate(date, maxValue = Number(elements.radarSlider.max) || 0) {
  if (!radarFrames.length || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return undefined;
  }

  const targetTime = date.getTime() / 1000;
  const firstFrame = radarFrames[0];
  const lastFrame = radarFrames[radarFrames.length - 1];
  if (targetTime <= firstFrame.time) {
    return 0;
  }

  if (targetTime >= lastFrame.time) {
    return maxValue;
  }

  for (let index = 0; index < radarFrames.length - 1; index += 1) {
    const lowerFrame = radarFrames[index];
    const upperFrame = radarFrames[index + 1];
    if (targetTime >= lowerFrame.time && targetTime <= upperFrame.time) {
      const frameDuration = upperFrame.time - lowerFrame.time;
      const progress = frameDuration > 0 ? (targetTime - lowerFrame.time) / frameDuration : 0;
      return clampNumber((index + progress) * 100, 0, maxValue);
    }
  }

  return undefined;
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

  const sliderWidth = elements.radarSlider.getBoundingClientRect().width;
  const trackWidth = Math.max(sliderWidth - getRadarSliderThumbSize(), 0);
  const maxLabels = Math.max(2, Math.min(13, Math.floor(trackWidth / 58)));
  const dates = getSliderTimestampDates(range.start, range.end, maxLabels);
  const track = document.createElement("div");
  track.className = "slider-timestamps-track";

  dates.forEach((date) => {
    track.appendChild(createSliderTimestamp(date, range.start, range.end));
  });

  elements.sliderTimestamps.hidden = false;
  elements.sliderTimestamps.replaceChildren(track);
  updatePrecipitationTimelineMarker();
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
  const position = getRadarSliderProgressForDate(date, { start, end }) * 100;
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
    const radar = await fetchBuienradarRadarMode(radarModeId);
    prepareBuienradarRainSamples(radar);
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
  const samples = buienradarRainSamples.get(radar.modeId);
  if (samples?.frameUrls === radar.frameUrls) {
    buienradarRainSamples.delete(radar.modeId);
  }

  const isRetainedLayerGeneration = (
    radar.frameUrls === buienradarCommittedFrameUrls
    && (buienradarLayer || buienradarNextLayer)
  );
  if (isRetainedLayerGeneration) {
    radar.frameUrls.forEach((url) => buienradarRetainedFrameUrlsToRevoke.add(url));
    return;
  }

  radar.frameUrls.forEach(revokeFrameUrl);
}

function getCurrentBuienradarRainSampleRun(frameUrls = buienradarFrameUrls, modeId = loadedBuienradarRadarModeId) {
  const run = buienradarRainSampleRuns.get(modeId);
  return run?.frameUrls === frameUrls && run.locationKey === getBuienradarSampleLocationKey(selectedLocation)
    ? run : undefined;
}

function createBuienradarRainSampleRun(radar) {
  const run = {
    radar,
    frameUrls: radar.frameUrls,
    location: { lat: selectedLocation.lat, lon: selectedLocation.lon },
    locationKey: getBuienradarSampleLocationKey(selectedLocation),
    samplesByIndex: new Map(),
    loadedImageIndexes: new Set(),
    failedIndexes: new Set(),
    sampleRequests: new Map(),
    backgroundPromise: undefined,
  };
  const samples = buienradarRainSamples.get(radar.modeId);
  if (samples?.frameUrls === radar.frameUrls && samples.locationKey === run.locationKey) {
    const duration = getBuienradarRadarMode(radar.modeId).frameMinutes * 60 * 1000;
    samples.samples.forEach((sample) => {
      const index = Math.round((sample.time - radar.startDate.getTime()) / duration);
      run.samplesByIndex.set(index, sample);
      run.loadedImageIndexes.add(index);
    });
  }
  return run;
}

function prepareBuienradarRainSamples(radar) {
  if (!radar?.frameUrls?.length || !isInBuienradarBounds(selectedLocation)) return;
  const run = getCurrentBuienradarRainSampleRun(radar.frameUrls, radar.modeId) || createBuienradarRainSampleRun(radar);
  buienradarRainSampleRuns.set(radar.modeId, run);
  if (run.backgroundPromise || run.loadedImageIndexes.size + run.failedIndexes.size >= radar.frameUrls.length) return;
  const selectedDate = getSelectedWeatherDate();
  const duration = getBuienradarRadarMode(radar.modeId).frameMinutes * 60 * 1000;
  const position = selectedDate instanceof Date ? (selectedDate - radar.startDate) / duration : 0;
  const preferred = getKnmiFrameIndexesForPosition(position, radar.frameUrls.length);
  run.backgroundPromise = ensureBuienradarRainSamplesForFrameIndexes(run, preferred)
    .then(async () => {
      publishBuienradarRainSampleRun(run, { render: true });
      for (let index = 0; index < radar.frameUrls.length; index += 1) {
        if (getCurrentBuienradarRainSampleRun(radar.frameUrls, radar.modeId) !== run) return;
        await ensureBuienradarRainSamplesForFrameIndexes(run, [index]);
      }
      publishBuienradarRainSampleRun(run, { render: true });
    })
    .catch((error) => console.warn("Could not sample Buienradar rain at the selected location.", error))
    .finally(() => { run.backgroundPromise = undefined; });
}

function ensureBuienradarRainSamplesForFrameIndexes(run, indexes, { retryImageFailures = false } = {}) {
  return Promise.all(indexes.map((index) => {
    if (run.loadedImageIndexes.has(index) || (!retryImageFailures && run.failedIndexes.has(index))) return;
    if (!run.sampleRequests.has(index)) {
      const request = Promise.resolve().then(() => sampleBuienradarRainFrame(run, index))
        .then(({ imageLoaded, sample } = {}) => {
          if (imageLoaded) run.loadedImageIndexes.add(index);
          if (sample) run.samplesByIndex.set(index, sample);
          if (imageLoaded) run.failedIndexes.delete(index);
          else run.failedIndexes.add(index);
        })
        .catch(() => { run.failedIndexes.add(index); })
        .finally(() => { run.sampleRequests.delete(index); });
      run.sampleRequests.set(index, request);
    }
    return run.sampleRequests.get(index);
  }));
}

function publishBuienradarRainSampleRun(run, { render = false } = {}) {
  if (getCurrentBuienradarRainSampleRun(run.frameUrls, run.radar.modeId) !== run) return;
  const samples = [...run.samplesByIndex.entries()].sort(([a], [b]) => a - b).map(([, sample]) => sample);
  if (!samples.length) return;
  const radar = run.radar;
  const series = {
    modeId: radar.modeId, source: "radar-image", frameUrls: radar.frameUrls,
    locationKey: run.locationKey, startDate: radar.startDate, fetchedAt: radar.fetchedAt,
    frameMinutes: getBuienradarRadarMode(radar.modeId).frameMinutes,
    maxLookaheadHours: buienradarBlendMaxLookaheadHours, samples,
  };
  buienradarRainSamples.set(radar.modeId, series);
  if (buienradarCommittedFrameUrls === radar.frameUrls && buienradarCommittedModeId === radar.modeId) {
    buienradarCommittedRainSamples = series;
    if (render) renderWeatherForRadarBlend(run.locationKey);
  }
}

function prepareKnmiRainSamples(radar) {
  if (!radar?.frameUrls?.length || !isInBuienradarBounds(selectedLocation)) {
    return;
  }

  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const existingRun = getCurrentKnmiRainSampleRun(radar.frameUrls);
  const sampleRun = existingRun || createKnmiRainSampleRun(radar, selectedLocation, locationKey);
  knmiRainSampleRun = sampleRun;

  if (sampleRun.backgroundPromise) {
    return;
  }

  const preferredDate = getSelectedWeatherDate();
  const preferredPosition = preferredDate instanceof Date && !Number.isNaN(preferredDate.getTime())
    ? getKnmiFramePositionForDate(preferredDate)
    : 0;
  const preferredIndexes = getKnmiFrameIndexesForPosition(preferredPosition, radar.frameUrls.length);
  const remainingIndexes = radar.frameUrls
    .map((_, index) => index)
    .filter((index) => !preferredIndexes.includes(index));

  sampleRun.backgroundPromise = ensureKnmiRainSamplesForFrameIndexes(sampleRun, preferredIndexes)
    .then(() => buildKnmiRainSamples(sampleRun, remainingIndexes))
    .then(() => {
      publishKnmiRainSampleRun(sampleRun, { render: sampleRun.isCommittedToTimeline });
    })
    .catch((error) => {
      console.warn("Could not sample KNMI rain at the selected location.", error);
    });
}

function getCurrentKnmiRainSampleRun(frameUrls = knmiFrameUrls) {
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  return (
    knmiRainSampleRun?.frameUrls === frameUrls
    && knmiRainSampleRun.locationKey === locationKey
  )
    ? knmiRainSampleRun
    : undefined;
}

function createKnmiRainSampleRun(radar, location, locationKey) {
  const sampleRun = {
    radar,
    frameUrls: radar.frameUrls,
    frameDates: radar.frameDates || [],
    location: { lat: location.lat, lon: location.lon },
    locationKey,
    samplesByIndex: new Map(),
    sampleRequests: new Map(),
    failedIndexes: new Set(),
    isCommittedToTimeline: false,
    backgroundPromise: undefined,
  };

  if (knmiRainSamples?.frameUrls === radar.frameUrls && knmiRainSamples.locationKey === locationKey) {
    knmiRainSamples.samples.forEach((sample) => {
      const index = sampleRun.frameDates.findIndex((date) => (
        date instanceof Date && date.getTime() === sample.time
      ));
      if (index >= 0) {
        sampleRun.samplesByIndex.set(index, sample);
      }
    });
  }

  return sampleRun;
}

function areKnmiRainSamplesSettled(sampleRun, frameIndexes) {
  return frameIndexes.every((index) => (
    sampleRun.samplesByIndex.has(index) || sampleRun.failedIndexes.has(index)
  ));
}

function ensureKnmiRainSamplesForFrameIndexes(sampleRun, frameIndexes) {
  const requests = frameIndexes.map((index) => {
    if (sampleRun.samplesByIndex.has(index) || sampleRun.failedIndexes.has(index)) {
      return Promise.resolve();
    }

    if (!sampleRun.sampleRequests.has(index)) {
      const request = Promise.resolve()
        .then(() => sampleKnmiRainFrame(sampleRun, index))
        .then((sample) => {
          if (sample) {
            sampleRun.samplesByIndex.set(index, sample);
          } else {
            sampleRun.failedIndexes.add(index);
          }
        })
        .catch(() => {
          sampleRun.failedIndexes.add(index);
        })
        .finally(() => {
          sampleRun.sampleRequests.delete(index);
        });
      sampleRun.sampleRequests.set(index, request);
    }

    return sampleRun.sampleRequests.get(index);
  });

  return Promise.all(requests);
}

function publishKnmiRainSampleRun(sampleRun, { render = false } = {}) {
  if (
    knmiRainSampleRun !== sampleRun
    || sampleRun.locationKey !== getBuienradarSampleLocationKey(selectedLocation)
    || !sampleRun.isCommittedToTimeline
  ) {
    return false;
  }

  const samples = [...sampleRun.samplesByIndex.entries()]
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, sample]) => sample);
  if (!samples.length) {
    return false;
  }

  const radar = sampleRun.radar;
  knmiRainSamples = {
    modeId: "knmi-image",
    source: "knmi-image",
    frameUrls: radar.frameUrls,
    locationKey: sampleRun.locationKey,
    startDate: radar.startDate,
    referenceDate: radar.referenceDate,
    fetchedAt: radar.fetchedAt,
    metadataFetchedAt: radar.metadataFetchedAt,
    proxyAgeSeconds: radar.proxyAgeSeconds,
    proxyCacheStatus: radar.proxyCacheStatus,
    proxyDiagnosticScope: radar.proxyDiagnosticScope,
    crs: radar.crs || knmiRadarConfig.mapCrs,
    frameMinutes: knmiRadarConfig.frameMinutes,
    maxLookaheadHours: knmiRadarConfig.maxLookaheadHours,
    samples,
  };

  if (render) {
    renderWeatherForRadarBlend(sampleRun.locationKey);
  }
  return true;
}

async function buildKnmiRainSamples(sampleRun, frameIndexes) {
  for (const index of frameIndexes) {
    await ensureKnmiRainSamplesForFrameIndexes(sampleRun, [index]);
  }

  return [...sampleRun.samplesByIndex.entries()]
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, sample]) => sample);
}

async function sampleKnmiRainFrame(sampleRun, index) {
  const image = await loadRadarSampleImage(sampleRun.frameUrls[index], {
    timeoutMs: knmiRadarImageLoadTimeoutMs,
  });
  if (!image) {
    return undefined;
  }

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) {
    return undefined;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return undefined;
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const sample = getKnmiFrameRainSample(context, width, height, sampleRun.location);
  const frameDate = sampleRun.frameDates[index];
  const time = frameDate instanceof Date && !Number.isNaN(frameDate.getTime())
    ? frameDate.getTime()
    : sampleRun.radar.startDate.getTime() + index * knmiRadarConfig.frameMinutes * 60 * 1000;
  return {
    ...sample,
    time,
    chance: getBuienradarSignalChance(sample),
  };
}

async function sampleBuienradarRainFrame(run, index) {
  const image = await loadRadarSampleImage(run.frameUrls[index], { timeoutMs: buienradarRadarTimeoutMs });
  if (!image) return { imageLoaded: false };
  try {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const canvas = run.canvas || (run.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!width || !height || !context) return { imageLoaded: true };
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);
    const sample = getBuienradarFrameRainSample(context, width, height, run.location);
    return { imageLoaded: true, sample: {
      ...sample,
      time: run.radar.startDate.getTime() + index * getBuienradarRadarMode(run.radar.modeId).frameMinutes * 60 * 1000,
      chance: getBuienradarSignalChance(sample),
    } };
  } catch (_error) {
    // A readable image can still fail canvas sampling; allow the point/model fallback.
    return { imageLoaded: true };
  }
}

function loadRadarSampleImage(url, { timeoutMs } = {}) {
  return new Promise((resolve) => {
    const image = new Image();
    let isSettled = false;
    let timeoutId;
    const finish = (result) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      image.onload = null;
      image.onerror = null;
      if (!result) image.src = "";
      resolve(result);
    };
    image.onload = () => finish(image);
    image.onerror = () => finish(undefined);
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeoutId = window.setTimeout(() => finish(undefined), timeoutMs);
    }
    image.src = url;
  });
}

function getBuienradarFrameRainSample(context, width, height, location) {
  return getRadarFrameRainSample(context, width, height, location, getBuienradarPixelRainSample);
}

function getKnmiFrameRainSample(context, width, height, location) {
  return getRadarFrameRainSample(context, width, height, location, getKnmiPixelRainSample);
}

function getRadarFrameRainSample(context, width, height, location, pixelRainSampler) {
  const point = getWebMercatorRadarPixelForLocation(location, width, height);
  if (!point) {
    return {
      signal: 0,
      chanceSignal: 0,
      intensitySignal: 0,
      intensityRank: 0,
      exactIntensitySignal: 0,
      exactIntensityRank: 0,
      nearbyIntensityRank: 0,
      exactSignal: 0,
      nearbySignal: 0,
      exactCoverage: 0,
      nearbyCoverage: 0,
    };
  }

  const radius = buienradarSampleNearbyRadiusPx;
  const left = Math.max(Math.floor(point.x) - radius, 0);
  const top = Math.max(Math.floor(point.y) - radius, 0);
  const right = Math.min(Math.floor(point.x) + radius, width - 1);
  const bottom = Math.min(Math.floor(point.y) + radius, height - 1);
  const sampleWidth = right - left + 1;
  const sampleHeight = bottom - top + 1;
  const data = context.getImageData(left, top, sampleWidth, sampleHeight).data;
  const stats = {
    exactPixels: 0,
    exactWeight: 0,
    exactRainWeight: 0,
    exactChanceSignalSum: 0,
    exactIntensitySignalSum: 0,
    nearbyPixels: 0,
    nearbyRainPixels: 0,
    nearbyChanceSignalSum: 0,
    nearbyClassCounts: [0, 0, 0, 0],
  };

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const absoluteX = left + x;
      const absoluteY = top + y;
      const distance = Math.hypot(absoluteX - point.x, absoluteY - point.y);
      if (distance > buienradarSampleNearbyRadiusPx) {
        continue;
      }

      const pixelIndex = (y * sampleWidth + x) * 4;
      const pixelSample = pixelRainSampler(
        data[pixelIndex],
        data[pixelIndex + 1],
        data[pixelIndex + 2],
        data[pixelIndex + 3],
      );
      const intensityRank = pixelSample.intensityRank;

      stats.nearbyPixels += 1;
      if (intensityRank > 0) {
        stats.nearbyRainPixels += 1;
        stats.nearbyChanceSignalSum += pixelSample.chanceSignal;
        stats.nearbyClassCounts[intensityRank] += 1;
      }

      const exactWeight = (
        Math.max(0, 1 - Math.abs(absoluteX - point.x))
        * Math.max(0, 1 - Math.abs(absoluteY - point.y))
      );
      if (exactWeight > 0) {
        stats.exactPixels += 1;
        stats.exactWeight += exactWeight;
        if (intensityRank > 0) {
          stats.exactRainWeight += exactWeight;
          stats.exactChanceSignalSum += pixelSample.chanceSignal * exactWeight;
          stats.exactIntensitySignalSum += getBuienradarIntensitySignalForRank(intensityRank) * exactWeight;
        }
      }
    }
  }

  const exactCoverage = stats.exactWeight ? stats.exactRainWeight / stats.exactWeight : 0;
  const nearbyCoverage = stats.nearbyPixels ? stats.nearbyRainPixels / stats.nearbyPixels : 0;
  const exactAverage = stats.exactWeight ? stats.exactChanceSignalSum / stats.exactWeight : 0;
  const exactWetAverage = stats.exactRainWeight ? stats.exactChanceSignalSum / stats.exactRainWeight : 0;
  const nearbyAverage = stats.nearbyPixels ? stats.nearbyChanceSignalSum / stats.nearbyPixels : 0;
  const nearbyWetAverage = stats.nearbyRainPixels ? stats.nearbyChanceSignalSum / stats.nearbyRainPixels : 0;
  const exactSignal = stats.exactRainWeight > 0
    ? clampNumber(
      (exactWetAverage * 0.58 + Math.min(exactAverage * 5, 1) * 0.42) * Math.min(exactCoverage * 10, 1),
      0,
      1,
    )
    : 0;
  const nearbySignal = stats.nearbyRainPixels > 0
    ? clampNumber(
      (nearbyWetAverage * 0.52 + Math.min(nearbyAverage * 4, 1) * 0.48) * Math.min(nearbyCoverage * 6, 1),
      0,
      1,
    )
    : 0;
  const exactIntensitySignal = stats.exactWeight
    ? stats.exactIntensitySignalSum / stats.exactWeight
    : 0;
  const exactIntensityRank = getRadarSampleIntensityRankForSignal(exactIntensitySignal);
  const nearbyIntensityRank = getBuienradarSampleIntensityRank(stats.nearbyClassCounts, stats.nearbyPixels);

  return {
    signal: exactSignal,
    chanceSignal: exactSignal,
    intensitySignal: exactIntensitySignal,
    intensityRank: exactIntensityRank,
    exactIntensityRank,
    exactIntensitySignal,
    nearbyIntensityRank,
    exactSignal,
    nearbySignal,
    exactCoverage,
    nearbyCoverage,
  };
}

function getBuienradarPixelRainSample(red, green, blue, alpha) {
  if (alpha < buienradarSampleAlphaThreshold || Math.max(red, green, blue) < 40) {
    return {
      intensityRank: 0,
      chanceSignal: 0,
    };
  }

  const opacity = alpha / 255;
  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const saturation = maxChannel - minChannel;
  const brightness = (red + green + blue) / 3;
  let intensityRank = 0;

  const isRedOrPurple = red > 150 && saturation > 55 && (green < 170 || blue > 120);
  const isDarkBlue = blue > 115 && red < 125 && green < 165 && brightness < 155 && saturation > 45;
  const isModerateBlue = blue > 135 && red < 175 && brightness < 205 && saturation > 35;
  const isLightRainColor = blue > 90 || green > 115 || red > 115;

  if (isRedOrPurple || isDarkBlue) {
    intensityRank = 3;
  } else if (isModerateBlue) {
    intensityRank = 2;
  } else if (isLightRainColor) {
    intensityRank = 1;
  }

  if (opacity < 0.28 && intensityRank > 1) {
    intensityRank -= 1;
  }

  return {
    intensityRank,
    chanceSignal: getBuienradarChanceSignalForRank(intensityRank) * Math.max(opacity, 0.45),
  };
}

function getKnmiPixelRainSample(red, green, blue, alpha) {
  if (alpha < knmiSampleAlphaThreshold) {
    return {
      intensityRank: 0,
      chanceSignal: 0,
    };
  }

  const opacity = alpha / 255;
  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const saturation = maxChannel - minChannel;
  const brightness = (red + green + blue) / 3;
  const isNeutral = saturation < 18 || (brightness > 235 && saturation < 35);
  const isExtremeRain = red > 0 && red < 30 && green < 5 && blue < 5;
  const isKnmiGreyRain = saturation < 18 && brightness >= 45 && brightness < 215;
  let intensityRank = isExtremeRain ? 3 : (isKnmiGreyRain ? 1 : 0);

  if (!isNeutral) {
    const isPurple = red > 110 && blue > 125 && green < 145 && saturation > 45;
    const isRedOrOrange = red > 165 && green < 185 && blue < 160 && saturation > 45;
    const isYellow = red > 165 && green > 135 && blue < 145 && saturation > 35;
    const isGreen = green > 115 && red < 190 && blue < 185 && saturation > 35;
    const isBlue = blue > 85 && saturation > 25;

    if (isPurple || isRedOrOrange) {
      intensityRank = 3;
    } else if (isYellow || isGreen) {
      intensityRank = 2;
    } else if (isBlue || saturation > 35) {
      intensityRank = 1;
    }
  }

  if (opacity < 0.28 && intensityRank > 1) {
    intensityRank -= 1;
  }

  return {
    intensityRank,
    chanceSignal: getBuienradarChanceSignalForRank(intensityRank) * Math.max(opacity, 0.45),
  };
}

function getBuienradarSampleIntensityRank(classCounts, totalPixels) {
  if (!totalPixels) {
    return 0;
  }

  const rainPixels = classCounts[1] + classCounts[2] + classCounts[3];
  if (!rainPixels) {
    return 0;
  }

  const heavyCoverage = classCounts[3] / totalPixels;
  const heavyWetRatio = classCounts[3] / rainPixels;
  const moderatePlusCoverage = (classCounts[2] + classCounts[3]) / totalPixels;
  const moderatePlusWetRatio = (classCounts[2] + classCounts[3]) / rainPixels;

  if (heavyCoverage >= 0.06 || (heavyCoverage >= 0.025 && heavyWetRatio >= 0.35)) {
    return 3;
  }

  if (moderatePlusCoverage >= 0.08 || (moderatePlusCoverage >= 0.035 && moderatePlusWetRatio >= 0.45)) {
    return 2;
  }

  return 1;
}

function getRadarSampleIntensityRankForSignal(signal) {
  if (signal >= 0.72) {
    return 3;
  }
  if (signal >= 0.38) {
    return 2;
  }
  return signal > 0 ? 1 : 0;
}

function getBuienradarChanceSignalForRank(rank) {
  const signals = [0, 0.3, 0.62, 0.92];
  return signals[rank] || 0;
}

function getBuienradarIntensitySignalForRank(rank) {
  const signals = [0, 0.2, 0.5, 0.85];
  return signals[rank] || 0;
}

function getWebMercatorRadarPixelForLocation(location, width, height, bounds = buienradarBounds) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return undefined;
  }

  const [[south, west], [north, east]] = bounds;
  const southWest = projectLocationToWebMercator({ lat: south, lon: west });
  const northEast = projectLocationToWebMercator({ lat: north, lon: east });
  const point = projectLocationToWebMercator(location);
  if (!southWest || !northEast || !point) {
    return undefined;
  }

  const xRatio = (point.x - southWest.x) / (northEast.x - southWest.x);
  const yRatio = (northEast.y - point.y) / (northEast.y - southWest.y);

  if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) {
    return undefined;
  }

  return {
    x: clampNumber(xRatio * width, 0, width - 1),
    y: clampNumber(yRatio * height, 0, height - 1),
  };
}

function projectLocationToWebMercator(location) {
  if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lon)) {
    return undefined;
  }

  const latitude = clampNumber(location.lat, -webMercatorMaxLatitude, webMercatorMaxLatitude);
  const longitudeRadians = location.lon * Math.PI / 180;
  const latitudeRadians = latitude * Math.PI / 180;
  return {
    x: webMercatorEarthRadiusMeters * longitudeRadians,
    y: webMercatorEarthRadiusMeters * Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)),
  };
}

function getBuienradarSignalChance(sample) {
  if (!sample || sample.signal <= 0.02) {
    return 0;
  }

  if (sample.exactSignal <= 0.02) {
    return clampNumber(sample.nearbySignal * 45, 0, 45);
  }

  return clampNumber(45 + sample.signal * 55, 0, 100);
}

function getBuienradarSampleLocationKey(location) {
  return `${Number(location.lat).toFixed(3)},${Number(location.lon).toFixed(3)}`;
}

async function prepareBuienradarPointRainForLocation(location, { forceRefresh = false } = {}) {
  if (!isInBuienradarBounds(location)) {
    return undefined;
  }

  const locationKey = getBuienradarSampleLocationKey(location);
  const cachedSamples = buienradarPointRainCache.get(locationKey);
  if (!forceRefresh && isFreshBuienradarPointRainSeries(cachedSamples)) {
    return cachedSamples;
  }

  const existingRequest = buienradarPointRainRequests.get(locationKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = downloadBuienradarPointRain(location, locationKey)
    .finally(() => {
      buienradarPointRainRequests.delete(locationKey);
    });

  buienradarPointRainRequests.set(locationKey, request);
  return request;
}

async function downloadBuienradarPointRain(location, locationKey) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), buienradarPointRainTimeoutMs);

  try {
    const response = await fetch(buildBuienradarPointRainUrl(location), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Buienradar point rain responded with ${response.status}`);
    }

    const fetchedAt = Date.now();
    const text = await response.text();
    const samples = parseBuienradarPointRainText(text, fetchedAt);
    if (!samples.length) {
      throw new Error("Buienradar point rain returned no usable samples");
    }

    const sampleSeries = {
      modeId: "point",
      source: "point",
      locationKey,
      startDate: new Date(samples[0].time),
      fetchedAt,
      frameMinutes: 5,
      samples,
    };
    buienradarPointRainCache.set(locationKey, sampleSeries);
    return sampleSeries;
  } finally {
    window.clearTimeout(timeout);
  }
}

function buildBuienradarPointRainUrl(location) {
  const params = new URLSearchParams({
    lat: String(location.lat),
    lon: String(location.lon),
  });

  return `${buienradarPointRainBaseUrl}?${params}`;
}

function parseBuienradarPointRainText(text, fetchedAt = Date.now()) {
  const baseParts = getDateParts(new Date(fetchedAt), DEFAULT_LOCATION.timezone);
  const samples = [];
  let dayOffset = 0;
  let previousTime;

  String(text || "").split(/\r?\n/).forEach((line) => {
    const match = line.trim().match(/^(\d{1,3})\|(\d{2}):(\d{2})$/);
    if (!match) {
      return;
    }

    const value = Number(match[1]);
    const hour = Number(match[2]);
    const minute = Number(match[3]);
    if (!Number.isFinite(value) || !Number.isFinite(hour) || !Number.isFinite(minute)) {
      return;
    }

    let time = getBuienradarPointRainSampleTime(baseParts, hour, minute, dayOffset);
    if (!previousTime) {
      while (time < fetchedAt - 30 * 60 * 1000) {
        dayOffset += 1;
        time = getBuienradarPointRainSampleTime(baseParts, hour, minute, dayOffset);
      }
    } else {
      while (time <= previousTime) {
        dayOffset += 1;
        time = getBuienradarPointRainSampleTime(baseParts, hour, minute, dayOffset);
      }
    }

    previousTime = time;
    samples.push({
      ...getBuienradarPointRainSampleFromValue(value),
      time,
    });
  });

  return samples;
}

function getBuienradarPointRainSampleTime(baseParts, hour, minute, dayOffset = 0) {
  return dateFromTimeZoneParts({
    year: Number(baseParts.year),
    month: Number(baseParts.month),
    day: Number(baseParts.day) + dayOffset,
    hour,
    minute,
  }, DEFAULT_LOCATION.timezone).getTime();
}

function getBuienradarPointRainSampleFromValue(value) {
  const amount = getBuienradarPointRainAmount(value);
  const intensityRank = getBuienradarPointRainIntensityRank(amount);

  return {
    source: "point",
    value,
    amount,
    signal: getBuienradarChanceSignalForRank(intensityRank),
    chance: getBuienradarPointRainChanceForRank(intensityRank),
    intensitySignal: getBuienradarIntensitySignalForRank(intensityRank),
    intensityRank,
  };
}

function getBuienradarPointRainAmount(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return 10 ** ((value - 109) / 32);
}

function getBuienradarPointRainIntensityRank(amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (amount >= precipitationIntensityThresholds.rain.heavy) {
    return 3;
  }

  if (amount >= precipitationIntensityThresholds.rain.moderate) {
    return 2;
  }

  return 1;
}

function getBuienradarPointRainChanceForRank(rank) {
  const chances = [0, 70, 85, 95];
  return chances[rank] || 0;
}

function isFreshBuienradarPointRainSeries(sampleSeries) {
  return Boolean(
    sampleSeries?.samples?.length
    && Number.isFinite(sampleSeries.fetchedAt)
    && Date.now() - sampleSeries.fetchedAt < buienradarPointRainCacheMaxAgeMs,
  );
}

async function prepareKnmiPointRainForLocation(location, { forceRefresh = false } = {}) {
  if (!isInBuienradarBounds(location)) {
    return undefined;
  }

  const locationKey = getBuienradarSampleLocationKey(location);
  const cachedSamples = knmiPointRainCache.get(locationKey);
  if (!forceRefresh && isFreshKnmiPointRainSeries(cachedSamples)) {
    return cachedSamples;
  }

  const existingRequest = knmiPointRainRequests.get(locationKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = downloadKnmiPointRain(location, locationKey, { forceMetadataRefresh: forceRefresh })
    .catch((error) => {
      knmiPointRainErrors.set(locationKey, {
        message: getKnmiPointRainErrorMessage(error),
        fetchedAt: Date.now(),
      });
      scheduleKnmiPointRainRenderRefresh(locationKey);
      throw error;
    })
    .finally(() => {
      knmiPointRainRequests.delete(locationKey);
    });

  knmiPointRainRequests.set(locationKey, request);
  return request;
}

async function downloadKnmiPointRain(location, locationKey, { forceMetadataRefresh = false } = {}) {
  const metadata = await fetchKnmiRadarMetadata({ forceRefresh: forceMetadataRefresh });
  const frameDates = getKnmiRadarFrameDates(metadata.referenceDate, metadata.endDate);
  const prioritizedDates = getKnmiPointRainPriorityDates(frameDates);
  const initialDates = prioritizedDates.slice(0, knmiPointRainInitialSampleCount);
  const initialSamples = (await fetchKnmiPointRainSamples(location, initialDates, metadata.referenceDate))
    .filter(Boolean);

  if (!initialSamples.length) {
    throw new Error("KNMI point rain returned no usable samples");
  }

  const sampleSeries = {
    modeId: "knmi-point",
    source: "knmi-point",
    pointWindow: true,
    locationKey,
    startDate: frameDates[0],
    referenceDate: metadata.referenceDate,
    fetchedAt: Date.now(),
    metadataFetchedAt: metadata.fetchedAt,
    proxyAgeSeconds: metadata.proxyAgeSeconds,
    proxyCacheStatus: metadata.proxyCacheStatus,
    proxyDiagnosticScope: metadata.proxyDiagnosticScope,
    crs: knmiRadarConfig.pointCrs,
    frameMinutes: knmiRadarConfig.frameMinutes,
    samples: [],
  };
  initialSamples.forEach((sample) => {
    addKnmiPointRainSample(sampleSeries, sample);
  });
  knmiPointRainCache.set(locationKey, sampleSeries);
  knmiPointRainErrors.delete(locationKey);
  scheduleKnmiPointRainRenderRefresh(locationKey);
  fillKnmiPointRainSampleSeries({
    location,
    locationKey,
    referenceDate: metadata.referenceDate,
    dates: prioritizedDates.slice(initialDates.length),
    sampleSeries,
  });
  return sampleSeries;
}

function getKnmiPointRainPriorityDates(frameDates) {
  const selectedTime = getSelectedWeatherDate()?.getTime() || Date.now();

  return [...frameDates].sort((left, right) => {
    const leftDistance = Math.abs(left.getTime() - selectedTime);
    const rightDistance = Math.abs(right.getTime() - selectedTime);
    return leftDistance - rightDistance || left.getTime() - right.getTime();
  });
}

async function fetchKnmiPointRainSamples(location, dates, referenceDate) {
  const samples = [];
  let index = 0;
  const workerCount = Math.min(knmiPointRainConcurrentRequests, dates.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (index < dates.length) {
      const date = dates[index];
      index += 1;
      const sample = await fetchKnmiPointRainSample(location, date, referenceDate)
        .catch(() => undefined);
      if (sample) {
        samples.push(sample);
      }
    }
  }));

  return samples;
}

function fillKnmiPointRainSampleSeries({ location, locationKey, referenceDate, dates, sampleSeries }) {
  fetchKnmiPointRainSamples(location, dates, referenceDate)
    .then((samples) => {
      if (knmiPointRainCache.get(locationKey) !== sampleSeries) {
        return;
      }

      samples.forEach((sample) => {
        addKnmiPointRainSample(sampleSeries, sample);
      });
      if (samples.length) {
        sampleSeries.fetchedAt = Date.now();
        scheduleKnmiPointRainRenderRefresh(locationKey);
      }
    })
    .catch((error) => {
      console.warn("Could not complete KNMI point rain samples.", error);
    });
}

function addKnmiPointRainSample(sampleSeries, sample) {
  const existingIndex = sampleSeries.samples.findIndex((existingSample) => existingSample.time === sample.time);
  if (existingIndex >= 0) {
    sampleSeries.samples[existingIndex] = sample;
  } else {
    sampleSeries.samples.push(sample);
  }

  sampleSeries.samples.sort((left, right) => left.time - right.time);
}

function scheduleKnmiPointRainRenderRefresh(locationKey) {
  if (
    getBuienradarSampleLocationKey(selectedLocation) !== locationKey
    || knmiPointRainRenderTimer
  ) {
    return;
  }

  knmiPointRainRenderTimer = window.setTimeout(() => {
    knmiPointRainRenderTimer = undefined;
    renderWeatherForRadarBlend(locationKey);
  }, knmiPointRainRenderDelayMs);
}

function getKnmiPointRainErrorMessage(error) {
  if (error?.name === "AbortError" || /timed out/i.test(error?.message || "")) {
    return "KNMI request timed out";
  }

  return "KNMI source unavailable";
}

async function fetchKnmiPointRainSample(location, date, referenceDate) {
  try {
    const { response, body: data } = await fetchBodyWithTimeout(buildKnmiPointRainUrl(location, date, referenceDate), {
      cache: "no-store",
      timeoutMs: knmiPointRainTimeoutMs,
      readBody: (nextResponse) => nextResponse.json(),
    });
    if (!response.ok) {
      throw new Error(`KNMI point rain responded with ${response.status}`);
    }

    const amount = getKnmiPointRainAmount(data);
    if (!Number.isFinite(amount)) {
      return undefined;
    }

    return {
      ...getKnmiPointRainSampleFromAmount(amount),
      ...getKnmiProxyCacheDiagnostics(response, "point"),
      time: date.getTime(),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("KNMI point rain timed out");
    }

    throw error;
  }
}

function buildKnmiPointRainUrl(location, date, referenceDate) {
  const latPadding = 0.05;
  const lonPadding = 0.05;
  const bbox = [
    location.lat - latPadding,
    location.lon - lonPadding,
    location.lat + latPadding,
    location.lon + lonPadding,
  ].join(",");

  return buildKnmiWmsUrl({
    dataset: knmiRadarConfig.dataset,
    service: "WMS",
    version: "1.3.0",
    request: "GetFeatureInfo",
    layers: knmiRadarConfig.layer,
    query_layers: knmiRadarConfig.layer,
    crs: knmiRadarConfig.pointCrs,
    bbox,
    width: "101",
    height: "101",
    i: "50",
    j: "50",
    info_format: "application/json",
    format: "image/png",
    styles: knmiRadarConfig.style,
    time: formatKnmiIsoTime(date),
    reference_time: formatKnmiIsoTime(referenceDate),
  });
}

function getKnmiPointRainAmount(data) {
  const firstResult = Array.isArray(data) ? data[0] : data;
  const valuesByReferenceTime = firstResult?.data;
  if (!valuesByReferenceTime || typeof valuesByReferenceTime !== "object") {
    return undefined;
  }

  const firstReferenceValue = Object.values(valuesByReferenceTime)[0];
  const rawValue = firstReferenceValue && typeof firstReferenceValue === "object"
    ? Object.values(firstReferenceValue)[0]
    : firstReferenceValue;
  const amount = Number(rawValue);
  return Number.isFinite(amount) ? Math.max(amount, 0) : undefined;
}

function getKnmiPointRainSampleFromAmount(amount) {
  const intensityRank = getBuienradarPointRainIntensityRank(amount);

  return {
    source: "knmi-point",
    value: amount,
    amount,
    signal: getBuienradarChanceSignalForRank(intensityRank),
    chance: getBuienradarPointRainChanceForRank(intensityRank),
    intensitySignal: getBuienradarIntensitySignalForRank(intensityRank),
    intensityRank,
  };
}

function isFreshKnmiPointRainSeries(sampleSeries) {
  return Boolean(
    sampleSeries?.samples?.length
    && Number.isFinite(sampleSeries.fetchedAt)
    && Date.now() - sampleSeries.fetchedAt < knmiPointRainCacheMaxAgeMs,
  );
}

function renderWeatherForRadarBlend(
  locationKey = getBuienradarSampleLocationKey(selectedLocation),
  loadRequestId = weatherDataLoadRequestId,
) {
  const selectedLocationKey = getBuienradarSampleLocationKey(selectedLocation);
  if (
    !weatherData
    || locationKey !== selectedLocationKey
    || weatherDataLocationKey !== selectedLocationKey
    || loadRequestId !== weatherDataLoadRequestId
    || loadRequestId !== dataLoadRequestId
  ) {
    return;
  }

  renderFiveDayForecast(weatherData);
  renderSelectedWeather(getSelectedWeatherDate());
  renderPrecipitationTimeline();
}

function getBuienradarAdjustmentForForecastTime(forecastTime, { radarSampleMode = "hourly", allowImageFallback = true } = {}) {
  if (forecastTime === undefined || forecastTime === null || !isInBuienradarBounds(selectedLocation)) {
    return undefined;
  }

  const forecastDate = toForecastDate(forecastTime);
  if (!(forecastDate instanceof Date) || Number.isNaN(forecastDate.getTime())) {
    return undefined;
  }

  const effectiveForecastDate = getEffectiveBuienradarForecastDate(forecastDate, radarSampleMode);
  const pointRainAdjustment = getBuienradarPointAdjustmentForDate(effectiveForecastDate, radarSampleMode);

  if (pointRainAdjustment) {
    return pointRainAdjustment;
  }

  return allowImageFallback ? getBuienradarImageAdjustmentForDate(effectiveForecastDate, radarSampleMode) : undefined;
}

function getBuienradarPointAdjustmentForDate(forecastDate, radarSampleMode = "hourly") {
  return getBuienradarAdjustmentFromSampleSeries(
    getBestBuienradarPointRainSampleSeries(forecastDate),
    forecastDate,
    radarSampleMode,
    {
      maxLookaheadHours: buienradarPointRainMaxLookaheadHours,
      source: "point",
      weight: buienradarPointRainBlendWeight,
    },
  );
}

function getBuienradarImageAdjustmentForDate(forecastDate, radarSampleMode = "hourly") {
  return getBuienradarAdjustmentFromSampleSeries(
    getBestBuienradarRainSampleSeries(forecastDate),
    forecastDate,
    radarSampleMode,
    {
      maxLookaheadHours: buienradarBlendMaxLookaheadHours,
      source: "radar-image",
    },
  );
}

function getKnmiAdjustmentForForecastTime(forecastTime, { radarSampleMode = "hourly" } = {}) {
  if (forecastTime === undefined || forecastTime === null || !isInBuienradarBounds(selectedLocation)) {
    return undefined;
  }

  const forecastDate = toForecastDate(forecastTime);
  if (!(forecastDate instanceof Date) || Number.isNaN(forecastDate.getTime())) {
    return undefined;
  }

  const effectiveForecastDate = getEffectiveBuienradarForecastDate(forecastDate, radarSampleMode);
  return getKnmiAdjustmentForDate(effectiveForecastDate, radarSampleMode);
}

function getKnmiAdjustmentForDate(forecastDate, radarSampleMode = "hourly") {
  return getBuienradarAdjustmentFromSampleSeries(
    getBestKnmiPointRainSampleSeries(forecastDate),
    forecastDate,
    radarSampleMode,
    {
      maxLookaheadHours: knmiRadarConfig.maxLookaheadHours,
      source: "knmi-point",
      weight: buienradarPointRainBlendWeight,
    },
  );
}

function getEffectiveBuienradarForecastDate(forecastDate, radarSampleMode) {
  if (radarSampleMode === "instant") {
    return forecastDate;
  }

  const now = new Date();
  return forecastDate < now && isSameForecastHour(forecastDate, now) ? now : forecastDate;
}

function isSameForecastHour(firstDate, secondDate) {
  const firstParts = getDateParts(firstDate);
  const secondParts = getDateParts(secondDate);

  return firstParts.year === secondParts.year
    && firstParts.month === secondParts.month
    && firstParts.day === secondParts.day
    && firstParts.hour === secondParts.hour;
}

function getBuienradarAdjustmentFromSampleSeries(
  sampleSeries,
  forecastDate,
  radarSampleMode,
  { maxLookaheadHours, source, weight } = {},
) {
  if (!sampleSeries) {
    return undefined;
  }

  const adjustmentSource = source || sampleSeries.source || sampleSeries.modeId;
  const sample = radarSampleMode === "instant"
    ? (isRadarImageAdjustmentSource(adjustmentSource)
      ? getRadarImageInstantRainSignal(sampleSeries, forecastDate)
      : getBuienradarInstantRainSignal(sampleSeries, forecastDate))
    : getBuienradarHourlyRainSignal(sampleSeries, forecastDate);
  if (!sample) {
    return undefined;
  }

  const horizonHours = Math.max(0, (forecastDate.getTime() - sampleSeries.startDate.getTime()) / (60 * 60 * 1000));
  if (horizonHours > maxLookaheadHours) {
    return undefined;
  }

  const blendWeight = Number.isFinite(weight) ? weight : getBuienradarBlendWeight(horizonHours);
  return {
    source: adjustmentSource,
    locationKey: sampleSeries.locationKey,
    referenceTime: sampleSeries.referenceDate instanceof Date
      ? sampleSeries.referenceDate.getTime()
      : undefined,
    fetchedAt: sampleSeries.fetchedAt,
    metadataFetchedAt: sampleSeries.metadataFetchedAt,
    proxyAgeSeconds: sample.proxyAgeSeconds ?? sampleSeries.proxyAgeSeconds,
    proxyCacheStatus: sample.proxyCacheStatus || sampleSeries.proxyCacheStatus,
    proxyDiagnosticScope: sample.proxyDiagnosticScope || sampleSeries.proxyDiagnosticScope,
    crs: sampleSeries.crs,
    chance: sample.chance,
    signal: sample.signal,
    intensitySignal: sample.intensitySignal,
    intensityRank: sample.intensityRank,
    exactSignal: sample.exactSignal,
    exactIntensitySignal: sample.exactIntensitySignal,
    nearbySignal: sample.nearbySignal,
    exactCoverage: sample.exactCoverage,
    nearbyCoverage: sample.nearbyCoverage,
    exactIntensityRank: sample.exactIntensityRank,
    nearbyIntensityRank: sample.nearbyIntensityRank,
    sampleMode: radarSampleMode,
    value: sample.value,
    amount: sample.amount,
    averageValue: sample.averageValue,
    peakValue: sample.peakValue,
    averageAmount: sample.averageAmount,
    peakAmount: sample.peakAmount,
    peakSignal: sample.peakSignal,
    averageSignal: sample.averageSignal,
    heavyFrameRatio: sample.heavyFrameRatio,
    moderateFrameRatio: sample.moderateFrameRatio,
    rainFrameRatio: sample.rainFrameRatio,
    sampleCount: sample.sampleCount,
    wetSampleCount: sample.wetSampleCount,
    time: sample.time,
    horizonHours,
    weight: blendWeight,
  };
}

function getBestBuienradarPointRainSampleSeries(forecastDate) {
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const sampleSeries = buienradarPointRainCache.get(locationKey);

  if (
    sampleSeries?.locationKey === locationKey
    && isFreshBuienradarPointRainSeries(sampleSeries)
    && doesBuienradarSampleSeriesCoverForecastDate(sampleSeries, forecastDate)
  ) {
    return sampleSeries;
  }

  return undefined;
}

function getBestKnmiPointRainSampleSeries(forecastDate) {
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const sampleSeries = knmiPointRainCache.get(locationKey);

  if (
    sampleSeries?.locationKey === locationKey
    && isFreshKnmiPointRainSeries(sampleSeries)
    && doesBuienradarSampleSeriesCoverForecastDate(sampleSeries, forecastDate)
  ) {
    return sampleSeries;
  }

  return undefined;
}

function getBestKnmiImageRainSampleSeries(forecastDate) {
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);

  if (
    knmiRainSamples?.locationKey === locationKey
    && isFreshKnmiRadar(knmiRainSamples)
    && doesBuienradarSampleSeriesCoverForecastDate(knmiRainSamples, forecastDate)
  ) {
    return knmiRainSamples;
  }

  return undefined;
}

function getDisplayedKnmiImageRainSampleSeries(forecastDate) {
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);

  if (
    knmiRainSamples?.locationKey === locationKey
    && knmiRainSamples.frameUrls === knmiCommittedFrameUrls
    && hasDisplayedKnmiRainSamplesForDate(forecastDate, knmiRainSamples)
    && doesBuienradarSampleSeriesCoverForecastDate(knmiRainSamples, forecastDate)
  ) {
    return knmiRainSamples;
  }

  return undefined;
}

function hasDisplayedKnmiRainSamplesForDate(forecastDate, sampleSeries = knmiRainSamples) {
  const sampleRun = knmiCommittedRainSampleRun;
  if (!sampleRun) {
    return true;
  }

  if (
    !sampleRun.isCommittedToTimeline
    || sampleRun.frameUrls !== sampleSeries?.frameUrls
  ) {
    return false;
  }

  const startDate = sampleRun.radar?.startDate;
  const frameDurationMs = knmiRadarConfig.frameMinutes * 60 * 1000;
  const framePosition = (
    forecastDate instanceof Date
    && !Number.isNaN(forecastDate.getTime())
    && startDate instanceof Date
    && !Number.isNaN(startDate.getTime())
  )
    ? clampNumber(
      (forecastDate.getTime() - startDate.getTime()) / frameDurationMs,
      0,
      Math.max(sampleRun.frameUrls.length - 1, 0),
    )
    : 0;
  const requiredFrameIndexes = getKnmiFrameIndexesForPosition(framePosition, sampleRun.frameUrls.length);
  return requiredFrameIndexes.every((index) => sampleRun.samplesByIndex.has(index));
}

function getDisplayedBuienradarImageRainSampleSeries(forecastDate) {
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const sampleSeries = buienradarCommittedRainSamples;

  if (
    sampleSeries?.locationKey === locationKey
    && sampleSeries.modeId === buienradarCommittedModeId
    && sampleSeries.frameUrls === buienradarCommittedFrameUrls
    && hasDisplayedBuienradarRainSamplesForDate(forecastDate)
    && doesBuienradarSampleSeriesCoverForecastDate(sampleSeries, forecastDate)
  ) {
    return sampleSeries;
  }

  return undefined;
}

function hasMissingDisplayedBuienradarSample(date) {
  const run = buienradarCommittedRainSampleRun;
  if (!run || (committedRadarSource !== "buienradar" && committedRadarSource !== "hybrid")) return false;
  const duration = getBuienradarRadarMode(run.radar.modeId).frameMinutes * 60 * 1000;
  return run.locationKey === getBuienradarSampleLocationKey(selectedLocation)
    && date >= run.radar.startDate
    && date.getTime() <= run.radar.startDate.getTime() + (run.frameUrls.length - 1) * duration
    && !hasDisplayedBuienradarRainSamplesForDate(date);
}

function hasDisplayedBuienradarRainSamplesForDate(date) {
  const run = buienradarCommittedRainSampleRun;
  if (!run) return true;
  const duration = getBuienradarRadarMode(run.radar.modeId).frameMinutes * 60 * 1000;
  const position = (date - run.radar.startDate) / duration;
  return getKnmiFrameIndexesForPosition(position, run.frameUrls.length)
    .every((index) => run.samplesByIndex.has(index));
}

function getBestBuienradarRainSampleSeries(forecastDate) {
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const series = ["3h", "8h"]
    .map((modeId) => buienradarRainSamples.get(modeId))
    .filter((sampleSeries) => (
      sampleSeries?.locationKey === locationKey
      && isFreshBuienradarRadar(sampleSeries)
      && doesBuienradarSampleSeriesCoverForecastDate(sampleSeries, forecastDate)
    ));

  if (!series.length) {
    return undefined;
  }

  const threeHourSeries = series.find((sampleSeries) => sampleSeries.modeId === "3h");
  if (threeHourSeries) {
    const horizonHours = (forecastDate.getTime() - threeHourSeries.startDate.getTime()) / (60 * 60 * 1000);
    if (horizonHours <= buienradarBlendFullWeightHours) {
      return threeHourSeries;
    }
  }

  return series.find((sampleSeries) => sampleSeries.modeId === "8h") || threeHourSeries || series[0];
}

function doesBuienradarSampleSeriesCoverForecastDate(sampleSeries, forecastDate) {
  if (!sampleSeries?.samples?.length) {
    return false;
  }

  const sampleWindow = getBuienradarHourlySampleWindow(sampleSeries, forecastDate);
  const firstTime = sampleSeries.samples[0].time;
  const lastTime = sampleSeries.samples[sampleSeries.samples.length - 1].time;
  const forecastStart = forecastDate.getTime() - sampleWindow.lookbackMinutes * 60 * 1000;
  const forecastEnd = forecastDate.getTime() + sampleWindow.windowMinutes * 60 * 1000;

  return forecastEnd >= firstTime && forecastStart <= lastTime;
}

function getBuienradarHourlyRainSignal(sampleSeries, forecastDate) {
  const sampleWindow = getBuienradarHourlySampleWindow(sampleSeries, forecastDate);
  const forecastStart = forecastDate.getTime() - sampleWindow.lookbackMinutes * 60 * 1000;
  const forecastEnd = forecastDate.getTime() + sampleWindow.windowMinutes * 60 * 1000;
  const samples = sampleSeries.samples.filter((sample) => sample.time >= forecastStart && sample.time < forecastEnd);

  if (samples.length) {
    return getBuienradarRepresentativeRainSignal(samples, forecastDate.getTime());
  }

  return getBuienradarInstantRainSignal(sampleSeries, forecastDate);
}

function getBuienradarHourlySampleWindow(sampleSeries, forecastDate) {
  if (sampleSeries?.source !== "point" && !sampleSeries?.pointWindow) {
    return {
      lookbackMinutes: buienradarHourlyLookbackMinutes,
      windowMinutes: buienradarHourlyWindowMinutes,
    };
  }

  if (forecastDate.getTime() <= Date.now() + 2 * 60 * 1000) {
    return {
      lookbackMinutes: buienradarHourlyLookbackMinutes,
      windowMinutes: buienradarPointRainCurrentWindowMinutes,
    };
  }

  return {
    lookbackMinutes: buienradarPointRainHourlyLookbackMinutes,
    windowMinutes: buienradarPointRainHourlyWindowMinutes,
  };
}

function getBuienradarInstantRainSignal(sampleSeries, forecastDate) {
  const nearestSample = sampleSeries.samples
    .map((sample) => ({
      sample,
      distance: Math.abs(sample.time - forecastDate.getTime()),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  const frameWindowMs = sampleSeries.frameMinutes * 60 * 1000;

  if (!nearestSample || nearestSample.distance > frameWindowMs) {
    return undefined;
  }

  return buildInstantRainSignal(nearestSample.sample);
}

function getRadarImageInstantRainSignal(sampleSeries, forecastDate) {
  const targetTime = forecastDate.getTime();
  const samples = sampleSeries.samples
    .filter((sample) => Number.isFinite(sample.time))
    .sort((left, right) => left.time - right.time);
  const upperIndex = samples.findIndex((sample) => sample.time >= targetTime);

  if (upperIndex <= 0) {
    return getBuienradarInstantRainSignal(sampleSeries, forecastDate);
  }

  const lowerSample = samples[upperIndex - 1];
  const upperSample = samples[upperIndex];
  const intervalMs = upperSample.time - lowerSample.time;
  const frameWindowMs = sampleSeries.frameMinutes * 60 * 1000;
  if (intervalMs <= 0 || intervalMs > frameWindowMs * 1.5) {
    return getBuienradarInstantRainSignal(sampleSeries, forecastDate);
  }

  const progress = clampNumber((targetTime - lowerSample.time) / intervalMs, 0, 1);
  return buildInstantRainSignal(interpolateRadarImageRainSamples(lowerSample, upperSample, progress, targetTime));
}

function interpolateRadarImageRainSamples(lowerSample, upperSample, progress, time) {
  const interpolate = (field) => interpolateRadarSampleNumber(lowerSample[field], upperSample[field], progress);
  const getExactIntensitySignal = (sample) => {
    if (Number.isFinite(sample.exactIntensitySignal)) {
      return sample.exactIntensitySignal;
    }

    if (Number.isFinite(sample.exactIntensityRank)) {
      return getBuienradarIntensitySignalForRank(sample.exactIntensityRank);
    }

    return sample.intensitySignal;
  };
  const interpolateExactIntensity = () => interpolateRadarSampleNumber(
    getExactIntensitySignal(lowerSample),
    getExactIntensitySignal(upperSample),
    progress,
  );
  const signal = interpolate("signal");
  const intensitySignal = interpolate("intensitySignal");
  const exactSignal = interpolate("exactSignal");
  const exactIntensitySignal = interpolateExactIntensity();
  const nearbySignal = interpolate("nearbySignal");
  const intensityRank = getPrecipitationIntensityRank(getBuienradarPrecipitationIntensity(intensitySignal));
  const exactIntensityRank = getPrecipitationIntensityRank(
    getBuienradarPrecipitationIntensity(exactIntensitySignal),
  );
  const nearbyIntensityRank = getPrecipitationIntensityRank(getBuienradarPrecipitationIntensity(nearbySignal));

  return {
    signal,
    chanceSignal: interpolate("chanceSignal"),
    chance: interpolate("chance"),
    intensitySignal,
    intensityRank,
    exactSignal,
    exactIntensitySignal,
    nearbySignal,
    exactCoverage: interpolate("exactCoverage"),
    nearbyCoverage: interpolate("nearbyCoverage"),
    exactIntensityRank,
    nearbyIntensityRank,
    value: interpolate("value"),
    amount: interpolate("amount"),
    time,
  };
}

function interpolateRadarSampleNumber(lowerValue, upperValue, progress) {
  if (Number.isFinite(lowerValue) && Number.isFinite(upperValue)) {
    return lowerValue + (upperValue - lowerValue) * progress;
  }

  return progress < 0.5 ? lowerValue : upperValue;
}

function buildInstantRainSignal(sample) {
  return {
    ...sample,
    averageSignal: sample.signal,
    peakSignal: sample.signal,
    averageValue: sample.value,
    peakValue: sample.value,
    averageAmount: sample.amount,
    peakAmount: sample.amount,
    intensitySignal: sample.intensitySignal,
    intensityRank: sample.intensityRank,
    heavyFrameRatio: sample.intensityRank >= 3 ? 1 : 0,
    moderateFrameRatio: sample.intensityRank >= 2 ? 1 : 0,
    rainFrameRatio: sample.signal > buienradarDrySignalThreshold ? 1 : 0,
    sampleCount: 1,
    wetSampleCount: sample.signal > buienradarDrySignalThreshold ? 1 : 0,
  };
}

function getBuienradarRepresentativeRainSignal(samples, fallbackTime) {
  const sampleCount = samples.length;
  const wetSamples = samples.filter((sample) => sample.signal > buienradarDrySignalThreshold);
  const wetSampleCount = wetSamples.length;
  const rainFrameRatio = sampleCount ? wetSampleCount / sampleCount : 0;
  const averageSignal = sampleCount
    ? samples.reduce((total, sample) => total + sample.signal, 0) / sampleCount
    : 0;
  const averageChance = sampleCount
    ? samples.reduce((total, sample) => total + sample.chance, 0) / sampleCount
    : 0;
  const peakSignal = samples.reduce((peak, sample) => Math.max(peak, sample.signal), 0);
  const peakChance = samples.reduce((peak, sample) => Math.max(peak, sample.chance), 0);
  const valueSamples = samples.filter((sample) => Number.isFinite(sample.value));
  const averageValue = valueSamples.length
    ? valueSamples.reduce((total, sample) => total + sample.value, 0) / valueSamples.length
    : undefined;
  const peakValue = valueSamples.length
    ? valueSamples.reduce((peak, sample) => Math.max(peak, sample.value), 0)
    : undefined;
  const amountSamples = samples.filter((sample) => Number.isFinite(sample.amount));
  const averageAmount = amountSamples.length
    ? amountSamples.reduce((total, sample) => total + sample.amount, 0) / amountSamples.length
    : undefined;
  const peakAmount = amountSamples.length
    ? amountSamples.reduce((peak, sample) => Math.max(peak, sample.amount), 0)
    : undefined;
  const heavyFrameRatio = sampleCount
    ? samples.filter((sample) => sample.intensityRank >= 3).length / sampleCount
    : 0;
  const moderateFrameRatio = sampleCount
    ? samples.filter((sample) => sample.intensityRank >= 2).length / sampleCount
    : 0;
  const intensityRank = getBuienradarRepresentativeIntensityRank({
    rainFrameRatio,
    moderateFrameRatio,
    heavyFrameRatio,
    wetSampleCount,
  });
  const representativeSignal = wetSampleCount
    ? clampNumber(
      averageSignal * (1 - buienradarRepresentativePeakWeight) + peakSignal * buienradarRepresentativePeakWeight,
      0,
      1,
    )
    : 0;
  const representativeChance = wetSampleCount
    ? clampNumber(
      averageChance * (1 - buienradarRepresentativePeakWeight)
        + peakChance * buienradarRepresentativePeakWeight
        + rainFrameRatio * buienradarHourlyCoverageChanceBoost,
      0,
      100,
    )
    : 0;

  return {
    signal: representativeSignal,
    chance: representativeChance,
    intensitySignal: getBuienradarIntensitySignalForRank(intensityRank),
    intensityRank,
    amount: averageAmount,
    averageSignal,
    peakSignal,
    averageValue,
    peakValue,
    averageAmount,
    peakAmount,
    heavyFrameRatio,
    moderateFrameRatio,
    rainFrameRatio,
    sampleCount,
    wetSampleCount,
    time: fallbackTime,
  };
}

function getBuienradarRepresentativeIntensityRank({
  rainFrameRatio,
  moderateFrameRatio,
  heavyFrameRatio,
  wetSampleCount,
}) {
  if (!wetSampleCount) {
    return 0;
  }

  if (heavyFrameRatio >= buienradarHeavyFrameRatioThreshold) {
    return 3;
  }

  if (moderateFrameRatio >= buienradarModerateFrameRatioThreshold) {
    return 2;
  }

  return rainFrameRatio > 0 ? 1 : 0;
}

function getBuienradarBlendWeight(horizonHours) {
  if (horizonHours <= buienradarBlendFullWeightHours) {
    return buienradarBlendFullWeight;
  }

  const fadeRange = buienradarBlendMaxLookaheadHours - buienradarBlendFullWeightHours;
  const fadeProgress = clampNumber((horizonHours - buienradarBlendFullWeightHours) / fadeRange, 0, 1);

  return buienradarBlendFullWeight
    - (buienradarBlendFullWeight - buienradarBlendMinimumWeight) * fadeProgress;
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

function setKnmiImageLayer(layer, currentKey, frameIndex, opacity, zIndex, attribution) {
  if (layer && currentKey === frameIndex) {
    layer.setOpacity(opacity);
    return layer;
  }

  const frameUrl = knmiFrameUrls[frameIndex];
  if (layer) {
    map.removeLayer(layer);
  }

  const nextLayer = L.imageOverlay(frameUrl, buienradarBounds, {
    opacity,
    attribution,
  }).addTo(map);

  nextLayer.mymeteoFrameIndex = frameIndex;
  nextLayer.once("load", () => {
    if (frameUrl) {
      knmiLoadedFrameUrls.add(frameUrl);
    }
    refreshMapSize();
  });
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
  buienradarFrameRenderRequestId += 1;
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

  releaseRetainedBuienradarFrameUrls();
}

function prepareBuienradarLayersForReplacement() {
  buienradarFrameRenderRequestId += 1;
  buienradarLayerKey = undefined;
  buienradarNextLayerKey = undefined;
}

function commitKnmiFrameGeneration(
  frameUrls = knmiFrameUrls,
  sampleRun = getCurrentKnmiRainSampleRun(frameUrls),
) {
  knmiCommittedFrameUrls = frameUrls;
  knmiCommittedRainSampleRun = sampleRun;
  if (sampleRun) {
    // The accepted hybrid timeline can use KNMI while the map shows Buienradar.
    sampleRun.isCommittedToTimeline = true;
    publishKnmiRainSampleRun(sampleRun, { render: false });
  }
}

function commitBuienradarFrameGeneration() {
  buienradarCommittedFrameUrls = buienradarFrameUrls;
  buienradarCommittedModeId = loadedBuienradarRadarModeId;
  buienradarCommittedRainSampleRun = getCurrentBuienradarRainSampleRun();
  if (buienradarCommittedRainSampleRun) publishBuienradarRainSampleRun(buienradarCommittedRainSampleRun);
  const sampleSeries = buienradarRainSamples.get(buienradarCommittedModeId);
  buienradarCommittedRainSamples = sampleSeries?.frameUrls === buienradarCommittedFrameUrls
    ? sampleSeries
    : undefined;
}

function releaseRetainedBuienradarFrameUrls() {
  const protectedFrameUrls = new Set([
    ...buienradarFrameUrls,
    ...buienradarCommittedFrameUrls,
  ]);
  buienradarRadarCache.forEach((radar) => {
    radar.frameUrls.forEach((url) => protectedFrameUrls.add(url));
  });
  buienradarRetainedFrameUrlsToRevoke.forEach((url) => {
    if (!protectedFrameUrls.has(url)) {
      revokeFrameUrl(url);
    }
  });
  buienradarRetainedFrameUrlsToRevoke.clear();
}

function clearBuienradarRadar() {
  buienradarDisplayRequestId += 1;
  window.clearTimeout(buienradarPreloadTimer);
  elements.radarPanel.classList.remove("is-animated");
  resetHybridRadarRange();
  buienradarTimeline = buienradarDefaultTimeline;
  clearBuienradarLayers();

  const cachedFrameUrls = new Set();
  buienradarRadarCache.forEach((radar) => {
    radar.frameUrls.forEach((url) => cachedFrameUrls.add(url));
  });
  buienradarRadarCache.forEach(revokeBuienradarRadar);
  buienradarRadarCache.clear();
  buienradarFrameUrls.forEach((url) => {
    if (!cachedFrameUrls.has(url)) {
      revokeFrameUrl(url);
    }
  });
  buienradarRainSamples.clear();
  buienradarRainSampleRuns.clear();
  buienradarCommittedFrameUrls = [];
  buienradarCommittedModeId = buienradarDefaultRadarModeId;
  buienradarCommittedRainSamples = undefined;
  buienradarCommittedRainSampleRun = undefined;
  releaseRetainedBuienradarFrameUrls();
  buienradarFrameUrls = [];
  buienradarStartDate = undefined;
}

function clearKnmiLayers() {
  hideKnmiLayers();
  knmiCommittedFrameUrls = [];
  knmiCommittedRainSampleRun = undefined;
}

function hideKnmiLayers() {
  // A hidden KNMI layer still supplies the earlier half of the hybrid timeline.
  knmiFrameRenderRequestId += 1;
  if (knmiLayer) {
    map.removeLayer(knmiLayer);
    knmiLayer = undefined;
    knmiLayerKey = undefined;
  }

  if (knmiNextLayer) {
    map.removeLayer(knmiNextLayer);
    knmiNextLayer = undefined;
    knmiNextLayerKey = undefined;
  }
}

function prepareKnmiLayersForReplacement() {
  knmiFrameRenderRequestId += 1;
  knmiLayerKey = undefined;
  knmiNextLayerKey = undefined;
}

function clearKnmiRadar() {
  knmiDisplayRequestId += 1;
  elements.radarPanel.classList.remove("is-animated");
  resetHybridRadarRange();
  clearKnmiLayers();
  knmiRadarCache = undefined;
  knmiRadarRequest = undefined;
  knmiLoadedFrameUrls.clear();
  knmiFramePreloadRequests.clear();
  knmiFrameUrls = [];
  knmiFrameDates = [];
  knmiStartDate = undefined;
  knmiReferenceDate = undefined;
  knmiRainSamples = undefined;
  knmiRainSampleRun = undefined;
  knmiCommittedFrameUrls = [];
  knmiCommittedRainSampleRun = undefined;
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

function buildKnmiRadarImageUrl(date, referenceDate = knmiReferenceDate) {
  return buildKnmiWmsUrl({
    dataset: knmiRadarConfig.dataset,
    service: "WMS",
    version: "1.3.0",
    request: "GetMap",
    layers: knmiRadarConfig.layer,
    crs: "EPSG:3857",
    bbox: getWmsEpsg3857Bbox(buienradarBounds),
    width: String(knmiRadarConfig.width),
    height: String(knmiRadarConfig.height),
    format: "image/png",
    transparent: "true",
    styles: knmiRadarConfig.style,
    time: formatKnmiIsoTime(date),
    reference_time: formatKnmiIsoTime(referenceDate),
  });
}

function buildKnmiWmsUrl(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key.toUpperCase() === "REFERENCE_TIME" ? "reference_time" : key.toUpperCase(), String(value));
    }
  });

  return `${knmiWmsBaseUrl}?${searchParams}`;
}

function formatKnmiIsoTime(date) {
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toISOString().replace(".000Z", "Z")
    : undefined;
}

function getWmsEpsg3857Bbox(bounds) {
  const [[south, west], [north, east]] = bounds;
  const southWest = projectLocationToWebMercator({ lat: south, lon: west });
  const northEast = projectLocationToWebMercator({ lat: north, lon: east });
  return [southWest.x, southWest.y, northEast.x, northEast.y].join(",");
}

function isFreshKnmiRadar(radar) {
  return Boolean(
    radar?.frameUrls?.length
    && Number.isFinite(radar.fetchedAt)
    && Date.now() - radar.fetchedAt < knmiRadarCacheMaxAgeMs,
  );
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

async function decodeBuienradarFrames(buffer, type, { signal } = {}) {
  const imageDecoderFrames = await decodeBuienradarFramesWithImageDecoder(buffer, type, { signal });
  if (imageDecoderFrames.length > 1) {
    return imageDecoderFrames;
  }

  imageDecoderFrames.forEach(revokeFrameUrl);
  return decodeBuienradarFramesWithGifuct(buffer, { signal });
}

async function decodeBuienradarFramesWithImageDecoder(buffer, type, { signal } = {}) {
  if (!("ImageDecoder" in window)) {
    return [];
  }

  let decoder;
  const frameUrls = [];
  let decoderClosed = false;
  const closeDecoder = () => {
    if (decoder && !decoderClosed) {
      decoderClosed = true;
      decoder.close?.();
    }
  };
  try {
    if (signal?.aborted) {
      throw signal.reason;
    }
    decoder = new ImageDecoder({ data: buffer.slice(0), type });
    signal?.addEventListener("abort", closeDecoder, { once: true });
    await waitForAbortableResult(decoder.tracks.ready, signal);

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
      const { image } = await waitForAbortableResult(
        decoder.decode({ frameIndex }), signal, (result) => result.image.close(),
      );
      canvas.width = image.displayWidth;
      canvas.height = image.displayHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      image.close();

      const frameBlob = await waitForAbortableResult(new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png");
      }), signal);
      if (frameBlob) {
        frameUrls.push(URL.createObjectURL(frameBlob));
      }
    }

    return frameUrls;
  } catch (error) {
    frameUrls.forEach(revokeFrameUrl);
    if (signal?.aborted) {
      throw signal.reason;
    }
    console.warn("Could not decode Buienradar animation frames.", error);
    return [];
  } finally {
    signal?.removeEventListener("abort", closeDecoder);
    closeDecoder();
  }
}

function loadBuienradarGifDecoder() {
  return import(gifDecoderModuleUrl);
}

async function decodeBuienradarFramesWithGifuct(buffer, { signal } = {}) {
  const frameUrls = [];

  try {
    const { parseGIF, decompressFrames } = await waitForAbortableResult(loadBuienradarGifDecoder(), signal);
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
    if (signal?.aborted) {
      throw signal.reason;
    }
    console.warn("Could not decode Buienradar frames with GIF fallback.", error);
    return [];
  }
}

function revokeFrameUrl(url) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function preloadImage(url, { signal } = {}) {
  if (!url || signal?.aborted) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (isLoaded) => {
      if (settled) {
        return;
      }
      settled = true;
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", onAbort);
      resolve(isLoaded);
    };
    const onAbort = () => {
      finish(false);
      image.src = "";
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    signal?.addEventListener("abort", onAbort, { once: true });
    image.src = url;
  });
}

function preloadKnmiFrameImage(url, { timeoutMs } = {}) {
  if (!url || knmiLoadedFrameUrls.has(url)) {
    return Promise.resolve(true);
  }

  const existingRequest = knmiFramePreloadRequests.get(url);
  if (existingRequest) {
    return existingRequest;
  }

  const request = new Promise((resolve) => {
    const image = new Image();
    let isResolved = false;
    let timeout;
    const finish = (isLoaded) => {
      if (isResolved) {
        return;
      }

      isResolved = true;
      if (timeout) {
        window.clearTimeout(timeout);
      }
      if (isLoaded) {
        knmiLoadedFrameUrls.add(url);
      }
      resolve(isLoaded);
    };

    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeout = window.setTimeout(() => finish(false), timeoutMs);
    }
    image.src = url;
  }).finally(() => {
    knmiFramePreloadRequests.delete(url);
  });

  knmiFramePreloadRequests.set(url, request);
  return request;
}

function queueKnmiFramePreload(frameUrls) {
  if (!Array.isArray(frameUrls) || frameUrls.length < 2) {
    return;
  }

  frameUrls.forEach((url, index) => {
    window.setTimeout(() => {
      preloadKnmiFrameImage(url, { timeoutMs: knmiRadarImageLoadTimeoutMs });
    }, index * knmiRadarFramePreloadDelayMs);
  });
}

async function decodeBuienradarStillFrame(buffer, type, { signal } = {}) {
  if (!("createImageBitmap" in window)) {
    return undefined;
  }

  try {
    const image = await waitForAbortableResult(
      createImageBitmap(new Blob([buffer.slice(0)], { type })), signal, (bitmap) => bitmap.close(),
    );
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

    const frameBlob = await waitForAbortableResult(new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    }), signal);

    return frameBlob ? URL.createObjectURL(frameBlob) : undefined;
  } catch (error) {
    if (signal?.aborted) {
      throw signal.reason;
    }
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

function roundDateToPreviousFiveMinutes(date) {
  const previous = new Date(date);
  const minutes = previous.getMinutes();
  const roundedMinutes = Math.floor(minutes / 5) * 5;
  previous.setMinutes(roundedMinutes, 0, 0);
  return previous;
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
  elements.refreshButton.toggleAttribute("aria-busy", isLoading);
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
  stormSignal,
  forecastTime,
  radarSampleMode = "hourly",
  includeIntensity = false,
}) {
  const precipitation = buildBasePrecipitationChance({
    chance,
    weatherCode,
    rainAmount,
    showersAmount,
    snowfallAmount,
    temperature,
    stormSignal,
    includeIntensity,
  });
  const adjustedPrecipitation = withBuienradarPrecipitationAdjustment(precipitation, forecastTime, {
    includeIntensity,
    radarSampleMode,
  });
  recordRainDebugPrecipitation(forecastTime, precipitation, adjustedPrecipitation);

  return adjustedPrecipitation;
}

function buildBasePrecipitationChance({
  chance,
  weatherCode,
  rainAmount,
  showersAmount,
  snowfallAmount,
  temperature,
  stormSignal,
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
  const precipitation = {
    type,
    label,
    value,
    chance,
    amount,
    intensity,
    stormSignal,
  };
  precipitation.ariaLabel = getPrecipitationAriaLabel(precipitation);

  return precipitation;
}

function withHourlyPrecipitationChance(precipitation, hourlyPrecipitations) {
  const hourlyPrecipitation = getMaxPrecipitation(hourlyPrecipitations);

  if (!Number.isFinite(hourlyPrecipitation?.chance)) {
    return precipitation;
  }

  return withPrecipitationChance({
    ...precipitation,
    intensity: hourlyPrecipitation.intensity || precipitation.intensity,
    hasRadarEvidence: hourlyPrecipitation.hasRadarEvidence,
    isRadarAdjusted: hourlyPrecipitation.isRadarAdjusted,
    radarAdjustment: hourlyPrecipitation.radarAdjustment,
    stormSignal: hourlyPrecipitation.stormSignal || precipitation.stormSignal,
  }, hourlyPrecipitation.chance);
}

function withPrecipitationChance(precipitation, chance) {
  const value = formatOptionalRainChance(chance);
  const displayChance = Number.isFinite(chance) ? roundRainChanceForDisplay(chance) : undefined;
  const nextPrecipitation = {
    ...precipitation,
    value,
    chance,
    intensity: getPrecipitationDisplayIntensity(precipitation, displayChance),
  };

  nextPrecipitation.ariaLabel = getPrecipitationAriaLabel(nextPrecipitation);

  return nextPrecipitation;
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
    ariaLabel: getPrecipitationAriaLabel({
      ...precipitation,
      type: normalizedType,
      label,
    }),
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

function getMaxPrecipitation(precipitations) {
  if (!Array.isArray(precipitations)) {
    return undefined;
  }

  const rankedPrecipitations = precipitations
    .filter((precipitation) => Number.isFinite(precipitation?.chance))
    .sort((a, b) => b.chance - a.chance);

  return rankedPrecipitations[0];
}

function getPrecipitationAriaLabel(precipitation) {
  const sourceLabel = precipitation.isRadarAdjusted ? ", adjusted with radar" : "";
  const dryLabel = isPrecipitationDisplayDry(precipitation) ? ", dry" : "";
  return `${precipitation.label} chance ${precipitation.value}${dryLabel}${precipitation.intensity ? `, ${precipitation.intensity}` : ""}${sourceLabel}`;
}

function recordRainDebugPrecipitation(forecastTime, modelPrecipitation, finalPrecipitation) {
  if (!isRainDebugEnabled || forecastTime === undefined || forecastTime === null) {
    return;
  }

  const entry = {
    forecastTime: formatDebugForecastTime(forecastTime),
    forecastLabel: formatTime(forecastTime),
    location: {
      lat: formatDebugNumber(selectedLocation.lat),
      lon: formatDebugNumber(selectedLocation.lon),
      key: getBuienradarSampleLocationKey(selectedLocation),
    },
    model: getRainDebugPrecipitationSummary(modelPrecipitation),
    radar: getRainDebugRadarSummary(finalPrecipitation.radarAdjustment),
    final: getRainDebugPrecipitationSummary(finalPrecipitation),
  };

  rainDebugEntries.push(entry);
  if (rainDebugEntries.length > 200) {
    rainDebugEntries = rainDebugEntries.slice(-200);
  }

  window.mymeteoRainDebug = rainDebugEntries;
  console.debug("MyMeteo rain debug", JSON.stringify(entry));
}

function getRainDebugPrecipitationSummary(precipitation) {
  return {
    chance: formatDebugNumber(precipitation.chance),
    value: precipitation.value,
    amount: formatDebugNumber(precipitation.amount),
    intensity: precipitation.intensity || "dry",
    hasRadarEvidence: Boolean(precipitation.hasRadarEvidence),
    isRadarAdjusted: Boolean(precipitation.isRadarAdjusted),
  };
}

function getRainDebugRadarSummary(adjustment) {
  if (!adjustment) {
    return null;
  }

  return {
    source: adjustment.source,
    locationKey: adjustment.locationKey,
    validTime: Number.isFinite(adjustment.time) ? new Date(adjustment.time).toISOString() : undefined,
    referenceTime: Number.isFinite(adjustment.referenceTime)
      ? new Date(adjustment.referenceTime).toISOString()
      : undefined,
    fetchedAt: Number.isFinite(adjustment.fetchedAt)
      ? new Date(adjustment.fetchedAt).toISOString()
      : undefined,
    clientFetchAgeMinutes: Number.isFinite(adjustment.fetchedAt)
      ? formatDebugNumber((Date.now() - adjustment.fetchedAt) / (60 * 1000))
      : undefined,
    referenceAgeMinutes: Number.isFinite(adjustment.referenceTime)
      ? formatDebugNumber((Date.now() - adjustment.referenceTime) / (60 * 1000))
      : undefined,
    metadataFetchedAt: Number.isFinite(adjustment.metadataFetchedAt)
      ? new Date(adjustment.metadataFetchedAt).toISOString()
      : undefined,
    proxyDiagnosticScope: adjustment.proxyDiagnosticScope,
    proxyCacheStatus: adjustment.proxyCacheStatus,
    proxyAgeSeconds: formatDebugNumber(adjustment.proxyAgeSeconds),
    crs: adjustment.crs,
    chance: formatDebugNumber(adjustment.chance),
    signal: formatDebugNumber(adjustment.signal),
    intensity: adjustment.intensity || "dry",
    weight: formatDebugNumber(adjustment.weight),
    horizonHours: formatDebugNumber(adjustment.horizonHours),
    sampleMode: adjustment.sampleMode,
    value: formatDebugNumber(adjustment.value),
    amount: formatDebugNumber(adjustment.amount),
    averageValue: formatDebugNumber(adjustment.averageValue),
    peakValue: formatDebugNumber(adjustment.peakValue),
    averageAmount: formatDebugNumber(adjustment.averageAmount),
    peakAmount: formatDebugNumber(adjustment.peakAmount),
    averageSignal: formatDebugNumber(adjustment.averageSignal),
    peakSignal: formatDebugNumber(adjustment.peakSignal),
    combinedSignal: formatDebugNumber(adjustment.combinedSignal),
    exactSignal: formatDebugNumber(adjustment.exactSignal),
    exactIntensitySignal: formatDebugNumber(adjustment.exactIntensitySignal),
    nearbySignal: formatDebugNumber(adjustment.nearbySignal),
    exactCoverage: formatDebugNumber(adjustment.exactCoverage),
    nearbyCoverage: formatDebugNumber(adjustment.nearbyCoverage),
    localWet: adjustment.localWet,
    intensitySignal: formatDebugNumber(adjustment.intensitySignal),
    intensityRank: adjustment.intensityRank,
    heavyFrameRatio: formatDebugNumber(adjustment.heavyFrameRatio),
    moderateFrameRatio: formatDebugNumber(adjustment.moderateFrameRatio),
    rainFrameRatio: formatDebugNumber(adjustment.rainFrameRatio),
    sampleCount: adjustment.sampleCount,
    wetSampleCount: adjustment.wetSampleCount,
  };
}

function formatDebugForecastTime(value) {
  const date = toForecastDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function formatDebugNumber(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}

function withBuienradarPrecipitationAdjustment(
  precipitation,
  forecastTime,
  { includeIntensity = false, radarSampleMode = "hourly", allowImageFallback = true, adjustment: providedAdjustment } = {},
) {
  const adjustment = providedAdjustment
    || getActiveRainSourceAdjustmentForForecastTime(forecastTime, { radarSampleMode, allowImageFallback });

  if (!adjustment) {
    return precipitation;
  }

  const modelChance = Number.isFinite(precipitation.chance) ? precipitation.chance : 0;
  const modelDisplayChance = roundRainChanceForDisplay(modelChance);
  const adjustedChance = clampNumber(
    modelChance * (1 - adjustment.weight) + adjustment.chance * adjustment.weight,
    0,
    100,
  );
  const radarIntensitySignal = Number.isFinite(adjustment.intensitySignal)
    ? adjustment.intensitySignal
    : adjustment.signal;
  const radarAmount = getBuienradarEquivalentPrecipitationAmount(radarIntensitySignal);
  const modelAmount = Number.isFinite(precipitation.amount) ? precipitation.amount : 0;
  const amount = Number.isFinite(precipitation.amount)
    ? modelAmount * (1 - adjustment.weight) + radarAmount * adjustment.weight
    : radarAmount;
  const value = formatOptionalRainChance(adjustedChance);
  const displayChance = roundRainChanceForDisplay(adjustedChance);
  const radarIntensity = getBuienradarPrecipitationIntensity(radarIntensitySignal);
  const modelIntensity = includeIntensity
    ? getPrecipitationIntensity(precipitation.type, modelAmount, modelDisplayChance)
    : precipitation.intensity;
  const intensity = includeIntensity
    ? getPrecipitationDisplayIntensity({
        ...precipitation,
        amount,
        intensity: getBlendedPrecipitationIntensity(modelIntensity, radarIntensity, adjustment.weight, displayChance),
      }, displayChance)
    : precipitation.intensity;
  const isRadarAdjusted = modelDisplayChance !== displayChance
    || intensity !== precipitation.intensity;

  const adjustedPrecipitation = {
    ...precipitation,
    value,
    chance: adjustedChance,
    amount,
    intensity,
    hasRadarEvidence: true,
    isRadarAdjusted,
    radarAdjustment: {
      source: adjustment.source,
      locationKey: adjustment.locationKey,
      referenceTime: adjustment.referenceTime,
      fetchedAt: adjustment.fetchedAt,
      metadataFetchedAt: adjustment.metadataFetchedAt,
    proxyAgeSeconds: adjustment.proxyAgeSeconds,
    proxyCacheStatus: adjustment.proxyCacheStatus,
    proxyDiagnosticScope: adjustment.proxyDiagnosticScope,
    crs: adjustment.crs,
      chance: adjustment.chance,
      signal: adjustment.signal,
      intensitySignal: adjustment.intensitySignal,
      intensityRank: adjustment.intensityRank,
      exactSignal: adjustment.exactSignal,
      exactIntensitySignal: adjustment.exactIntensitySignal,
      nearbySignal: adjustment.nearbySignal,
      exactCoverage: adjustment.exactCoverage,
      nearbyCoverage: adjustment.nearbyCoverage,
      exactIntensityRank: adjustment.exactIntensityRank,
      nearbyIntensityRank: adjustment.nearbyIntensityRank,
      intensity: radarIntensity,
      weight: adjustment.weight,
      sampleMode: adjustment.sampleMode,
      horizonHours: adjustment.horizonHours,
      value: adjustment.value,
      amount: adjustment.amount,
      averageValue: adjustment.averageValue,
      peakValue: adjustment.peakValue,
      averageAmount: adjustment.averageAmount,
      peakAmount: adjustment.peakAmount,
      peakSignal: adjustment.peakSignal,
      averageSignal: adjustment.averageSignal,
      heavyFrameRatio: adjustment.heavyFrameRatio,
      moderateFrameRatio: adjustment.moderateFrameRatio,
      rainFrameRatio: adjustment.rainFrameRatio,
      sampleCount: adjustment.sampleCount,
      wetSampleCount: adjustment.wetSampleCount,
      time: adjustment.time,
    },
  };
  adjustedPrecipitation.ariaLabel = getPrecipitationAriaLabel(adjustedPrecipitation);

  return adjustedPrecipitation;
}

function getActiveRainSourceAdjustmentForForecastTime(forecastTime, options = {}) {
  if (isRainSourceCompareEnabled && activeRainSourceMode === "current") {
    return getBuienradarAdjustmentForForecastTime(forecastTime, options);
  }

  return getKnmiAdjustmentForForecastTime(forecastTime, options)
    || getBuienradarAdjustmentForForecastTime(forecastTime, options);
}

function getPrecipitationAdjustedWeatherCode(weatherCode, precipitation) {
  if (thunderstormWeatherCodes.has(Number(weatherCode))) {
    return weatherCode;
  }

  if (shouldUseThunderstormWeatherCode(precipitation)) {
    return 95;
  }

  if (!Number.isFinite(precipitation?.chance)) {
    return weatherCode;
  }

  if (precipitation.chance < precipitationConditionChanceThreshold) {
    return precipitationWeatherCodes.has(Number(weatherCode)) ? 3 : weatherCode;
  }

  const nextWeatherCode = getPrecipitationWeatherCode(precipitation);

  return precipitationWeatherCodes.has(Number(weatherCode)) || getWeatherCodeSeverity(nextWeatherCode) > getWeatherCodeSeverity(weatherCode)
    ? nextWeatherCode
    : weatherCode;
}

function shouldUseThunderstormWeatherCode(precipitation) {
  if (!precipitation || precipitation.type === "snow" || !Number.isFinite(precipitation.chance)) {
    return false;
  }

  if (precipitation.chance < stormRainChanceThreshold) {
    return false;
  }

  if (getPrecipitationIntensityRank(precipitation.intensity) < 2) {
    return false;
  }

  const stormSignal = precipitation.stormSignal;
  if (!stormSignal) {
    return false;
  }

  return Boolean(
    stormSignal.hasThunderstormCode
    || (Number.isFinite(stormSignal.lightningPotential) && stormSignal.lightningPotential >= stormLightningPotentialThreshold)
    || (Number.isFinite(stormSignal.cape) && stormSignal.cape >= stormCapeThreshold),
  );
}

function getPrecipitationWeatherCode(precipitation) {
  if (precipitation.type === "snow") {
    if (precipitation.intensity === "heavy") {
      return 75;
    }

    return precipitation.intensity === "moderate" ? 73 : 71;
  }

  if (precipitation.intensity === "heavy") {
    return 65;
  }

  return precipitation.intensity === "moderate" ? 63 : 61;
}

function getBlendedPrecipitationIntensity(modelIntensity, radarIntensity, radarWeight, displayChance) {
  if (
    !Number.isFinite(displayChance)
    || displayChance < precipitationIntensityChanceThreshold
  ) {
    return undefined;
  }

  const modelRank = getPrecipitationIntensityRank(modelIntensity);
  const radarRank = getPrecipitationIntensityRank(radarIntensity);
  const blendedRank = modelRank * (1 - radarWeight) + radarRank * radarWeight;

  return getPrecipitationIntensityByRank(Math.round(blendedRank));
}

function getPrecipitationIntensityRank(intensity) {
  const ranks = {
    light: 1,
    moderate: 2,
    heavy: 3,
  };

  return ranks[intensity] || 0;
}

function getPrecipitationIntensityByRank(rank) {
  if (rank >= 3) {
    return "heavy";
  }

  if (rank >= 2) {
    return "moderate";
  }

  if (rank >= 1) {
    return "light";
  }

  return undefined;
}

function getBuienradarEquivalentPrecipitationAmount(signal) {
  if (!Number.isFinite(signal) || signal <= 0) {
    return 0;
  }

  if (signal >= 0.72) {
    return precipitationIntensityThresholds.rain.heavy;
  }

  if (signal >= 0.38) {
    return precipitationIntensityThresholds.rain.moderate;
  }

  return 0.1;
}

function getBuienradarPrecipitationIntensity(signal) {
  if (!Number.isFinite(signal) || signal <= 0) {
    return undefined;
  }

  if (signal >= 0.72) {
    return "heavy";
  }

  if (signal >= 0.38) {
    return "moderate";
  }

  return "light";
}

function getPrecipitationLabel(type) {
  return type === "snow" ? "Snow" : "Rain";
}

function getPrecipitationDisplayIntensity(precipitation, displayChance) {
  if (
    !Number.isFinite(displayChance)
    || displayChance < precipitationIntensityChanceThreshold
  ) {
    return undefined;
  }

  return precipitation.intensity
    || getPrecipitationIntensity(precipitation.type, precipitation.amount, displayChance);
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
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat("en-US", {
      weekday,
      timeZone: "UTC",
    }).format(new Date(`${value}T12:00:00Z`));
  }

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

function dateFromTimeZoneParts(parts, timezone = selectedLocation.timezone) {
  const desiredUtcTime = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) || 0,
    Number(parts.minute) || 0,
  );
  let time = desiredUtcTime;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actualParts = getDateParts(new Date(time), timezone);
    const actualUtcTime = Date.UTC(
      Number(actualParts.year),
      Number(actualParts.month) - 1,
      Number(actualParts.day),
      Number(actualParts.hour) || 0,
      Number(actualParts.minute) || 0,
    );
    const delta = desiredUtcTime - actualUtcTime;
    if (!delta) {
      break;
    }

    time += delta;
  }

  return new Date(time);
}

function getFormattedDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
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
  window.clearTimeout(knmiPointRainRenderTimer);
  buienradarRadarCache.forEach(revokeBuienradarRadar);
  clearKnmiLayers();
});
