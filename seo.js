/* SCAMRADAR SEO + trust pages. Loaded by server.js with: require('./seo.js');
   Adds /robots.txt, /sitemap.xml, /scams, /scam/<name>, /hi/scam/<name>, /about, /privacy, /contact.
   Optional Render setting CONTACT_EMAIL changes the public contact address. */
const http = require('http');
const EMAIL = process.env.CONTACT_EMAIL || 'divyamaini16@gmail.com';
const SLUG = {'call-arrest': 'digital-arrest-scam', 'upi-collect': 'upi-collect-request-scam', 'wa-task': 'part-time-job-task-scam',
  'web-kyc': 'kyc-update-phishing', 'web-shop': 'fake-online-store-scam', 'fb-market': 'marketplace-qr-code-scam',
  'fb-friend': 'hacked-friend-emergency-money-scam', 'ig-invest': 'instagram-investment-scam', 'ig-giveaway': 'instagram-giveaway-scam'};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const origin = req => String(req.headers['x-forwarded-proto'] || 'https').split(',')[0] + '://' + req.headers.host;
const scams = () => { try { return require('./server.js').SCAMS || []; } catch (e) { return []; } };
const TAGS = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-PB9GCGLQJX"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-PB9GCGLQJX");</script>' +
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2610065563716071" crossorigin="anonymous"></script>';
const CSS = '*{box-sizing:border-box;margin:0;padding:0}body{background:#05060d;color:#e8ecff;font:17px/1.7 "Segoe UI","Nirmala UI",system-ui,sans-serif;padding:0 16px 60px}' +
  'main{max-width:760px;margin:auto}a{color:#18f0ff}nav{max-width:760px;margin:auto;display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:16px 0}' +
  '.logo{font-weight:800;letter-spacing:3px;font-family:Consolas,monospace;color:#e8ecff;text-decoration:none}.logo b{color:#ff2e63}' +
  'h1{font-size:30px;line-height:1.25;margin:10px 0}h2{font-size:21px;color:#18f0ff;margin:26px 0 8px}p{margin:10px 0;color:#cfd5f5}li{margin:6px 0 6px 22px;color:#cfd5f5}' +
  '.pill{display:inline-block;font:700 12px Consolas,monospace;letter-spacing:2px;border:1px solid #ff2e63;color:#ff2e63;border-radius:99px;padding:3px 12px;margin-right:8px}' +
  '.box{background:rgba(16,18,40,.7);border:1px solid #262a55;border-radius:16px;padding:18px;margin:24px 0}.btn{display:inline-block;padding:11px 18px;border-radius:12px;border:1px solid #18f0ff;font-weight:700;text-decoration:none;margin:6px 8px 0 0}' +
  '.btn.red{background:#ff2e63;border-color:#ff2e63;color:#fff}.fine{color:#7d86b8;font-size:13px}footer{max-width:760px;margin:40px auto 0;border-top:1px solid #262a55;padding-top:16px}';

function layout(req, o) {
  const base = origin(req), lang = o.lang || 'en';
  const alt = o.alt ? '<link rel="alternate" hreflang="en" href="' + base + o.alt.en + '"><link rel="alternate" hreflang="hi" href="' + base + o.alt.hi + '">' : '';
  const hi = lang === 'hi';
  return '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(o.title) + '</title>' +
    '<meta name="description" content="' + esc(o.desc) + '"><link rel="canonical" href="' + base + o.path + '">' + alt +
    '<meta property="og:title" content="' + esc(o.title) + '"><meta property="og:description" content="' + esc(o.desc) + '"><meta property="og:type" content="article"><meta property="og:url" content="' + base + o.path + '"><meta property="og:image" content="' + base + '/icon-512.png"><meta name="twitter:card" content="summary">' +
    '<meta name="theme-color" content="#05060d"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon-192.png">' + TAGS + '<style>' + CSS + '</style></head><body>' +
    '<nav><a class="logo" href="/">SCAM<b>●</b>RADAR</a><a href="/">' + (hi ? 'होम' : 'Home') + '</a><a href="' + (hi ? '/hi/scams' : '/scams') + '">' + (hi ? 'स्कैम गाइड' : 'Scam guides') + '</a><a href="/help">' + (hi ? 'मदद' : 'Get help') + '</a>' +
    (o.alt ? '<a href="' + (hi ? o.alt.en : o.alt.hi) + '">' + (hi ? 'English' : 'हिन्दी') + '</a>' : '') + '</nav><main>' + o.body + '</main>' +
    '<footer class="fine"><a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/contact">Contact</a> · <a href="/scams">Scam guides</a><br>' +
    (hi ? 'ScamRadar एक स्वतंत्र जागरूकता प्रोजेक्ट है, पुलिस या सरकार से जुड़ा नहीं है। ठगी हो जाए तो तुरंत 1930 पर कॉल करें।' : 'ScamRadar is an independent awareness project, not connected to the police or government. If you have been scammed, call 1930 right away.') + '</footer></body></html>';
}
const list = a => '<ul>' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';

function scamPage(req, s, hi) {
  const slug = SLUG[s.id] || s.id, t = hi && s.hi ? s.hi.title : s.title, how = hi && s.hi ? s.hi.how : s.how;
  const others = scams().filter(x => x.id !== s.id).map(x => '<li><a href="' + (hi ? '/hi' : '') + '/scam/' + (SLUG[x.id] || x.id) + '">' + esc(hi && x.hi ? x.hi.title : x.title) + '</a></li>').join('');
  const body = '<h1>' + esc(t) + '</h1><p><span class="pill">' + esc(s.platform.toUpperCase()) + '</span><span class="pill">' + (hi ? 'जोखिम ' : 'RISK ') + s.risk + '/100</span></p>' +
    '<h2>' + (hi ? 'यह कैसे काम करता है' : 'How this scam works') + '</h2><p>' + esc(how) + '</p>' +
    '<h2>' + (hi ? 'ख़तरे के संकेत (English)' : 'Red flags') + '</h2>' + list(s.flags) +
    '<h2>' + (hi ? 'कैसे बचें (English)' : 'How to stay safe') + '</h2>' + list(s.protect) +
    '<div class="box"><b>' + (hi ? 'क्या अभी आपके साथ ऐसा हो रहा है?' : 'Is this happening to you right now?') + '</b><p>' + (hi ? 'रुकिए, पैसे न भेजें और अपना OTP या PIN किसी को न बताएँ।' : 'Stop, do not send money, and never share your OTP or PIN.') + '</p>' +
    '<a class="btn red" href="/help">' + (hi ? '🆘 क्या हो रहा है?' : '🆘 Get help now') + '</a><a class="btn" href="/#scan">' + (hi ? 'मैसेज जाँचें' : 'Check a message') + '</a><a class="btn" href="/complaint">' + (hi ? 'शिकायत बनाएँ' : 'Make a complaint') + '</a><a class="btn" href="tel:1930">1930</a></div>' +
    '<h2>' + (hi ? 'दूसरे स्कैम गाइड' : 'Other scam guides') + '</h2><ul>' + others + '</ul>';
  return layout(req, {title: t + ' | ScamRadar', desc: how.slice(0, 155), path: (hi ? '/hi' : '') + '/scam/' + slug, lang: hi ? 'hi' : 'en',
    alt: {en: '/scam/' + slug, hi: '/hi/scam/' + slug}, body});
}
function indexPage(req, hi) {
  const items = scams().map(s => '<li><a href="' + (hi ? '/hi' : '') + '/scam/' + (SLUG[s.id] || s.id) + '">' + esc(hi && s.hi ? s.hi.title : s.title) + '</a> <span class="fine">(' + esc(s.platform) + ')</span></li>').join('');
  return layout(req, {title: (hi ? 'स्कैम गाइड: कैसे पहचानें और बचें' : 'Scam guides: how to spot and avoid common scams in India') + ' | ScamRadar',
    desc: hi ? 'भारत में आम ऑनलाइन ठगियों की सरल गाइड: डिजिटल अरेस्ट, UPI, KYC, नकली जॉब और ज़्यादा।' : 'Plain guides to common online scams in India: digital arrest, UPI and QR scams, fake KYC, task jobs, investment scams and more.',
    path: hi ? '/hi/scams' : '/scams', lang: hi ? 'hi' : 'en', alt: {en: '/scams', hi: '/hi/scams'},
    body: '<h1>' + (hi ? 'स्कैम गाइड' : 'Scam guides') + '</h1><p>' + (hi ? 'किसी स्कैम पर टैप करके देखें वह कैसे काम करता है और उससे कैसे बचें।' : 'Tap a scam to see how it works and how to stay safe.') + '</p><ul>' + items + '</ul>'});
}
const ABOUT = '<h1>About ScamRadar</h1><p>ScamRadar is a free awareness and help tool that shows people how online scams work in India, checks suspicious messages, and guides them step by step if they are being scammed or have already lost money.</p>' +
  '<h2>What we do</h2><p>We show live scam news, scan messages and links for warning signs, explain common scams in Hindi and English, and help people prepare a complaint for cybercrime.gov.in, their bank, and the 1930 helpline.</p>' +
  '<h2>What we are not</h2><p>ScamRadar is an independent project. It is not connected to the police, the government, any bank or any payment app. Our risk scores are estimates, not guarantees. Always check with the official source, and call 1930 if you have lost money.</p>' +
  '<h2>Who builds it</h2><p>ScamRadar is built by Divya Maini, a student developer in Delhi. Questions or corrections are welcome on the <a href="/contact">contact page</a>.</p>';
const PRIVACY = '<h1>Privacy policy</h1><p class="fine">Last updated: November 2026</p>' +
  '<h2>What you type</h2><p>Messages you paste into the scanner are checked on our server and are not stored. The complaint helper runs in your browser, and what you type there is not sent to us.</p>' +
  '<h2>AI helper</h2><p>If the AI helper is switched on, the text you submit is sent to an AI service (Anthropic) to produce the analysis. We do not store it. Please do not include passwords, OTPs or card numbers.</p>' +
  '<h2>Community reports</h2><p>If you submit a report, we store the platform, scam type, description, optional amount, state and optional scammer identifier (such as a UPI ID or number). Please do not include your own phone number or personal details.</p>' +
  '<h2>Analytics and ads</h2><p>We use Google Analytics to understand how the site is used, and Google AdSense may show ads. These services use cookies and similar technology. You can learn how Google uses data at policies.google.com/technologies/partner-sites and manage ad settings at adssettings.google.com.</p>' +
  '<h2>Your choices</h2><p>You can clear your browser data at any time. To ask about a report you submitted, contact us.</p>' +
  '<h2>Children</h2><p>ScamRadar is meant for general audiences and does not knowingly collect personal information from children.</p>' +
  '<h2>Contact</h2><p>See the <a href="/contact">contact page</a>.</p>';
const contact = () => '<h1>Contact</h1><p>Have a question, a correction, a scam to report, or a partnership idea? Email us:</p><p><a href="mailto:' + esc(EMAIL) + '">' + esc(EMAIL) + '</a></p>' +
  '<div class="box"><b>Lost money to a scam?</b><p>Do not wait for an email reply. Call <a href="tel:1930">1930</a> now and report at cybercrime.gov.in. ScamRadar cannot recover money or file a complaint for you.</p></div>';

function sitemap(req) {
  const b = origin(req), d = new Date().toISOString().slice(0, 10);
  const urls = ['/', '/help', '/complaint', '/scams', '/hi/scams', '/about', '/privacy', '/contact'];
  scams().forEach(s => { urls.push('/scam/' + (SLUG[s.id] || s.id)); urls.push('/hi/scam/' + (SLUG[s.id] || s.id)); });
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map(u => '<url><loc>' + b + u + '</loc><lastmod>' + d + '</lastmod></url>').join('') + '</urlset>';
}

const HOME_META = b => '<meta property="og:title" content="ScamRadar: see the scam before it sees you"><meta property="og:description" content="Free scam checker, live scam news and step-by-step help in Hindi and English."><meta property="og:type" content="website"><meta property="og:image" content="' + b + '/icon-512.png"><link rel="canonical" href="' + b + '/">';
const HOME_LINKS = '<div style="text-align:center;padding:0 5vw 20px;font-size:14px"><a href="/scams" style="color:#18f0ff">Scam guides</a> · <a href="/hi/scams" style="color:#18f0ff">स्कैम गाइड</a> · <a href="/about" style="color:#18f0ff">About</a> · <a href="/privacy" style="color:#18f0ff">Privacy</a> · <a href="/contact" style="color:#18f0ff">Contact</a></div>';

const orig = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex(a => typeof a === 'function');
  if (i >= 0) {
    const handler = args[i];
    args[i] = function (req, res) {
      const url = (req.url || '').split('?')[0].replace(/\/+$/, '') || '/';
      if (req.method === 'GET') {
        const out = (type, body, code) => { res.writeHead(code || 200, {'Content-Type': type, 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com; img-src * data:; connect-src *; frame-src *"}); res.end(body); };
        const html = 'text/html; charset=utf-8';
        if (url === '/robots.txt') return out('text/plain; charset=utf-8', 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ' + origin(req) + '/sitemap.xml\n');
        if (url === '/sitemap.xml') return out('application/xml; charset=utf-8', sitemap(req));
        if (url === '/about') return out(html, layout(req, {title: 'About ScamRadar', desc: 'ScamRadar is a free, independent tool that helps people in India spot online scams and know what to do next.', path: '/about', body: ABOUT}));
        if (url === '/privacy') return out(html, layout(req, {title: 'Privacy policy | ScamRadar', desc: 'How ScamRadar handles the messages, reports and analytics data of its visitors.', path: '/privacy', body: PRIVACY}));
        if (url === '/contact') return out(html, layout(req, {title: 'Contact ScamRadar', desc: 'Contact the ScamRadar team with questions, corrections or partnership ideas.', path: '/contact', body: contact()}));
        if (url === '/scams') return out(html, indexPage(req, false));
        if (url === '/hi/scams') return out(html, indexPage(req, true));
        const m = url.match(/^(\/hi)?\/scam\/([a-z0-9-]+)$/);
        if (m) {
          const s = scams().find(x => (SLUG[x.id] || x.id) === m[2]);
          if (s) return out(html, scamPage(req, s, !!m[1]));
        }
        if (url === '/') {
          const end = res.end.bind(res);
          res.end = function (chunk, ...rest) {
            if (typeof chunk === 'string' && chunk.includes('</head>')) {
              chunk = chunk.replace('</head>', () => HOME_META(origin(req)) + '</head>');
              if (chunk.includes('<footer')) chunk = chunk.replace('<footer', () => HOME_LINKS + '<footer');
            }
            return end(chunk, ...rest);
          };
        }
      }
      return handler.apply(this, arguments);
    };
  }
  return orig.apply(http, args);
};
