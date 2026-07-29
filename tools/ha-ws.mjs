// Home Assistant WebSocket client.
// Usage:  HA_URL=… HA_TOKEN=… node ha-ws.mjs <commandfile.json>
//   HA_URL   — your HA base URL, e.g. https://<id>.ui.nabu.casa or http://homeassistant.local:8123
//              (a ws://…/api/websocket URL is also accepted verbatim)
//   HA_TOKEN — a long-lived access token (HA → Profile → Security → Long-lived access tokens)
// <commandfile.json> is a JSON array of WS commands; results are written as JSON to stdout.
import { readFileSync } from 'node:fs';

const TOKEN = process.env.HA_TOKEN;
const HA_URL = process.env.HA_URL;
if (!TOKEN || !HA_URL) {
  console.error('Set HA_URL and HA_TOKEN, e.g. HA_URL=https://<id>.ui.nabu.casa HA_TOKEN=… node ha-ws.mjs cmds.json');
  process.exit(1);
}
const URL_WS = /^wss?:\/\//.test(HA_URL)
  ? HA_URL
  : `${HA_URL.replace(/^http/, 'ws').replace(/\/+$/, '')}/api/websocket`;

const commands = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const ws = new WebSocket(URL_WS);
let id = 0;
const pending = new Map();
const results = [];

function send(msg) {
  return new Promise((resolve, reject) => {
    msg.id = ++id;
    pending.set(msg.id, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });
}

ws.onmessage = async (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === 'auth_required') {
    ws.send(JSON.stringify({ type: 'auth', access_token: TOKEN }));
  } else if (msg.type === 'auth_ok') {
    for (const cmd of commands) {
      try {
        const r = await send(structuredClone(cmd));
        results.push({ cmd: cmd.type, ok: true, result: r });
      } catch (e) {
        results.push({ cmd: cmd.type, ok: false, error: e });
      }
    }
    console.log(JSON.stringify(results, null, 2));
    ws.close();
    process.exit(0);
  } else if (msg.type === 'auth_invalid') {
    console.error('AUTH FAILED:', msg.message);
    process.exit(1);
  } else if (msg.type === 'result') {
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.success) p.resolve(msg.result);
    else p.reject(msg.error);
  }
};
ws.onerror = (e) => { console.error('WS error', e.message || e); process.exit(1); };
setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 60000);
