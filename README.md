# Solinteg Controller — example Home Assistant dashboard

An example Lovelace energy dashboard for the
[`solinteg-controller-oss`](https://github.com/hspolander/solinteg-controller-oss) add-on:
Nord Pool prices, bought/sold power + solar + battery SoC, the optimizer's plan vs. actual,
solar-forecast vs. actual, and measured irradiance (WS90/Ecowitt). Built with
[apexcharts-card](https://github.com/RomRider/apexcharts-card).

> These are **examples** — the entity IDs, roof parameters and coordinates are placeholders.
> Adapt them to your own installation.

## Files
- `tools/build-dashboard.mjs` — generates the Lovelace view config (all the chart definitions).
  Entity IDs live in the `E` map at the top — **edit those to match your own sensors.**
- `tools/ha-ws.mjs` — deploys a saved config to Home Assistant over the WebSocket API.
- `tools/forecast-solar-curve.mjs` — optional: pushes a full-day forecast.solar curve as
  `sensor.forecast_solar_curve` (a forward-looking line the dashboard can chart). Configure your
  array via `FS_*` env vars.
- `www/energi-villa-card.js` — a small custom Lovelace card used by the dashboard.

## Setup
Requires Node 20+ (uses the global `fetch` and `WebSocket`). Set two env vars:

```bash
export HA_URL="https://<id>.ui.nabu.casa"     # or http://homeassistant.local:8123
export HA_TOKEN="<long-lived access token>"   # HA → Profile → Security → Long-lived access tokens
```

Then edit the `E` entity map at the top of `tools/build-dashboard.mjs` to your own sensor IDs.

## Use
```bash
node tools/build-dashboard.mjs                    # writes dashboard/ config + tools/save-dashboard.json
node tools/ha-ws.mjs tools/save-dashboard.json    # deploys it to Home Assistant
```

Optional solar-forecast curve (set your roof via the FS_* vars):
```bash
FS_LAT=59.33 FS_LON=18.07 FS_DEC=30 FS_AZ=0 FS_KWP=10 node tools/forecast-solar-curve.mjs
```

## Notes
- Some inline comments are in Swedish (the dashboard's origin) — translate as needed.
- Nothing here writes to the inverter; it only reads HA state and deploys Lovelace config.
