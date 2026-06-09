# MyMeteo Project Context

Last updated: 2026-06-08

This file is the shared product memory for MyMeteo. Read it before discussing or changing the app in a new Codex chat. It summarizes the decisions, trade-offs, and design philosophy that emerged from the MyMeteo development chats, the app changelog, the README, git history, and the current implementation.

## Core Philosophy

MyMeteo is a small, practical weather app. The main goal is not to show every possible weather detail, but to help a user quickly answer: what is the weather like now, will it rain soon, and what does the next few days look like?

The project started because existing weather apps and websites showed too much data, too little data, or data in formats the user did not like. The original target was a personal "ideal weather view" for Amsterdam that could be checked a few times per day on an iPhone, then gradually opened up for other users and locations.

The app should feel calm, compact, and trustworthy. Prefer clarity and stability over cleverness. Avoid adding visible explanations, extra panels, badges, or teaching UI unless they solve a real user confusion and can fit naturally into the existing compact interface.

The app is intentionally mobile-first. It should fit comfortably on a phone screen, but desktop should also feel polished. On mobile, the app uses a simple two-tab structure: `Today` and `5 days`. On wider screens, Today and the forecast can coexist more comfortably, but the app should still avoid dashboard clutter.

## Working Agreement

When the user asks for ideas, advice, wording, drafts, or discussion, do not edit files or implement changes. Only make code or file changes when the user explicitly asks to build, change, implement, or update something.

Changelog workflow: when implementing MyMeteo changes, suggest changelog wording separately and ask for approval before editing the changelog. Do not update the changelog automatically.

Outfit image workflow: show redesigned outfit images to the user for approval before replacing app assets. When an outfit image is approved for the app, back up the previous app-facing asset in `private/outfit-scenes-source/backups/` before replacing it, and keep generated/source artifacts in the ignored `private/` archive.

When implementing, keep changes scoped and verify them. For MyMeteo this usually means at least:

- `node --check app.js` after JavaScript changes
- `git diff --check` after style/source edits
- browser verification for visual or interaction changes, especially across mobile and desktop widths
- screenshots or measured DOM checks when spacing and layout stability matter
- stable/reusable browser-check commands when possible, so repeated approval prompts do not become noisy

## Current App Shape

MyMeteo is a static HTML/CSS/JavaScript app. It can run locally from the folder or be served by a simple static server. It is hosted publicly through GitHub Pages / mymeteo.nl.

Keeping the site static, no-key, and backend-free has been an important design constraint. API-key providers are possible, but they would either expose secrets in the browser or require a backend/proxy. Prefer no-key public data sources unless there is a strong reason to change the architecture.

Core files:

- `index.html`: app shell, About modal, source notes, changelog, cache-busted asset links
- `styles.css`: layout, responsive behavior, weather card, forecast table, modal styling
- `app.js`: data fetching, radar animation, forecast processing, UI behavior
- `assets/weather-icons-mymeteo/`: custom MyMeteo weather icons

Primary data sources:

- Open-Meteo Forecast API for forecast data
- Open-Meteo Geocoding API for location autocomplete
- OpenStreetMap Nominatim for current-location names
- Buienradar for Netherlands point rain nowcast data and rain radar animation
- LibreWXR as fallback/outside-Netherlands radar tiles
- OpenStreetMap/Leaflet for maps

No API key is required.

## Major Decisions

### Start With The Essential Weather Questions

The original desired data set was intentionally narrow:

- current temperature
- sky condition
- daily max temperature, later also min temperature
- wind direction and speed
- rain radar with a time slider
- later, a compact 5-day outlook

This origin still matters. New features should earn their place by helping users make quick weather decisions. The app should not drift into a full meteorological dashboard.

### Keep The Main UI Minimal

The user repeatedly favored a simple, usable interface over visible explanations and extra controls. When users might need more information, prefer hidden or secondary locations such as About sections, tooltips, titles, and ARIA labels. Do not solve every ambiguity by adding text to the main screen.

The About modal is the right home for supporting context: creator info, a combined Legend section, data sources, shortcut instructions, changelog, and background notes. The Legend section can group icon and outfit explanations behind compact tabs so the modal does not grow too many separate accordion sections. Outfit Legend previews should use compact weather-scene previews that reuse the same layered background and character assets as outfit mode, so the legend matches what users see in Today. Early footer text was moved into About because it made the main weather view busier without helping the primary task.

### Make Today The Weather-First View

The Today tab combines the rain radar map with a compact selected-time weather card. The card shows time, icon/condition, temperature, remaining-day high/low, wind, and rain chance.

The radar slider should control the radar map and selected radar time. In an early iteration it also updated temperature and wind predictions, but that was deliberately reverted because short-term temp/wind changes were not useful enough and made the interaction feel broader than needed.

The leftmost slider position should show `Now` rather than an exact technical radar time. The exact radar time is still preserved in title/ARIA text. When the slider moves away from the left edge, the visible label switches to `At HH:MM`, then returns to `Now` when the slider returns to the left edge.

The radar should not autoplay. It should load at the beginning and stay there until the user intentionally drags the slider.

The Today view can also offer a compact outfit mode. A small clothing/map toggle in the radar area switches between the rain radar and an illustrated outfit recommendation for the selected time. The weather card remains visible and should continue to update with the slider. Outfit changes should be stable and meaningful, using priority rules so rain, snow, storm, fog, and strong wind override dry temperature bands. For the selected Today time, precipitation outfit scenes should stay in sync with the displayed weather icon: do not show umbrella/rain-jacket or snow outfits when the selected weather icon is dry, clear, cloudy, or overcast. Warm rain at tropical temperatures should branch to breathable warm-wet variants instead of cool-weather rain jackets and long trousers. The app renders the layered v2 asset set in `assets/outfit-scenes/v2/`, with wide weather WebP backgrounds and transparent WebP character/outfit foreground layers so the outfit view can fill different radar-area aspect ratios more naturally while keeping downloads light. The v2 set covers the full current seventeen-state outfit set from hot sunny through heavy snow, including warm drizzle/rain/heavy-rain variants. Older experiments, generated sources, PNG reference layers, preview pages, and reference-character photos belong in the ignored `private/` archive rather than the public app asset path. Outfit assets are loaded on demand when outfit mode opens; remaining scenes preload progressively during idle time and are skipped for Save-Data or very slow connections. The hidden `?outfitState=<state-id>` query parameter can force a valid outfit scene for QA without adding visible UI.

The outfit/radar toggle should remain a destination-style icon button: show a shirt icon while the destination is outfit mode, and keep the map icon while the destination is the rain radar. The map icon is recognizable enough in context because the button stays in the same place and the title/ARIA label says `Show rain radar`. A back arrow was considered, but it suggests generic navigation or closing the outfit view rather than specifically returning to the radar. More weather-specific icons such as radar or cloud-rain could be tested later if the map icon proves confusing, but for now the map icon is the calmer and clearer fit.

The Today weather card also has a hidden Easter egg: clicking or tapping the large temperature in the radar weather card reveals an 8-second Marc rain-dance video in the radar area, and tapping the temperature or video dismisses it. The video should stay lazy-loaded, respect reduced-motion and data-saver settings by falling back to a poster, keep the radar/map controls hidden while active, and bottom-anchor the video/poster crop so extra safe-area fill is biased toward the top behind the weather card rather than the clean lower edge. Production assets live in `assets/easter-eggs/`; when replacing the video, replace the MP4 and poster together and bump the Easter egg asset version in `app.js`.

### Show Useful Data As Soon As It Exists

The weather card should not wait for slower radar graphics if forecast/current weather data is already available. The card should show its main contents early, while radar-loading status belongs in the map/status area. This keeps the first load from feeling unnecessarily blocked.

### Keep The Weather Card Calm

The Today weather card should feel visually stable while the slider moves. Contents may change, but columns, slider width, and important alignments should not jump around.

Implementation choices that support this:

- fixed grid columns for the card units
- tabular numeric styling
- stable min widths for values such as wind and rain chance
- responsive card dimensions tuned by breakpoint
- careful spacing between time, icon, temperature, wind, and rain
- measured verification across mobile and desktop widths

Spacing changes should be checked in several viewport widths. Small fixes can create new gaps elsewhere, so verify both zero-rain and longer-label cases such as `moderate`.

### Treat Weather Source Conflicts Honestly

Open-Meteo and Buienradar can disagree. Users may see clear radar over Amsterdam while hourly forecast rain chance says 100%, or radar rain over a location while the hourly chance is low. This is a real usability problem because users experience both as statements about the same rain question.

The chosen direction is not to add lots of visible warnings. Instead, MyMeteo should make the displayed near-term rain chance more coherent:

- For the Netherlands, use Buienradar coordinate rain data as the primary point signal for the first 2 hours.
- For the later near-term window, sample Buienradar frames around the selected location.
- Convert the point/radar signal into dry/light/moderate/heavy-like rain information.
- Blend that into Open-Meteo hourly rain chance and intensity for the first 8 hours.
- Let the blend work in both directions: radar can increase rain risk when rain is present, but can also lower probability, intensity, and rain icons when the local radar signal is dry or lighter.
- Keep radar chance and intensity separate: chance should follow coverage/timing, while intensity should follow the local Buienradar color class so broad light rain does not become heavy rain.
- Use representative hourly rain signal rather than the single strongest frame, while the Today/Now card should use the nearest point/radar sample.
- For Buienradar point rain data, keep the current hour near-now focused, but let future hourly rows use the upcoming hour so short showers are not lost between labels.
- Let radar influence be strongest for the first 3 hours, then fade toward the 8-hour limit.
- After 8 hours, Open-Meteo is leading because there is no longer radar coverage.
- Do not alter the radar animation based on Open-Meteo. The map should remain honest radar data.

The current implementation uses blend constants in `app.js` around `buienradarPointRainMaxLookaheadHours`, `buienradarBlendMaxLookaheadHours`, `buienradarBlendFullWeightHours`, and related sampling settings. These can be tuned if live use shows overcorrection or undercorrection.

The About/Data Sources section and README mention that near-term rain chance in the Netherlands is Open-Meteo adjusted with Buienradar point rain data for the first 2 hours, then radar data toward the 8-hour limit.

### Rain Chance Should Be Easy To Scan

The app moved from compact rain amounts in millimeters toward rain chance percentages, because that better matches the user's quick decision need. Displayed rain chances are rounded to the nearest 5% to avoid false precision.

Intensity words such as light, moderate, and heavy are useful, but should remain compact. They help users understand that a high probability of tiny rain is different from a high probability of heavy rain.

The compact UI should use "rain chance" as the user-facing term. When the displayed rain chance rounds to 0%, show `Dry` instead of `0%` plus extra decoration. When rain chance is above 0%, show the rounded percentage next to a small three-step intensity meter: one segment for light, two for moderate, three for heavy. The same rain display language should be reused in the Today weather card, 5-day summaries, and expanded hourly rows. Keep the light/moderate/heavy words available in titles, ARIA labels, or About text rather than repeating them in compact forecast cells.

Avoid unnecessary decimals. Early rain amounts were rounded to whole millimeters because `10 mm` is more readable than `10.1 mm` in a compact weather UI. The same taste applies elsewhere: avoid false precision unless the precision helps a real decision.

For today, daily summaries should focus on the remaining hours rather than already-past weather. The daily rain summary uses the maximum relevant hourly rain risk, not a misleading average.

Snow and mixed precipitation labels should be treated carefully so near-even rain/snow totals read naturally in the compact UI.

### Make The 5-Day Forecast Dense But Understandable

The 5-day forecast starts with today, not tomorrow. It uses summary rows for quick scanning and expandable hourly rows for detail.

Hourly rows should be compact, aligned, and readable on narrow mobile widths. The layout should handle short values like `0%` and longer labels like `moderate` without columns touching or creating awkward gaps.

Users may not know what every weather icon means. The chosen solution is the `Icons` tab in the About modal's `Legend` section, not visible labels beside every icon. The intro text is `Weather icons used in MyMeteo.`

### Location UX Should Avoid Surprise

The app supports city/place search and browser current-location permission. Current-location mode should auto-refresh on open when browser geolocation permission is already granted.

First-time visitors default to Amsterdam when there is no saved browser location yet. After a user chooses a location, the app stores that choice locally and starts there next time.

Location search should work well on iPhone Safari. The native datalist was replaced with a custom suggestions menu because browser-controlled popovers could cover the text box. The suggestion list should be readable from the first one or two typed characters, not only after the input gets wider.

The current-location button should stay visually associated with the location name. It should not float far away for short names like Paris, overlap longer names like Current location, or cause placeholder text such as Search location to be clipped. Clicking the location field should make it easy to replace the current label.

On mobile, if the user selects a new location while on the 5-day tab and then returns to Today, the map should center on the new location. Otherwise the user can reasonably wonder whether the Today map is still showing the old place.

### Radar Behavior

The radar source changed several times because the desired interaction was specific: real moving rain spots, a usable time slider, and no backend/API key.

Early RainViewer use was limited because future nowcast support was no longer available. Synthetic Open-Meteo forecast circles were rejected because they did not look like actual moving radar spots. LibreWXR gave real tile movement but only about one hour of future coverage. Buienradar became the Netherlands source because it provided a smoother seekable radar animation and about three hours of public no-key forecast frames.

For locations in the Netherlands, Buienradar is the primary near-term rain source. The coordinate rain feed is preferred for point rain correction in the first 2 hours because it is less fragile than reading a visual radar image pixel at a lat/lon. The radar animation remains the visible map source, and the app supports a 3-hour and 8-hour Buienradar view with preloading so switching modes feels fast. Earlier investigation found the public no-key Buienradar animation endpoint capped at about 36 five-minute frames for the simple 3-hour setup; longer horizons generally require either model forecasts, different providers, or later source changes.

For locations outside the Netherlands or when Buienradar is unavailable, LibreWXR/fallback radar tiles are used. The outside-Netherlands one-hour radar animation was smoothed to feel less jumpy.

Radar downloads and decoded frames are cached carefully, with cache busting and cleanup to avoid stale or leaking frame URLs.

### Visual Identity

MyMeteo uses custom weather icons in `assets/weather-icons-mymeteo/`. The move to custom icons was made because they are more specific and easier to recognize than the earlier/default icons.

The app icon became a red umbrella. README screenshots should reflect the current Today tab and 5-day forecast tab.

Outfit illustrations that show an umbrella should use a red umbrella canopy to echo the MyMeteo logo. Umbrella handles and shafts can stay dark/black so the image still reads naturally.

Clear icons are more important than decorative icons. An early attempt to make the weather icon tile more colorful with extra circles/layers was reverted because it made the icons less clear.

Avoid wordy weather descriptions in the compact UI. Icons, numbers, and short labels should carry the experience.

Temperature color is meaningful: max temperatures are red and min temperatures are blue. Wind direction should stay compact, usually one or two letters such as `N` or `NW`, not three-letter detail like `WSW`.

### Sharing, Caching, And iPhone Details

The page title and link-preview metadata should be generic `MyMeteo`, not `MyMeteo Amsterdam`. Amsterdam is only the default starting location, and shared links should not imply the app is Amsterdam-only.

The `MyMeteo` title can open the About modal, like the info icon, but it should still look like plain title text. On iPhone, avoid using a native button element for the visual title if it makes the title look like a button; preserve accessibility semantics without changing the visual feel.

iPhone Safari, Chrome on iPhone, and iOS home-screen shortcuts can cache CSS, JS, metadata, and app icons stubbornly. Cache-busting query strings and version bumps are part of the workflow after deploy-sensitive changes. For home-screen icon changes, users may need to delete and re-add the shortcut.

## Design Taste

The design should feel like a refined utility, not a marketing page. Prefer:

- compact controls
- stable measurements
- readable numbers
- subtle borders and shadows
- small-radius cards
- clear tab names
- calm spacing
- mobile layouts that do not require explanation

Avoid:

- extra instructional text on the main screen
- layout shifts while data changes
- adding another visible badge for every data nuance
- making the app feel like a generic dashboard
- decorative visual effects that do not help weather comprehension

## Future Development Notes

Read this file first in new MyMeteo chats.

If a new durable product decision is made, update this file so future chats inherit the reasoning. Keep it concise and opinionated. This should not become a full transcript or changelog; it should capture the "why" behind the app.

When a request is only discussion/advice, do not update this file unless the user explicitly asks. When implementing a change, consider whether the change updates the product philosophy, source behavior, or recurring design conventions enough to warrant a short context-file update.
