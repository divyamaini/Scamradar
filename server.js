const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
const DB = path.join(process.env.DATA_DIR || __dirname, 'reports.json');

/* ---------- DATA ---------- */
const SCAMS = [
 {id:'ig-giveaway',platform:'Instagram',title:'Fake Giveaways & Verified-Badge Phishing',risk:82,
  how:'A page that looks like a big brand or influencer announces a giveaway, or says your account will get a blue tick. You are asked to log in on a "form" link, which steals your password.',
  flags:['Account is new or has a name with extra dots or underscores','Asks you to log in through a link in DMs','Winner chosen without you entering anything','Countdown timers and urgency'],
  protect:['Only log in inside the official app','Check the account age and "About this account"','Turn on 2-factor authentication','Report and block the page']},
 {id:'ig-invest',platform:'Instagram',title:'Reel-Based Trading & Investment Scams',risk:91,
  how:'Reels show luxury lifestyles and "guaranteed" returns. You are moved to Telegram or WhatsApp, shown fake profit screenshots, and pushed to deposit more until the app stops withdrawals.',
  flags:['Guaranteed or daily returns','Private "VIP signal" groups','Fake trading app not on the official app store','Withdrawal needs an extra "tax" or "fee"'],
  protect:['Check the broker on the SEBI website','Never install apps from links','Test-withdraw before depositing more','No legitimate investment guarantees returns']},
 {id:'fb-market',platform:'Facebook',title:'Marketplace Advance & QR Scams',risk:77,
  how:'A buyer says "I will pay by UPI" and sends a QR code or collect request. Scanning it takes money out of your account instead of adding it. Fake sellers ask for an advance and vanish.',
  flags:['Buyer insists on QR codes or "collect" requests','Price far below market','Seller refuses a video call or a meeting','Army or transfer-posting sob story'],
  protect:['Scanning or entering a PIN is only for PAYING, never receiving','Meet in person and inspect first','Pay on delivery for high-value items']},
 {id:'fb-friend',platform:'Facebook',title:'Hacked Friend & Emergency Money Scam',risk:70,
  how:'A friend\'s account is hacked or cloned. "They" message you about a hospital emergency or a stuck payment and ask for quick money.',
  flags:['Out-of-character message with urgency','Won\'t take a voice or video call','Gives a UPI ID of an unknown person'],
  protect:['Call your friend on their normal number','Ask something only they would know','Warn mutual friends']},
 {id:'web-shop',platform:'Websites',title:'Fake Online Stores & Clone Sites',risk:80,
  how:'A professional-looking store runs ads with 80% off deals. You pay and either get nothing or a worthless item. Some clones copy real brands to steal card details.',
  flags:['Ridiculously low prices','Domain is new or has strange endings like .top or .xyz','No real address, GST or return policy','Only UPI or bank transfer accepted'],
  protect:['Check the domain age on WHOIS','Search "<site name> scam" first','Pay with a card or cash on delivery','Look for typos in the URL']},
 {id:'web-kyc',platform:'Websites',title:'KYC / Bank / Refund Phishing Pages',risk:88,
  how:'An SMS or email says your account will be blocked unless you update KYC. The link goes to a copy of your bank site that captures your login, card and OTP in real time.',
  flags:['Link shortener or odd domain','Threat of blocking in 24 hours','Asks for OTP, PIN, CVV or card expiry','Generic greeting instead of your name'],
  protect:['Type your bank\'s address yourself','Banks never ask for OTP or PIN','Call the number printed on your card']},
 {id:'wa-task',platform:'WhatsApp / Telegram',title:'Part-Time Job & Task Scams',risk:93,
  how:'You get "work from home" offers: like videos or rate products and earn a little. Early payouts build trust, then you must "deposit" to unlock bigger tasks and lose everything.',
  flags:['Unknown number offers a job','Pay for "tasks" or "prepaid" orders','Telegram group full of "earners"','Deposits to unlock withdrawals'],
  protect:['Real employers never charge to work','Do not pay to earn','Report the number on sanchaarsaathi.gov.in']},
 {id:'call-arrest',platform:'Phone / Video Call',title:'"Digital Arrest" & Fake Officer Calls',risk:95,
  how:'Someone in uniform on video claims a parcel in your name has drugs or that you are linked to a crime. They keep you on camera, demand secrecy and make you transfer money to a "safe account".',
  flags:['Claims to be CBI, customs, police or TRAI','Keeps you on a call for hours','Demands secrecy','Asks you to move money to verify it'],
  protect:['No agency arrests people over video call','Hang up, then call 1930','Tell a family member immediately']},
 {id:'upi-collect',platform:'UPI & Payments',title:'Collect-Request & Refund Tricks',risk:84,
  how:'A "refund" or "prize" needs you to accept a request on your payment app. You enter your PIN thinking you will receive money, but the request is for you to PAY.',
  flags:['Any "receive money" step that asks for a PIN','A caller guiding you step by step','Screen-share app requests (AnyDesk, TeamViewer)'],
  protect:['PIN is only needed to send money','Never install screen-share apps for strangers','Decline unknown collect requests']}
];
const PLATFORMS = ['Instagram','Facebook','Websites','WhatsApp / Telegram','Phone / Video Call','UPI & Payments','Email / SMS','Other'];

/* ---------- STORAGE ---------- */
let reports = [];
try { reports = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) { reports = []; }
const save = () => fs.writeFile(DB, JSON.stringify(reports.slice(-500)), () => {});

/* ---------- RISK ENGINE ---------- */
const BAD_TLD = ['xyz','top','click','icu','buzz','live','shop','online','site','cfd','sbs','rest','monster','vip','work','loan','gq','tk','ml','cf'];
const SHORT = ['bit.ly','tinyurl.com','t.co','cutt.ly','rb.gy','is.gd','shorturl.at','goo.gl','wa.me'];
const BRANDS = {paypal:['paypal.com'],amazon:['amazon.in','amazon.com'],flipkart:['flipkart.com'],paytm:['paytm.com'],
  phonepe:['phonepe.com'],sbi:['sbi.co.in','onlinesbi.sbi'],hdfc:['hdfcbank.com'],icici:['icicibank.com'],
  instagram:['instagram.com'],facebook:['facebook.com'],whatsapp:['whatsapp.com'],google:['google.com'],
  netflix:['netflix.com'],apple:['apple.com'],microsoft:['microsoft.com'],kotak:['kotak.com'],axis:['axisbank.com'],gpay:['pay.google.com']};
const WORDS = [
 [/otp|one.?time password/,25,'Asks for or mentions an OTP, which nobody legitimate needs from you'],
 [/upi pin|cvv|card number|atm pin|password/,30,'Asks for secret PIN/CVV/password details'],
 [/urgent|immediately|within 24|last chance|expires|act now|final warning/,15,'Creates artificial urgency'],
 [/kyc|account (will be )?(blocked|suspended|closed)|verify your account/,25,'Classic KYC/account-block threat'],
 [/lottery|winner|you have won|prize|lucky draw|congratulations/,25,'Prize or lottery bait'],
 [/guaranteed|double your|daily profit|100% (safe|return)|risk.?free|return of/,25,'Promises guaranteed or unrealistic returns'],
 [/work from home|part.?time job|like and earn|per task|earn \d+|prepaid task/,25,'Task or part-time-job scam pattern'],
 [/refund|customs|parcel|courier|fedex|narcotics|cbi|police|arrest|digital arrest|trai/,25,'Impersonation of officials, couriers or refunds'],
 [/anydesk|teamviewer|quicksupport|screen.?share/,30,'Asks you to install remote-access or screen-share apps'],
 [/registration fee|processing fee|advance|security deposit|pay (a )?fee|tax to release/,25,'Asks for an upfront fee to receive something'],
 [/telegram|whatsapp group|vip group|signal group/,10,'Moves the chat to a private group'],
 [/do not tell|don'?t tell|keep (this )?secret|confidential/,20,'Demands secrecy, which is a manipulation tactic'],
 [/crypto|bitcoin|usdt|forex/,10,'Mentions crypto or forex investing']
];
function scan(input) {
  const text = String(input || '').slice(0, 3000), low = text.toLowerCase();
  let score = 0; const reasons = []; const add = (n, m) => { score += n; reasons.push({points:n, text:m}); };
  const urls = text.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi) || [];
  [...new Set(urls)].slice(0, 5).forEach(u => {
    let host; try { host = new URL(/^https?:\/\//i.test(u) ? u : 'http://' + u).hostname.toLowerCase(); } catch (e) { return; }
    const tld = host.split('.').pop();
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) add(30, host + ' is a raw IP address, not a real brand site');
    if (/^http:\/\//i.test(u)) add(10, 'Link is not using HTTPS');
    if (BAD_TLD.includes(tld)) add(20, host + ' ends in .' + tld + ', which is common on throwaway scam sites');
    if (SHORT.includes(host)) add(15, 'Shortened link hides the real destination');
    if (host.includes('xn--')) add(25, 'Lookalike (punycode) characters in the domain');
    if (u.includes('@')) add(20, 'Contains @ in the link, a trick to hide the real site');
    if ((host.match(/-/g) || []).length >= 3) add(10, 'Domain has many hyphens');
    if (host.length > 35) add(10, 'Unusually long domain');
    for (const b in BRANDS) {
      if (host.includes(b) && !BRANDS[b].some(d => host === d || host.endsWith('.' + d))) { add(35, host + ' imitates "' + b + '" but is not its official domain'); break; }
    }
  });
  WORDS.forEach(w => { if (w[0].test(low)) add(w[1], w[2]); });
  score = Math.min(100, score);
  const level = score < 25 ? 'LOW' : score < 50 ? 'MEDIUM' : score < 75 ? 'HIGH' : 'CRITICAL';
  const advice = {
    LOW: 'No strong scam signals found, but stay careful. Never share OTPs or PINs.',
    MEDIUM: 'Some warning signs. Verify through the official app or website before acting.',
    HIGH: 'Likely a scam. Do not click, pay or reply. Block and report it.',
    CRITICAL: 'Almost certainly a scam. Stop. If you already paid, call 1930 or visit cybercrime.gov.in right away.'
  }[level];
  return {score, level, reasons, advice};
}

/* ---------- HELPERS ---------- */
const hits = new Map();
function limited(ip) { const n = Date.now(), a = (hits.get(ip) || []).filter(t => n - t < 60000); a.push(n); hits.set(ip, a); return a.length > 25; }
function body(req) { return new Promise((res, rej) => { let d = ''; req.on('data', c => { d += c; if (d.length > 10000) { rej(); req.destroy(); } }); req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { rej(); } }); }); }
function send(res, code, obj, type) { res.writeHead(code, {'Content-Type': type || 'application/json; charset=utf-8', 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:"}); res.end(type ? obj : JSON.stringify(obj)); }
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);

/* ---------- SERVER ---------- */
http.createServer(async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const url = req.url.split('?')[0];
  try {
    if (req.method === 'GET' && url === '/') return send(res, 200, PAGE, 'text/html; charset=utf-8');
    if (req.method === 'GET' && url === '/health') return send(res, 200, {ok:true});
    if (req.method === 'GET' && url === '/api/scams') return send(res, 200, {scams:SCAMS, platforms:PLATFORMS});
    if (req.method === 'GET' && url === '/api/stats') {
      const by = {}; reports.forEach(r => by[r.platform] = (by[r.platform] || 0) + 1);
      return send(res, 200, {total:reports.length, amount:reports.reduce((a, r) => a + (r.amount || 0), 0), by});
    }
    if (req.method === 'GET' && url === '/api/reports')
      return send(res, 200, reports.slice(-15).reverse().map(r => ({platform:r.platform, type:r.type, description:r.description, amount:r.amount, ts:r.ts})));
    if (req.method === 'POST' && (url === '/api/scan' || url === '/api/report')) {
      if (limited(ip)) return send(res, 429, {error:'Too many requests. Slow down.'});
      const b = await body(req);
      if (url === '/api/scan') {
        if (!clean(b.text, 5).length) return send(res, 400, {error:'Paste something to scan.'});
        return send(res, 200, scan(b.text));
      }
      const platform = PLATFORMS.includes(b.platform) ? b.platform : 'Other';
      const description = clean(b.description, 500);
      if (description.length < 10) return send(res, 400, {error:'Please describe what happened (10+ characters).'});
      const amount = Math.max(0, Math.min(1e8, Number(b.amount) || 0));
      reports.push({id:Date.now(), platform, type:clean(b.type, 60) || 'Unspecified', description, amount, ts:Date.now()});
      save();
      return send(res, 200, {ok:true});
    }
    send(res, 404, {error:'Not found'});
  } catch (e) { send(res, 400, {error:'Bad request'}); }
}).listen(PORT, () => console.log('SCAMRADAR running → http://localhost:' + PORT));

/* ---------- FRONTEND ---------- */
const PAGE = String.raw`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SCAMRADAR — See the scam before it sees you</title>
<meta name="description" content="Live scam threat radar for Instagram, Facebook, websites, WhatsApp and UPI. Scan suspicious links and messages.">
<style>
:root{--bg:#05060d;--c:#18f0ff;--r:#ff2e63;--y:#ffd23f;--g:#2ee6a6;--t:#e8ecff;--m:#7d86b8;--card:rgba(16,18,40,.6)}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--t);font:16px/1.6 'Segoe UI',system-ui,sans-serif;overflow-x:hidden}
body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:50;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
#bg{position:fixed;inset:0;z-index:-2}
.glow{position:fixed;width:420px;height:420px;border-radius:50%;pointer-events:none;z-index:-1;background:radial-gradient(circle,rgba(24,240,255,.14),transparent 65%);transform:translate(-50%,-50%);left:50%;top:30%}
.mono{font-family:Consolas,'Courier New',monospace}
nav{position:fixed;top:0;left:0;right:0;z-index:40;display:flex;justify-content:space-between;align-items:center;padding:16px 5vw;backdrop-filter:blur(12px);background:rgba(5,6,13,.55);border-bottom:1px solid rgba(24,240,255,.12)}
.logo{font-weight:800;letter-spacing:3px}.logo b{color:var(--r);animation:blink 1.2s infinite}
nav div a{color:var(--m);text-decoration:none;margin-left:22px;font-size:14px;transition:.3s}nav div a:hover{color:var(--c);text-shadow:0 0 12px var(--c)}
@keyframes blink{50%{opacity:.2}}
section{padding:110px 5vw 40px;max-width:1200px;margin:auto}
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding-top:120px}
.tag{display:inline-block;padding:6px 14px;border:1px solid rgba(255,46,99,.5);border-radius:99px;color:var(--r);font-size:12px;letter-spacing:2px;margin-bottom:26px;width:fit-content;background:rgba(255,46,99,.08)}
h1{font-size:clamp(42px,9vw,124px);line-height:.95;font-weight:900;letter-spacing:-2px;position:relative}
h1 span{background:linear-gradient(90deg,var(--c),var(--r));-webkit-background-clip:text;background-clip:text;color:transparent}
h1.gl{animation:glitch .35s steps(2) 1}
@keyframes glitch{0%{transform:translate(-4px,2px);filter:hue-rotate(90deg)}50%{transform:translate(5px,-2px)}100%{transform:none}}
.sub{max-width:640px;color:var(--m);margin:28px 0 38px;font-size:19px}
.btn{display:inline-block;padding:15px 30px;border-radius:12px;border:1px solid var(--c);color:var(--c);background:rgba(24,240,255,.06);text-decoration:none;font-weight:700;letter-spacing:1px;cursor:pointer;font-size:15px;transition:.3s;margin-right:12px}
.btn:hover{background:var(--c);color:#001;box-shadow:0 0 40px rgba(24,240,255,.6);transform:translateY(-3px)}
.btn.red{border-color:var(--r);color:var(--r);background:rgba(255,46,99,.06)}.btn.red:hover{background:var(--r);color:#fff;box-shadow:0 0 40px rgba(255,46,99,.6)}
.ticker{position:fixed;bottom:0;left:0;right:0;z-index:40;overflow:hidden;white-space:nowrap;border-top:1px solid rgba(255,46,99,.3);background:rgba(5,6,13,.85);padding:8px 0;font-size:13px;color:var(--r)}
.ticker div{display:inline-block;animation:tk 60s linear infinite}@keyframes tk{to{transform:translateX(-50%)}}
h2{font-size:clamp(30px,5vw,56px);letter-spacing:-1px;margin-bottom:10px}h2 small{display:block;font-size:13px;color:var(--c);letter-spacing:4px;margin-bottom:8px;font-weight:600}
.lead{color:var(--m);max-width:620px;margin-bottom:36px}
.rv{opacity:0;transform:translateY(50px);transition:opacity 1s,transform 1s}.rv.in{opacity:1;transform:none}
.radarwrap{display:grid;grid-template-columns:minmax(300px,560px) 1fr;gap:34px;align-items:center}
#rad{width:100%;aspect-ratio:1;border-radius:50%;box-shadow:0 0 80px rgba(24,240,255,.15),inset 0 0 60px rgba(24,240,255,.08);cursor:crosshair}
.panel{background:var(--card);border:1px solid rgba(24,240,255,.18);border-radius:20px;padding:28px;backdrop-filter:blur(10px);min-height:360px}
.panel h3{font-size:24px;margin:6px 0 10px}.pill{font-size:12px;letter-spacing:2px;padding:4px 10px;border-radius:99px;border:1px solid}
.panel p{color:#b9c0e6;margin-bottom:14px}.panel h4{color:var(--c);font-size:12px;letter-spacing:3px;margin:14px 0 6px}
.panel li{margin-left:18px;color:#cfd5f5;font-size:14px}
.bar{height:8px;background:#1a1d3a;border-radius:9px;overflow:hidden;margin:10px 0}.bar i{display:block;height:100%;width:0;transition:width 1.2s cubic-bezier(.2,.8,.2,1)}
.scan{background:var(--card);border:1px solid rgba(255,46,99,.25);border-radius:24px;padding:30px;display:grid;grid-template-columns:1.2fr 1fr;gap:30px}
textarea,input,select{width:100%;background:rgba(5,6,13,.8);border:1px solid #262a55;color:var(--t);border-radius:12px;padding:14px;font:15px 'Segoe UI',sans-serif;outline:0;transition:.3s}
textarea:focus,input:focus,select:focus{border-color:var(--c);box-shadow:0 0 24px rgba(24,240,255,.25)}textarea{min-height:190px;resize:vertical;margin-bottom:14px}
.gauge{text-align:center}.gauge svg{width:100%;max-width:300px}.gauge .num{font-size:56px;font-weight:900;margin-top:-70px}.gauge .lvl{letter-spacing:5px;font-size:14px;margin-bottom:12px}
#why li{list-style:none;padding:8px 12px;margin-bottom:6px;border-left:3px solid var(--r);background:rgba(255,46,99,.06);border-radius:0 8px 8px 0;font-size:14px;text-align:left;animation:slide .5s both}
@keyframes slide{from{opacity:0;transform:translateX(-20px)}}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:22px}
.card{background:var(--card);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:24px;transition:transform .15s,border-color .3s,box-shadow .3s;transform-style:preserve-3d;position:relative;overflow:hidden}
.card:hover{border-color:var(--c);box-shadow:0 20px 60px rgba(24,240,255,.12)}
.card:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(24,240,255,.1),transparent 70%);transform:translateX(-100%);transition:.8s}.card:hover:before{transform:translateX(100%)}
.card .plat{font-size:12px;color:var(--c);letter-spacing:3px}.card h3{font-size:19px;margin:8px 0 14px}.card .rk{display:flex;justify-content:space-between;font-size:13px;color:var(--m)}
.steps{position:relative;margin-left:20px;border-left:2px dashed rgba(24,240,255,.3);padding-left:34px}
.step{position:relative;margin-bottom:36px}.step:before{content:attr(data-n);position:absolute;left:-58px;top:0;width:40px;height:40px;border-radius:50%;background:var(--bg);border:2px solid var(--r);display:grid;place-items:center;font-weight:800;color:var(--r);box-shadow:0 0 20px rgba(255,46,99,.4)}
.step h3{margin-bottom:4px}.step p{color:var(--m);max-width:620px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.stats{display:flex;gap:30px;margin-bottom:20px;flex-wrap:wrap}.stats b{display:block;font-size:42px;color:var(--c)}.stats span{color:var(--m);font-size:13px;letter-spacing:2px}
form input,form select,form textarea{margin-bottom:12px}form textarea{min-height:110px}
.feed{display:flex;flex-direction:column;gap:12px;max-height:520px;overflow:auto}
.item{background:var(--card);border-left:3px solid var(--y);border-radius:0 14px 14px 0;padding:14px 18px;animation:slide .6s both}
.item small{color:var(--m)}.item p{font-size:14px;margin-top:4px;color:#cfd5f5}
.sos{margin:60px 0 90px;padding:40px;border-radius:24px;text-align:center;background:linear-gradient(135deg,rgba(255,46,99,.15),rgba(24,240,255,.08));border:1px solid rgba(255,46,99,.4)}
.sos b{font-size:64px;color:var(--r);text-shadow:0 0 40px var(--r);display:block;animation:blink 2s infinite}
footer{text-align:center;color:var(--m);font-size:13px;padding:0 5vw 70px}
@media(max-width:820px){.radarwrap,.scan,.two{grid-template-columns:1fr}nav div a:not(.cta){display:none}}
</style></head><body>
<canvas id="bg"></canvas><div class="glow" id="glow"></div>
<nav><div class="logo mono">SCAM<b>●</b>RADAR</div><div><a href="#radar">Radar</a><a href="#scan">Scanner</a><a href="#platforms">Threats</a><a href="#report">Report</a></div></nav>

<section class="hero">
 <div class="tag mono">● LIVE THREAT MAP · INSTAGRAM · FACEBOOK · WEB · WHATSAPP · UPI</div>
 <h1 id="title" class="gl">YOU ARE<br><span>THE TARGET.</span></h1>
 <p class="sub">Scammers do not hack computers, they hack trust. See where the danger hides, scan anything suspicious, and warn others before they lose money.</p>
 <div><a class="btn" href="#scan">⚡ SCAN A LINK / MESSAGE</a><a class="btn red" href="#radar">VIEW THREAT RADAR</a></div>
</section>

<section id="radar" class="rv">
 <h2><small>// 01 THREAT RADAR</small>Where is the danger right now?</h2>
 <p class="lead">Each blip is a scam type. The closer to the center, the higher the risk. Click one to see how it works.</p>
 <div class="radarwrap"><canvas id="rad" width="600" height="600"></canvas><div class="panel" id="detail"></div></div>
</section>

<section id="scan" class="rv">
 <h2><small>// 02 RISK SCANNER</small>Paste it. We will tell you the risk.</h2>
 <p class="lead">Drop in a suspicious link, SMS, DM or email. The server analyses the domain, wording and pressure tactics. Nothing is stored.</p>
 <div class="scan">
  <div><textarea id="txt" placeholder="e.g. Dear user your SBI KYC expires today. Update now: http://sbi-kyc-update.xyz/login  Share OTP to confirm"></textarea>
   <button class="btn red" id="go">▶ ANALYSE THREAT</button><span id="err" style="color:var(--r)"></span></div>
  <div class="gauge"><svg viewBox="0 0 200 110"><path d="M10 100A90 90 0 0 1 190 100" fill="none" stroke="#1a1d3a" stroke-width="14" stroke-linecap="round"/>
   <path id="arc" d="M10 100A90 90 0 0 1 190 100" fill="none" stroke="#2ee6a6" stroke-width="14" stroke-linecap="round" stroke-dasharray="283" stroke-dashoffset="283" style="transition:stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1),stroke .6s;filter:drop-shadow(0 0 8px currentColor)"/></svg>
   <div class="num mono" id="num">--</div><div class="lvl mono" id="lvl">AWAITING INPUT</div>
   <p id="adv" style="color:var(--m);font-size:14px;margin-bottom:12px"></p><ul id="why"></ul></div>
 </div>
</section>

<section id="platforms" class="rv"><h2><small>// 03 KNOW YOUR ENEMY</small>Every way you can get scammed</h2>
 <p class="lead">Hover the cards. Click one to open it on the radar.</p><div class="grid" id="grid"></div></section>

<section class="rv"><h2><small>// 04 ANATOMY</small>How almost every scam works</h2><br>
 <div class="steps">
  <div class="step" data-n="1"><h3>The Hook</h3><p>An ad, reel, SMS or "friend" makes you curious or scared: free prize, easy money, a blocked account.</p></div>
  <div class="step" data-n="2"><h3>The Move</h3><p>They pull you off the safe platform into WhatsApp, Telegram, a link or a call where nobody can monitor it.</p></div>
  <div class="step" data-n="3"><h3>The Pressure</h3><p>Deadlines, threats, secrecy, "don't tell anyone". Panic switches off careful thinking.</p></div>
  <div class="step" data-n="4"><h3>The Ask</h3><p>OTP, PIN, a small fee, an app install or a "safe account" transfer. This is the moment to stop.</p></div>
  <div class="step" data-n="5"><h3>The Vanish</h3><p>The account disappears. Report within the first hour. The sooner you report, the better the chance of freezing the money.</p></div>
 </div></section>

<section id="report" class="rv"><h2><small>// 05 COMMUNITY</small>Got scammed or nearly? Warn others.</h2>
 <div class="stats"><div><b id="s1">0</b><span>REPORTS</span></div><div><b id="s2">0</b><span>₹ REPORTED LOST</span></div></div>
 <div class="two"><form id="f"><select id="fp"></select><input id="ft" placeholder="Scam type (e.g. fake job, QR scam)" maxlength="60">
  <input id="fa" type="number" min="0" placeholder="Amount lost in ₹ (optional)"><textarea id="fd" placeholder="What happened? Do not include phone numbers or personal details." maxlength="500"></textarea>
  <button class="btn" type="submit">📡 SUBMIT REPORT</button><span id="fm" style="color:var(--g)"></span></form>
  <div class="feed" id="feed"></div></div>
 <div class="sos"><div class="mono" style="letter-spacing:4px;color:var(--m)">LOST MONEY? ACT WITHIN HOURS</div><b>1930</b>
  <p>India's National Cyber Crime Helpline · report at <span style="color:var(--c)">cybercrime.gov.in</span></p></div></section>
<footer>SCAMRADAR · Educational awareness project. The risk score is an estimate, not a guarantee. Always verify with the official source.</footer>
<div class="ticker mono"><div id="tk"></div></div>

<script>
var $=function(i){return document.getElementById(i)};
function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function col(r){return r<25?'#2ee6a6':r<50?'#ffd23f':r<75?'#ff8a3d':'#ff2e63'}
/* glow follows cursor */
var mx=-999,my=-999;document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;var g=$('glow');g.style.left=mx+'px';g.style.top=my+'px'});
/* glitch title */
(function(){var t=$('title');setTimeout(function(){t.classList.remove('gl')},400);
 function run(){t.classList.remove('gl');void t.offsetWidth;t.classList.add('gl')}setInterval(run,7000)})();
/* ticker */
var tips=['NO BANK EVER ASKS FOR YOUR OTP','DIGITAL ARREST DOES NOT EXIST','NEVER ENTER A PIN TO RECEIVE MONEY','REAL JOBS NEVER CHARGE A FEE','GUARANTEED RETURNS = GUARANTEED SCAM','1930 = CYBER CRIME HELPLINE','VERIFY BEFORE YOU CLICK'];
$('tk').textContent=(tips.join('   ///   ')+'   ///   ').repeat(4);
/* reveal */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in')})},{threshold:.12});
document.querySelectorAll('.rv').forEach(function(e){io.observe(e)});
/* animated network background */
(function(){var c=$('bg'),x=c.getContext('2d'),N=[],W,H;
 function rs(){W=c.width=innerWidth;H=c.height=innerHeight;N=[];for(var i=0;i<Math.min(90,W/14);i++)N.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,bad:Math.random()<.1})}
 rs();addEventListener('resize',rs);
 (function loop(){x.clearRect(0,0,W,H);
  N.forEach(function(a,i){a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;
   var dx=a.x-mx,dy=a.y-my,d=Math.sqrt(dx*dx+dy*dy);if(d<130){a.x+=dx/d*1.5;a.y+=dy/d*1.5}
   for(var j=i+1;j<N.length;j++){var b=N[j],q=Math.hypot(a.x-b.x,a.y-b.y);if(q<130){x.strokeStyle=(a.bad||b.bad)?'rgba(255,46,99,'+(1-q/130)*.5+')':'rgba(24,240,255,'+(1-q/130)*.25+')';x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}}
   x.fillStyle=a.bad?'#ff2e63':'#18f0ff';x.beginPath();x.arc(a.x,a.y,a.bad?3.2:1.8,0,6.3);x.fill()});
  requestAnimationFrame(loop)})()})();

/* ---------- data + radar + cards ---------- */
var S=[],sel=0,ang=0;
function panel(i){sel=i;var s=S[i],p=$('detail');p.innerHTML='';var c=col(s.risk);
 var pl=h('span','pill mono',s.platform.toUpperCase());pl.style.color=c;pl.style.borderColor=c;p.appendChild(pl);
 p.appendChild(h('h3','',s.title));var b=h('div','bar'),f=h('i');f.style.background=c;f.style.boxShadow='0 0 14px '+c;b.appendChild(f);p.appendChild(b);
 var rk=h('div','mono','RISK '+s.risk+'/100');rk.style.color=c;rk.style.fontSize='13px';rk.style.marginBottom='12px';p.appendChild(rk);
 setTimeout(function(){f.style.width=s.risk+'%'},50);p.appendChild(h('p','',s.how));
 [['RED FLAGS',s.flags],['HOW TO STAY SAFE',s.protect]].forEach(function(g){p.appendChild(h('h4','mono',g[0]));var u=h('ul');g[1].forEach(function(t){u.appendChild(h('li','',t))});p.appendChild(u)})}
function pos(i,R){var a=i/S.length*6.2832+.4,r=(1-S[i].risk/100)*.62*R+.2*R;return{a:a,x:R+Math.cos(a)*r,y:R+Math.sin(a)*r}}
var rc=$('rad'),rx=rc.getContext('2d');
function draw(){var R=300;rx.clearRect(0,0,600,600);
 rx.fillStyle='rgba(4,10,20,.9)';rx.beginPath();rx.arc(R,R,R-2,0,6.3);rx.fill();
 rx.strokeStyle='rgba(24,240,255,.22)';for(var k=1;k<=4;k++){rx.beginPath();rx.arc(R,R,R*k/4-2,0,6.3);rx.stroke()}
 rx.beginPath();rx.moveTo(0,R);rx.lineTo(600,R);rx.moveTo(R,0);rx.lineTo(R,600);rx.stroke();
 ang+=.018;var gr=rx.createConicGradient?rx.createConicGradient(ang-1.2,R,R):null;
 if(gr){gr.addColorStop(0,'rgba(24,240,255,0)');gr.addColorStop(.19,'rgba(24,240,255,.35)');gr.addColorStop(.2,'rgba(24,240,255,0)');rx.fillStyle=gr;rx.beginPath();rx.arc(R,R,R-2,0,6.3);rx.fill()}
 rx.strokeStyle='#18f0ff';rx.lineWidth=2;rx.beginPath();rx.moveTo(R,R);rx.lineTo(R+Math.cos(ang)*(R-2),R+Math.sin(ang)*(R-2));rx.stroke();rx.lineWidth=1;
 S.forEach(function(s,i){var p=pos(i,R),d=((ang-p.a)%6.2832+6.2832)%6.2832,g=Math.max(0,1-d/2.2),c=col(s.risk);
  rx.fillStyle=c;rx.globalAlpha=.35+g*.65;rx.shadowColor=c;rx.shadowBlur=10+g*25;rx.beginPath();rx.arc(p.x,p.y,6+g*6+(i===sel?4:0),0,6.3);rx.fill();
  if(i===sel){rx.globalAlpha=1;rx.strokeStyle=c;rx.beginPath();rx.arc(p.x,p.y,18+Math.sin(Date.now()/200)*3,0,6.3);rx.stroke()}
  rx.shadowBlur=0;rx.globalAlpha=.9;rx.fillStyle='#e8ecff';rx.font='13px Consolas,monospace';rx.fillText(s.platform.split(' ')[0],p.x+14,p.y+4);rx.globalAlpha=1});
 requestAnimationFrame(draw)}
rc.addEventListener('click',function(e){var b=rc.getBoundingClientRect(),x=(e.clientX-b.left)*600/b.width,y=(e.clientY-b.top)*600/b.height,best=-1,bd=40;
 S.forEach(function(s,i){var p=pos(i,300),d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best=i}});if(best>=0)panel(best)});
fetch('/api/scams').then(function(r){return r.json()}).then(function(d){S=d.scams;panel(0);draw();
 var g=$('grid');S.forEach(function(s,i){var c=h('div','card rv');c.appendChild(h('div','plat mono',s.platform.toUpperCase()));c.appendChild(h('h3','',s.title));
  var r=h('div','rk mono');r.appendChild(h('span','','RISK'));var v=h('span','',s.risk+'/100');v.style.color=col(s.risk);r.appendChild(v);c.appendChild(r);
  var b=h('div','bar'),f=h('i');f.style.background=col(s.risk);f.style.width=s.risk+'%';b.appendChild(f);c.appendChild(b);
  c.addEventListener('mousemove',function(e){var q=c.getBoundingClientRect(),px=(e.clientX-q.left)/q.width-.5,py=(e.clientY-q.top)/q.height-.5;c.style.transform='perspective(700px) rotateY('+px*12+'deg) rotateX('+(-py*12)+'deg) scale(1.03)'});
  c.addEventListener('mouseleave',function(){c.style.transform=''});
  c.addEventListener('click',function(){panel(i);$('radar').scrollIntoView({behavior:'smooth'})});g.appendChild(c);io.observe(c)});
 d.platforms.forEach(function(p){var o=h('option','',p);o.value=p;$('fp').appendChild(o)})});

/* ---------- scanner ---------- */
function countTo(el,to,ms){var t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/ms);el.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)})(t0)}
$('go').addEventListener('click',function(){$('err').textContent='';var v=$('txt').value;
 $('lvl').textContent='SCANNING…';$('why').innerHTML='';$('arc').style.strokeDashoffset=283;
 fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:v})}).then(function(r){return r.json()}).then(function(d){
  if(d.error){$('err').textContent=' '+d.error;$('lvl').textContent='AWAITING INPUT';return}
  setTimeout(function(){var c=col(d.score);$('arc').style.stroke=c;$('arc').style.color=c;$('arc').style.strokeDashoffset=283*(1-d.score/100);
   countTo($('num'),d.score,1600);$('num').style.color=c;$('lvl').textContent=d.level+' RISK';$('lvl').style.color=c;$('adv').textContent=d.advice;
   d.reasons.forEach(function(r,i){var li=h('li','','+'+r.points+'  '+r.text);li.style.animationDelay=(i*.12)+'s';$('why').appendChild(li)});
   if(!d.reasons.length)$('why').appendChild(h('li','','No known scam patterns detected.'))},300)}).catch(function(){$('err').textContent=' Server unreachable.'})});

/* ---------- reports ---------- */
function ago(t){var s=(Date.now()-t)/1000;return s<60?'just now':s<3600?Math.floor(s/60)+' min ago':s<86400?Math.floor(s/3600)+' h ago':Math.floor(s/86400)+' d ago'}
function load(){fetch('/api/stats').then(function(r){return r.json()}).then(function(d){countTo($('s1'),d.total,900);countTo($('s2'),d.amount,1200)});
 fetch('/api/reports').then(function(r){return r.json()}).then(function(a){var f=$('feed');f.innerHTML='';
  if(!a.length){f.appendChild(h('div','item','No reports yet. Be the first to warn others.'));return}
  a.forEach(function(r){var i=h('div','item');var s=h('small','mono',r.platform+' · '+r.type+(r.amount?' · ₹'+r.amount:'')+' · '+ago(r.ts));i.appendChild(s);i.appendChild(h('p','',r.description));f.appendChild(i)})})}
load();setInterval(load,15000);
$('f').addEventListener('submit',function(e){e.preventDefault();
 fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform:$('fp').value,type:$('ft').value,amount:$('fa').value,description:$('fd').value})})
 .then(function(r){return r.json()}).then(function(d){var m=$('fm');if(d.ok){m.style.color='#2ee6a6';m.textContent=' Report received. Thank you!';$('f').reset();load()}else{m.style.color='#ff2e63';m.textContent=' '+d.error}})});
</script></body></html>`;
