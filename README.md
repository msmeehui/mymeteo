# Amsterdam Weather

A small personal weather dashboard for Amsterdam.

## Open

Open `index.html` in a browser, or serve the folder locally:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:4173/`.

## Data

- Forecast and 15-minute rain outlook: Open-Meteo Forecast API
- Live radar tiles: RainViewer Weather Maps API
- Map: OpenStreetMap tiles through Leaflet
