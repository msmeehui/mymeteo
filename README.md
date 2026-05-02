# MyMeteo

A small personal weather dashboard with location search, current-location support, live weather, and moving rain radar. Current-location mode uses the browser geolocation permission prompt.

## Open

Open `index.html` in a browser, or serve the folder locally:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:4173/`.

## Data

- Forecast: Open-Meteo Forecast API
- Location autocomplete: Open-Meteo Geocoding API
- Smooth Netherlands radar animation: Buienradar public image animation, requested with 36 forecast steps
- Safari-compatible radar frame decoding: gifuct-js through esm.sh
- Fallback live and nowcast radar tiles: LibreWXR
- Map: OpenStreetMap tiles through Leaflet
