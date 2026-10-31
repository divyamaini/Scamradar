/* SCAMRADAR app mode: makes the site installable like a phone app. Loaded by server.js */
const http = require('http'), zlib = require('zlib');

/* --- draws the radar icon as a PNG (no image files needed) --- */
const CRC_T = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = CRC_T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const cache = {};
function iconPNG(size) {
  if (cache[size]) return cache[size];
  const stride = size * 4 + 1, raw = Buffer.alloc(stride * size);
  const C = size / 2, ang = -0.7, th = size * 0.012 + 1;
  const dx = C + Math.cos(ang) * size * 0.26, dy = C + Math.sin(ang) * size * 0.26;
  const mix = (p, r, g, b, a) => { a = Math.max(0, Math.min(1, a)); p[0] += (r - p[0]) * a; p[1] += (g - p[1]) * a; p[2] += (b - p[2]) * a; };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = [5, 6, 13], d = Math.hypot(x - C, y - C);
      [0.36, 0.24, 0.12].forEach((rr, i) => mix(p, 24, 240, 255, (1 - Math.abs(d - rr * size) / th) * (1 - i * 0.2)));
      const along = (x - C) * Math.cos(ang) + (y - C) * Math.sin(ang);
      const perp = Math.abs(-(x - C) * Math.sin(ang) + (y - C) * Math.cos(ang));
      if (along > 0 && along < size * 0.36) mix(p, 24, 240, 255, 1 - perp / th);
      mix(p, 24, 240, 255, (size * 0.02 - d) / 2 + 0.5);
      mix(p, 255, 46, 99, (size * 0.045 - Math.hypot(x - dx, y - dy)) / 1.5 + 0.5);
      const o = y * stride + 1 + x * 4;
      raw[o] = p[0]; raw[o + 1] = p[1]; raw[o + 2] = p[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return cache[size] = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/* --- app files --- */
const MANIFEST = {
  name: 'ScamRadar', short_name: 'ScamRadar',
  description: 'See the scam before it sees you. Live scam news, risk scanner and emergency help.',
  start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait',
  background_color: '#05060d', theme_color: '#05060d',
  icons: [
    {src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
    {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
    {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'}
  ]
};
const SW = `
const CACHE = 'scamradar-v1';
const OFFLINE = "<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'><body style='margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#05060d;color:#e8ecff;font-family:sans-serif;text-align:center;padding:24px'><h1 style='color:#18f0ff'>SCAMRADAR</h1><p>You are offline. Reconnect to see live scam news and alerts.</p><p style='color:#2ee6a6;font-size:22px'>Scammed? Call 1930</p><button onclick='location.reload()' style='padding:12px 26px;border:0;border-radius:10px;background:#18f0ff;color:#05060d;font-weight:700;font-size:16px'>Retry</button></body>";
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return r;
  }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate'
    ? new Response(OFFLINE, {headers: {'Content-Type': 'text/html; charset=utf-8'}}) : Response.error()))));
});`;
const HEAD = `
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#05060d">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="ScamRadar">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="icon" type="image/png" href="/icon-192.png">
<link rel="apple-touch-icon" href="/icon-192.png">`;
const BODY = `
<script>
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function(){});
var dip;
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault(); dip = e;
  if (document.getElementById('sr-inst')) return;
  var b = document.createElement('button'); b.id = 'sr-inst'; b.textContent = '📲 INSTALL APP';
  b.style.cssText = 'position:fixed;right:16px;bottom:56px;z-index:70;padding:12px 18px;border:1px solid #18f0ff;border-radius:99px;background:#05060d;color:#18f0ff;font:700 14px Consolas,monospace;letter-spacing:1px;box-shadow:0 0 30px rgba(24,240,255,.4);cursor:pointer';
  b.onclick = function(){ b.remove(); dip.prompt(); dip = null; };
  document.body.appendChild(b);
});
window.addEventListener('appinstalled', function(){ var b = document.getElementById('sr-inst'); if (b) b.remove(); });
</script>`;
const withApp = html => html.replace('</head>', () => HEAD + '</head>').replace('</body>', () => BODY + '</body>');

/* --- hooks into the server without changing your existing code --- */
const orig = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex(a => typeof a === 'function');
  if (i >= 0) {
    const handler = args[i];
    args[i] = function (req, res) {
      const url = (req.url || '').split('?')[0];
      if (req.method === 'GET') {
        const ok = (type, body) => { res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-cache'}); res.end(body); };
        if (url === '/manifest.webmanifest') return ok('application/manifest+json; charset=utf-8', JSON.stringify(MANIFEST));
        if (url === '/sw.js') return ok('application/javascript; charset=utf-8', SW);
        if (url === '/icon-192.png') return ok('image/png', iconPNG(192));
        if (url === '/icon-512.png') return ok('image/png', iconPNG(512));
        if (url === '/') {
          const end = res.end.bind(res);
          res.end = function (chunk, ...rest) {
            if (typeof chunk === 'string' && chunk.includes('</head>')) chunk = withApp(chunk);
            return end(chunk, ...rest);
          };
        }
      }
      return handler.apply(this, arguments);
    };
  }
  return orig.apply(http, args);
};
