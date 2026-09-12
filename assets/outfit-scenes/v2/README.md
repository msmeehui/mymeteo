# MyMeteo Outfit Scenes v2

This folder contains the layered outfit asset set used by the MyMeteo outfit
mode.

## Goal

Keep production outfit scenes split into:

- a wide weather background layer that can cover any radar-area aspect ratio
- a transparent character/outfit foreground layer anchored near the bottom center
- optional future weather-effect overlays, such as rain, snow, fog, lightning, or wind streaks

## Canonical clothing scenes

The v2 set includes seventeen clothing states. The table lists canonical artwork
used by the Outfit Legend, forced-outfit debug previews, and specialist weather
scenes. Normal selected-weather rendering uses the shared backgrounds below.

| State | Background | Character |
| --- | --- | --- |
| `hot-sunny` | `backgrounds/hot-sunny.webp` | `characters/hot-sunny.webp` |
| `warm-fair` | `backgrounds/warm-fair.webp` | `characters/warm-fair.webp` |
| `mild-cloudy` | `backgrounds/mild-cloudy.webp` | `characters/mild-cloudy.webp` |
| `cool-dry` | `backgrounds/cool-dry.webp` | `characters/cool-dry.webp` |
| `cold-dry` | `backgrounds/cold-dry.webp` | `characters/cold-dry.webp` |
| `freezing-dry` | `backgrounds/freezing-dry.webp` | `characters/freezing-dry.webp` |
| `fog` | `backgrounds/fog.webp` | `characters/fog.webp` |
| `windy` | `backgrounds/windy.webp` | `characters/windy.webp` |
| `drizzle` | `backgrounds/drizzle.webp` | `characters/drizzle.webp` |
| `warm-drizzle` | `backgrounds/drizzle.webp` | `characters/warm-drizzle.webp` |
| `rain` | `backgrounds/rain.webp` | `characters/rain.webp` |
| `warm-rain` | `backgrounds/rain.webp` | `characters/warm-rain.webp` |
| `heavy-rain` | `backgrounds/heavy-rain.webp` | `characters/heavy-rain.webp` |
| `warm-heavy-rain` | `backgrounds/heavy-rain.webp` | `characters/warm-heavy-rain.webp` |
| `thunderstorm` | `backgrounds/thunderstorm.webp` | `characters/thunderstorm.webp` |
| `snow` | `backgrounds/snow.webp` | `characters/snow.webp` |
| `heavy-snow` | `backgrounds/heavy-snow.webp` | `characters/heavy-snow.webp` |

## Shared dry-weather skies

The selected-time condition shown by the Today icon selects these backgrounds
independently of clothing temperature bands and the wind outfit:

| Displayed condition | Day background | Night background |
| --- | --- | --- |
| Clear (0) | `sky-clear.webp` | `sky-clear-night.webp` |
| Mostly clear (1) | `warm-fair.webp` | `warm-fair-night.webp` |
| Partly cloudy (2) | `cool-dry.webp` | `cool-dry-night.webp` |
| Overcast (3) | `sky-overcast.webp` | `sky-overcast-night.webp` |

Names are relative to `backgrounds/`. The four `sky-*.webp` files are new;
existing canonical assets and character layers are preserved. The approved
21-degree overcast proof is the source for `sky-overcast.webp`. Generated
sources and prompts are archived privately under
`private/outfit-scenes-source/sky-20260912/`.

Sky changes and sunset update presentation without changing clothing hysteresis.
The fully gated debug outfit override keeps canonical scene artwork. Shared sky
preloads reuse image objects across outfit states and keep the existing lazy,
Save-Data, and slow-connection behavior.

## Shared precipitation backgrounds

The selected Today icon also distinguishes showers from steady precipitation.
Approved day/night backgrounds are shared by cool and warm clothing variants:

| Displayed condition | Day background | Night background |
| --- | --- | --- |
| Rain showers (80/81), ordinary rain outfit | `rain-showers-day.webp` | `rain-showers-night.webp` |
| Heavy showers (82), or showers with heavier rain protection | `heavy-showers-day.webp` | `heavy-showers-night.webp` |
| Ordinary steady snow / snow grains (71/73/77), snow outfit | `steady-snow-day.webp` | `steady-snow-night.webp` |

Snow showers (85) retain the existing broken-cloud `snow.webp` and
`snow-night.webp` pair. Heavy snow (75/86 or an intensity upgrade) retains its
existing heavy-snow pair. Drizzle, steady rain, freezing rain, fog and storm
scenes keep their specialist artwork.

The Today adjustment preserves the source forecast's shower family when its
adjusted precipitation type still matches. Radar dryness, intensity and type
changes, and thunderstorm priority remain authoritative. The shared hourly and
five-day condition adjustment is unchanged.

The weather background can change without changing clothing, including during
warm-rain hysteresis and at sunset. Canonical Outfit Legend and gated forced-outfit
previews remain unchanged. Additional precipitation backgrounds preload only
with compatible outfit families and use the same shared-image deduplication.

The six approved WebPs are copied byte-for-byte from the private reviewed
sources. Ordinary night rain uses revision 3; day rain and night snow use
revision 2. Sources and prompts are archived in
`private/outfit-scenes-source/precipitation-20260912/` and
`private/outfit-scenes-source/heavy-showers-20260912/`.


## After-dark variants

For selected times after sunset, ten visually light daytime scenes have matching
after-dark background files named STATE-night.webp:

- hot sunny
- warm fair
- mild cloudy
- cool dry
- cold dry
- freezing dry
- fog
- windy
- snow
- heavy snow

The hot-weather scene also has hot-sunny-night.webp in the character folder so
Marc is not wearing sunglasses after sunset. Steady rain, drizzle, heavy steady
rain, and thunderstorm scenes deliberately reuse their existing darker backgrounds.
The shared shower and steady-snow pairs above have their own night versions.
Unspecified night assets always fall back to the normal scene asset.

The selected forecast time decides the variant. The Outfit Legend keeps the
canonical daytime artwork so it remains a compact overview of clothing states.

## File Roles

- `backgrounds/`: app-facing 1920x1200 WebP background layers
- `characters/`: app-facing transparent WebP character layers

Private source/reference material is kept outside the public app asset path in
`private/outfit-scenes-source/`, which is ignored by git and should not be
deployed.

## Generation Notes

The assets were generated with the built-in image generator.

Background prompts asked for wide, empty weather backgrounds with a low horizon,
generous sky area, no character, no text, and no foreground objects.

Character prompts asked for a consistent Marc-like full-body illustrated weather
person on a flat `#ff00ff` chroma-key background. The chroma key was removed
locally using border auto-key sampling, soft matte, and despill.

The app-facing character layers were converted from transparent PNG to WebP with
alpha using `cwebp -q 86 -alpha_q 95`.

After-dark backgrounds were created as lighting/weather edits of the matching
daytime source. They preserve the empty low-horizon composition, use a restrained
indigo palette, and keep snow and fog luminous enough for character contrast.

Warm rain variants reuse the existing drizzle/rain/heavy-rain background layers
and add separate warm-weather character layers so tropical rain does not suggest
heavy cool-weather rain gear.

For the first `drizzle`, `rain`, and `freezing-dry` character layers, a stricter
hard key pass was used instead of soft matte/despill because the softer pass
clipped warm skin tones. This preserves the character better at the cost of a
very thin magenta edge in close inspection.

## Current Caveats

- Character consistency is good enough for layout testing, but not final.
- The heavy-rain umbrella and windy scarf layers are the most important stress
  tests because they are wide and can collide with the weather card in short
  frames.
- Backgrounds currently include weather effects directly. A later version may
  move rain, snow, fog, and lightning to separate transparent overlay layers.
