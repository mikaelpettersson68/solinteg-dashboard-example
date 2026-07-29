// Hämtar forecast.solar:s TIMKURVA (W) direkt från publika API:t och pushar den som
// ett HA-tillstånd `sensor.forecast_solar_curve` med attributet `watts` = [[epoch_ms, W], …].
// Poäng: HA:s forecast_solar-integration exponerar bara skalärsensorer (ingen kurva) och
// dess "power_production_now" kan vara stale (free tier uppdaterar sällan). Den här kurvan
// kan apexcharts-kortets data_generator läsa och rita som en framåtblickande prognoslinje,
// på samma sätt som best_match-planen ritas framåt.
//
// Roof parameters come from env (set them to YOUR array — see the consts below).
// forecast.solar free-tier rate limit: 12 calls/hour per IP — run it a few times a day, no more.
// Skriver ALDRIG till optimeraren; enbart ett läs-API + ett HA-state-push.
//
// Körning:  node forecast-solar-curve.mjs            (pushar till HA)
//           node forecast-solar-curve.mjs --dry-run  (skriver bara ut, pushar inte)
// (no imports needed — uses global fetch)

// Set these to YOUR site/array via env (the defaults are placeholders, not a real installation):
const LAT = process.env.FS_LAT || '59.33';  // your latitude
const LON = process.env.FS_LON || '18.07';  // your longitude
const DEC = process.env.FS_DEC || '30';     // roof tilt (degrees)
const AZ  = process.env.FS_AZ  || '0';      // forecast.solar azimuth: 0=south, +90=west, −90=east
const KWP = process.env.FS_KWP || '10';     // installed DC peak power (kWp)
const HA  = process.env.HA_URL || 'http://homeassistant.local:8123';
const ENTITY = 'sensor.forecast_solar_curve';
const DRY = process.argv.includes('--dry-run');
// API:t ger timvärden (fri nivå) → för glesa prickar i grafen. Interpolera linjärt till
// finare upplösning: 20 min ≈ 3× tätare punkter. Sätt FS_STEP_MIN=0 för att stänga av.
const STEP_MIN = Number(process.env.FS_STEP_MIN ?? 20);

// Fyller ut en stigande [ms, W]-serie med linjärt interpolerade punkter var stepMin minut.
function densify(points, stepMin) {
  if (!(stepMin > 0) || points.length < 2) return points;
  const stepMs = stepMin * 60000;
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [t0, w0] = points[i];
    const [t1, w1] = points[i + 1];
    out.push([t0, w0]);
    for (let t = t0 + stepMs; t < t1 - 1000; t += stepMs) {
      const frac = (t - t0) / (t1 - t0);
      out.push([Math.round(t), Math.round(w0 + (w1 - w0) * frac)]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) { console.error('Set HA_TOKEN (a long-lived HA access token)'); process.exit(1); }

const API = `https://api.forecast.solar/estimate/${LAT}/${LON}/${DEC}/${AZ}/${KWP}`;

async function main() {
  const r = await fetch(API);
  if (!r.ok) throw new Error(`forecast.solar API → ${r.status} ${r.statusText}`);
  const body = await r.json();
  const watts = body?.result?.watts;
  if (!watts) throw new Error(`oväntat API-svar: ${JSON.stringify(body).slice(0, 300)}`);

  // {"2026-07-23 16:00:00": 4872, …} (lokal tid) → [[epoch_ms, W], …], stigande.
  // Tidsstämplarna saknar offset men är i anläggningens lokala tid; Date() på macOS/HA
  // are interpreted in the system's timezone, i.e. the installation's local time.
  const rawPoints = Object.entries(watts)
    .map(([t, w]) => [new Date(t.replace(' ', 'T')).getTime(), Math.round(w)])
    .filter(([ms, w]) => Number.isFinite(ms) && Number.isFinite(w))
    .sort((a, b) => a[0] - b[0]);
  const points = densify(rawPoints, STEP_MIN);

  const whDay = body.result.watt_hours_day || {};
  const dates = Object.keys(whDay).sort();
  const todayWh = whDay[dates[0]] ?? null;
  const peak = points.reduce((m, p) => (p[1] > m[1] ? p : m), [0, -1]);

  const attributes = {
    watts: points,                         // [[epoch_ms, W], …] idag + imorgon
    watt_hours_day: whDay,
    generated: new Date().toISOString(),
    source: 'api.forecast.solar',
    params: { lat: LAT, lon: LON, dec: DEC, az: AZ, kwp: KWP },
    unit_of_measurement: 'W',
    friendly_name: 'Forecast.Solar kurva',
    icon: 'mdi:sun-clock',
  };
  // state = dagens estimat i kWh (skalärt, för snabb avläsning); kurvan ligger i attributet.
  const state = todayWh != null ? (todayWh / 1000).toFixed(2) : 'unknown';

  console.log(`forecast.solar: ${points.length} punkter, topp ${peak[1]} W @ ${new Date(peak[0]).toLocaleString('sv-SE')}, dygn ${state} kWh`);

  if (DRY) { console.log('(--dry-run: pushar inte till HA)'); return; }

  const resp = await fetch(`${HA}/api/states/${ENTITY}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, attributes }),
  });
  if (!resp.ok) throw new Error(`HA POST ${ENTITY} → ${resp.status} ${await resp.text()}`);
  console.log(`✓ pushade ${ENTITY} (state=${state} kWh, ${points.length} kurvpunkter)`);
}

main().catch((e) => { console.error('FEL:', e.message); process.exit(1); });
