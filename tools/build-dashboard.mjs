// Bygger konfigen för dashboarden "Energi Förbrukning" (url_path energi-forbrukning)
// och skriver WS-kommandofilen som sparar den. Kör sedan: node ha-ws.mjs save-dashboard.json
// Vy 1 "Översikt" = Claude Design-korten (platta ≥768px / mobil <768px via condition: screen).
// Vy 2 "Detaljer" = tile-baserad layout, också responsiv.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const DESKTOP = [{ condition: 'screen', media_query: '(min-width: 768px)' }];
const MOBILE = [{ condition: 'screen', media_query: '(max-width: 767px)' }];

const E = {
  houseLoad: 'sensor.solinteg_inverter_solinteg_house_total_load',
  houseToday: 'sensor.solinteg_inverter_solinteg_house_energy_today',
  gridPower: 'sensor.solinteg_energy_dashboard_solinteg_grid_power',
  gridImportToday: 'sensor.solinteg_inverter_solinteg_grid_import_today',
  gridExportToday: 'sensor.solinteg_inverter_solinteg_grid_export_today',
  pvPower: 'sensor.solinteg_inverter_solinteg_pv_power_total',
  pvToday: 'sensor.solinteg_inverter_solinteg_energy_generation_today',
  battPower: 'sensor.solinteg_energy_dashboard_solinteg_battery_power', // + = laddar (inverter-varianten är inverterad)
  battSoc: 'sensor.solinteg_inverter_solinteg_battery_soc',
  evPower: 'sensor.lievagen_22_laddeffekt',
  evStatus: 'sensor.lievagen_22_laddstatus',
  evSession: 'sensor.lievagen_22_laddat_denna_sessionen',
  evTotal: 'sensor.lievagen_22_forbrukad_energi',
  poolPower: 'sensor.poolpump_effekt',
  poolEnergy: 'sensor.poolpump_energi',
  price: 'sensor.nord_pool_se3_aktuellt_pris',
  savings: 'sensor.battery_optimizer_light_plus_optimizer_light_daily_savings',
};

const tile = (entity, name, color, extra = {}) => ({ type: 'tile', entity, name, color, ...extra });
const heading = (h, icon) => ({ type: 'heading', heading: h, heading_style: 'title', ...(icon ? { icon } : {}) });

// Panel-vy: kortet får hela bredden. custom:energi-villa väljer själv platta/mobil-layout
// efter containerbredd (brytpunkt 700 px) och skalar plattdesignen (1280×800) till bredden.
const designView = {
  title: 'Översikt',
  path: 'oversikt',
  icon: 'mdi:home-analytics',
  panel: true,
  cards: [{ type: 'custom:energi-villa' }],
};

const detailView = {
  title: 'Detaljer',
  path: 'detaljer',
  icon: 'mdi:view-list',
  type: 'sections',
  max_columns: 3,
  sections: [
    {
      type: 'grid', visibility: DESKTOP,
      cards: [
        heading('Just nu', 'mdi:flash'),
        { type: 'gauge', name: 'Husets förbrukning', entity: E.houseLoad, unit: 'W', min: 0, max: 14000, needle: true, severity: { green: 0, yellow: 6000, red: 10000 } },
        tile(E.gridPower, 'Nät (minus = export)', 'blue'),
        tile(E.pvPower, 'Solproduktion', 'amber'),
        tile(E.battPower, 'Batterieffekt (+ = laddar)', 'green'),
        tile(E.poolPower, 'Poolpump', 'cyan'),
        tile(E.evPower, 'Elbil laddeffekt', 'purple'),
        tile(E.price, 'Elpris just nu', 'cyan'),
      ],
    },
    {
      type: 'grid', visibility: DESKTOP,
      cards: [
        heading('Idag', 'mdi:calendar-today'),
        tile(E.houseToday, 'Förbrukat', 'red'),
        tile(E.gridImportToday, 'Importerat', 'cyan'),
        tile(E.gridExportToday, 'Exporterat', 'blue'),
        tile(E.pvToday, 'Producerat', 'amber'),
        tile(E.evSession, 'Elbil (session)', 'purple'),
        tile(E.savings, 'Sparat idag', 'teal'),
      ],
    },
    {
      type: 'grid', visibility: DESKTOP,
      cards: [
        heading('Elbil', 'mdi:car-electric'),
        tile(E.evStatus, 'Laddstatus', 'purple'),
        tile(E.evPower, 'Laddeffekt', 'purple'),
        tile(E.evSession, 'Laddat denna session', 'purple'),
        tile(E.evTotal, 'Förbrukat totalt', 'purple'),
      ],
    },
    {
      type: 'grid', column_span: 2, visibility: DESKTOP,
      cards: [
        heading('Trend', 'mdi:chart-line'),
        {
          type: 'history-graph', hours_to_show: 24, title: 'Effekt (24 h)',
          entities: [
            { entity: E.houseLoad, name: 'Förbrukning' },
            { entity: E.pvPower, name: 'Sol' },
            { entity: E.gridPower, name: 'Nät' },
          ],
        },
        {
          type: 'statistics-graph', chart_type: 'bar', period: 'day', days_to_show: 7,
          stat_types: ['change'], title: 'Senaste 7 dagarna (kWh)',
          entities: [
            { entity: E.houseToday, name: 'Förbrukat' },
            { entity: E.gridImportToday, name: 'Importerat' },
            { entity: E.pvToday, name: 'Producerat' },
          ],
        },
      ],
    },
    {
      type: 'grid', visibility: MOBILE,
      cards: [
        heading('Just nu', 'mdi:flash'),
        tile(E.houseLoad, 'Förbrukning', 'red'),
        tile(E.price, 'Elpris', 'cyan'),
        tile(E.gridPower, 'Nät', 'blue'),
        tile(E.pvPower, 'Sol', 'amber'),
        tile(E.battSoc, 'Batteri', 'green'),
        tile(E.evPower, 'Elbil', 'purple'),
      ],
    },
    {
      type: 'grid', visibility: MOBILE,
      cards: [
        heading('Idag', 'mdi:calendar-today'),
        tile(E.houseToday, 'Förbrukat', 'red'),
        tile(E.gridImportToday, 'Importerat', 'cyan'),
        tile(E.gridExportToday, 'Exporterat', 'blue'),
      ],
    },
    {
      type: 'grid', visibility: MOBILE,
      cards: [
        heading('Trend', 'mdi:chart-line'),
        {
          type: 'history-graph', hours_to_show: 12, title: 'Effekt (12 h)',
          entities: [
            { entity: E.houseLoad, name: 'Förbrukning' },
            { entity: E.pvPower, name: 'Sol' },
          ],
        },
      ],
    },
    // Manuell override av växelriktaren (alla skärmstorlekar). Automationerna
    // vx_styrning_* mappar valet till working_mode + EMS-börvärde (neg=ladda,
    // pos=ladda ur, 0=håll) med auto-retur till Automatisk efter vx_timer_h.
    {
      type: 'grid',
      cards: [
        heading('Växelriktare – manuell styrning', 'mdi:tune-vertical'),
        {
          type: 'entities',
          entities: [
            { entity: 'input_select.vx_styrning', name: 'Läge' },
            { entity: 'input_number.vx_effekt_kw', name: 'Effekt (kW)' },
            { entity: 'input_select.vx_timer_h', name: 'Auto-retur efter (h)' },
            { entity: 'timer.vx_override', name: 'Tid kvar till Automatisk' },
            // EV-laddare ≠ Ingen aktiverar SoC-vakten (ev_soc_guard, alla lägen):
            // paus vid golv+5 %, prognos vid laddstart, auto-resume vid golv+10 %.
            { entity: 'input_select.ev_laddare', name: 'EV-laddare (SoC-vakt)' },
            // Laddmål: spegla Mercedes-appens inställning (API:t exponerar den ej).
            { entity: 'input_number.ev_laddmal_procent', name: 'Bilens laddmål (%)' },
            { entity: 'sensor.wcw36x_state_of_charge', name: 'Bilens batteri (live)' },
            { type: 'divider' },
            { entity: 'select.solinteg_inverter_working_mode', name: 'VX aktuellt läge' },
            {
              entity: 'number.solinteg_inverter_ems_battctrl_charge_discharge_power_target',
              name: 'Aktivt börvärde (+ = ladda ur)',
            },
          ],
        },
      ],
    },
  ],
};

// Nord Pool idag+imorgon: apexcharts hämtar timpriser via tjänsten get_prices_for_date
// (de officiella sensor-entiteterna saknar timpris-attribut). config_entry = live Nord Pool-entry.
const NORDPOOL_ENTRY = '01KQD9YYPHF5QJT9VYBN80F50X';
const priceGen = (dayOffset) => `const d = new Date();
d.setDate(d.getDate() + ${dayOffset});
const ds = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
return hass.callWS({
  type: "call_service", domain: "nordpool", service: "get_prices_for_date",
  service_data: { config_entry: "${NORDPOOL_ENTRY}", date: ds },
  return_response: true
}).then((r) => {
  const a = (r.response && r.response.SE3) || [];
  const pts = a.map((p) => [new Date(p.start).getTime(), p.price / 1000]);
  if (a.length) pts.push([new Date(a[a.length-1].end).getTime(), a[a.length-1].price / 1000]);
  return pts;
}).catch(() => []);`;
const priceSeries = (name, offset, color) => ({
  entity: E.price, name, type: 'area', curve: 'stepline', stroke_width: 2,
  color, opacity: 0.2, extend_to: false, show: { legend_value: false },
  float_precision: 2, // tooltip/legend-värden; default är 1 decimal
  data_generator: priceGen(offset),
});

const priceView = {
  title: 'Elpris',
  path: 'elpris',
  icon: 'mdi:cash-multiple',
  type: 'sections',
  max_columns: 3,
  sections: [
    {
      type: 'grid',
      cards: [
        heading('Elpris just nu', 'mdi:cash'),
        {
          type: 'custom:mushroom-template-card',
          primary: 'Elpris nu',
          secondary: "{{ states('" + E.price + "') | float(0) | round(2) }} SEK/kWh",
          icon: 'mdi:cash',
          icon_color: "{% set p = states('" + E.price + "') | float(0) %}{% if p < 0.5 %}green{% elif p < 1.5 %}orange{% else %}red{% endif %}",
          entity: E.price,
        },
        tile('sensor.nord_pool_se3_lagsta_pris', 'Lägsta idag', 'green'),
        tile('sensor.nord_pool_se3_hogsta_pris', 'Högsta idag', 'red'),
        tile('sensor.nord_pool_se3_nasta_pris', 'Nästa timme', 'blue'),
      ],
    },
    {
      type: 'grid', column_span: 3,
      cards: [
        heading('Idag & imorgon', 'mdi:chart-timeline-variant'),
        {
          type: 'custom:apexcharts-card',
          graph_span: '2d',
          span: { start: 'day' },
          now: { show: true, label: 'Nu' },
          header: { show: true, title: 'Spotpris idag & imorgon (SEK/kWh)', show_states: false },
          apex_config: {
            legend: { show: true },
            tooltip: { x: { format: 'ddd HH:mm' } },
            chart: {
              height: 380,
              // dra över ett tidsspann för att zooma; verktygsrad för zoom/panorering/återställ
              zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
              toolbar: {
                show: true,
                autoSelected: 'zoom',
                tools: { zoom: true, zoomin: true, zoomout: true, pan: true, reset: true, download: false },
              },
            },
          },
          yaxis: [{ decimals: 2 }],
          series: [
            priceSeries('Idag', 0, '#3b82f6'),
            priceSeries('Imorgon', 1, '#f59e0b'),
          ],
          grid_options: { columns: 'full', rows: 'auto' },
        },
      ],
    },
  ],
};

// Hemenergi (NATIV, ersatte iframe-varianten 2026-07-15): optimizer-datan
// kommer via add-on:ets MQTT-publisher (v0.3.0, sensor.solinteg_optimizer_*)
// och köp/sälj-kurvorna beräknas från Nord Pool-spot med användarens exakta
// E.ON-fält — allt server-side/HA-nativt → fungerar även via Nabu Casa
// (ingen mixed content). Planerad SoC-kurva saknas (exponeras ej via API —
// ev. framtida /api/plan-feature-request uppströms).
const OPT = {
  next: 'sensor.solinteg_optimizer_optimizer_nasta_atgard',
  recent: 'sensor.solinteg_optimizer_optimizer_senaste_beslut',
  buy: 'sensor.solinteg_optimizer_optimizer_koppris_nu',
  sell: 'sensor.solinteg_optimizer_optimizer_saljpris_nu',
  facit: 'sensor.solinteg_optimizer_optimizer_facit_regret', // faktisk regret (det som styr batteriet)
  shadow: 'sensor.solinteg_optimizer_optimizer_facit_regret_solinteg_plan', // Solinteg-planens shadow-regret
};

// Köp/sälj i öre/kWh från spot (SEK/MWh → /10). Samma formler som add-on:et:
// köp = (spot + påslag 10.32 exkl moms) × 1.25 + skatt&överföring 71.30 inkl
// moms; sälj = spot + 13.35 (E.ON-påslag 10 t.o.m. ~april 2027 + nätnytta 3.35).
// En serie per riktning som täcker BÅDA dygnen (idag + imorgon i ett svep) — en
// legendpost och en kontinuerlig kurva. Imorgon är tom tills Nord Pool släpper (~13:00).
const hemPriceGen = (kind) => `const fetchDay = (off) => {
  const d = new Date(); d.setDate(d.getDate() + off);
  const ds = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  return hass.callWS({
    type: "call_service", domain: "nordpool", service: "get_prices_for_date",
    service_data: { config_entry: "${NORDPOOL_ENTRY}", date: ds },
    return_response: true
  }).then((r) => (r.response && r.response.SE3) || []).catch(() => []);
};
const f = (spotOre) => ${kind === 'buy' ? '(spotOre + 10.32) * 1.25 + 71.30' : 'spotOre + 13.35'};
return Promise.all([fetchDay(0), fetchDay(1)]).then(([a, b]) => {
  const all = a.concat(b);
  const pts = all.map((p) => [new Date(p.start).getTime(), Math.round(f(p.price / 10) * 10) / 10]);
  if (all.length) pts.push([new Date(all[all.length-1].end).getTime(), Math.round(f(all[all.length-1].price / 10) * 10) / 10]);
  return pts;
});`;
const hemSeries = (name, kind, color) => ({
  entity: E.price, name, type: 'line', curve: 'stepline', stroke_width: 2, unit: ' öre/kWh',
  color, extend_to: false, float_precision: 1, yaxis_id: 'ore', show: { legend_value: false },
  data_generator: hemPriceGen(kind),
});

// Solintegs framtidsplan (streckade serier höger om "Nu"). Läser plan-sensorns attribut
// (slots [[epochSec, gridKw, socPct], …], publiceras var 5:e min av add-on v0.4.2+).
// Bara framtida slots ritas — historiedelen täcks av de uppmätta serierna. OBS shadow-läge:
// planen är Solintegs hypotes; batteriet styrs av BO, så plan-SoC ≠ uppmätt SoC.
const PLAN_SENSOR_IDS = [
  'sensor.solinteg_optimizer_optimizer_plan', // device-prefixat (som övriga solinteg_opt-sensorer)
  'sensor.solinteg_opt_plan', // fallback: object_id rakt av
];
const planGen = (pick) => `try {
  const st = ${JSON.stringify(PLAN_SENSOR_IDS)}.map((id) => hass.states[id]).find(Boolean);
  const slots = (st && st.attributes && st.attributes.slots) || [];
  const now = Date.now();
  return slots
    .filter((s) => s[0] * 1000 >= now)
    .map((s) => [s[0] * 1000, ${pick}])
    .filter((p) => Number.isFinite(p[1])); // tål äldre payloads utan alla element (t.ex. solarKw)
} catch (e) { return []; }`;
// Plan-serier ritas som PUNKTER (linje av via stroke_width 0; markers-storlek sätts per
// serieindex i apex_config.markers.size) — streckade linjer var för subtila.
const planSeries = (name, carrierEntity, yaxis, pick, color) => ({
  entity: carrierEntity, name, type: 'line', color, yaxis_id: yaxis,
  stroke_width: 0, curve: 'stepline', float_precision: 1, extend_to: false,
  unit: yaxis === 'soc' ? ' %' : ' kW',
  show: { legend_value: false, in_header: false },
  data_generator: planGen(pick),
});

// Solintegs FULLDAGS-solprognos (best_match) för prognos-vs-utfall-grafen. Läser sensorns
// 'forecast'-attribut (date → 96 kWh/slot) och ritar HELA dygnet (past+future) som linje —
// till skillnad från plan-sensorn som bara är framåt. epoch = lokal midnatt + i·15 min
// (hemdashboard = svensk tid); kWh/slot × 4 = kW. Behåller nollor så linjen är sammanhängande.
const SOLARFC_SENSOR_IDS = [
  'sensor.solinteg_optimizer_optimizer_solprognos_idag',
  'sensor.solinteg_opt_solar_forecast_today',
];
const solarFcGen = `try {
  const st = ${JSON.stringify(SOLARFC_SENSOR_IDS)}.map((id) => hass.states[id]).find(Boolean);
  const fc = st && st.attributes && st.attributes.forecast;
  if (!fc) return [];
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
  const arr = fc[today] || [];
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  return arr.map((v, i) => [d0.getTime() + i * 15 * 60000, v * 4]).filter((p) => Number.isFinite(p[1]));
} catch (e) { return []; }`;

// W/m² → kW för "Modell ur uppmätt GHI": samma linjära solmodell som ghiToKwh i add-on:ets
// constants.ts (Σ kWp × performanceRatio / 1000). SPEGLA constants.ts om kWp/PR ändras.
const GHI_TO_KW = (15 * 0.738) / 1000; // 15 kWp × PR 0.738 → 0.01107 kW per W/m²

// Faktiskt nätflöde (kW) på sekundär axel. grid_power: + = köpt, − = sålt (W).
// dir 'buy' → importdelen, 'sell' → exportdelen (som positivt tal). Bara historik →
// syns för dygnets gångna timmar; morgondagens del av grafen har bara prisprognosen.
const flowSeries = (name, dir, color) => ({
  entity: E.gridPower, name, type: 'area', color, yaxis_id: 'kw', unit: ' kW',
  stroke_width: 1, opacity: 0.15, float_precision: 2,
  // extend_to false: annars dras sista mätvärdet som rak linje in i "framtiden"
  // (apexcharts-card-default är 'end') — framtidssidan tillhör plan-serierna.
  extend_to: false,
  group_by: { func: 'avg', duration: '15min' },
  transform: dir === 'buy' ? 'return x > 0 ? x / 1000 : 0;' : 'return x < 0 ? -x / 1000 : 0;',
  show: { legend_value: false },
});

const hemenergiView = {
  title: 'Hemenergi',
  path: 'hemenergi',
  icon: 'mdi:home-lightning-bolt',
  type: 'sections',
  max_columns: 3,
  sections: [
    {
      type: 'grid',
      cards: [
        heading('Optimizer', 'mdi:robot'),
        {
          type: 'markdown',
          content:
            "**{{ states('" + OPT.next + "') }}**\n\n" +
            "Köp just nu **{{ states('" + OPT.buy + "') }} öre/kWh** · " +
            "Sälj **{{ states('" + OPT.sell + "') }} öre/kWh**\n\n" +
            "*Shadow-läge — beräknar men styr inte. Batteriet styrs av Battery Optimizer.*",
        },
        tile(OPT.recent, 'Senaste beslut', 'blue'),
        {
          type: 'markdown',
          title: 'Senaste besluten',
          content:
            "{% set ds = state_attr('" + OPT.recent + "', 'decisions') or [] %}" +
            '{% for d in ds[-8:] | reverse %}' +
            '- **{{ d.time }}** · {{ d.action }}{% if d.powerKw %} {{ d.powerKw | round(1) }} kW{% endif %} ({{ d.outcome }})\n' +
            '{% endfor %}{% if not ds %}*Inga beslut loggade ännu.*{% endif %}',
        },
      ],
    },
    {
      type: 'grid',
      cards: [
        heading('Just nu', 'mdi:flash'),
        tile(E.pvPower, 'Sol', 'amber'),
        tile(E.houseLoad, 'Förbrukning', 'red'),
        tile(E.battPower, 'Batterieffekt (− = laddar)', 'green'),
        tile(E.battSoc, 'Batteri SoC', 'green'),
        tile(E.gridPower, 'Nät (− = export)', 'blue'),
      ],
    },
    {
      // Oberoende solprognos (HA:s inbyggda Forecast.Solar-integration) som "andra åsikt"
      // mot Solintegs egen (Open-Meteo/MET Norge). Uppdateras dagligen av integrationen.
      // Stor skillnad i "Imorgon" = osäkert soldygn — värt att titta närmare på.
      type: 'grid',
      cards: [
        heading('Solprognos – andra åsikt (forecast.solar)', 'mdi:weather-sunny-alert'),
        tile('sensor.energy_production_tomorrow', 'Imorgon', 'amber'),
        tile('sensor.energy_production_today', 'Idag (prognos)', 'amber'),
        tile('sensor.energy_production_today_remaining', 'Kvar idag', 'amber'),
        {
          type: 'markdown',
          content:
            'forecast.solar räknar oberoende av Solintegs MET Norge-prognos. Jämför **Imorgon** ' +
            'med Solintegs egen solprognos (gula punkter i grafen nedan) — stor skillnad = ' +
            'osäkert soldygn, och facit natten efter avgör vem som låg rätt.',
        },
      ],
    },
    {
      type: 'grid',
      cards: [
        heading('Facit (oracle)', 'mdi:target'),
        // Två sensorer: faktisk regret (det som FAKTISKT styr batteriet = den befintliga
        // optimeraren i shadow-läge) och Solinteg-planens shadow-regret (vad add-on:ets
        // egen, icke-exekverade plan HADE gett mot facit). Lägre = närmare perfekt →
        // beslutsunderlag för om man vågar arma Solinteg-optimeraren.
        tile(OPT.facit, 'Regret: faktisk (befintlig)', 'teal'),
        tile(OPT.shadow, 'Regret: Solinteg-plan (shadow)', 'orange'),
        {
          type: 'markdown',
          content:
            "{% set L = state_attr('" + OPT.facit + "', 'latest') %}" +
            '{% if L %}' +
            'Senaste facit **{{ L.date }}** — utfall **{{ L.achievedTotalKr | round(2) }} kr** ' +
            'vs perfekt **{{ L.oracleTotalKr | round(2) }} kr**.\n\n' +
            '| Dag | Faktisk | Solinteg-plan |\n|---|--:|--:|\n' +
            "{% set ds = state_attr('" + OPT.facit + "', 'days') or [] %}" +
            '{% for d in ds[-7:] | reverse %}' +
            '| {{ d.date }} | {{ d.regretKr | round(2) }} kr | ' +
            '{% if d.shadowDayAheadRegretKr is not none %}{{ d.shadowDayAheadRegretKr | round(2) }} kr{% else %}—{% endif %} |\n' +
            '{% endfor %}\n' +
            '*Regret = kr kvar mot perfekt facit (lägre = bättre). Solinteg-plan = add-on:ets ' +
            'egen, icke-exekverade plan i shadow-läge.*' +
            '{% else %}*Inget facit ännu — dag D poängsätts först när hela D+1 passerat ' +
            '(facit släpar två nätter).*{% endif %}',
        },
      ],
    },
    {
      type: 'grid', column_span: 3,
      cards: [
        heading('Köp & sälj + faktiskt nätflöde idag & imorgon', 'mdi:chart-timeline-variant'),
        {
          type: 'custom:apexcharts-card',
          graph_span: '2d',
          span: { start: 'day' },
          now: { show: true, label: 'Nu' },
          header: { show: true, title: 'Pris (öre/kWh) · köpt/såld & sol (kW) · SoC (%) · plan = punkter', show_states: false },
          apex_config: {
            legend: { show: true },
            tooltip: { x: { format: 'ddd HH:mm' } },
            // markers.size per serieindex: 0 = ingen punkt (linjer/ytor), 2 = punkter (plan).
            // MÅSTE matcha series-ordningen nedan (2 pris + 3 flöde/sol + 1 SoC + 4 plan).
            markers: { size: [0, 0, 0, 0, 0, 0, 2, 2, 2, 2], strokeWidth: 0 },
            chart: { height: 340, zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
              toolbar: { show: true, autoSelected: 'zoom', tools: { zoom: true, zoomin: true, zoomout: true, pan: true, reset: true, download: false } } },
          },
          // Dubbla axlar: pris i öre/kWh (vänster), faktiskt nätflöde i kW (höger).
          yaxis: [
            { id: 'ore', decimals: 0, apex_config: { title: { text: 'öre/kWh' } } },
            { id: 'kw', opposite: true, min: 0, decimals: 1, apex_config: { title: { text: 'kW' }, forceNiceScale: true } },
            // SoC 0–100 %: egen axel, dold för att inte tränga grafen — värdet syns i tooltip.
            { id: 'soc', min: 0, max: 100, decimals: 0, apex_config: { show: false } },
          ],
          series: [
            hemSeries('Köp', 'buy', '#16a34a'),
            hemSeries('Sälj', 'sell', '#3b82f6'),
            flowSeries('Köpt (kW)', 'buy', '#ef4444'),
            flowSeries('Såld (kW)', 'sell', '#14b8a6'),
            // Solproduktion (kW) på samma kW-axel, som linje ovanpå flödesytorna. Alltid ≥ 0.
            {
              entity: E.pvPower, name: 'Sol (kW)', type: 'line', color: '#f59e0b', yaxis_id: 'kw', unit: ' kW',
              stroke_width: 2, curve: 'smooth', float_precision: 2, extend_to: false,
              group_by: { func: 'avg', duration: '15min' },
              transform: 'return x / 1000;',
              show: { legend_value: false },
            },
            // Batteriets SoC (%) på egen dold 0–100-axel, lila linje. Redan i %, ingen transform.
            // group_by 'last' (inte 'avg'): SoC är ett TILLSTÅND — medel över pågående bucket
            // visar fel nivå vid snabba förändringar (t.ex. 89→100 % gav "91 %" i grafen).
            {
              entity: E.battSoc, name: 'SoC (%)', type: 'line', color: '#a855f7', yaxis_id: 'soc', unit: ' %',
              stroke_width: 2, curve: 'smooth', float_precision: 0, extend_to: false,
              group_by: { func: 'last', duration: '15min' },
              show: { legend_value: false },
            },
            // Solintegs plan (streckade via stroke.dashArray ovan) — bara framtida slots.
            planSeries('Plan: köp (kW)', E.gridPower, 'kw', 'Math.max(s[1], 0)', '#ef4444'),
            planSeries('Plan: sälj (kW)', E.gridPower, 'kw', 'Math.max(-s[1], 0)', '#14b8a6'),
            planSeries('Plan: SoC (%)', E.battSoc, 'soc', 's[2]', '#a855f7'),
            // Solprognosen planen räknades mot (4:e slot-elementet, add-on v0.4.3+).
            planSeries('Plan: sol (kW)', E.pvPower, 'kw', 's[3]', '#f59e0b'),
          ],
          grid_options: { columns: 'full', rows: 'auto' },
        },
      ],
    },
    {
      type: 'grid', column_span: 3,
      cards: [
        heading('Batteri senaste dygnet', 'mdi:battery-charging'),
        {
          type: 'history-graph', hours_to_show: 24, title: 'SoC & effekt (24 h)',
          entities: [
            { entity: E.battSoc, name: 'SoC' },
            { entity: E.battPower, name: 'Batterieffekt' },
          ],
        },
      ],
    },
    {
      // Dedikerad prognos-vs-utfall för solen. Uppmätt PV = inspelad historik (gången tid).
      // forecast.solar ritas som en FRAMÅTBLICKANDE heldygnskurva (sensor.forecast_solar_curve,
      // pushad från API:t av tools/forecast-solar-curve.mjs) och Solintegs best_match ligger som
      // punkter framåt — så båda prognoserna kan jämföras mot varandra och mot utfallet i samma graf.
      type: 'grid', column_span: 3,
      cards: [
        heading('Solprognos vs utfall (idag)', 'mdi:weather-partly-cloudy'),
        {
          type: 'custom:apexcharts-card',
          graph_span: '1d',
          span: { start: 'day' },
          now: { show: true, label: 'Nu' },
          header: { show: true, title: 'Sol: prognos & modell-ur-uppmätt-GHI mot faktisk produktion (kW)', show_states: false },
          apex_config: {
            legend: { show: true },
            tooltip: { x: { format: 'HH:mm' } },
            // Serier: [0] Uppmätt=yta, [1] forecast.solar=prickar (stroke 0), [2] Solinteg=linje
            // (fulldag via solarFcGen), [3] modell-ur-uppmätt-GHI=linje (gångna timmar). Bara
            // forecast.solar ritas som prickar → markers [0,2,0,0].
            markers: { size: [0, 2, 0, 0], strokeWidth: 0 },
            chart: { height: 320, zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
              toolbar: { show: true, autoSelected: 'zoom', tools: { zoom: true, zoomin: true, zoomout: true, pan: true, reset: true, download: false } } },
          },
          yaxis: [{ min: 0, decimals: 1, apex_config: { title: { text: 'kW' } } }],
          series: [
            {
              entity: E.pvPower, name: 'Uppmätt', type: 'area', color: '#f59e0b', unit: ' kW',
              opacity: 0.15, stroke_width: 2, extend_to: false, float_precision: 2,
              group_by: { func: 'avg', duration: '15min' }, transform: 'return x / 1000;',
              show: { legend_value: true },
            },
            {
              // Framåtblickande forecast.solar-prognos (hela dygnet) ur sensor.forecast_solar_curve,
              // som tools/forecast-solar-curve.mjs pushar från forecast.solar:s publika API. Ersätter
              // gamla power_production_now-serien (bara "nu", ofta stale på free tier). Ritas som
              // PUNKTER (stroke_width 0 + markers.size[1] ovan) likt best_match — prognoser = prickar.
              entity: 'sensor.forecast_solar_curve', name: 'Prognos: forecast.solar', type: 'line', color: '#3b82f6', unit: ' kW',
              stroke_width: 0, extend_to: false, float_precision: 2,
              show: { legend_value: false }, // hela-dygns-kurva → legend visar bara sista punkten (natt ≈ 0), missvisande
              data_generator: `
                try {
                  const st = hass.states['sensor.forecast_solar_curve'];
                  const pts = (st && st.attributes && st.attributes.watts) || [];
                  return pts.map((p) => [p[0], p[1] / 1000]);
                } catch (e) { return []; }
              `,
            },
            {
              entity: E.pvPower, name: 'Prognos: Solinteg (best_match)', type: 'line', color: '#ef4444', unit: ' kW',
              stroke_width: 2, float_precision: 2, extend_to: false,
              show: { legend_value: false }, // hela-dygns-kurva → legend-siffran vore sista punkten (natt ≈ 0)
              data_generator: solarFcGen,
            },
            {
              // Modell ur UPPMÄTT solinstrålning — läser HA:s Ecowitt-integration DIREKT
              // (sensor.ws3900a_solar_radiation: native, loggad, realtid — inget add-on-släp).
              // W/m² × GHI_TO_KW = "vad modellen SKULLE gett med faktisk himmel". Gap mot
              // Solinteg-prognosen = vädermodellfel; gap mot Uppmätt = PV-modellfel.
              entity: 'sensor.ws3900a_solar_radiation', name: 'Modell ur uppmätt GHI', type: 'line', color: '#a855f7', unit: ' kW',
              stroke_width: 2, extend_to: false, float_precision: 2,
              group_by: { func: 'avg', duration: '15min' },
              transform: `return x * ${GHI_TO_KW};`,
              show: { legend_value: true },
            },
          ],
          grid_options: { columns: 'full', rows: 'auto' },
        },
      ],
    },
  ],
};

const config = { views: [designView, detailView, priceView, hemenergiView] };

writeFileSync(join(here, '..', 'dashboard', 'energi-forbrukning.config.json'), JSON.stringify(config, null, 2));
writeFileSync(join(here, 'save-dashboard.json'), JSON.stringify([
  { type: 'lovelace/config/save', url_path: 'energi-forbrukning', config },
  { type: 'lovelace/config', url_path: 'energi-forbrukning' },
], null, 2));
console.log('skrev dashboard/energi-forbrukning.config.json + tools/save-dashboard.json');
