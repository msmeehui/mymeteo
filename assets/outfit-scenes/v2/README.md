# MyMeteo Outfit Scenes v2

This folder contains the layered outfit asset set used by the MyMeteo outfit
mode.

## Goal

Keep production outfit scenes split into:

- a wide weather background layer that can cover any radar-area aspect ratio
- a transparent character/outfit foreground layer anchored near the bottom center
- optional future weather-effect overlays, such as rain, snow, fog, lightning, or wind streaks

## States

The v2 set currently includes the full current fourteen-state outfit set:

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
| `rain` | `backgrounds/rain.webp` | `characters/rain.webp` |
| `heavy-rain` | `backgrounds/heavy-rain.webp` | `characters/heavy-rain.webp` |
| `thunderstorm` | `backgrounds/thunderstorm.webp` | `characters/thunderstorm.webp` |
| `snow` | `backgrounds/snow.webp` | `characters/snow.webp` |
| `heavy-snow` | `backgrounds/heavy-snow.webp` | `characters/heavy-snow.webp` |

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

For the `drizzle`, `rain`, and `freezing-dry` character layers, a stricter hard
key pass was used instead of soft matte/despill because the softer pass clipped
warm skin tones. This preserves the character better at the cost of a very thin
magenta edge in close inspection.

## Current Caveats

- Character consistency is good enough for layout testing, but not final.
- The heavy-rain umbrella and windy scarf layers are the most important stress
  tests because they are wide and can collide with the weather card in short
  frames.
- Backgrounds currently include weather effects directly. A later version may
  move rain, snow, fog, and lightning to separate transparent overlay layers.
