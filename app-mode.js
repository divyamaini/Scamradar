/* SCAMRADAR app mode v2: installable app + share target + complaint helper. Loaded by server.js */
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

/* --- app manifest: install, shortcuts, share target --- */
const ICONS = [{src: '/icon-192.png', sizes: '192x192', type: 'image/png'}];
const MANIFEST = {
  name: 'ScamRadar', short_name: 'ScamRadar',
  description: 'Check scams before you lose money. Get help and file a complaint after.',
  start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait',
  background_color: '#05060d', theme_color: '#05060d',
  icons: [
    {src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
    {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
    {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'}
  ],
  shortcuts: [
    {name: 'Scan a message', short_name: 'Scan', url: '/#scan', icons: ICONS},
    {name: 'I got scammed', short_name: 'Scammed', url: '/complaint', icons: ICONS},
    {name: 'Live call check', short_name: 'Call check', url: '/#call', icons: ICONS}
  ],
  share_target: {action: '/', method: 'GET', params: {title: 'title', text: 'text', url: 'url'}}
};

/* --- service worker (the complaint page is saved for offline use) --- */
const SW = `
const CACHE = 'scamradar-v2';
const OFFLINE = "<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'><body style='margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#05060d;color:#e8ecff;font-family:sans-serif;text-align:center;padding:24px'><h1 style='color:#18f0ff'>SCAMRADAR</h1><p>You are offline. Reconnect to see live scam news and alerts.</p><p style='color:#2ee6a6;font-size:22px'>Scammed? Call 1930</p><button onclick='location.reload()' style='padding:12px 26px;border:0;border-radius:10px;background:#18f0ff;color:#05060d;font-weight:700;font-size:16px'>Retry</button></body>";
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/complaint'])).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return r;
  }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate'
    ? new Response(OFFLINE, {headers: {'Content-Type': 'text/html; charset=utf-8'}}) : Response.error()))));
});`;

/* --- injected into the main page --- */
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
(function(){
 if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function(){});
 /* Share to ScamRadar: shared text is scanned automatically */
 try {
  var q = new URLSearchParams(location.search), parts = [q.get('title'), q.get('text'), q.get('url')].filter(Boolean);
  if (parts.length) {
   var t = document.getElementById('txt');
   if (t) { t.value = parts.join('\\n'); history.replaceState(null, '', '/');
    setTimeout(function(){ var s = document.getElementById('scan'); if (s) s.scrollIntoView(); var g = document.getElementById('go'); if (g) g.click(); }, 1200); }
  }
 } catch (e) {}
 /* floating help button */
 var f = document.createElement('a'); f.href = '/complaint'; f.textContent = '🚨 Got scammed? Get help';
 f.style.cssText = 'position:fixed;left:16px;bottom:56px;z-index:70;padding:11px 16px;border-radius:99px;background:#ff2e63;color:#fff;font:700 13px Consolas,monospace;text-decoration:none;box-shadow:0 0 30px rgba(255,46,99,.5)';
 document.body.appendChild(f);
 /* install button (Android / desktop) */
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
 /* iPhone hint */
 try {
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = window.navigator.standalone;
  if (ios && !standalone && !localStorage.getItem('sr-ios')) {
   var h = document.createElement('div');
   h.style.cssText = 'position:fixed;left:12px;right:12px;bottom:104px;z-index:80;background:#10132a;border:1px solid #18f0ff;color:#e8ecff;border-radius:14px;padding:12px 40px 12px 14px;font:14px sans-serif';
   h.textContent = '📲 Install on iPhone: tap the Share button, then "Add to Home Screen".';
   var x = document.createElement('span'); x.textContent = '✕'; x.style.cssText = 'position:absolute;right:14px;top:10px;cursor:pointer;color:#7d86b8';
   x.onclick = function(){ h.remove(); try { localStorage.setItem('sr-ios', '1'); } catch (e) {} };
   h.appendChild(x); document.body.appendChild(h);
  }
 } catch (e) {}
})();
</script>`;
const withApp = html => html.replace('</head>', () => HEAD + '</head>').replace('</body>', () => BODY + '</body>');

/* --- complaint helper page --- */
const COMPLAINT_PAGE = String.raw`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#05060d"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon-192.png">
<title>ScamRadar — I got scammed. Help me file a complaint</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#05060d;color:#e8ecff;font:16px/1.6 'Segoe UI','Nirmala UI',system-ui,sans-serif;padding:18px 16px 60px;max-width:760px;margin:auto}
a{color:#18f0ff}.top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
.logo{font-weight:800;letter-spacing:3px;font-family:Consolas,monospace;text-decoration:none;color:#e8ecff}.logo b{color:#ff2e63}
.lang{background:transparent;border:1px solid #18f0ff;color:#18f0ff;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700}
h1{font-size:28px;line-height:1.2;margin:8px 0}h2{font-size:19px;margin:26px 0 10px;color:#18f0ff}p.lead{color:#9aa3d0;margin-bottom:14px}
.sos{display:block;text-align:center;text-decoration:none;background:#ff2e63;color:#fff;font-weight:800;font-size:22px;padding:16px;border-radius:14px;margin:14px 0;box-shadow:0 0 40px rgba(255,46,99,.4)}
.box{background:rgba(16,18,40,.7);border:1px solid #262a55;border-radius:16px;padding:16px;margin-bottom:12px}
.warn{border-color:#ffd23f;background:rgba(255,210,63,.07);color:#ffe9a0;font-size:14px}
label{display:block;font-size:13px;color:#9aa3d0;margin:12px 0 4px}
input,select,textarea{width:100%;background:#05060d;border:1px solid #262a55;color:#e8ecff;border-radius:10px;padding:12px;font:15px inherit;font-family:inherit;outline:0}
input:focus,select:focus,textarea:focus{border-color:#18f0ff}textarea{min-height:110px;resize:vertical}
.btn{display:inline-block;padding:13px 22px;border-radius:12px;border:1px solid #18f0ff;background:rgba(24,240,255,.08);color:#18f0ff;font-weight:700;cursor:pointer;font-size:15px;font-family:inherit;margin:8px 8px 0 0;text-decoration:none}
.btn.red{border-color:#ff2e63;background:#ff2e63;color:#fff}.btn.sm{padding:8px 14px;font-size:13px;margin:6px 6px 0 0}
.out textarea{min-height:170px;font-size:14px;background:#0b0e1d}.cb{display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid #262a55;border-radius:12px;margin-bottom:8px;cursor:pointer}
.cb input{width:22px;height:22px;flex:none;margin-top:3px;accent-color:#2ee6a6;padding:0}.cb.done{opacity:.5;border-color:#2ee6a6}.cb h4{font-size:16px}.cb p{font-size:14px;color:#9aa3d0}
#outs{display:none}small.t{color:#7d86b8;font-size:12px}#tip{display:none}
@media print{body{background:#fff;color:#000}.noprint{display:none!important}.out textarea{border:1px solid #999;background:#fff;color:#000;min-height:260px}h2{color:#000}}
</style></head><body>
<div class="top noprint"><a class="logo" href="/">SCAM<b>●</b>RADAR</a><button class="lang" id="lang">हिं</button></div>
<h1 data-i="h1"></h1><p class="lead" data-i="lead"></p>
<a class="sos noprint" href="tel:1930" data-i="call"></a>
<div class="box warn noprint" data-i="warn"></div>
<div class="box noprint"><b data-i="before"></b><br><a href="/#call" data-i="b1"></a> · <a href="/#scan" data-i="b2"></a></div>

<h2 class="noprint" data-i="s1"></h2>
<div class="box noprint">
<label data-i="l_nm"></label><input id="nm" autocomplete="name">
<label data-i="l_ty"></label><select id="ty"></select>
<div id="tip" class="box warn" data-i="tip"></div>
<label data-i="l_hw"></label><select id="hw"></select>
<label data-i="l_sc"></label><input id="sc" placeholder="98xxxxxx10 / name@upi / site.com / @handle">
<label data-i="l_dt"></label><input id="dt" type="datetime-local">
<label data-i="l_am"></label><input id="am" type="number" min="0" inputmode="numeric">
<label data-i="l_pm"></label><select id="pm"></select>
<label data-i="l_bk"></label><input id="bk">
<label data-i="l_tx"></label><input id="tx">
<label data-i="l_ds"></label><textarea id="ds"></textarea>
<button class="btn red" id="gen" data-i="gen"></button>
</div>

<div id="outs">
<h2 data-i="o1"></h2><div class="box out"><textarea id="o1" readonly></textarea><button class="btn sm" data-c="o1" data-i="copy"></button><a class="btn sm" href="https://cybercrime.gov.in" target="_blank" rel="noopener" data-i="open"></a></div>
<h2 data-i="o2"></h2><div class="box out"><textarea id="o2" readonly></textarea><button class="btn sm" data-c="o2" data-i="copy"></button></div>
<h2 data-i="o3"></h2><div class="box out"><textarea id="o3" readonly></textarea><button class="btn sm" data-c="o3" data-i="copy"></button></div>
<button class="btn noprint" id="pr" data-i="print"></button>
</div>

<h2 class="noprint" data-i="s2"></h2><div id="cl" class="noprint"></div>
<p class="noprint"><small class="t" data-i="priv"></small></p>

<script>
var $=function(i){return document.getElementById(i)};
var TY=['Digital arrest / fake officer call|डिजिटल अरेस्ट / नकली अफ़सर कॉल','Investment / trading|निवेश / ट्रेडिंग ठगी','Part-time job / task|पार्ट-टाइम जॉब / टास्क','UPI / QR / collect request|UPI / QR / कलेक्ट रिक्वेस्ट','KYC / bank phishing|KYC / बैंक फ़िशिंग','Online shopping|ऑनलाइन शॉपिंग','Loan app / harassment|लोन ऐप / धमकी','Blackmail with photos (sextortion)|फ़ोटो से ब्लैकमेल','Social media hack / impersonation|सोशल मीडिया हैक / नक़ल','Other|अन्य'];
var HW=['Phone call|फ़ोन कॉल','SMS|SMS','WhatsApp|व्हाट्सऐप','Instagram|इंस्टाग्राम','Facebook|फ़ेसबुक','Telegram|टेलीग्राम','Email|ईमेल','Website / app|वेबसाइट / ऐप','Other|अन्य'];
var PM=['UPI|UPI','Debit card|डेबिट कार्ड','Credit card|क्रेडिट कार्ड','Net banking|नेट बैंकिंग','Wallet|वॉलेट','Crypto|क्रिप्टो','Cash / transfer|नक़द / ट्रांसफ़र','Other|अन्य','No money lost yet|अभी पैसे नहीं गए'];
var D={en:{
h1:'I got scammed. What now?',lead:'Answer a few questions. We prepare your complaint, bank letter and call script in seconds. You only have to copy and paste.',
call:'📞 CALL 1930 NOW (Cyber Crime Helpline)',warn:'Speed matters. Calling 1930 early gives the best chance of stopping the money. Never share your OTP, PIN or CVV with anyone, including people who say they are helping you recover money.',
before:'Still getting the call or message right now?',b1:'Live call check',b2:'Scan the message',
s1:'1. Tell us what happened',l_nm:'Your name',l_ty:'Type of fraud',l_hw:'How did they contact you?',l_sc:'Scammer phone / UPI ID / website / handle',l_dt:'When did it happen?',l_am:'Amount lost (₹)',l_pm:'How did you pay?',l_bk:'Your bank or payment app',l_tx:'Transaction ID / UTR number',l_ds:'What happened, in your own words',gen:'✨ CREATE MY COMPLAINT',
tip:'If someone is blackmailing you with private photos: do NOT pay, do not delete the chats, report it, and you can also ask stopncii.org to help stop the images from spreading.',
o1:'A. Text for cybercrime.gov.in (incident details)',o2:'B. Email or letter to your bank',o3:'C. What to say on the 1930 call',copy:'📋 Copy',open:'Open cybercrime.gov.in ↗',print:'🖨 Save as PDF / Print',copied:'Copied!',
s2:'2. Your action checklist',priv:'This page works in your browser only. Nothing you type is sent to or saved on our server.',
unk:'(not sure)',
c1t:'Call 1930',c1d:'Tell them what happened. Use text C below. Keep transaction ID and amount ready.',
c2t:'Call your bank or payment app helpline',c2d:'Ask them to flag the fraud, block your card/UPI and freeze the receiving account. Send them letter B by email.',
c3t:'Register on cybercrime.gov.in',c3d:'Choose "Report Other Cyber Crime" or "Financial Fraud". You will need your mobile number for the OTP. Paste text A in the incident details. Save the acknowledgement number.',
c4t:'Report the number on Sanchar Saathi',c4d:'Report fraud calls, SMS and WhatsApp numbers on sancharsaathi.gov.in (Chakshu).',
c5t:'Report and block on the platform',c5d:'Report the account on Instagram, Facebook, WhatsApp or Telegram and block it.',
c6t:'Save all evidence',c6d:'Screenshots of chats, call log, payment receipt, UPI IDs and links. Do not delete anything.',
c7t:'Secure your accounts',c7d:'Change passwords, turn on 2-step login, and uninstall any remote app such as AnyDesk or TeamViewer.'},
hi:{
h1:'मेरे साथ ठगी हुई है। अब क्या करूँ?',lead:'कुछ सवालों के जवाब दीजिए। हम आपकी शिकायत, बैंक का पत्र और कॉल की स्क्रिप्ट कुछ ही सेकंड में तैयार कर देंगे। आपको बस कॉपी और पेस्ट करना है।',
call:'📞 अभी 1930 पर कॉल करें (साइबर क्राइम हेल्पलाइन)',warn:'रफ़्तार ज़रूरी है। जल्दी 1930 पर कॉल करने से पैसा रुकने की सबसे अच्छी संभावना होती है। अपना OTP, PIN या CVV किसी को न बताएँ, चाहे वह पैसे वापस दिलाने का दावा करे।',
before:'क्या कॉल या मैसेज अभी भी आ रहा है?',b1:'लाइव कॉल चेक',b2:'मैसेज स्कैन करें',
s1:'1. बताइए क्या हुआ',l_nm:'आपका नाम',l_ty:'ठगी का प्रकार',l_hw:'उन्होंने आपसे कैसे संपर्क किया?',l_sc:'ठग का फ़ोन / UPI ID / वेबसाइट / हैंडल',l_dt:'यह कब हुआ?',l_am:'गंवाई गई रक़म (₹)',l_pm:'आपने भुगतान कैसे किया?',l_bk:'आपका बैंक या पेमेंट ऐप',l_tx:'ट्रांज़ैक्शन ID / UTR नंबर',l_ds:'क्या हुआ, अपने शब्दों में',gen:'✨ मेरी शिकायत बनाएँ',
tip:'अगर कोई निजी फ़ोटो से ब्लैकमेल कर रहा है: पैसे न दें, चैट डिलीट न करें, शिकायत करें, और फ़ोटो फैलने से रोकने के लिए stopncii.org की मदद भी ले सकते हैं।',
o1:'A. cybercrime.gov.in के लिए टेक्स्ट (घटना का विवरण)',o2:'B. आपके बैंक को ईमेल या पत्र',o3:'C. 1930 कॉल पर क्या बोलें',copy:'📋 कॉपी करें',open:'cybercrime.gov.in खोलें ↗',print:'🖨 PDF सेव / प्रिंट करें',copied:'कॉपी हो गया!',
s2:'2. आपकी एक्शन चेकलिस्ट',priv:'यह पेज सिर्फ़ आपके ब्राउज़र में चलता है। आप जो भी लिखते हैं वह हमारे सर्वर पर भेजा या सेव नहीं होता।',
unk:'(पता नहीं)',
c1t:'1930 पर कॉल करें',c1d:'उन्हें बताइए क्या हुआ। नीचे दिया टेक्स्ट C इस्तेमाल करें। ट्रांज़ैक्शन ID और रक़म तैयार रखें।',
c2t:'अपने बैंक या पेमेंट ऐप की हेल्पलाइन पर कॉल करें',c2d:'उनसे ठगी फ़्लैग करने, आपका कार्ड/UPI ब्लॉक करने और पैसे पाने वाला अकाउंट फ़्रीज़ करने को कहें। उन्हें ईमेल से पत्र B भेजें।',
c3t:'cybercrime.gov.in पर शिकायत दर्ज करें',c3d:'"Report Other Cyber Crime" या "Financial Fraud" चुनें। OTP के लिए आपका मोबाइल नंबर चाहिए होगा। घटना के विवरण में टेक्स्ट A पेस्ट करें। acknowledgement नंबर सुरक्षित रखें।',
c4t:'संचार साथी पर नंबर रिपोर्ट करें',c4d:'ठगी वाले कॉल, SMS और व्हाट्सऐप नंबर sancharsaathi.gov.in (चक्षु) पर रिपोर्ट करें।',
c5t:'प्लेटफ़ॉर्म पर रिपोर्ट और ब्लॉक करें',c5d:'इंस्टाग्राम, फ़ेसबुक, व्हाट्सऐप या टेलीग्राम पर अकाउंट रिपोर्ट करें और ब्लॉक कर दें।',
c6t:'सारे सबूत सहेजें',c6d:'चैट, कॉल लॉग, पेमेंट रसीद, UPI ID और लिंक के स्क्रीनशॉट रखें। कुछ भी डिलीट न करें।',
c7t:'अपने अकाउंट सुरक्षित करें',c7d:'पासवर्ड बदलें, 2-स्टेप लॉगिन चालू करें और AnyDesk या TeamViewer जैसा कोई रिमोट ऐप हो तो हटा दें।'}};
var L='en';try{if(localStorage.getItem('lang')==='hi')L='hi'}catch(e){}
function T(k){return D[L][k]||D.en[k]||k}
function fill(sel,arr){var v=sel.value;sel.innerHTML='';arr.forEach(function(p,i){var s=p.split('|'),o=document.createElement('option');o.value=s[0];o.textContent=L==='hi'?s[1]:s[0];sel.appendChild(o)});if(v)sel.value=v}
function applyLang(){document.documentElement.lang=L;$('lang').textContent=L==='hi'?'EN':'हिं';
 document.querySelectorAll('[data-i]').forEach(function(e){e.textContent=T(e.getAttribute('data-i'))});
 fill($('ty'),TY);fill($('hw'),HW);fill($('pm'),PM);tip();renderCl();if($('outs').style.display==='block')gen()}
$('lang').onclick=function(){L=L==='hi'?'en':'hi';try{localStorage.setItem('lang',L)}catch(e){}applyLang()};
function tip(){$('tip').style.display=$('ty').value.indexOf('Blackmail')===0?'block':'none'}$('ty').onchange=tip;
var DONE={};
var LK={1:['tel:1930','📞 1930'],3:['https://cybercrime.gov.in','cybercrime.gov.in ↗'],4:['https://sancharsaathi.gov.in','sancharsaathi.gov.in ↗']};
function renderCl(){var box=$('cl');box.innerHTML='';
 for(var i=1;i<=7;i++)(function(i){var d=document.createElement('div');d.className='cb'+(DONE[i]?' done':'');
  var c=document.createElement('input');c.type='checkbox';c.checked=!!DONE[i];c.onchange=function(){DONE[i]=c.checked;renderCl()};d.appendChild(c);
  var w=document.createElement('div'),h=document.createElement('h4');h.textContent=i+'. '+T('c'+i+'t');var p=document.createElement('p');p.textContent=T('c'+i+'d');w.appendChild(h);w.appendChild(p);
  if(LK[i]){var a=document.createElement('a');a.href=LK[i][0];a.textContent=LK[i][1];if(i!==1){a.target='_blank';a.rel='noopener'}w.appendChild(a)}
  d.appendChild(w);box.appendChild(d)})(i)}
function val(i){return $(i).value.trim()}
function gen(){
 var nm=val('nm'),ty=val('ty')||$('ty').value,hw=$('hw').value,sc=val('sc'),dt=val('dt').replace('T',' '),am=val('am'),pm=$('pm').value,bk=val('bk'),tx=val('tx'),ds=val('ds');
 var lost=am&&pm.indexOf('No money')!==0, hi=L==='hi', u=T('unk');
 var a,b,c;
 if(!hi){
  a='On '+(dt||'(date and time)')+' I was cheated through '+hw+(sc?' by this number / account / website: '+sc:'')+'. Type of fraud: '+ty+'. '+(ds?ds+' ':'')+
    (lost?'Because of this I lost Rs '+am+' through '+pm+(bk?' ('+bk+')':'')+(tx?'. Transaction ID / UTR: '+tx:'')+'. ':'')+
    'I request you to register my complaint, trace the receiving account'+(lost?', and help freeze and recover the money':'')+'.\n\nName: '+(nm||'________');
  b='Subject: Fraud complaint - request to hold/freeze transaction'+(tx?' (Txn ID: '+tx+')':'')+'\n\nTo,\nThe Nodal Officer / Customer Care\n'+(bk||'(Bank / payment app name)')+'\n\nI am writing to report an online fraud.\n\nOn '+(dt||'________')+', a person contacted me through '+hw+(sc?' ('+sc+')':'')+' and cheated me ('+ty+'). '+(lost?'Because of this I paid Rs '+am+' through '+pm+(tx?' (Transaction ID / UTR: '+tx+')':'')+'.':'')+'\n\nI have called the National Cyber Crime Helpline 1930 and registered a complaint on cybercrime.gov.in (Acknowledgement no.: ________).\n\nI request you to:\n1. Immediately mark this transaction as fraud and hold/freeze the amount in the beneficiary account if it is still available.\n2. Block my card / UPI if it may be misused.\n3. Share the reference number and status of my complaint.\n4. Share the details the police may need.\n\nAccount / registered mobile number: ________\nName: '+(nm||'________')+'\n\nThank you.';
  c='"Hello, my name is '+(nm||'________')+'. I have been cheated online and want to report it.\nIt happened on '+(dt||'________')+' through '+hw+'. The fraud type is '+ty+'.\n'+(lost?'I lost Rs '+am+' by '+pm+(bk?' from '+bk:'')+'. Transaction ID is '+(tx||u)+'.\n':'I have not lost money yet.\n')+'The scammer\'s number / UPI / website is '+(sc||u)+'.\nPlease register my complaint and ask my bank to freeze the money."\n\nKeep ready: your phone number, bank name, transaction ID, screenshots.';
 } else {
  a=(dt||'(तारीख़ और समय)')+' को '+hw+' के ज़रिए मेरे साथ ठगी हुई'+(sc?' इस नंबर / अकाउंट / वेबसाइट से: '+sc:'')+'। ठगी का प्रकार: '+ty+'। '+(ds?ds+' ':'')+
    (lost?'इस वजह से मैंने '+pm+(bk?' ('+bk+')':'')+' से Rs '+am+' गंवाए'+(tx?'। ट्रांज़ैक्शन ID / UTR: '+tx:'')+'। ':'')+
    'कृपया मेरी शिकायत दर्ज करें, पैसे पाने वाले अकाउंट की जाँच करें'+(lost?' और पैसे फ़्रीज़ व वापस दिलाने में मदद करें':'')+'।\n\nनाम: '+(nm||'________');
  b='विषय: ठगी की शिकायत - ट्रांज़ैक्शन होल्ड/फ़्रीज़ करने का अनुरोध'+(tx?' (Txn ID: '+tx+')':'')+'\n\nसेवा में,\nनोडल अधिकारी / कस्टमर केयर\n'+(bk||'(बैंक / पेमेंट ऐप का नाम)')+'\n\nमैं एक ऑनलाइन ठगी की सूचना दे रहा/रही हूँ।\n\n'+(dt||'________')+' को एक व्यक्ति ने '+hw+(sc?' ('+sc+')':'')+' के ज़रिए मुझसे संपर्क करके ठगी की ('+ty+')। '+(lost?'इसके कारण मैंने '+pm+' से Rs '+am+' का भुगतान किया'+(tx?' (ट्रांज़ैक्शन ID / UTR: '+tx+')':'')+'।':'')+'\n\nमैंने राष्ट्रीय साइबर क्राइम हेल्पलाइन 1930 पर कॉल किया है और cybercrime.gov.in पर शिकायत दर्ज की है (Acknowledgement नं.: ________)।\n\nकृपया:\n1. इस ट्रांज़ैक्शन को तुरंत फ़्रॉड चिह्नित करें और यदि राशि अभी उपलब्ध है तो लाभार्थी अकाउंट में उसे होल्ड/फ़्रीज़ करें।\n2. ज़रूरत हो तो मेरा कार्ड / UPI ब्लॉक करें।\n3. मेरी शिकायत का संदर्भ नंबर और स्थिति बताएँ।\n4. पुलिस को जो जानकारी चाहिए वह उपलब्ध कराएँ।\n\nअकाउंट / रजिस्टर्ड मोबाइल नंबर: ________\nनाम: '+(nm||'________')+'\n\nधन्यवाद।';
  c='"नमस्ते, मेरा नाम '+(nm||'________')+' है। मेरे साथ ऑनलाइन ठगी हुई है और मैं शिकायत दर्ज कराना चाहता/चाहती हूँ।\nयह '+(dt||'________')+' को '+hw+' के ज़रिए हुआ। ठगी का प्रकार: '+ty+'।\n'+(lost?'मैंने '+pm+(bk?' से ('+bk+')':'')+' Rs '+am+' गंवाए। ट्रांज़ैक्शन ID '+(tx||u)+' है।\n':'अभी तक मेरे पैसे नहीं गए हैं।\n')+'ठग का नंबर / UPI / वेबसाइट '+(sc||u)+' है।\nकृपया मेरी शिकायत दर्ज करें और मेरे बैंक से पैसे फ़्रीज़ कराने को कहें।"\n\nतैयार रखें: आपका फ़ोन नंबर, बैंक का नाम, ट्रांज़ैक्शन ID, स्क्रीनशॉट।';
 }
 $('o1').value=a;$('o2').value=b;$('o3').value=c;$('outs').style.display='block';
}
$('gen').onclick=function(){gen();$('outs').scrollIntoView({behavior:'smooth'})};
document.addEventListener('click',function(e){var id=e.target.getAttribute&&e.target.getAttribute('data-c');if(!id)return;var t=$(id);t.select();t.setSelectionRange(0,99999);
 var ok=function(){var o=e.target.textContent;e.target.textContent=T('copied');setTimeout(function(){e.target.textContent=o},1500)};
 if(navigator.clipboard)navigator.clipboard.writeText(t.value).then(ok,function(){document.execCommand('copy');ok()});else{document.execCommand('copy');ok()}});
$('pr').onclick=function(){window.print()};
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){});
applyLang();
</script></body></html>`;

/* --- hooks into the server without changing your existing code --- */
const orig = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex(a => typeof a === 'function');
  if (i >= 0) {
    const handler = args[i];
    args[i] = function (req, res) {
      const url = (req.url || '').split('?')[0];
      if (req.method === 'GET') {
        const ok = (type, body, extra) => { res.writeHead(200, Object.assign({'Content-Type': type, 'Cache-Control': 'no-cache'}, extra || {})); res.end(body); };
        if (url === '/manifest.webmanifest') return ok('application/manifest+json; charset=utf-8', JSON.stringify(MANIFEST));
        if (url === '/sw.js') return ok('application/javascript; charset=utf-8', SW);
        if (url === '/icon-192.png') return ok('image/png', iconPNG(192));
        if (url === '/icon-512.png') return ok('image/png', iconPNG(512));
        if (url === '/complaint') return ok('text/html; charset=utf-8', COMPLAINT_PAGE, {
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:",
          'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'});
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
