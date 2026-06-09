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
const buienradarPointRainBaseUrl = "https://gps.buienradar.nl/getrr.php";
const gifDecoderModuleUrl = "https://esm.sh/gifuct-js@2.1.2?bundle";
const weatherIconBasePath = "assets/weather-icons-mymeteo/";
const outfitSceneBackgroundBasePath = "assets/outfit-scenes/v2/backgrounds/";
const outfitSceneCharacterBasePath = "assets/outfit-scenes/v2/characters/";
const outfitSceneAssetVersion = "20260608-01";
// Replace these files and bump this version when updating the Easter egg video.
const easterEggAssetVersion = "20260609-04";
const easterEggDanceVideo = {
  src: "assets/easter-eggs/marc-dancing-rain.mp4",
  poster: "assets/easter-eggs/marc-dancing-rain-poster.jpg",
};
const outfitSceneOverrideQueryParam = "outfitState";
const rainDebugQueryParam = "debugRain";
const isRainDebugEnabled = new URLSearchParams(window.location.search).get(rainDebugQueryParam) === "1";
const outfitScenePreloadInitialDelayMs = 1200;
const outfitScenePreloadStepDelayMs = 700;
const outfitScenePreloadIdleTimeoutMs = 1500;
const buienradarRadarCacheMaxAgeMs = 9 * 60 * 1000;
const buienradarPointRainCacheMaxAgeMs = 4 * 60 * 1000;
const buienradarPointRainTimeoutMs = 3500;
const currentLocationSource = "current";
const currentLocationRefreshCooldownMs = 60 * 1000;
const compactLocationLabelMediaQuery = "(max-width: 480px)";
const desktopLayoutMediaQuery = "(min-width: 900px)";
const reverseGeocodingTimeoutMs = 5 * 1000;
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
  outfitModeToggle: document.querySelector("#outfitModeToggle"),
  outfitScene: document.querySelector("#outfitScene"),
  outfitSceneBackground: document.querySelector("#outfitSceneBackground"),
  outfitSceneCharacter: document.querySelector("#outfitSceneCharacter"),
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
    character: "hot-sunny.webp",
    label: "Hot sunny outfit",
    alt: "Suggested outfit for hot sunny weather: shorts, T-shirt, sunglasses, sandals, and water bottle.",
    characterMaxWidth: "70%",
    characterMaxWidthWide: "62%",
    legendCharacterBottom: "-2px",
  },
  "warm-fair": {
    background: "warm-fair.webp",
    character: "warm-fair.webp",
    label: "Warm fair-weather outfit",
    alt: "Suggested outfit for warm dry weather: light shirt, light linen trousers, casual shoes, and a relaxed walking pose.",
    characterMaxWidth: "70%",
    characterMaxWidthWide: "62%",
  },
  "mild-cloudy": {
    background: "mild-cloudy.webp",
    character: "mild-cloudy.webp",
    label: "Mild cloudy outfit",
    alt: "Suggested outfit for mild cloudy weather: long trousers, a light jumper, and a relaxed hands-in-pockets stroll.",
    characterMaxWidth: "70%",
    characterMaxWidthWide: "62%",
  },
  "cool-dry": {
    background: "cool-dry.webp",
    character: "cool-dry.webp",
    label: "Cool dry outfit",
    alt: "Suggested outfit for cool dry weather: long trousers, sweater, light jacket, and a relaxed half-turn stroll.",
    characterMaxWidth: "72%",
    characterMaxWidthWide: "64%",
  },
  "cold-dry": {
    background: "cold-dry.webp",
    character: "cold-dry.webp",
    label: "Cold dry outfit",
    alt: "Suggested outfit for cold dry weather: warm coat, scarf, long trousers, and closed shoes.",
    characterMaxWidth: "74%",
    characterMaxWidthWide: "66%",
    legendCharacterBottom: "-2px",
  },
  "freezing-dry": {
    background: "freezing-dry.webp",
    character: "freezing-dry.webp",
    label: "Freezing dry outfit",
    alt: "Suggested outfit for freezing dry weather: thick coat, scarf, gloves, beanie, and warm shoes.",
    characterMaxWidth: "76%",
    characterMaxWidthWide: "68%",
    legendCharacterBottom: "-2px",
  },
  fog: {
    background: "fog.webp",
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
    character: "snow.webp",
    label: "Snow outfit",
    alt: "Suggested outfit for snow: winter coat, scarf, gloves, beanie, and boots.",
    characterMaxWidth: "72%",
    characterMaxWidthWide: "62%",
    legendCharacterBottom: "-2px",
  },
  "heavy-snow": {
    background: "heavy-snow.webp",
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
      { sceneId: "hot-sunny", label: "Hot sunny", description: "Shorts, T-shirt, sunglasses, sandals, and water bottle." },
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
const precipitationConditionChanceThreshold = 50;
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
const buienradarSampleExactRadiusPx = 4;
const buienradarSampleNearbyRadiusPx = 12;
const buienradarSampleAlphaThreshold = 18;
const buienradarHourlyLookbackMinutes = 10;
const buienradarHourlyWindowMinutes = 30;
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
let buienradarPointRainCache = new Map();
let buienradarPointRainRequests = new Map();
let buienradarRainSamples = new Map();
let buienradarRainSampleRuns = new Map();
let rainDebugEntries = [];
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
let isOutfitMode = false;
let activeOutfitSceneId;
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
let lastCurrentLocationRefreshAttemptAt = 0;
let statusMessage = elements.updatedAt.textContent || "Loading forecast...";
let statusTitle = elements.updatedAt.title || "";
let statusIsError = elements.updatedAt.classList.contains("error");
let refreshTimer;

function init() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  renderWeatherIconLegend();
  renderLocation();
  initMap();
  bindEvents();
  bindLegendTabs();
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

function shouldEnableAnalytics() {
  return analyticsHostnames.has(window.location.hostname.toLowerCase());
}

function trackAnalyticsEvent(eventName) {
  if (!shouldEnableAnalytics()) {
    return;
  }

  if (typeof window.sa_event === "function") {
    window.sa_event(eventName);
  }
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
  activeOutfitSceneId = undefined;
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
  const requestLocation = selectedLocation;
  const requestLocationKey = getBuienradarSampleLocationKey(requestLocation);
  const pointRainPromise = prepareBuienradarPointRainForLocation(requestLocation).catch((error) => {
    console.warn("Could not load Buienradar point rain data.", error);
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
      "wind_speed_10m",
      "wind_direction_10m",
      "is_day",
    ].join(","),
    forecast_days: "5",
    timezone: requestLocation.timezone,
    timeformat: "unixtime",
    wind_speed_unit: "kmh",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) {
      throw new Error(`Open-Meteo responded with ${response.status}`);
    }

    const data = await response.json();
    await pointRainPromise;
    if (getBuienradarSampleLocationKey(selectedLocation) !== requestLocationKey) {
      return;
    }

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

  if (!getActiveRadarDate()) {
    setRainForecastBadgeCurrent(new Date(current.time * 1000));
  }

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
  elements.currentPrecipitationValue.classList.toggle("is-dry", isPrecipitationDisplayDry(precipitation));
  elements.rainTotal.title = precipitation.ariaLabel;
  elements.currentPrecipMetric.setAttribute("aria-label", `${scopeLabel} ${precipitation.ariaLabel.toLowerCase()}`);
  elements.currentPrecipitationValue.replaceChildren(
    ...createPrecipitationDisplayParts(precipitation, "current", elements.rainTotal),
  );
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
  const precipitation = buildSelectedDayPrecipitation(weatherData, summaryDate, snapshot);
  const hourlyPrecipitation = getClosestHourlyPrecipitation(summaryDate);
  const adjustedWeatherCode = getRadarAdjustedSnapshotWeatherCode(snapshot, summaryDate);

  renderCurrentTemperatureRange(buildSelectedDayTemperatureRange(weatherData, summaryDate, snapshot));
  renderCurrentPrecipitation(precipitation);

  renderTimedCondition(getCondition(adjustedWeatherCode, snapshot.isDaytime));
  renderTemperatureAndWind(snapshot);
  if (isOutfitMode) {
    renderOutfitScene(snapshot, hourlyPrecipitation || precipitation, adjustedWeatherCode);
    elements.outfitScene.hidden = false;
  }
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

  const precipitation = buildHourlyPrecipitation(hourly, index, {
    includeIntensity: true,
  });
  const weatherCode = getPrecipitationAdjustedWeatherCode(hourly.weather_code?.[index], precipitation);
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

function getRadarAdjustedSnapshotWeatherCode(snapshot, date) {
  const hourlyPrecipitation = getClosestHourlyPrecipitation(date);
  return getPrecipitationAdjustedWeatherCode(snapshot.weatherCode, hourlyPrecipitation);
}

function getClosestHourlyPrecipitation(date) {
  if (!date || !weatherData?.hourly?.time?.length) {
    return undefined;
  }

  const index = getClosestTimeIndex(weatherData.hourly.time, date.getTime() / 1000);
  if (index < 0) {
    return undefined;
  }

  return buildHourlyPrecipitation(weatherData.hourly, index, {
    includeIntensity: true,
    radarSampleMode: "instant",
    radarTime: date.getTime() / 1000,
  });
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
  const sceneId = getOutfitSceneOverrideId() || getOutfitSceneId(snapshot, precipitation, weatherCode);
  const scene = outfitScenes[sceneId] || outfitScenes[outfitDefaultSceneId];

  if (!scene) {
    return;
  }

  if (activeOutfitSceneId !== sceneId) {
    activeOutfitSceneId = sceneId;
    preloadedOutfitSceneIds.add(sceneId);
    elements.outfitSceneBackground.src = buildOutfitSceneAssetUrl(outfitSceneBackgroundBasePath, scene.background);
    elements.outfitSceneCharacter.src = buildOutfitSceneAssetUrl(outfitSceneCharacterBasePath, scene.character);
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
  elements.outfitScene.setAttribute("aria-label", scene.label);
}

function setOutfitSceneProperty(property, value) {
  if (value) {
    elements.outfitScene.style.setProperty(property, value);
  } else {
    elements.outfitScene.style.removeProperty(property);
  }
}

function getOutfitSceneOverrideId() {
  const sceneId = new URLSearchParams(window.location.search).get(outfitSceneOverrideQueryParam);
  return outfitScenes[sceneId] ? sceneId : undefined;
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

  outfitScenePreloadQueue = outfitSceneIds.filter(
    (sceneId) => sceneId !== activeOutfitSceneId && !preloadedOutfitSceneIds.has(sceneId),
  );
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
  const background = new Image();
  const character = new Image();
  background.decoding = "async";
  character.decoding = "async";
  outfitScenePreloadImages.set(sceneId, [background, character]);
  background.src = buildOutfitSceneAssetUrl(outfitSceneBackgroundBasePath, scene.background);
  character.src = buildOutfitSceneAssetUrl(outfitSceneCharacterBasePath, scene.character);
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

  return buildPrecipitationChance({
    chance: hourly?.precipitation_probability?.[index],
    weatherCode,
    rainAmount: hourly?.rain?.[index],
    showersAmount: hourly?.showers?.[index],
    snowfallAmount: hourly?.snowfall?.[index],
    temperature: hourly?.temperature_2m?.[index],
    forecastTime: radarTime ?? hourly?.time?.[index],
    radarSampleMode,
    includeIntensity,
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
  setRadarMapStatus("Loading rain forecast...");
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
  clearRadarMapStatus();
  refreshMapSize();
  prepareBuienradarRainSamples(radar);

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
  clearRadarMapStatus();
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

function setRadarMapStatus(message, { isError = false } = {}) {
  elements.radarMapStatus.textContent = message;
  elements.radarMapStatus.hidden = false;
  elements.radarMapStatus.classList.toggle("is-error", isError);
}

function clearRadarMapStatus() {
  elements.radarMapStatus.hidden = true;
  elements.radarMapStatus.classList.remove("is-error");
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
  setRainForecastBadgeCurrent();
  setRadarMapStatus(message, { isError: true });
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
  const isCurrentPosition = isRadarSliderAtStart(value);
  elements.radarTime.textContent = label;
  setRainForecastBadgeText(label, displayDate, selectedLocation.timezone, { isCurrentPosition });
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
  const isCurrentPosition = isRadarSliderAtStart(value);
  elements.radarTime.textContent = label;
  setRainForecastBadgeText(label, frameDate, DEFAULT_LOCATION.timezone, { isCurrentPosition });
  elements.radarSlider.value = String(Math.round(framePosition * 100));
  elements.radarSlider.setAttribute("aria-valuetext", label);
  elements.radarTime.classList.remove("error");
  setActiveRadarDate(frameDate);
}

function isRadarSliderAtStart(value) {
  return Math.abs(Number(value) || 0) < 0.5;
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

  radar.frameUrls.forEach(revokeFrameUrl);
}

function prepareBuienradarRainSamples(radar) {
  if (!radar?.frameUrls?.length || !isInBuienradarBounds(selectedLocation)) {
    return;
  }

  const modeId = radar.modeId;
  const locationKey = getBuienradarSampleLocationKey(selectedLocation);
  const existingSamples = buienradarRainSamples.get(modeId);
  if (
    existingSamples?.frameUrls === radar.frameUrls
    && existingSamples.locationKey === locationKey
    && isFreshBuienradarRadar(existingSamples)
  ) {
    return;
  }

  const sampleRun = {
    frameUrls: radar.frameUrls,
    locationKey,
  };
  buienradarRainSampleRuns.set(modeId, sampleRun);

  buildBuienradarRainSamples(radar, selectedLocation)
    .then((samples) => {
      if (
        buienradarRainSampleRuns.get(modeId) !== sampleRun
        || sampleRun.locationKey !== getBuienradarSampleLocationKey(selectedLocation)
        || !samples.length
      ) {
        return;
      }

      buienradarRainSamples.set(modeId, {
        modeId,
        frameUrls: radar.frameUrls,
        locationKey,
        startDate: radar.startDate,
        fetchedAt: radar.fetchedAt,
        frameMinutes: getBuienradarRadarMode(modeId).frameMinutes,
        samples,
      });
      renderWeatherForRadarBlend();
    })
    .catch((error) => {
      console.warn("Could not sample Buienradar rain at the selected location.", error);
    });
}

async function buildBuienradarRainSamples(radar, location) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return [];
  }

  const radarMode = getBuienradarRadarMode(radar.modeId);
  const samples = [];

  for (let index = 0; index < radar.frameUrls.length; index += 1) {
    const image = await loadBuienradarSampleImage(radar.frameUrls[index]);
    if (!image) {
      continue;
    }

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) {
      continue;
    }

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const sample = getBuienradarFrameRainSample(context, width, height, location);
    const time = radar.startDate.getTime() + index * radarMode.frameMinutes * 60 * 1000;
    samples.push({
      ...sample,
      time,
      chance: getBuienradarSignalChance(sample),
    });
  }

  return samples;
}

function loadBuienradarSampleImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = url;
  });
}

function getBuienradarFrameRainSample(context, width, height, location) {
  const point = getBuienradarPixelForLocation(location, width, height);
  if (!point) {
    return {
      signal: 0,
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
    exactRainPixels: 0,
    exactChanceSignalSum: 0,
    exactClassCounts: [0, 0, 0, 0],
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
      const pixelSample = getBuienradarPixelRainSample(
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

      if (distance <= buienradarSampleExactRadiusPx) {
        stats.exactPixels += 1;
        if (intensityRank > 0) {
          stats.exactRainPixels += 1;
          stats.exactChanceSignalSum += pixelSample.chanceSignal;
          stats.exactClassCounts[intensityRank] += 1;
        }
      }
    }
  }

  const exactCoverage = stats.exactPixels ? stats.exactRainPixels / stats.exactPixels : 0;
  const nearbyCoverage = stats.nearbyPixels ? stats.nearbyRainPixels / stats.nearbyPixels : 0;
  const exactAverage = stats.exactPixels ? stats.exactChanceSignalSum / stats.exactPixels : 0;
  const exactWetAverage = stats.exactRainPixels ? stats.exactChanceSignalSum / stats.exactRainPixels : 0;
  const nearbyAverage = stats.nearbyPixels ? stats.nearbyChanceSignalSum / stats.nearbyPixels : 0;
  const nearbyWetAverage = stats.nearbyRainPixels ? stats.nearbyChanceSignalSum / stats.nearbyRainPixels : 0;
  const exactSignal = stats.exactRainPixels > 0
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
  const nearbyWeight = exactSignal > 0 ? 0.35 : 0.55;
  const exactIntensityRank = getBuienradarSampleIntensityRank(stats.exactClassCounts, stats.exactPixels);
  const nearbyIntensityRank = getBuienradarSampleIntensityRank(stats.nearbyClassCounts, stats.nearbyPixels);
  const intensityRank = exactIntensityRank || nearbyIntensityRank;
  const intensitySignal = getBuienradarIntensitySignalForRank(intensityRank);

  return {
    signal: Math.max(exactSignal, nearbySignal * nearbyWeight),
    chanceSignal: Math.max(exactSignal, nearbySignal * nearbyWeight),
    intensitySignal,
    intensityRank,
    exactIntensityRank,
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

function getBuienradarChanceSignalForRank(rank) {
  const signals = [0, 0.3, 0.62, 0.92];
  return signals[rank] || 0;
}

function getBuienradarIntensitySignalForRank(rank) {
  const signals = [0, 0.2, 0.5, 0.85];
  return signals[rank] || 0;
}

function getBuienradarPixelForLocation(location, width, height) {
  if (!window.L || !Number.isFinite(location?.lat) || !Number.isFinite(location?.lon)) {
    return undefined;
  }

  const bounds = L.latLngBounds(buienradarBounds);
  const crs = map?.options?.crs || L.CRS.EPSG3857;
  const northWest = crs.latLngToPoint(bounds.getNorthWest(), 0);
  const southEast = crs.latLngToPoint(bounds.getSouthEast(), 0);
  const point = crs.latLngToPoint(L.latLng(location.lat, location.lon), 0);
  const xRatio = (point.x - northWest.x) / (southEast.x - northWest.x);
  const yRatio = (point.y - northWest.y) / (southEast.y - northWest.y);

  if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) {
    return undefined;
  }

  return {
    x: clampNumber(xRatio * width, 0, width - 1),
    y: clampNumber(yRatio * height, 0, height - 1),
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

function renderWeatherForRadarBlend() {
  if (!weatherData) {
    return;
  }

  renderFiveDayForecast(weatherData);
  renderSelectedWeather(getSelectedWeatherDate());
}

function getBuienradarAdjustmentForForecastTime(forecastTime, { radarSampleMode = "hourly" } = {}) {
  if (forecastTime === undefined || forecastTime === null || !isInBuienradarBounds(selectedLocation)) {
    return undefined;
  }

  const forecastDate = toForecastDate(forecastTime);
  if (!(forecastDate instanceof Date) || Number.isNaN(forecastDate.getTime())) {
    return undefined;
  }

  const effectiveForecastDate = getEffectiveBuienradarForecastDate(forecastDate, radarSampleMode);
  const pointRainAdjustment = getBuienradarAdjustmentFromSampleSeries(
    getBestBuienradarPointRainSampleSeries(effectiveForecastDate),
    effectiveForecastDate,
    radarSampleMode,
    {
      maxLookaheadHours: buienradarPointRainMaxLookaheadHours,
      source: "point",
      weight: buienradarPointRainBlendWeight,
    },
  );

  if (pointRainAdjustment) {
    return pointRainAdjustment;
  }

  return getBuienradarAdjustmentFromSampleSeries(
    getBestBuienradarRainSampleSeries(effectiveForecastDate),
    effectiveForecastDate,
    radarSampleMode,
    {
      maxLookaheadHours: buienradarBlendMaxLookaheadHours,
      source: "radar-image",
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

  const sample = radarSampleMode === "instant"
    ? getBuienradarInstantRainSignal(sampleSeries, forecastDate)
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
    source: source || sampleSeries.source || sampleSeries.modeId,
    chance: sample.chance,
    signal: sample.signal,
    intensitySignal: sample.intensitySignal,
    intensityRank: sample.intensityRank,
    sampleMode: radarSampleMode,
    value: sample.value,
    averageValue: sample.averageValue,
    peakValue: sample.peakValue,
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
  if (sampleSeries?.source !== "point") {
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

  return {
    ...nearestSample.sample,
    averageSignal: nearestSample.sample.signal,
    peakSignal: nearestSample.sample.signal,
    averageValue: nearestSample.sample.value,
    peakValue: nearestSample.sample.value,
    intensitySignal: nearestSample.sample.intensitySignal,
    intensityRank: nearestSample.sample.intensityRank,
    heavyFrameRatio: nearestSample.sample.intensityRank >= 3 ? 1 : 0,
    moderateFrameRatio: nearestSample.sample.intensityRank >= 2 ? 1 : 0,
    rainFrameRatio: nearestSample.sample.signal > buienradarDrySignalThreshold ? 1 : 0,
    sampleCount: 1,
    wetSampleCount: nearestSample.sample.signal > buienradarDrySignalThreshold ? 1 : 0,
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
    averageSignal,
    peakSignal,
    averageValue,
    peakValue,
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
  buienradarRainSamples.clear();
  buienradarRainSampleRuns.clear();
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
  forecastTime,
  radarSampleMode = "hourly",
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
  };
  precipitation.ariaLabel = getPrecipitationAriaLabel(precipitation);

  const adjustedPrecipitation = withBuienradarPrecipitationAdjustment(precipitation, forecastTime, {
    includeIntensity,
    radarSampleMode,
  });
  recordRainDebugPrecipitation(forecastTime, precipitation, adjustedPrecipitation);

  return adjustedPrecipitation;
}

function withHourlyPrecipitationChance(precipitation, hourlyPrecipitations) {
  const hourlyPrecipitation = getMaxPrecipitation(hourlyPrecipitations);

  if (!Number.isFinite(hourlyPrecipitation?.chance)) {
    return precipitation;
  }

  return withPrecipitationChance({
    ...precipitation,
    intensity: hourlyPrecipitation.intensity || precipitation.intensity,
    isRadarAdjusted: hourlyPrecipitation.isRadarAdjusted,
    radarAdjustment: hourlyPrecipitation.radarAdjustment,
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
    isRadarAdjusted: Boolean(precipitation.isRadarAdjusted),
  };
}

function getRainDebugRadarSummary(adjustment) {
  if (!adjustment) {
    return null;
  }

  return {
    source: adjustment.source,
    chance: formatDebugNumber(adjustment.chance),
    signal: formatDebugNumber(adjustment.signal),
    intensity: adjustment.intensity || "dry",
    weight: formatDebugNumber(adjustment.weight),
    horizonHours: formatDebugNumber(adjustment.horizonHours),
    sampleMode: adjustment.sampleMode,
    value: formatDebugNumber(adjustment.value),
    averageValue: formatDebugNumber(adjustment.averageValue),
    peakValue: formatDebugNumber(adjustment.peakValue),
    averageSignal: formatDebugNumber(adjustment.averageSignal),
    peakSignal: formatDebugNumber(adjustment.peakSignal),
    intensitySignal: formatDebugNumber(adjustment.intensitySignal),
    intensityRank: adjustment.intensityRank,
    heavyFrameRatio: formatDebugNumber(adjustment.heavyFrameRatio),
    moderateFrameRatio: formatDebugNumber(adjustment.moderateFrameRatio),
    rainFrameRatio: formatDebugNumber(adjustment.rainFrameRatio),
    sampleCount: adjustment.sampleCount,
    wetSampleCount: adjustment.wetSampleCount,
    sampleTime: Number.isFinite(adjustment.time) ? new Date(adjustment.time).toISOString() : undefined,
  };
}

function formatDebugForecastTime(value) {
  const date = toForecastDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function formatDebugNumber(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}

function withBuienradarPrecipitationAdjustment(precipitation, forecastTime, { includeIntensity = false, radarSampleMode = "hourly" } = {}) {
  const adjustment = getBuienradarAdjustmentForForecastTime(forecastTime, { radarSampleMode });

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

  if (!isRadarAdjusted) {
    return precipitation;
  }

  const adjustedPrecipitation = {
    ...precipitation,
    value,
    chance: adjustedChance,
    amount,
    intensity,
    isRadarAdjusted,
    radarAdjustment: {
      source: adjustment.source,
      chance: adjustment.chance,
      signal: adjustment.signal,
      intensitySignal: adjustment.intensitySignal,
      intensityRank: adjustment.intensityRank,
      intensity: radarIntensity,
      weight: adjustment.weight,
      sampleMode: adjustment.sampleMode,
      horizonHours: adjustment.horizonHours,
      value: adjustment.value,
      averageValue: adjustment.averageValue,
      peakValue: adjustment.peakValue,
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

function getPrecipitationAdjustedWeatherCode(weatherCode, precipitation) {
  if (!precipitation?.isRadarAdjusted || !Number.isFinite(precipitation.chance)) {
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
  buienradarRadarCache.forEach(revokeBuienradarRadar);
});
