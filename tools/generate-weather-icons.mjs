import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const iconDir = path.join(repoRoot, "assets", "weather-icons-mymeteo");

const color = {
  sun: "#f5a400",
  moon: "#c5cace",
  cloud: "#9ea3a5",
  cloudFill: "#fff",
  rain: "#238fc7",
  snow: "#64add2",
  bolt: "#f2a600",
};

function fmt(value) {
  return Number(value.toFixed(1));
}

function wrap(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>${title}</title>
  ${body}
</svg>
`;
}

function sun(cx, cy, r, ray = 7, stroke = 4) {
  const rays = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    const x1 = fmt(cx + Math.cos(angle) * (r + 5));
    const y1 = fmt(cy + Math.sin(angle) * (r + 5));
    const x2 = fmt(cx + Math.cos(angle) * (r + ray + 5));
    const y2 = fmt(cy + Math.sin(angle) * (r + ray + 5));
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join("\n    ");

  return `<g fill="none" stroke="${color.sun}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="${cx}" cy="${cy}" r="${r}"/>
    ${rays}
  </g>`;
}

function moon(cx, cy, r, cutX = cx + 8, cutY = cy - 6) {
  return `<mask id="moon-cut">
    <rect width="64" height="64" fill="#fff"/>
    <circle cx="${cutX}" cy="${cutY}" r="${r}" fill="#000"/>
  </mask>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color.moon}" mask="url(#moon-cut)"/>`;
}

function cloudMain() {
  return `<path d="M17 43h29a9 9 0 0 0 1-18 13 13 0 0 0-24-4 10 10 0 0 0-6 22Z" fill="${color.cloudFill}" stroke="${color.cloud}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function cloudSmall() {
  return `<path d="M27 45h19a6.8 6.8 0 0 0 .7-13.6 9.5 9.5 0 0 0-17.5-3.1A7.5 7.5 0 0 0 27 45Z" fill="${color.cloudFill}" stroke="${color.cloud}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function cloudTiny() {
  return `<path d="M34 46h14a5.5 5.5 0 0 0 .5-11 7.5 7.5 0 0 0-13.8-2.5A6 6 0 0 0 34 46Z" fill="${color.cloudFill}" stroke="${color.cloud}" stroke-width="3.7" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function cloudWide() {
  return `<path d="M15 43h33a9.5 9.5 0 0 0 1-19 14 14 0 0 0-25.8-4.1A10.5 10.5 0 0 0 15 43Z" fill="${color.cloudFill}" stroke="${color.cloud}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function cloudBack() {
  return `<path d="M21 34h25a7.5 7.5 0 0 0 .7-15 11 11 0 0 0-20.1-3.4 8 8 0 0 0-5.6 18.4Z" fill="${color.cloudFill}" stroke="${color.cloud}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" opacity=".72"/>`;
}

function rainDrops(xs = [24, 34, 44], y = 48, len = 8, stroke = 4) {
  return `<g fill="none" stroke="${color.rain}" stroke-width="${stroke}" stroke-linecap="round">
    ${xs.map((x) => `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + len}"/>`).join("\n    ")}
  </g>`;
}

function drizzleDots(xs = [24, 34, 44], y = 51) {
  return `<g fill="${color.rain}">
    ${xs.map((x) => `<circle cx="${x}" cy="${y}" r="2.5"/>`).join("\n    ")}
  </g>`;
}

function snowStar(cx, cy, size = 4.5, stroke = 2.6) {
  return `<g fill="none" stroke="${color.snow}" stroke-width="${stroke}" stroke-linecap="round">
    <line x1="${cx}" y1="${cy - size}" x2="${cx}" y2="${cy + size}"/>
    <line x1="${cx - size}" y1="${cy}" x2="${cx + size}" y2="${cy}"/>
    <line x1="${fmt(cx - size * 0.72)}" y1="${fmt(cy - size * 0.72)}" x2="${fmt(cx + size * 0.72)}" y2="${fmt(cy + size * 0.72)}"/>
    <line x1="${fmt(cx + size * 0.72)}" y1="${fmt(cy - size * 0.72)}" x2="${fmt(cx - size * 0.72)}" y2="${fmt(cy + size * 0.72)}"/>
  </g>`;
}

function hailDots(xs = [25, 35, 45], y = 53) {
  return `<g fill="${color.rain}">
    ${xs.map((x) => `<circle cx="${x}" cy="${y}" r="3"/>`).join("\n    ")}
  </g>`;
}

function lightning(x = 33, y = 41, scale = 1) {
  const points = [
    [x, y],
    [x - 7 * scale, y + 13 * scale],
    [x + 1 * scale, y + 13 * scale],
    [x - 3 * scale, y + 23 * scale],
    [x + 11 * scale, y + 7 * scale],
    [x + 3 * scale, y + 7 * scale],
    [x + 8 * scale, y],
  ]
    .map(([px, py]) => `${fmt(px)} ${fmt(py)}`)
    .join("L");

  return `<path d="M${points}Z" fill="${color.bolt}"/>`;
}

function fogLines() {
  return `<g fill="none" stroke="${color.cloud}" stroke-width="3.8" stroke-linecap="round" opacity=".86">
    <line x1="18" y1="49" x2="48" y2="49"/>
    <line x1="13" y1="56" x2="42" y2="56"/>
  </g>`;
}

function stormRain(dayPart) {
  const sky = skyBehindCloud(dayPart);
  return `${sky}
  ${cloudMain()}
  ${lightning(34, 39, 0.9)}
  ${rainDrops([23, 47], 49, 7, 3.6)}`;
}

function stormHail(dayPart) {
  const sky = skyBehindCloud(dayPart);
  return `${sky}
  ${cloudMain()}
  ${lightning(34, 39, 0.9)}
  ${hailDots([25, 45], 54)}`;
}

function skyBehindCloud(dayPart) {
  return dayPart === "day" ? sun(22, 20, 12, 5, 3.8) : moon(24, 19, 15, 33, 13);
}

const icons = {
  "clear-day": wrap("Clear sky", sun(32, 32, 12, 8, 4.4)),
  "clear-night": wrap("Clear night", moon(31, 32, 17, 40, 25)),
  "mostly-clear-day": wrap("Mostly clear", `${sun(28, 28, 13, 7, 4.2)}
  ${cloudTiny()}`),
  "mostly-clear-night": wrap("Mostly clear night", `${moon(30, 29, 15, 38, 22)}
  ${cloudTiny()}`),
  "partly-cloudy-day": wrap("Partly cloudy", `${skyBehindCloud("day")}
  ${cloudMain()}`),
  "partly-cloudy-night": wrap("Partly cloudy night", `${skyBehindCloud("night")}
  ${cloudMain()}`),
  "overcast-day": wrap("Overcast", cloudWide()),
  "overcast-night": wrap("Overcast night", `${skyBehindCloud("night")}
  ${cloudWide()}`),
  "fog-day": wrap("Fog", `${cloudMain()}
  ${fogLines()}`),
  "fog-night": wrap("Fog night", `${moon(23, 19, 14, 31, 13)}
  ${cloudMain()}
  ${fogLines()}`),
  drizzle: wrap("Drizzle", `${cloudMain()}
  ${drizzleDots()}`),
  "overcast-sleet": wrap("Sleet", `${cloudWide()}
  ${rainDrops([22, 46], 48, 7, 3.8)}
  ${snowStar(31, 55, 3.2, 2.1)}`),
  rain: wrap("Rain", `${cloudMain()}
  ${rainDrops()}`),
  "overcast-rain": wrap("Overcast rain", `${cloudWide()}
  ${rainDrops([22, 31, 40, 49], 48, 8, 3.8)}`),
  "partly-cloudy-day-rain": wrap("Showers", `${skyBehindCloud("day")}
  ${cloudMain()}
  ${rainDrops([25, 36, 47], 48, 8, 3.8)}`),
  "partly-cloudy-night-rain": wrap("Night showers", `${skyBehindCloud("night")}
  ${cloudMain()}
  ${rainDrops([25, 36, 47], 48, 8, 3.8)}`),
  snow: wrap("Snow", `${cloudMain()}
  ${snowStar(26, 53, 4, 2.4)}
  ${snowStar(42, 53, 4, 2.4)}`),
  snowflake: wrap("Snow grains", snowStar(32, 32, 18, 3.7)),
  "partly-cloudy-day-snow": wrap("Snow showers", `${skyBehindCloud("day")}
  ${cloudMain()}
  ${snowStar(27, 53, 4, 2.3)}
  ${snowStar(43, 53, 4, 2.3)}`),
  "partly-cloudy-night-snow": wrap("Night snow showers", `${skyBehindCloud("night")}
  ${cloudMain()}
  ${snowStar(27, 53, 4, 2.3)}
  ${snowStar(43, 53, 4, 2.3)}`),
  "thunderstorms-day-rain": wrap("Thunderstorm", stormRain("day")),
  "thunderstorms-night-rain": wrap("Night thunderstorm", stormRain("night")),
  "thunderstorms-day-hail": wrap("Storm with hail", stormHail("day")),
  "thunderstorms-night-hail": wrap("Night storm with hail", stormHail("night")),
};

const previewOrder = [
  ["Clear sky", "clear-day"],
  ["Clear night", "clear-night"],
  ["Mostly clear", "mostly-clear-day"],
  ["Mostly clear night", "mostly-clear-night"],
  ["Partly cloudy", "partly-cloudy-day"],
  ["Partly cloudy night", "partly-cloudy-night"],
  ["Overcast", "overcast-day"],
  ["Overcast night", "overcast-night"],
  ["Fog", "fog-day"],
  ["Fog night", "fog-night"],
  ["Drizzle", "drizzle"],
  ["Sleet", "overcast-sleet"],
  ["Rain", "rain"],
  ["Overcast rain", "overcast-rain"],
  ["Showers", "partly-cloudy-day-rain"],
  ["Night showers", "partly-cloudy-night-rain"],
  ["Snow", "snow"],
  ["Snow grains", "snowflake"],
  ["Snow showers", "partly-cloudy-day-snow"],
  ["Night snow showers", "partly-cloudy-night-snow"],
  ["Thunderstorm", "thunderstorms-day-rain"],
  ["Night thunderstorm", "thunderstorms-night-rain"],
  ["Storm with hail", "thunderstorms-day-hail"],
  ["Night storm with hail", "thunderstorms-night-hail"],
];

function iconCard([label, name]) {
  return `      <article class="icon-card">
        <div class="icon-large"><img src="assets/weather-icons-mymeteo/${name}.svg" alt="${label}" width="64" height="64"></div>
        <div class="icon-sizes" aria-hidden="true">
          <img src="assets/weather-icons-mymeteo/${name}.svg" width="34" height="34" alt="">
          <img src="assets/weather-icons-mymeteo/${name}.svg" width="28" height="28" alt="">
          <img src="assets/weather-icons-mymeteo/${name}.svg" width="22" height="22" alt="">
        </div>
        <h2>${label}</h2>
        <code>${name}.svg</code>
      </article>`;
}

function previewPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyMeteo Weather Icons</title>
    <style>
      :root { color-scheme: light; --page: #f4f0e7; --panel: #fffaf0; --ink: #17201b; --muted: #68716c; --line: #d8d0c0; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--page); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(1120px, 100%); margin: 0 auto; padding: 24px 14px 32px; }
      h1 { margin: 0 0 8px; font-size: clamp(1.6rem, 3vw, 2.2rem); letter-spacing: 0; }
      p { max-width: 760px; margin: 0 0 22px; color: var(--muted); font-size: 1rem; line-height: 1.45; }
      .icon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
      .icon-card { min-width: 0; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .icon-large { width: 70px; height: 70px; display: grid; place-items: center; margin-bottom: 8px; border-radius: 8px; background: #fff; }
      .icon-sizes { min-height: 34px; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      .icon-sizes img, .icon-large img { display: block; object-fit: contain; }
      h2 { margin: 0 0 5px; font-size: .95rem; line-height: 1.15; letter-spacing: 0; }
      code { color: var(--muted); font-size: .72rem; word-break: break-word; }
    </style>
  </head>
  <body>
    <main>
      <h1>MyMeteo Weather Icons</h1>
      <p>First-pass custom icons, shown at full size and at small forecast-table sizes for legibility checks.</p>
      <section class="icon-grid" aria-label="Weather icon overview">
${previewOrder.map(iconCard).join("\n")}
      </section>
    </main>
  </body>
</html>
`;
}

await fs.mkdir(iconDir, { recursive: true });

await Promise.all(
  Object.entries(icons).map(([name, svg]) => fs.writeFile(path.join(iconDir, `${name}.svg`), svg)),
);

await fs.writeFile(
  path.join(iconDir, "README.md"),
  `# MyMeteo Weather Icons

A custom SVG weather icon set for MyMeteo, designed to stay clear at small forecast-table sizes. The icons use simple strokes, large sun/moon symbols, outline clouds, and distinct blue precipitation marks.
`,
);

await fs.writeFile(path.join(repoRoot, "weather-icons-preview.html"), previewPage());

console.log(`Generated ${Object.keys(icons).length} icons in ${path.relative(repoRoot, iconDir)}`);
