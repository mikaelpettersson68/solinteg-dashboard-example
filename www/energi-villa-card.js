/* Energi Villa Card — återskapar Claude Design "Energidashboard villa"
 * Två kort: <energi-villa-platta> (väggplatta/desktop) och <energi-villa-mobil> (telefon).
 * Design handoff: claude-design/design_handoff_energidashboard/ (i repot)
 * Deployad som Lovelace-resurs (data:-URL, base64) via WebSocket-API — se tools/deploy-card.mjs
 */

const DEFAULTS = {
  solar: 'sensor.solinteg_inverter_solinteg_pv_power_total',
  house: 'sensor.solinteg_inverter_solinteg_house_total_load',
  grid: 'sensor.solinteg_energy_dashboard_solinteg_grid_power',
  // OBS teckenkonvention (verifierad mot SoC-historik 2026-07-13): sensorn har − = laddar, + = urladdar.
  // battery_invert: true normaliserar till intern konvention + = laddar. Sensorn har BYTT tecken förr
  // (2026-07-10 var ED-varianten spegelvänd mot inverter-varianten; 2026-07-12 identiska) — vid nytt
  // teckenfel: sätt battery_invert: false i kortkonfig i stället för att ändra kod.
  battery: 'sensor.solinteg_energy_dashboard_solinteg_battery_power',
  battery_invert: true,
  battery_soc: 'sensor.solinteg_inverter_solinteg_battery_soc',
  ev: 'sensor.lievagen_22_laddeffekt',
  ev_status: 'sensor.lievagen_22_laddstatus',
  ev_authorize: 'button.lievagen_22_auktorisera_laddning', // trycks vid tap på elbilskortet (mobil)
  pool: 'sensor.poolpump_effekt',
  pool_switch: 'switch.poolpump',
  pool_heater: 'switch.pool_varmare',
  opt_action: 'sensor.battery_optimizer_light_plus_optimizer_light_action',
  opt_reason: 'sensor.battery_optimizer_light_plus_optimizer_light_reason',
  opt_next: 'sensor.optimizer_light_next_action',
  opt_next_time: 'sensor.optimizer_light_next_action_time',
  title: 'Lievägen 22',
};

// Batterioptimerarens åtgärder → svenska + accentfärg
const OPT_ACTION = {
  IDLE: ['Vilar', '#9aa4ad'],
  HOLD: ['Håller', '#5b9dff'],
  CHARGE: ['Laddar', '#46d98a'],
  DISCHARGE: ['Urladdar', '#ff8a5c'],
  CHARGE_SOLAR: ['Laddar sol', '#f4b740'],
  SELL: ['Säljer', '#f4b740'],
  BUY: ['Köper', '#34d3e0'],
};
const optSv = (a) => (OPT_ACTION[a] || [a || '–', '#9aa4ad']);

// Zaptec-integrationens verkliga laddstatusar (verifierade i live-data 2026-07-10)
const EV_STATUS = {
  disconnected: 'Frånkopplad',
  connected_waiting: 'Väntar',
  connected_requesting: 'Begär laddning',
  connected_charging: 'Laddar bilen',
  connected_finished: 'Laddning klar',
  // äldre/alternativa koder
  connected: 'Ansluten',
  waiting: 'Väntar',
  charging: 'Laddar bilen',
  charge_done: 'Laddning klar',
  paused: 'Pausad',
  unknown: '–',
};

(function loadFonts() {
  if (document.getElementById('energi-villa-fonts')) return;
  const l = document.createElement('link');
  l.id = 'energi-villa-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap';
  document.head.appendChild(l);
})();

const kw = (w) => (Math.abs(w) / 1000).toFixed(1);
const num = (hass, id) => {
  const s = hass.states[id];
  const v = s ? parseFloat(s.state) : NaN;
  return isNaN(v) ? 0 : v;
};
const str = (hass, id) => (hass.states[id] ? hass.states[id].state : '');

const ICONS = {
  sun: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#f4b740" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  house: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5b9dff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
  battery: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ff8a5c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2"/><path d="M7 11v2M11 11v2"/></svg>',
  pool: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#34d3e0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"/><path d="M2 17c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"/><path d="M2 7c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"/></svg>',
  ev: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#46d98a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z"/></svg>',
};

const SHARED_CSS = `
  @keyframes ha-shimmer { 0%,100% { opacity: .35; } 50% { opacity: .7; } }
  @keyframes ha-ripple { 0% { transform: scale(1); opacity: .5; } 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes ha-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(70,217,138,.45); } 50% { box-shadow: 0 0 0 10px rgba(70,217,138,0); } }
  @keyframes ha-spin { to { transform: rotate(360deg); } }
  .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
  .root { font-family: 'Manrope', system-ui, sans-serif; -webkit-font-smoothing: antialiased; color: #e8edf2; }
`;

// Tomtplanen (delas av platta [full] och mobil [mini]) — positioner ur designen
function sitePlanHtml(mini) {
  const chipCss = 'position:absolute; transform:translateX(-50%); display:flex; align-items:center; gap:11px; padding:9px 15px 9px 11px; background:rgba(10,14,19,.82); backdrop-filter:blur(8px); border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.5);';
  const tile = (c) => `width:34px; height:34px; border-radius:10px; background:${c}; display:flex; align-items:center; justify-content:center; flex-shrink:0;`;
  // icon-tile bakgrunder (14% alpha av accent)
  const tileBg = { sun: 'rgba(244,183,64,.14)', house: 'rgba(91,157,255,.14)', battery: 'rgba(255,138,92,.14)', pool: 'rgba(52,211,224,.14)', ev: 'rgba(70,217,138,.14)' };
  const chipFull = (left, top, key, border, icon, label, valueId, valueColor, mutedColor, chipId) =>
    `<div ${chipId ? `id="${chipId}"` : ''} style="${chipCss} left:${left}; top:${top}; border:1px solid ${border};${chipId ? ' cursor:pointer; -webkit-tap-highlight-color:transparent;' : ''}">
      <div style="${tile(tileBg[key])}">${icon}</div>
      <div style="display:flex; flex-direction:column; gap:1px;">
        <div style="font-size:11px; color:#9aa4ad; font-weight:600;">${label}</div>
        <div class="mono" style="font-size:17px; font-weight:700; color:${valueColor}; line-height:1;"><span id="${valueId}">–</span> <span style="font-size:11px; color:${mutedColor};">kW</span></div>
      </div>
    </div>`;

  const panels = Array.from({ length: 18 }, (_, i) =>
    `<div style="background:linear-gradient(135deg,#1b3a5c,#14263d); border:1px solid rgba(120,180,255,.18); border-radius:3px; position:relative; overflow:hidden;">
      <div style="position:absolute; inset:0; background:linear-gradient(135deg, rgba(244,183,64,.5), transparent 60%); animation:ha-shimmer 3.5s ease-in-out infinite; animation-delay:${(i * 0.4) % 3.5}s;"></div>
    </div>`).join('');

  const labels = mini ? '' : `
    ${chipFull('44%', '3%', 'sun', 'rgba(244,183,64,.35)', ICONS.sun, 'Solceller', 'v-solar', '#f4b740', '#b48a34')}
    ${chipFull('56%', '52%', 'house', 'rgba(91,157,255,.35)', ICONS.house, 'Villan', 'v-house', '#5b9dff', '#4a6f9e')}
    ${chipFull('20%', '86%', 'battery', 'rgba(255,138,92,.35)', ICONS.battery, '<span id="l-batt">Batteri</span>', 'v-batt', '#ff8a5c', '#a86a4c')}
    ${chipFull('15%', '14%', 'pool', 'rgba(52,211,224,.35)', ICONS.pool, 'Pool', 'v-pool', '#34d3e0', '#4a939b')}
    ${chipFull('70%', '80%', 'ev', 'rgba(70,217,138,.35)', ICONS.ev, '<span id="l-ev">Elbilsladdare</span>', 'v-ev', '#46d98a', '#3d9464', 'z-ev-chip')}`;

  // prick + litet kW-värde under (mv-* uppdateras i _update; pointer-events:none så taps går till ev. tapyta bakom)
  const miniDot = (left, top, color, valueId) => `
    <div style="position:absolute; left:${left}; top:${top}; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:3px; pointer-events:none;">
      <div style="width:9px; height:9px; border-radius:50%; background:${color}; box-shadow:0 0 9px ${color};"></div>
      <div class="mono" style="font-size:9px; font-weight:700; color:${color}; line-height:1; background:rgba(10,14,19,.75); padding:2px 4px; border-radius:5px; white-space:nowrap;"><span id="${valueId}">–</span> kW</div>
    </div>`;
  const miniDots = mini ? `
    ${miniDot('45%', '16%', '#f4b740', 'mv-solar')}
    ${miniDot('55%', '54%', '#5b9dff', 'mv-house')}
    ${miniDot('32%', '78%', '#ff8a5c', 'mv-batt')}
    ${miniDot('14%', '48%', '#34d3e0', 'mv-pool')}
    <div id="z-ev-dot" style="position:absolute; left:71%; top:58%; width:16%; height:30%; cursor:pointer; -webkit-tap-highlight-color:transparent;">
      ${miniDot('30%', '40%', '#46d98a', 'mv-ev')}
    </div>` : '';

  const fs = mini ? 8 : 11; // etikettstorlek i planen

  return `
    <div style="position:absolute; inset:0; background-image: radial-gradient(circle at 20% 30%, rgba(52,120,74,.12), transparent 40%), radial-gradient(circle at 80% 70%, rgba(52,120,74,.10), transparent 45%); pointer-events:none;"></div>
    <div style="position:absolute; left:78%; top:62%; width:15%; height:40%; background:repeating-linear-gradient(90deg,#1c232b,#1c232b 26px,#171d24 26px,#171d24 28px); border-radius:4px 4px 0 0; box-shadow:inset 0 0 30px rgba(0,0,0,.4);"></div>
    <div style="position:absolute; left:75%; top:30%; width:20%; height:33%; background:linear-gradient(150deg,#232c36,#1a222b); border:1px solid rgba(255,255,255,.07); border-radius:8px; box-shadow:inset 0 2px 0 rgba(255,255,255,.04), 0 16px 30px rgba(0,0,0,.4);">
      <div style="position:absolute; bottom:8px; left:12%; right:12%; height:34%; background:repeating-linear-gradient(90deg,#2c3742,#2c3742 8px,#232c36 8px,#232c36 10px); border-radius:3px; border:1px solid rgba(255,255,255,.05);"></div>
      ${mini ? '' : `<div style="position:absolute; top:9px; right:12px; font-size:${fs}px; color:#5a6570; font-weight:700; letter-spacing:.08em; text-transform:uppercase;">Garage</div>`}
    </div>
    <div style="position:absolute; left:38%; top:9%; width:24%; height:77%; border:1px solid rgba(255,255,255,.08); border-radius:8px; box-shadow:inset 0 2px 0 rgba(255,255,255,.05), 0 22px 44px rgba(0,0,0,.45); overflow:hidden;">
      <div style="position:absolute; inset:0; background:linear-gradient(90deg,#2a3d32 0%,#35493c 47%,#46514a 53%,#3a443d 100%);"></div>
      <div style="position:absolute; left:50%; right:0; top:0; bottom:0; background:repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0 13px, rgba(255,255,255,.05) 13px 15px);"></div>
      <div style="position:absolute; inset:0; box-shadow:inset 0 12px 22px rgba(0,0,0,.3), inset 0 -12px 22px rgba(0,0,0,.3);"></div>
      <div style="position:absolute; left:50%; top:0; bottom:0; width:3px; transform:translateX(-1.5px); background:linear-gradient(to bottom, rgba(255,255,255,.22), rgba(255,255,255,.08)); box-shadow:0 0 10px rgba(0,0,0,.5);"></div>
      <div style="position:absolute; left:${mini ? 4 : 12}px; top:${mini ? 5 : 14}px; bottom:${mini ? 5 : 14}px; width:calc(50% - ${mini ? 7 : 20}px); display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(6,1fr); gap:${mini ? 2 : 5}px;">${panels}</div>
      ${mini ? '' : `<div style="position:absolute; bottom:10px; right:12px; font-size:${fs}px; color:rgba(255,255,255,.5); font-weight:700; letter-spacing:.08em; text-transform:uppercase; z-index:2;">Villa</div>`}
    </div>
    <div style="position:absolute; left:5%; top:26%; width:18%; height:46%; background:linear-gradient(160deg,#123f4a,#0d2f39); border:1px solid rgba(52,211,224,.25); border-radius:12px; overflow:hidden; box-shadow:inset 0 0 40px rgba(52,211,224,.15), 0 16px 30px rgba(0,0,0,.4);">
      <div style="position:absolute; inset:6px; background:repeating-linear-gradient(120deg, rgba(52,211,224,.10), rgba(52,211,224,.10) 3px, transparent 3px, transparent 12px); border-radius:8px;"></div>
      <div style="position:absolute; left:50%; top:50%; width:${mini ? 16 : 40}px; height:${mini ? 16 : 40}px; margin:-${mini ? 8 : 20}px 0 0 -${mini ? 8 : 20}px; border:2px solid rgba(52,211,224,.5); border-radius:50%; animation:ha-ripple 3s ease-out infinite;"></div>
      ${mini ? '' : `<div style="position:absolute; bottom:9px; left:0; right:0; text-align:center; font-size:${fs}px; color:rgba(52,211,224,.7); font-weight:700; letter-spacing:.08em; text-transform:uppercase;">Pool</div>`}
    </div>
    <div style="position:absolute; left:29%; top:72%; width:7%; height:12%; background:linear-gradient(150deg,#2e2620,#241d18); border:1px solid rgba(255,138,92,.25); border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 20px rgba(0,0,0,.4); gap:${mini ? 1 : 3}px; padding:0 ${mini ? 3 : 10}px; box-sizing:border-box;">
      <div style="flex:1; height:55%; background:rgba(255,138,92,.55); border-radius:2px;"></div>
      <div style="flex:1; height:55%; background:rgba(255,138,92,.4); border-radius:2px;"></div>
      <div style="flex:1; height:55%; background:rgba(255,138,92,.18); border-radius:2px;"></div>
    </div>
    <div id="z-ev-post" style="position:absolute; left:72.5%; top:66%; width:3.2%; height:12%; background:linear-gradient(150deg,#1c3325,#14251b); border:1px solid rgba(70,217,138,.35); border-radius:5px; animation:ha-pulse 2s ease-in-out infinite; cursor:pointer; -webkit-tap-highlight-color:transparent;"></div>
    ${labels}
    ${miniDots}`;
}

class EnergiVillaBase extends HTMLElement {
  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    this._built = false;
  }
  getCardSize() { return 8; }
  set hass(hass) {
    this._hass = hass;
    if (!this._built) { this._build(); this._built = true; }
    this._update();
  }
  $(id) { return this.shadowRoot.getElementById(id); }
  _set(id, text) { const el = this.$(id); if (el && el.textContent !== text) el.textContent = text; }

  _values() {
    const h = this._hass, c = this._config;
    const solar = num(h, c.solar), house = num(h, c.house), grid = num(h, c.grid);
    const battRaw = num(h, c.battery);
    // normalisera till intern konvention + = laddar (sensorn har − = laddar när battery_invert: true)
    const batt = c.battery_invert === false ? battRaw : -battRaw;
    const soc = num(h, c.battery_soc);
    const ev = num(h, c.ev), pool = num(h, c.pool);
    const evStatus = EV_STATUS[str(h, c.ev_status)] || str(h, c.ev_status) || '–';
    const poolOn = str(h, c.pool_switch) === 'on', heatOn = str(h, c.pool_heater) === 'on';
    return { solar, house, grid, batt, soc, ev, pool, evStatus, poolOn, heatOn };
  }

  _update() {
    const v = this._values();
    this._set('v-total', kw(v.house));
    this._set('v-solar-top', kw(v.solar));
    // Nät: positivt = export hos solinteg energy-dashboard-sensorn? Nej: negativt = export (import positivt).
    const importing = v.grid > 0;
    this._set('v-grid', kw(v.grid));
    const gl = this.$('l-grid'); if (gl) gl.textContent = importing ? 'Från nätet' : 'Till nätet';
    const gv = this.$('v-grid'); const gc = importing ? '#ff8080' : '#46d98a';
    if (gv && gv.parentElement) gv.parentElement.style.color = gc;
    const gbox = this.$('b-grid');
    if (gbox) {
      gbox.style.background = importing ? 'rgba(255,107,107,.07)' : 'rgba(70,217,138,.07)';
      gbox.style.border = `1px solid ${importing ? 'rgba(255,107,107,.16)' : 'rgba(70,217,138,.16)'}`;
      const lbl = this.$('l-grid'); if (lbl) lbl.style.color = importing ? '#c26b6b' : '#3d9464';
    }
    this._set('v-house', kw(v.house));
    this._set('v-pool', kw(v.pool));
    this._set('v-ev', kw(v.ev));
    this._set('v-batt', kw(v.batt));
    const battIdle = Math.abs(v.batt) < 50; // under 50 W ≈ vilande (mätbrus)
    const bl = this.$('l-batt');
    if (bl) bl.textContent = `Batteri · ${Math.round(v.soc)}% · ${battIdle ? 'vilar' : v.batt >= 0 ? 'laddar' : 'urladdar'}`;
    const sv = this.$('v-solar'); if (sv) sv.textContent = kw(v.solar);
    if (['charging', 'connected_charging'].includes(str(this._hass, this._config.ev_status))) this._evPendingUntil = 0;
    const evPending = this._evPendingUntil && Date.now() < this._evPendingUntil;
    const evShown = evPending ? 'Auktoriserar…' : v.evStatus;
    const el2 = this.$('l-ev'); if (el2) el2.textContent = `Elbilsladdare · ${evShown}`;
    // batterioptimeraren: status-pill + orsak + nästa åtgärd med tid
    const [actTxt, actColor] = optSv(str(this._hass, this._config.opt_action));
    const pill = this.$('o-status');
    if (pill) {
      pill.textContent = actTxt;
      pill.style.color = actColor;
      pill.style.background = actColor + '24'; // ~14 % alpha
      pill.style.border = `1px solid ${actColor}55`;
    }
    this._set('o-reason', str(this._hass, this._config.opt_reason) || '–');
    const nextEl = this.$('o-next');
    if (nextEl) {
      const [nextTxt] = optSv(str(this._hass, this._config.opt_next));
      const raw = str(this._hass, this._config.opt_next_time);
      let when = '';
      if (raw && raw !== 'unknown' && raw !== 'unavailable') {
        const d = new Date(raw.replace(' ', 'T'));
        if (!isNaN(d)) {
          const sameDay = d.toDateString() === new Date().toDateString();
          when = (sameDay ? 'kl ' : d.toLocaleDateString('sv-SE', { weekday: 'short' }) + ' ')
            + d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        }
      }
      nextEl.textContent = `${nextTxt}${when ? ' · ' + when : ''}`;
    }
    // hero-radens batterikolumn (mobil): tecknet visar riktning; grönt = laddar, rött = urladdar,
    // batteri-orange = vilar (samma mönster som nät-boxen)
    this._set('v-batt-hero', battIdle ? '0.0' : `${v.batt >= 0 ? '+' : '−'}${kw(v.batt)}`);
    const bbox = this.$('b-batt');
    if (bbox) {
      const charging = v.batt >= 0;
      const bg = battIdle ? 'rgba(255,138,92,.08)' : charging ? 'rgba(70,217,138,.07)' : 'rgba(255,107,107,.07)';
      const border = battIdle ? 'rgba(255,138,92,.18)' : charging ? 'rgba(70,217,138,.16)' : 'rgba(255,107,107,.16)';
      const labelC = battIdle ? '#a86a4c' : charging ? '#3d9464' : '#c26b6b';
      const valueC = battIdle ? '#ff8a5c' : charging ? '#46d98a' : '#ff8080';
      bbox.style.background = bg;
      bbox.style.border = `1px solid ${border}`;
      const bl2 = this.$('l-batt-hero'); if (bl2) bl2.style.color = labelC;
      const bv = this.$('v-batt-hero'); if (bv && bv.parentElement) bv.parentElement.style.color = valueC;
    }
    // mobil-specifika (minikartans prick-värden)
    this._set('mv-solar', kw(v.solar));
    this._set('mv-house', kw(v.house));
    this._set('mv-batt', kw(v.batt));
    this._set('mv-pool', kw(v.pool));
    this._set('mv-ev', kw(v.ev));
    this._set('m-sub-batt', `${Math.round(v.soc)}% · ${battIdle ? 'Vilar' : v.batt >= 0 ? 'Laddar' : 'Urladdar'}`);
    this._set('m-sub-ev', evShown);
    this._set('m-sub-pool', v.poolOn || v.heatOn ? 'Pump & värme' : 'Avstängd');
  }

  // Koppla klick → auktorisera laddning på de element-id:n som finns i layouten
  _wireEvClicks(ids) {
    for (const id of ids) {
      const el = this.$(id);
      if (el) el.addEventListener('click', () => this._authorizeEv(el));
    }
  }
  _authorizeEv(el) {
    if (!this._hass) return;
    if (!window.confirm('Auktorisera laddning av bilen?')) return;
    this._hass.callService('button', 'press', { entity_id: this._config.ev_authorize });
    this._evPendingUntil = Date.now() + 15000; // visa "Auktoriserar…" tills status hinner ändras
    if (el) {
      const prev = el.style.boxShadow;
      el.style.boxShadow = '0 0 0 3px rgba(70,217,138,.7)';
      setTimeout(() => { el.style.boxShadow = prev; }, 1200);
    }
    this._update();
  }
}

/* ============ PLATTA (1280×800, skalas till containerbredd) ============ */
class EnergiVillaPlatta extends EnergiVillaBase {
  connectedCallback() {
    if (this._built && !this._ro) this._observe();
    this._onWinResize = () => this._rescale();
    window.addEventListener('resize', this._onWinResize);
    requestAnimationFrame(() => this._rescale());
  }
  disconnectedCallback() {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    if (this._onWinResize) window.removeEventListener('resize', this._onWinResize);
  }
  _observe() {
    this._ro = new ResizeObserver(() => this._rescale());
    this._ro.observe(this);
    this._rescale();
  }
  _rescale() {
    const outer = this.shadowRoot && this.shadowRoot.querySelector('.outer');
    const stage = this.shadowRoot && this.shadowRoot.querySelector('.stage');
    if (!outer || !stage) return;
    const w = this.getBoundingClientRect().width;
    if (!w) return;
    // skala till bredd, men låt inte kortet bli högre än fönstret (HA-header ≈ 130 px), max 125 %
    const maxByHeight = Math.max(0.4, (window.innerHeight - 130) / 800);
    const s = Math.min(w / 1280, maxByHeight, 1.25);
    stage.style.transform = `scale(${s})`;
    stage.style.left = `${Math.max(0, (w - 1280 * s) / 2)}px`;
    outer.style.height = `${800 * s}px`;
  }
  _build() {
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    const statTile = (label, valueId, valueColor, mutedColor, bg, border, labelColor, boxId) => `
      <div id="${boxId || ''}" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; padding:10px 18px; background:${bg}; border:1px solid ${border}; border-radius:14px;">
        <div id="${boxId ? 'l-grid' : ''}" style="font-size:11px; color:${labelColor}; font-weight:600; text-transform:uppercase; letter-spacing:.08em;">${label}</div>
        <div class="mono" style="font-size:22px; font-weight:700; color:${valueColor};"><span id="${valueId}">–</span> <span style="font-size:13px; color:${mutedColor};">kW</span></div>
      </div>`;
    root.innerHTML = `
      <style>${SHARED_CSS}
        :host { display: block; }
        .outer { position:relative; width:100%; overflow:hidden; }
        .stage { position:absolute; top:0; left:0; transform-origin:top left; }
        .card { position:relative; width:1280px; height:800px; background: radial-gradient(1200px 600px at 70% -10%, #12202b 0%, #0a0e13 55%, #070a0e 100%); border-radius:22px; overflow:hidden; box-shadow:0 40px 120px rgba(0,0,0,.6); display:flex; flex-direction:column; box-sizing:border-box; }
      </style>
      <div class="outer"><div class="stage"><div class="card root">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:22px 30px 16px; flex-shrink:0;">
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="font-size:15px; color:#9aa4ad; font-weight:600; letter-spacing:.01em;">${this._config.title} · Energiförbrukning just nu</div>
            <div style="display:flex; align-items:center; gap:9px;">
              <span id="o-status" style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; padding:3px 9px; border-radius:999px;">–</span>
              <span style="font-size:12px; color:#6d7883; font-weight:600;">Nästa: <span id="o-next" style="color:#e8edf2;">–</span></span>
            </div>
            <div id="o-reason" style="font-size:11px; color:#6d7883; font-weight:500;">–</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            ${statTile('Förbrukning nu', 'v-total', '#e8edf2', '#6d7883', 'rgba(255,255,255,.03)', 'rgba(255,255,255,.06)', '#6d7883')}
            ${statTile('Solproduktion', 'v-solar-top', '#f4b740', '#b48a34', 'rgba(244,183,64,.08)', 'rgba(244,183,64,.18)', '#b48a34')}
            ${statTile('Från nätet', 'v-grid', '#ff8080', '#c26b6b', 'rgba(255,107,107,.07)', 'rgba(255,107,107,.16)', '#c26b6b', 'b-grid')}
          </div>
        </div>
        <div style="position:relative; flex:1; margin:0 22px 22px; border-radius:18px; background:linear-gradient(160deg,#0c1a12 0%,#0a1510 60%,#0b120f 100%); border:1px solid rgba(255,255,255,.05); overflow:hidden;">
          ${sitePlanHtml(false)}
        </div>
      </div></div></div>`;
    this._wireEvClicks(['z-ev-chip', 'z-ev-post']);
    this._observe();
  }
}

/* ============ MOBIL (390 bas, fluid höjd) ============ */
class EnergiVillaMobil extends EnergiVillaBase {
  _build() {
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    const tileBg = { sun: 'rgba(244,183,64,.14)', house: 'rgba(91,157,255,.14)', battery: 'rgba(255,138,92,.14)', pool: 'rgba(52,211,224,.14)', ev: 'rgba(70,217,138,.14)' };
    const zoneCard = (key, icon, name, subId, subText, valueId, color, cardId) => `
      <div ${cardId ? `id="${cardId}"` : ''} style="display:flex; align-items:center; gap:13px; padding:15px 16px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:16px;${cardId ? ' cursor:pointer; -webkit-tap-highlight-color:transparent; transition:background .15s, border-color .15s;' : ''}">
        <div style="width:40px; height:40px; border-radius:12px; background:${tileBg[key]}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${icon}</div>
        <div style="display:flex; flex-direction:column; gap:2px; flex:1; min-width:0;">
          <div style="font-size:16px; font-weight:700;">${name}</div>
          <div id="${subId || ''}" style="font-size:12px; color:#6d7883; font-weight:500;">${subText}</div>
        </div>
        <div class="mono" style="font-size:20px; font-weight:700; color:${color};"><span id="${valueId}">–</span> <span style="font-size:12px; opacity:.6;">kW</span></div>
      </div>`;
    root.innerHTML = `
      <style>${SHARED_CSS}
        :host { display: block; }
        .card { position:relative; width:100%; background:#05070a; border-radius:24px; overflow:hidden; padding:18px; box-sizing:border-box; display:flex; flex-direction:column; gap:12px; }
      </style>
      <div class="card root">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="font-size:14px; color:#9aa4ad; font-weight:600;">${this._config.title} · Energiförbrukning just nu</div>
          <div style="width:9px; height:9px; border-radius:50%; background:#46d98a; box-shadow:0 0 10px #46d98a; flex-shrink:0;"></div>
        </div>
        <div style="padding:20px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:20px; display:flex; flex-direction:column; gap:12px;">
          <div style="font-size:12px; color:#6d7883; font-weight:700; text-transform:uppercase; letter-spacing:.08em;">Förbrukning nu</div>
          <div class="mono" style="font-size:46px; font-weight:700; line-height:1;"><span id="v-total">–</span> <span style="font-size:18px; color:#6d7883;">kW</span></div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
            <div style="padding:10px 11px; background:rgba(244,183,64,.08); border:1px solid rgba(244,183,64,.18); border-radius:13px; display:flex; flex-direction:column; gap:3px; min-width:0;">
              <div style="font-size:11px; color:#b48a34; font-weight:600; text-transform:uppercase; letter-spacing:.06em;">Sol</div>
              <div class="mono" style="font-size:16px; font-weight:700; color:#f4b740; white-space:nowrap;"><span id="v-solar-top">–</span> <span style="font-size:11px; color:#b48a34;">kW</span></div>
            </div>
            <div id="b-grid" style="padding:10px 11px; background:rgba(255,107,107,.07); border:1px solid rgba(255,107,107,.16); border-radius:13px; display:flex; flex-direction:column; gap:3px; min-width:0;">
              <div id="l-grid" style="font-size:11px; color:#c26b6b; font-weight:600; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap;">Från nätet</div>
              <div class="mono" style="font-size:16px; font-weight:700; white-space:nowrap;"><span id="v-grid">–</span> <span style="font-size:11px; opacity:.6;">kW</span></div>
            </div>
            <div id="b-batt" style="padding:10px 11px; background:rgba(70,217,138,.07); border:1px solid rgba(70,217,138,.16); border-radius:13px; display:flex; flex-direction:column; gap:3px; min-width:0;">
              <div id="l-batt-hero" style="font-size:11px; color:#3d9464; font-weight:600; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap;">Batteri</div>
              <div class="mono" style="font-size:16px; font-weight:700; color:#46d98a; white-space:nowrap;"><span id="v-batt-hero">–</span> <span style="font-size:11px; opacity:.6;">kW</span></div>
            </div>
          </div>
        </div>
        <div style="padding:13px 15px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:16px; display:flex; flex-direction:column; gap:7px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:9px;">
            <div style="font-size:11px; color:#6d7883; font-weight:700; text-transform:uppercase; letter-spacing:.08em;">Batterioptimeraren</div>
            <span id="o-status" style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; padding:3px 9px; border-radius:999px; flex-shrink:0;">–</span>
          </div>
          <div id="o-reason" style="font-size:12px; color:#9aa4ad; font-weight:500;">–</div>
          <div style="font-size:12px; color:#6d7883; font-weight:600;">Nästa åtgärd: <span id="o-next" style="color:#e8edf2;">–</span></div>
        </div>
        <div style="position:relative; height:200px; border-radius:18px; background:linear-gradient(160deg,#0c1a12 0%,#0a1510 60%,#0b120f 100%); border:1px solid rgba(255,255,255,.05); overflow:hidden;">
          ${sitePlanHtml(true)}
        </div>
        <div style="font-size:12px; color:#6d7883; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-top:4px;">Förbrukning per del</div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${zoneCard('sun', ICONS.sun, 'Solceller', '', 'Producerar', 'v-solar', '#f4b740')}
          ${zoneCard('house', ICONS.house, 'Villan', '', 'Hushållsel', 'v-house', '#5b9dff')}
          ${zoneCard('ev', ICONS.ev, 'Elbilsladdare', 'm-sub-ev', '–', 'v-ev', '#46d98a', 'z-ev')}
          ${zoneCard('battery', ICONS.battery, 'Batteri', 'm-sub-batt', '–', 'v-batt', '#ff8a5c')}
          ${zoneCard('pool', ICONS.pool, 'Pool', 'm-sub-pool', 'Pump & värme', 'v-pool', '#34d3e0')}
        </div>
      </div>`;
    this._wireEvClicks(['z-ev', 'z-ev-post', 'z-ev-dot']);
  }
}

/* ============ AUTO — väljer platta/mobil efter containerbredd ============ */
class EnergiVillaAuto extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._breakpoint = this._config.breakpoint || 700; // px containerbredd
    if (!this._platta) {
      this._platta = document.createElement('energi-villa-platta');
      this._mobil = document.createElement('energi-villa-mobil');
      this._mobil.style.display = 'none';
      this.appendChild(this._platta);
      this.appendChild(this._mobil);
    }
    this._platta.setConfig(this._config);
    this._mobil.setConfig(this._config);
  }
  getCardSize() { return 8; }
  set hass(hass) {
    if (this._platta) { this._platta.hass = hass; this._mobil.hass = hass; }
  }
  connectedCallback() {
    this.style.display = 'block';
    this._ro = new ResizeObserver(() => this._pick());
    this._ro.observe(this);
    this._onWinResize = () => this._pick();
    window.addEventListener('resize', this._onWinResize);
    this._pick();
    requestAnimationFrame(() => this._pick());
  }
  disconnectedCallback() {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    if (this._onWinResize) window.removeEventListener('resize', this._onWinResize);
  }
  _pick() {
    if (!this._platta) return;
    const w = this.getBoundingClientRect().width;
    if (!w) return;
    const usePlatta = w >= this._breakpoint;
    this._platta.style.display = usePlatta ? 'block' : 'none';
    this._mobil.style.display = usePlatta ? 'none' : 'block';
  }
}

customElements.define('energi-villa-platta', EnergiVillaPlatta);
customElements.define('energi-villa-mobil', EnergiVillaMobil);
customElements.define('energi-villa', EnergiVillaAuto);

window.customCards = window.customCards || [];
window.customCards.push(
  { type: 'energi-villa', name: 'Energi Villa', description: 'Tomtplan med liveeffekt — växlar platta/mobil-layout automatiskt' },
  { type: 'energi-villa-platta', name: 'Energi Villa — Platta', description: 'Tomtplan med liveeffekt (väggplatta/desktop)' },
  { type: 'energi-villa-mobil', name: 'Energi Villa — Mobil', description: 'Hero + tomtplan + zonlista (telefon)' },
);
