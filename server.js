/* SCAMRADAR v2 - one file: backend + database + live news + website
   Optional env vars: SUPABASE_URL, SUPABASE_KEY (database), ADMIN_PASSWORD (admin page), DATA_DIR, PORT */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(process.env.DATA_DIR || __dirname, 'reports.json');
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, ''), SB_KEY = process.env.SUPABASE_KEY || '';
const ADMIN = process.env.ADMIN_PASSWORD || '';
const useDB = !!(SB_URL && SB_KEY);

/* ================= DATA ================= */
const SCAMS = [
 {id:'ig-giveaway',platform:'Instagram',title:'Fake Giveaways & Verified-Badge Phishing',risk:82,
  how:'A page that looks like a big brand or influencer announces a giveaway, or says your account will get a blue tick. You are asked to log in on a "form" link, which steals your password.',
  flags:['Account is new or has a name with extra dots or underscores','Asks you to log in through a link in DMs','Winner chosen without you entering anything','Countdown timers and urgency'],
  protect:['Only log in inside the official app','Check the account age and "About this account"','Turn on 2-factor authentication','Report and block the page'],
  hi:{title:'नकली गिवअवे और ब्लू-टिक फ़िशिंग',how:'कोई पेज बड़े ब्रांड या इन्फ्लुएंसर बनकर गिवअवे या ब्लू टिक का लालच देता है। "फ़ॉर्म" के लिंक पर लॉगिन कराकर आपका पासवर्ड चुरा लेता है।'}},
 {id:'ig-invest',platform:'Instagram',title:'Reel-Based Trading & Investment Scams',risk:91,
  how:'Reels show luxury lifestyles and "guaranteed" returns. You are moved to Telegram or WhatsApp, shown fake profit screenshots, and pushed to deposit more until the app stops withdrawals.',
  flags:['Guaranteed or daily returns','Private "VIP signal" groups','Fake trading app not on the official app store','Withdrawal needs an extra "tax" or "fee"'],
  protect:['Check the broker on the SEBI website','Never install apps from links','Test-withdraw before depositing more','No legitimate investment guarantees returns'],
  hi:{title:'रील वाले ट्रेडिंग और निवेश घोटाले',how:'रील में आलीशान ज़िंदगी और "पक्के" मुनाफ़े का दावा होता है। फिर आपको टेलीग्राम या व्हाट्सऐप पर ले जाकर नकली प्रॉफ़िट दिखाया जाता है, और ज़्यादा पैसे डलवाकर विड्रॉल बंद कर दिया जाता है।'}},
 {id:'fb-market',platform:'Facebook',title:'Marketplace Advance & QR Scams',risk:77,
  how:'A buyer says "I will pay by UPI" and sends a QR code or collect request. Scanning it takes money out of your account instead of adding it. Fake sellers ask for an advance and vanish.',
  flags:['Buyer insists on QR codes or "collect" requests','Price far below market','Seller refuses a video call or a meeting','Army or transfer-posting sob story'],
  protect:['Scanning or entering a PIN is only for PAYING, never receiving','Meet in person and inspect first','Pay on delivery for high-value items'],
  hi:{title:'मार्केटप्लेस एडवांस और QR घोटाला',how:'ख़रीदार UPI से पेमेंट का कहकर QR कोड या कलेक्ट रिक्वेस्ट भेजता है। स्कैन करने पर पैसा आता नहीं, कट जाता है। नकली विक्रेता एडवांस लेकर ग़ायब हो जाते हैं।'}},
 {id:'fb-friend',platform:'Facebook',title:'Hacked Friend & Emergency Money Scam',risk:70,
  how:'A friend\'s account is hacked or cloned. "They" message you about a hospital emergency or a stuck payment and ask for quick money.',
  flags:['Out-of-character message with urgency','Won\'t take a voice or video call','Gives a UPI ID of an unknown person'],
  protect:['Call your friend on their normal number','Ask something only they would know','Warn mutual friends'],
  hi:{title:'हैक या क्लोन दोस्त से इमरजेंसी पैसे',how:'दोस्त का अकाउंट हैक या क्लोन करके अस्पताल या अटके पेमेंट का बहाना बनाया जाता है और जल्दी पैसे माँगे जाते हैं।'}},
 {id:'web-shop',platform:'Websites',title:'Fake Online Stores & Clone Sites',risk:80,
  how:'A professional-looking store runs ads with 80% off deals. You pay and either get nothing or a worthless item. Some clones copy real brands to steal card details.',
  flags:['Ridiculously low prices','Domain is new or has strange endings like .top or .xyz','No real address, GST or return policy','Only UPI or bank transfer accepted'],
  protect:['Check the domain age on WHOIS','Search "<site name> scam" first','Pay with a card or cash on delivery','Look for typos in the URL'],
  hi:{title:'नकली ऑनलाइन स्टोर और क्लोन साइट',how:'80% छूट वाले विज्ञापन से सजी साइट पर पेमेंट के बाद या तो सामान नहीं आता या बेकार चीज़ आती है। कुछ क्लोन साइटें कार्ड की जानकारी भी चुराती हैं।'}},
 {id:'web-kyc',platform:'Websites',title:'KYC / Bank / Refund Phishing Pages',risk:88,
  how:'An SMS or email says your account will be blocked unless you update KYC. The link goes to a copy of your bank site that captures your login, card and OTP in real time.',
  flags:['Link shortener or odd domain','Threat of blocking in 24 hours','Asks for OTP, PIN, CVV or card expiry','Generic greeting instead of your name'],
  protect:['Type your bank\'s address yourself','Banks never ask for OTP or PIN','Call the number printed on your card'],
  hi:{title:'KYC / बैंक / रिफ़ंड फ़िशिंग पेज',how:'SMS या ईमेल कहता है कि KYC अपडेट नहीं किया तो अकाउंट बंद हो जाएगा। लिंक आपके बैंक की नकली साइट पर ले जाता है, जो लॉगिन, कार्ड और OTP तुरंत चुरा लेती है।'}},
 {id:'wa-task',platform:'WhatsApp / Telegram',title:'Part-Time Job & Task Scams',risk:93,
  how:'You get "work from home" offers: like videos or rate products and earn a little. Early payouts build trust, then you must "deposit" to unlock bigger tasks and lose everything.',
  flags:['Unknown number offers a job','Pay for "tasks" or "prepaid" orders','Telegram group full of "earners"','Deposits to unlock withdrawals'],
  protect:['Real employers never charge to work','Do not pay to earn','Report the number on sancharsaathi.gov.in'],
  hi:{title:'पार्ट-टाइम जॉब और टास्क घोटाला',how:'वीडियो लाइक करने या प्रोडक्ट रेट करने पर कमाई का ऑफ़र आता है। शुरू में थोड़ा पैसा मिलता है, फिर बड़े टास्क के लिए "डिपॉज़िट" माँगा जाता है और सारा पैसा डूब जाता है।'}},
 {id:'call-arrest',platform:'Phone / Video Call',title:'"Digital Arrest" & Fake Officer Calls',risk:95,
  how:'Someone in uniform on video claims a parcel in your name has drugs or that you are linked to a crime. They keep you on camera, demand secrecy and make you transfer money to a "safe account".',
  flags:['Claims to be CBI, customs, police or TRAI','Keeps you on a call for hours','Demands secrecy','Asks you to move money to verify it'],
  protect:['No agency arrests people over video call','Hang up, then call 1930','Tell a family member immediately'],
  hi:{title:'"डिजिटल अरेस्ट" और नकली अफ़सर कॉल',how:'वर्दी में कोई वीडियो कॉल पर कहता है कि आपके नाम के पार्सल में ड्रग्स मिले हैं या आप किसी अपराध से जुड़े हैं। वे आपको कैमरे पर रोके रखते हैं, किसी को बताने से मना करते हैं और "सेफ़ अकाउंट" में पैसे डलवाते हैं।'}},
 {id:'upi-collect',platform:'UPI & Payments',title:'Collect-Request & Refund Tricks',risk:84,
  how:'A "refund" or "prize" needs you to accept a request on your payment app. You enter your PIN thinking you will receive money, but the request is for you to PAY.',
  flags:['Any "receive money" step that asks for a PIN','A caller guiding you step by step','Screen-share app requests (AnyDesk, TeamViewer)'],
  protect:['PIN is only needed to send money','Never install screen-share apps for strangers','Decline unknown collect requests'],
  hi:{title:'कलेक्ट-रिक्वेस्ट और रिफ़ंड की चाल',how:'"रिफ़ंड" या "इनाम" के नाम पर आपसे पेमेंट ऐप में रिक्वेस्ट एक्सेप्ट कराई जाती है। आप PIN डालते हैं यह सोचकर कि पैसे आएँगे, पर असल में पैसे कटते हैं।'}}
];
const PLATFORMS = ['Instagram','Facebook','Websites','WhatsApp / Telegram','Phone / Video Call','UPI & Payments','Email / SMS','Other'];

/* code, name, grid x, grid y, keywords (states + major cities) */
const STATES = [
['JK','Jammu & Kashmir',2,0,'jammu|kashmir|srinagar'],['LA','Ladakh',3,0,'ladakh|leh'],
['PB','Punjab',2,1,'punjab|ludhiana|amritsar|jalandhar|mohali|chandigarh|patiala'],['HP','Himachal Pradesh',3,1,'himachal|shimla|manali'],
['UK','Uttarakhand',4,1,'uttarakhand|dehradun|haridwar|nainital'],
['HR','Haryana',2,2,'haryana|gurugram|gurgaon|faridabad|panipat|hisar|rohtak|sonipat'],['DL','Delhi',3,2,'delhi'],
['UP','Uttar Pradesh',4,2,'uttar pradesh|lucknow|noida|ghaziabad|kanpur|varanasi|agra|meerut|prayagraj|allahabad|bareilly|gorakhpur'],
['BR','Bihar',5,2,'bihar|patna|gaya|muzaffarpur|bhagalpur'],['SK','Sikkim',6,2,'sikkim|gangtok'],['AR','Arunachal Pradesh',8,2,'arunachal|itanagar'],
['RJ','Rajasthan',2,3,'rajasthan|jaipur|jodhpur|udaipur|kota|alwar|bharatpur|ajmer|bikaner'],
['MP','Madhya Pradesh',3,3,'madhya pradesh|bhopal|indore|gwalior|jabalpur|ujjain'],['CG','Chhattisgarh',4,3,'chhattisgarh|raipur|bilaspur|bhilai'],
['JH','Jharkhand',5,3,'jharkhand|ranchi|jamshedpur|dhanbad|jamtara|bokaro'],['WB','West Bengal',6,3,'west bengal|kolkata|siliguri|howrah|durgapur'],
['AS','Assam',7,3,'assam|guwahati|dibrugarh'],['NL','Nagaland',8,3,'nagaland|kohima|dimapur'],
['GJ','Gujarat',2,4,'gujarat|ahmedabad|surat|vadodara|rajkot|gandhinagar|bhavnagar'],
['MH','Maharashtra',3,4,'maharashtra|mumbai|pune|nagpur|thane|nashik|aurangabad|navi mumbai|kolhapur'],
['TG','Telangana',4,4,'telangana|hyderabad|cyberabad|warangal|secunderabad'],['OD','Odisha',5,4,'odisha|bhubaneswar|cuttack|rourkela'],
['ML','Meghalaya',7,4,'meghalaya|shillong'],['MN','Manipur',8,4,'manipur|imphal'],
['GA','Goa',3,5,'goa|panaji|margao'],['KA','Karnataka',4,5,'karnataka|bengaluru|bangalore|mysuru|mysore|mangaluru|hubballi|belagavi'],
['AP','Andhra Pradesh',5,5,'andhra|visakhapatnam|vizag|vijayawada|tirupati|amaravati|guntur'],['TR','Tripura',7,5,'tripura|agartala'],['MZ','Mizoram',8,5,'mizoram|aizawl'],
['KL','Kerala',4,6,'kerala|kochi|thiruvananthapuram|trivandrum|kozhikode|kannur|thrissur'],
['TN','Tamil Nadu',5,6,'tamil nadu|chennai|coimbatore|madurai|tiruchirappalli|trichy|salem']
].map(s => ({c:s[0], n:s[1], x:s[2], y:s[3], re:new RegExp('\\b(' + s[4] + ')\\b', 'i')}));
const STATE_CODES = STATES.map(s => s.c);

const QUIZ = [
 {id:1,text:'SBI ALERT: Your KYC has expired. Account will be blocked today. Update now at http://sbi-kyc-update.xyz',scam:true,why:'Fake KYC deadline, a look-alike domain ending in .xyz and a threat to block your account. Banks never do this over SMS links.'},
 {id:2,text:'Your OTP for HDFC Bank NetBanking login is 482913. Do not share it with anyone. Bank never asks for OTP.',scam:false,why:'This is a normal OTP message you triggered yourself. It becomes dangerous only if someone asks you to read the OTP out.'},
 {id:3,text:'Hi, I am from Amazon HR. Earn Rs 3,000 a day just by liking YouTube videos. Join our Telegram group now.',scam:true,why:'Classic task scam: unknown number, easy money, Telegram group. Real employers do not hire through random messages like this.'},
 {id:4,text:'Your Swiggy order is out for delivery. Track it live in the app. (from the Swiggy sender ID)',scam:false,why:'No link to click, no pressure, no payment request, and it matches an order you placed.'},
 {id:5,text:'This is CBI. A parcel in your name contains drugs. You are under digital arrest. Stay on video and tell nobody.',scam:true,why:'Digital arrest does not exist. Secrecy plus staying on camera is the scammer\'s way of isolating you.'},
 {id:6,text:'Sir I want your sofa. I will send Rs 500 as token. Please scan this QR to receive the money.',scam:true,why:'You never scan a QR or enter a PIN to RECEIVE money. Scanning it sends money out.'},
 {id:7,text:'Mom this is my new number, my phone broke. Please pay this Rs 18,000 bill urgently, I will return it tonight.',scam:true,why:'Cloned-identity trick. Call your child on the old number or ask something only they would know.'},
 {id:8,text:'Dear customer your electricity will be cut tonight at 9:30 pm due to unpaid bill. Call 98xxxxxx now.',scam:true,why:'Fake disconnection threat with a personal mobile number. Check your bill in the official app.'},
 {id:9,text:'Income Tax refund of Rs 15,490 approved. Claim it here: incometax-refund.top',scam:true,why:'The real tax site is incometax.gov.in. A .top domain asking you to claim a refund is phishing.'},
 {id:10,text:'Reminder: your car insurance renews next week. Renew in the official app or at your branch. No action needed today.',scam:false,why:'No link, no urgency, and it points you to the official app. Still verify in the app if unsure.'},
 {id:11,text:'Congratulations! You won an iPhone 15 in the Flipkart lucky draw. Pay Rs 199 delivery charge to claim.',scam:true,why:'You cannot win a draw you never entered, and real prizes never ask you to pay first.'},
 {id:12,text:'Zerodha: Your monthly ledger statement is now available in Console. No action needed.',scam:false,why:'Informational only. It asks for nothing and has no link or pressure.'}
];

/* ================= DATABASE (Supabase over REST, falls back to a local file) ================= */
let reports = [], news = [];
async function sb(method, q, bodyObj, extra) {
  const r = await fetch(SB_URL + '/rest/v1/' + q, {method, signal:AbortSignal.timeout(9000),
    headers:Object.assign({apikey:SB_KEY, Authorization:'Bearer ' + SB_KEY, 'Content-Type':'application/json'}, extra || {}),
    body: bodyObj ? JSON.stringify(bodyObj) : undefined});
  if (!r.ok) throw new Error('DB ' + r.status + ' ' + (await r.text()).slice(0, 160));
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
async function loadData() {
  if (useDB) {
    try {
      reports = (await sb('GET', 'reports?select=*&order=ts.desc&limit=2000')).reverse();
      news = await sb('GET', 'news?select=*&order=ts.desc&limit=400');
      console.log('Database connected: ' + reports.length + ' reports, ' + news.length + ' news stories');
    } catch (e) { console.log('Database problem:', e.message); }
  } else {
    try { reports = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { reports = []; }
    console.log('No database set, saving reports to ' + DB_FILE);
  }
}
async function addReport(r) {
  reports.push(r); if (reports.length > 2000) reports.shift();
  if (useDB) { try { await sb('POST', 'reports', r, {Prefer:'return=minimal'}); } catch (e) { console.log(e.message); } }
  else fs.writeFile(DB_FILE, JSON.stringify(reports), () => {});
}
async function removeReport(id) {
  if (useDB) { try { await sb('DELETE', 'reports?id=eq.' + id); } catch (e) { console.log(e.message); } }
  else fs.writeFile(DB_FILE, JSON.stringify(reports), () => {});
}

/* ================= RISK ENGINE ================= */
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

/* UPI ID / phone / website lookup against community reports */
function normIdent(s) {
  s = String(s || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (/^[+\d][\d\s\-]{7,}$/.test(s)) s = s.replace(/\D/g, '').slice(-10);
  return s.replace(/[^a-z0-9@._\-]/g, '').slice(0, 80);
}
const mask = s => s ? s.slice(0, 3) + '•••' : '';
function checkIdent(q) {
  const n = normIdent(q); if (n.length < 3) return null;
  const m = reports.filter(r => r.ident && r.ident === n);
  const sc = n.includes('.') && !n.includes('@') ? scan(n) : null;
  return {q:n, count:m.length, platforms:[...new Set(m.map(r => r.platform))], level:m.length >= 3 ? 'many' : m.length ? 'some' : 'none',
    signals: sc ? sc.reasons.map(r => r.text) : []};
}

/* ================= LIVE SCAM NEWS (Google News RSS, read on the server) ================= */
const TYPES = [
 ['Digital Arrest', /digital arrest|fake (cbi|police|ed|customs|officer)|posing as (a )?(cbi|police|officer|ed)/i],
 ['Sextortion', /sextort|blackmail|honey.?trap|morphed/i],
 ['Investment / Trading', /invest|trading|stock|crypto|bitcoin|ponzi|forex|returns/i],
 ['Job / Task Scam', /part.?time|task|job (fraud|scam|racket)|work.from.home|recruit|youtube.?like/i],
 ['Loan App', /loan app|instant loan|loan fraud/i],
 ['UPI / Payment', /upi|qr code|payment|bank account|debit card|credit card|otp|net banking|wallet/i],
 ['Social Media', /instagram|facebook|whatsapp|telegram|youtube|social media|snapchat/i],
 ['Phishing / KYC', /phishing|kyc|fake (website|app|link|apk)|apk|sms|link/i],
 ['Online Shopping', /online shopping|fake (store|website)|olx|marketplace|delivery|e-?commerce/i]
];
const SCAMWORD = /scam|fraud|cheat|dupe|swindl|phishing|cyber.?crime|digital arrest|extort|blackmail|conned|ponzi/i;
const BANKS = /punjab national bank|bank of maharashtra|andhra bank|state bank of india|indian overseas bank|bank of baroda/gi;
const FEEDS = [
 ['digital arrest scam India','IN'],['UPI fraud India','IN'],['cyber fraud arrested India','IN'],
 ['Instagram OR Facebook OR WhatsApp scam India','IN'],['online investment fraud India','IN'],
 ['part time job task fraud cyber crime India','IN'],['scam alert fraud warning','WORLD']
];
const dec = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
function parseRSS(xml) {
  const out = [];
  (String(xml).match(/<item>[\s\S]*?<\/item>/g) || []).forEach(it => {
    const g = t => { const m = it.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '>')); return m ? dec(m[1]) : ''; };
    let title = g('title'); const link = g('link'), src = g('source'), ts = Date.parse(g('pubDate'));
    if (src && title.endsWith(' - ' + src)) title = title.slice(0, -(src.length + 3));
    if (!title || !/^https?:\/\//.test(link) || !ts || !SCAMWORD.test(title)) return;
    out.push({title:title.slice(0, 220), link, source:src || 'News', ts:Math.min(ts, Date.now())});
  });
  return out;
}
function tag(title, region) {
  const t = title.replace(BANKS, ''); let best = null, bi = 1e9;
  STATES.forEach(s => { const m = s.re.exec(t); if (m && m.index < bi) { bi = m.index; best = s; } });
  const ty = TYPES.find(x => x[1].test(title));
  return {type:ty ? ty[0] : 'Other fraud', state:best ? best.c : '', place:best ? best.n : (region === 'IN' ? 'India' : 'World')};
}
let newsAt = 0, refreshing = false;
async function refreshNews() {
  if (refreshing || typeof fetch !== 'function') return;
  refreshing = true;
  try {
    const got = [];
    await Promise.all(FEEDS.map(async ([q, reg]) => {
      try {
        const loc = reg === 'IN' ? 'hl=en-IN&gl=IN&ceid=IN:en' : 'hl=en-US&gl=US&ceid=US:en';
        const r = await fetch('https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:7d') + '&' + loc,
          {headers:{'User-Agent':'Mozilla/5.0 ScamRadar'}, signal:AbortSignal.timeout(9000)});
        if (!r.ok) return;
        parseRSS(await r.text()).forEach(x => { x.reg = reg; got.push(x); });
      } catch (e) {}
    }));
    const seenL = new Set(news.map(n => n.link)), seenT = new Set(news.map(n => n.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)));
    const fresh = [];
    got.forEach(x => {
      const k = x.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
      if (seenL.has(x.link) || seenT.has(k)) return;
      seenL.add(x.link); seenT.add(k);
      const t = tag(x.title, x.reg);
      fresh.push({link:x.link, title:x.title, source:x.source, ts:x.ts, type:t.type, state:t.state, place:t.place});
    });
    if (fresh.length) {
      news = news.concat(fresh).sort((a, b) => b.ts - a.ts).slice(0, 400);
      if (useDB) { try { await sb('POST', 'news?on_conflict=link', fresh, {Prefer:'resolution=ignore-duplicates,return=minimal'}); } catch (e) { console.log(e.message); } }
      console.log('News: ' + fresh.length + ' new stories');
    }
    if (got.length) newsAt = Date.now();
  } finally { refreshing = false; }
}

/* ================= HELPERS ================= */
const hits = new Map(), ahits = new Map();
function rate(map, ip, max) { const n = Date.now(), a = (map.get(ip) || []).filter(t => n - t < 60000); a.push(n); map.set(ip, a); return a.length > max; }
setInterval(() => { hits.clear(); ahits.clear(); }, 10 * 60 * 1000).unref();
function body(req) { return new Promise((res, rej) => { let d = ''; req.on('data', c => { d += c; if (d.length > 20000) { rej(); req.destroy(); } }); req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { rej(); } }); }); }
const CSP = "default-src 'self'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net 'wasm-unsafe-eval' blob:; worker-src 'self' blob: https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net https://tessdata.projectnaptha.com; img-src 'self' data: blob:";
function send(res, code, obj, type) {
  const hd = {'Content-Type':type || 'application/json; charset=utf-8', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer'};
  if (type) hd['Content-Security-Policy'] = CSP; else hd['Cache-Control'] = 'no-store';
  res.writeHead(code, hd); res.end(type ? obj : JSON.stringify(obj));
}
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
function okAdmin(k) {
  if (!ADMIN) return false;
  const a = crypto.createHash('sha256').update(String(k || '')).digest(), b = crypto.createHash('sha256').update(ADMIN).digest();
  return crypto.timingSafeEqual(a, b);
}
const weekly = () => Math.floor(Date.now() / (7 * 864e5)) % SCAMS.length;

/* ================= SERVER ================= */
const server = http.createServer(async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const url = req.url.split('?')[0], GET = req.method === 'GET', POST = req.method === 'POST';
  try {
    if (GET && url === '/') return send(res, 200, PAGE, 'text/html; charset=utf-8');
    if (GET && url === '/admin') return send(res, 200, ADMIN_PAGE, 'text/html; charset=utf-8');
    if (GET && url === '/health') return send(res, 200, {ok:true, db:useDB, reports:reports.length, news:news.length});
    if (GET && url === '/api/scams') return send(res, 200, {scams:SCAMS, platforms:PLATFORMS, weekly:weekly(),
      states:STATES.map(s => ({c:s.c, n:s.n, x:s.x, y:s.y}))});
    if (GET && url === '/api/stats') {
      const by = {}; reports.forEach(r => by[r.platform] = (by[r.platform] || 0) + 1);
      return send(res, 200, {total:reports.length, amount:reports.reduce((a, r) => a + (r.amount || 0), 0), by, news:news.length});
    }
    if (GET && url === '/api/reports')
      return send(res, 200, reports.slice(-15).reverse().map(r => ({platform:r.platform, type:r.type, state:r.state, description:r.description, amount:r.amount, ident:mask(r.ident), ts:r.ts})));
    if (GET && url === '/api/news') {
      if (!news.length && !refreshing) await refreshNews();
      else if (Date.now() - newsAt > 30 * 60 * 1000 && !refreshing) refreshNews();
      return send(res, 200, {items:news.slice(0, 80).map(n => ({title:n.title, link:n.link, source:n.source, ts:n.ts, type:n.type, state:n.state, place:n.place})), updated:newsAt});
    }
    if (GET && url === '/api/heatmap') {
      const st = {}, cut = Date.now() - 30 * 864e5, bump = (c, k) => { if (!c) return; (st[c] = st[c] || {r:0, n:0})[k]++; };
      reports.forEach(r => bump(r.state, 'r')); news.forEach(n => { if (n.ts > cut) bump(n.state, 'n'); });
      return send(res, 200, {states:st});
    }
    if (GET && url === '/api/quiz') {
      const a = QUIZ.slice().sort(() => Math.random() - .5).slice(0, 8);
      return send(res, 200, {items:a.map(q => ({id:q.id, text:q.text}))});
    }
    if (POST && url.startsWith('/api/admin/')) {
      if (!ADMIN) return send(res, 403, {error:'Admin is off. Set ADMIN_PASSWORD on the server first.'});
      if (rate(ahits, ip, 10)) return send(res, 429, {error:'Too many attempts. Wait a minute.'});
      const b = await body(req);
      if (!okAdmin(b.key)) return send(res, 401, {error:'Wrong password'});
      if (url === '/api/admin/list') return send(res, 200, {reports:reports.slice().reverse().slice(0, 300), db:useDB});
      if (url === '/api/admin/delete') {
        const id = Number(b.id), i = reports.findIndex(r => r.id === id);
        if (i < 0) return send(res, 404, {error:'Not found'});
        reports.splice(i, 1); await removeReport(id); return send(res, 200, {ok:true});
      }
    }
    if (POST && ['/api/scan', '/api/report', '/api/check', '/api/quiz/answer'].includes(url)) {
      if (rate(hits, ip, 40)) return send(res, 429, {error:'Too many requests. Slow down.'});
      const b = await body(req);
      if (url === '/api/scan') {
        if (!clean(b.text, 5).length) return send(res, 400, {error:'Paste something to scan.'});
        return send(res, 200, scan(b.text));
      }
      if (url === '/api/check') {
        const c = checkIdent(b.q);
        return c ? send(res, 200, c) : send(res, 400, {error:'Type a UPI ID, phone number or website.'});
      }
      if (url === '/api/quiz/answer') {
        const q = QUIZ.find(x => x.id === Number(b.id));
        if (!q) return send(res, 404, {error:'Unknown question'});
        return send(res, 200, {correct:(b.choice === 'scam') === q.scam, answer:q.scam ? 'scam' : 'safe', why:q.why});
      }
      const platform = PLATFORMS.includes(b.platform) ? b.platform : 'Other';
      const description = clean(b.description, 500);
      if (description.length < 10) return send(res, 400, {error:'Please describe what happened (10+ characters).'});
      const amount = Math.max(0, Math.min(1e8, Number(b.amount) || 0));
      const state = STATE_CODES.includes(b.state) ? b.state : '';
      await addReport({id:Date.now() * 1000 + Math.floor(Math.random() * 1000), platform, type:clean(b.type, 60) || 'Unspecified',
        description, amount, state, ident:normIdent(b.ident), ts:Date.now()});
      return send(res, 200, {ok:true});
    }
    send(res, 404, {error:'Not found'});
  } catch (e) { send(res, 400, {error:'Bad request'}); }
});

/* ================= FRONTEND ================= */
const PAGE = String.raw`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PB9GCGLQJX">
</script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-PB9GCGLQJX');
</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SCAMRADAR — See the scam before it sees you</title>
<meta name="description" content="Live scam news, threat radar, risk scanner and emergency help for Instagram, Facebook, websites, WhatsApp and UPI scams in India.">

<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2610065563716071"
     crossorigin="anonymous"></script>

<style>
:root{--bg:#05060d;--c:#18f0ff;--r:#ff2e63;--y:#ffd23f;--g:#2ee6a6;--t:#e8ecff;--m:#7d86b8;--card:rgba(16,18,40,.6)}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--t);font:16px/1.6 'Segoe UI','Nirmala UI',system-ui,sans-serif;overflow-x:hidden}
body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:50;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
#bg{position:fixed;inset:0;z-index:-2}
.glow{position:fixed;width:420px;height:420px;border-radius:50%;pointer-events:none;z-index:-1;background:radial-gradient(circle,rgba(24,240,255,.14),transparent 65%);transform:translate(-50%,-50%);left:50%;top:30%}
.mono{font-family:Consolas,'Courier New',monospace}
nav{position:fixed;top:0;left:0;right:0;z-index:40;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 5vw;backdrop-filter:blur(12px);background:rgba(5,6,13,.6);border-bottom:1px solid rgba(24,240,255,.12)}
.logo{font-weight:800;letter-spacing:3px}.logo b{color:var(--r);animation:blink 1.2s infinite}
.nv a{color:var(--m);text-decoration:none;margin-left:20px;font-size:14px;transition:.3s}.nv a:hover{color:var(--c);text-shadow:0 0 12px var(--c)}
.nr{display:flex;gap:10px;align-items:center}
.pts{font-size:12px;color:var(--y);border:1px solid rgba(255,210,63,.4);padding:5px 10px;border-radius:99px;white-space:nowrap}
.lang{background:transparent;border:1px solid var(--c);color:var(--c);border-radius:8px;padding:5px 11px;cursor:pointer;font-weight:700;font-size:13px}.lang:hover{background:var(--c);color:#001}
@keyframes blink{50%{opacity:.2}}
section{padding:110px 5vw 30px;max-width:1200px;margin:auto}
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding-top:120px}
.tag{display:inline-block;padding:6px 14px;border:1px solid rgba(255,46,99,.5);border-radius:99px;color:var(--r);font-size:12px;letter-spacing:2px;margin-bottom:26px;width:fit-content;max-width:100%;background:rgba(255,46,99,.08)}
h1{font-size:clamp(42px,9vw,124px);line-height:.95;font-weight:900;letter-spacing:-2px;position:relative}
h1 .g{background:linear-gradient(90deg,var(--c),var(--r));-webkit-background-clip:text;background-clip:text;color:transparent}
h1.gl{animation:glitch .35s steps(2) 1}
@keyframes glitch{0%{transform:translate(-4px,2px);filter:hue-rotate(90deg)}50%{transform:translate(5px,-2px)}100%{transform:none}}
.sub{max-width:660px;color:var(--m);margin:28px 0 38px;font-size:19px}
.btn{display:inline-block;padding:14px 26px;border-radius:12px;border:1px solid var(--c);color:var(--c);background:rgba(24,240,255,.06);text-decoration:none;font-weight:700;letter-spacing:1px;cursor:pointer;font-size:14px;transition:.3s;margin:0 10px 10px 0;font-family:inherit}
.btn:hover{background:var(--c);color:#001;box-shadow:0 0 40px rgba(24,240,255,.6);transform:translateY(-3px)}
.btn.red{border-color:var(--r);color:var(--r);background:rgba(255,46,99,.06)}.btn.red:hover{background:var(--r);color:#fff;box-shadow:0 0 40px rgba(255,46,99,.6)}
.btn.sm{padding:9px 16px;font-size:13px;margin:0}
.wk{display:inline-flex;gap:10px;align-items:center;margin-top:24px;padding:10px 16px;border-radius:12px;border:1px dashed rgba(255,210,63,.5);color:var(--y);text-decoration:none;font-size:14px;width:fit-content;max-width:100%}.wk:hover{background:rgba(255,210,63,.08)}
.ticker{position:fixed;bottom:0;left:0;right:0;z-index:40;overflow:hidden;white-space:nowrap;border-top:1px solid rgba(255,46,99,.3);background:rgba(5,6,13,.88);padding:8px 0;font-size:13px;color:var(--r)}
.ticker div{display:inline-block;animation:tk 90s linear infinite}@keyframes tk{to{transform:translateX(-50%)}}
h2{font-size:clamp(28px,5vw,54px);letter-spacing:-1px;margin-bottom:10px;line-height:1.1}h2 small{display:block;font-size:13px;color:var(--c);letter-spacing:4px;margin-bottom:8px;font-weight:600}
.lead{color:var(--m);max-width:660px;margin-bottom:34px}
.rv{opacity:0;transform:translateY(50px);transition:opacity 1s,transform 1s}.rv.in{opacity:1;transform:none}
.radarwrap{display:grid;grid-template-columns:minmax(300px,560px) 1fr;gap:34px;align-items:center}
#rad{width:100%;aspect-ratio:1;border-radius:50%;box-shadow:0 0 80px rgba(24,240,255,.15),inset 0 0 60px rgba(24,240,255,.08);cursor:crosshair}
.panel{background:var(--card);border:1px solid rgba(24,240,255,.18);border-radius:20px;padding:28px;backdrop-filter:blur(10px);min-height:360px}
.panel h3{font-size:24px;margin:6px 0 10px}.pill{font-size:12px;letter-spacing:2px;padding:4px 10px;border-radius:99px;border:1px solid}
.panel p{color:#b9c0e6;margin-bottom:14px}.panel h4{color:var(--c);font-size:12px;letter-spacing:3px;margin:14px 0 6px}
.panel li{margin-left:18px;color:#cfd5f5;font-size:14px}
.bar{height:8px;background:#1a1d3a;border-radius:9px;overflow:hidden;margin:10px 0}.bar i{display:block;height:100%;width:0;transition:width 1.2s cubic-bezier(.2,.8,.2,1)}
.filters{display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap}.filters select{width:auto;min-width:200px;padding:10px 14px}
.nlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.nw{display:block;text-decoration:none;color:var(--t);background:var(--card);border:1px solid rgba(255,255,255,.08);border-left:3px solid var(--r);border-radius:14px;padding:16px;transition:.3s}
.nw:hover{border-color:var(--c);transform:translateY(-4px);box-shadow:0 14px 40px rgba(24,240,255,.12)}
.nw h4{font-size:16px;margin:10px 0;line-height:1.4;font-weight:600}.nw small{color:var(--m)}
.tg{display:flex;gap:6px;flex-wrap:wrap}.chip{font-size:11px;letter-spacing:1px;padding:3px 9px;border-radius:99px;background:rgba(255,46,99,.14);color:#ff8fab}.chip.pl{background:rgba(24,240,255,.12);color:var(--c)}
.note{color:var(--m);font-size:13px;margin-top:14px}
.tiles{display:grid;grid-template-columns:repeat(9,1fr);gap:6px;max-width:700px}
.tile{aspect-ratio:1;border-radius:10px;border:1px solid rgba(24,240,255,.25);color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;font:inherit;transition:.25s;padding:0}
.tile:hover{transform:scale(1.14);border-color:var(--c);z-index:2;box-shadow:0 0 24px rgba(24,240,255,.4)}.tile b{font-size:13px}.tile i{font-style:normal;font-size:11px;color:#ffd6e0}
.legend{margin-top:14px;display:flex;align-items:center;gap:10px;color:var(--m);font-size:12px}.legend span{width:140px;height:8px;border-radius:9px;background:linear-gradient(90deg,rgba(255,46,99,.08),rgba(255,46,99,.9))}
.scan{background:var(--card);border:1px solid rgba(255,46,99,.25);border-radius:24px;padding:30px;display:grid;grid-template-columns:1.2fr 1fr;gap:30px}
textarea,input,select{width:100%;background:rgba(5,6,13,.8);border:1px solid #262a55;color:var(--t);border-radius:12px;padding:14px;font:15px 'Segoe UI','Nirmala UI',sans-serif;outline:0;transition:.3s}
textarea:focus,input:focus,select:focus{border-color:var(--c);box-shadow:0 0 24px rgba(24,240,255,.25)}textarea{min-height:190px;resize:vertical;margin-bottom:14px}
.gauge{text-align:center}.gauge svg{width:100%;max-width:300px}.gauge .num{font-size:56px;font-weight:900;margin-top:-70px}.gauge .lvl{letter-spacing:4px;font-size:14px;margin-bottom:12px}
#why li{list-style:none;padding:8px 12px;margin-bottom:6px;border-left:3px solid var(--r);background:rgba(255,46,99,.06);border-radius:0 8px 8px 0;font-size:14px;text-align:left;animation:slide .5s both}
@keyframes slide{from{opacity:0;transform:translateX(-20px)}}
.ckb{margin-top:24px;background:var(--card);border:1px solid rgba(24,240,255,.2);border-radius:20px;padding:24px}
.ckb h3{margin-bottom:12px}.ckrow{display:flex;gap:12px;flex-wrap:wrap}.ckrow input{flex:1;min-width:220px}
.res{margin-top:14px;padding:14px 16px;border-radius:12px;border-left:4px solid;font-size:14px;display:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:22px}
.card{background:var(--card);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:24px;transition:transform .15s,border-color .3s,box-shadow .3s;transform-style:preserve-3d;position:relative;overflow:hidden;cursor:pointer}
.card:hover{border-color:var(--c);box-shadow:0 20px 60px rgba(24,240,255,.12)}
.card:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(24,240,255,.1),transparent 70%);transform:translateX(-100%);transition:.8s;pointer-events:none}.card:hover:before{transform:translateX(100%)}
.card .plat{font-size:12px;color:var(--c);letter-spacing:3px}.card h3{font-size:19px;margin:8px 0 14px}.card .rk{display:flex;justify-content:space-between;font-size:13px;color:var(--m)}
.card .btn{margin-top:14px}
.phone{max-width:440px;margin:0 auto;background:#0b0e1d;border:1px solid #262a55;border-radius:30px;padding:18px;box-shadow:0 0 80px rgba(255,46,99,.12)}
.chat{min-height:320px;max-height:430px;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:6px}
.bub{align-self:flex-start;background:#1a1f45;border-radius:16px 16px 16px 4px;padding:10px 14px;max-width:88%;font-size:14px;animation:slide .3s both}
.bub.me{align-self:flex-end;background:rgba(24,240,255,.18);border-radius:16px 16px 4px 16px}
.typing{color:var(--m);letter-spacing:3px}
.opts{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.opt{background:rgba(24,240,255,.06);border:1px solid rgba(24,240,255,.35);color:var(--t);border-radius:12px;padding:11px 14px;font:14px inherit;cursor:pointer;text-align:left;transition:.25s;font-family:inherit}.opt:hover{background:rgba(24,240,255,.18);transform:translateX(4px)}
.end{margin-top:10px;padding:16px;border-radius:16px;text-align:center;animation:slide .5s both}
.end.bad{background:rgba(255,46,99,.12);border:1px solid var(--r)}.end.ok{background:rgba(46,230,166,.1);border:1px solid var(--g)}
.end b{display:block;font-size:34px;color:var(--r)}.end h4{margin:6px 0}.end p{font-size:14px;color:#cfd5f5}
.quiz{max-width:640px;background:var(--card);border:1px solid rgba(255,210,63,.3);border-radius:24px;padding:28px}
.qt{font-size:18px;min-height:96px;padding:16px;border-radius:14px;background:rgba(5,6,13,.7);border:1px solid #262a55;margin:12px 0 16px;line-height:1.5}
.qfb{margin-top:14px;font-size:14px;min-height:22px}.qb{display:flex;gap:12px;flex-wrap:wrap}
.cl{max-width:720px;background:var(--card);border:1px solid rgba(255,46,99,.3);border-radius:24px;padding:26px}
.cl label{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:15px;transition:.2s}.cl label:hover{background:rgba(255,255,255,.04)}
.cl input,.st input{width:20px;height:20px;margin-top:3px;flex:none;accent-color:var(--r);padding:0}
.meter{height:12px;background:#1a1d3a;border-radius:9px;overflow:hidden;margin:18px 0 10px}.meter i{display:block;height:100%;width:0;transition:width .5s,background .5s}
.vd{font-size:20px;font-weight:800;letter-spacing:1px}
.st{display:flex;gap:14px;align-items:flex-start;padding:16px;border-radius:14px;background:var(--card);border:1px solid rgba(255,255,255,.08);margin-bottom:12px;transition:.3s}
.st.done{opacity:.55;border-color:var(--g)}.st h4{font-size:17px;margin-bottom:2px}.st p{color:#b9c0e6;font-size:14px}.st a{color:var(--c);font-size:14px}
.steps{position:relative;margin-left:20px;border-left:2px dashed rgba(24,240,255,.3);padding-left:34px}
.step{position:relative;margin-bottom:36px}.step:before{content:attr(data-n);position:absolute;left:-58px;top:0;width:40px;height:40px;border-radius:50%;background:var(--bg);border:2px solid var(--r);display:grid;place-items:center;font-weight:800;color:var(--r);box-shadow:0 0 20px rgba(255,46,99,.4)}
.step h3{margin-bottom:4px}.step p{color:var(--m);max-width:620px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.stats{display:flex;gap:30px;margin-bottom:20px;flex-wrap:wrap}.stats b{display:block;font-size:42px;color:var(--c)}.stats span{color:var(--m);font-size:13px;letter-spacing:2px}
form input,form select,form textarea{margin-bottom:12px}form textarea{min-height:110px}
.feed{display:flex;flex-direction:column;gap:12px;max-height:540px;overflow:auto}
.item{background:var(--card);border-left:3px solid var(--y);border-radius:0 14px 14px 0;padding:14px 18px;animation:slide .6s both}
.item small{color:var(--m)}.item p{font-size:14px;margin-top:4px;color:#cfd5f5}
.sos{margin:60px 0 40px;padding:40px;border-radius:24px;text-align:center;background:linear-gradient(135deg,rgba(255,46,99,.15),rgba(24,240,255,.08));border:1px solid rgba(255,46,99,.4)}
.sos b{font-size:64px;color:var(--r);text-shadow:0 0 40px var(--r);display:block;animation:blink 2s infinite}
.fam{display:flex;gap:30px;flex-wrap:wrap;align-items:center}.fam canvas{width:100%;max-width:340px;border-radius:18px;border:1px solid rgba(24,240,255,.3);box-shadow:0 0 60px rgba(255,46,99,.2)}
footer{text-align:center;color:var(--m);font-size:13px;padding:0 5vw 70px}
#toast{position:fixed;left:50%;bottom:54px;transform:translate(-50%,30px);background:#10132a;border:1px solid var(--y);color:var(--y);padding:10px 18px;border-radius:99px;font-size:14px;opacity:0;transition:.4s;z-index:60;pointer-events:none}
#toast.on{opacity:1;transform:translate(-50%,0)}
@media(max-width:900px){.nv{display:none}}
@media(max-width:820px){.radarwrap,.scan,.two{grid-template-columns:1fr}.tiles{gap:4px}.tile b{font-size:11px}.tile i{font-size:10px}}
</style></head><body>
<canvas id="bg"></canvas><div class="glow" id="glow"></div>
<nav><div class="logo mono">SCAM<b>●</b>RADAR</div>
<div class="nv"><a href="#radar" data-i="nRadar"></a><a href="#news" data-i="nNews"></a><a href="#map" data-i="nMap"></a><a href="#scan" data-i="nScan"></a><a href="#play" data-i="nPlay"></a><a href="#help" data-i="nHelp"></a></div>
<div class="nr"><span id="pts" class="pts mono"></span><button id="lang" class="lang mono">हिं</button></div></nav>

<section class="hero">
 <div class="tag mono">● LIVE THREAT MAP · INSTAGRAM · FACEBOOK · WEB · WHATSAPP · UPI</div>
 <h1 id="title" class="gl"><span data-i="h1a"></span><br><span class="g" data-i="h1b"></span></h1>
 <p class="sub" data-i="sub"></p>
 <div><a class="btn" href="#scan" data-i="b1"></a><a class="btn red" href="#help" data-i="b3"></a><a class="btn" href="#news" data-i="b2"></a></div>
 <a id="wk" class="wk" href="#radar" style="display:none"></a>
</section>

<section id="radar" class="rv">
 <h2><small>// 01 THREAT RADAR</small><span data-i="r_h"></span></h2>
 <p class="lead" data-i="r_l"></p>
 <div class="radarwrap"><canvas id="rad" width="600" height="600"></canvas><div class="panel" id="detail"></div></div>
</section>

<section id="news" class="rv">
 <h2><small>// 02 LIVE SCAM NEWS</small><span data-i="n_h"></span></h2>
 <p class="lead" data-i="n_l"></p>
 <div class="filters"><select id="nt"></select><select id="np"></select></div>
 <div class="nlist" id="nlist"></div><p class="note" data-i="n_note"></p>
</section>

<section id="map" class="rv">
 <h2><small>// 03 INDIA HEATMAP</small><span data-i="m_h"></span></h2>
 <p class="lead" data-i="m_l"></p>
 <div class="tiles" id="tiles"></div>
 <div class="legend mono"><span></span><em data-i="m_key" style="font-style:normal"></em></div>
</section>

<section id="scan" class="rv">
 <h2><small>// 04 RISK SCANNER</small><span data-i="s_h"></span></h2>
 <p class="lead" data-i="s_l"></p>
 <div class="scan">
  <div><textarea id="txt" data-ph="s_ph"></textarea>
   <button class="btn red" id="go" data-i="s_go"></button>
   <label class="btn" for="img" data-i="s_img"></label><input type="file" id="img" accept="image/*" style="display:none">
   <span id="err" style="color:var(--r)"></span></div>
  <div class="gauge"><svg viewBox="0 0 200 110"><path d="M10 100A90 90 0 0 1 190 100" fill="none" stroke="#1a1d3a" stroke-width="14" stroke-linecap="round"/>
   <path id="arc" d="M10 100A90 90 0 0 1 190 100" fill="none" stroke="#2ee6a6" stroke-width="14" stroke-linecap="round" stroke-dasharray="283" stroke-dashoffset="283" style="transition:stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1),stroke .6s;filter:drop-shadow(0 0 8px currentColor)"/></svg>
   <div class="num mono" id="num">--</div><div class="lvl mono" id="lvl"></div>
   <p id="adv" style="color:var(--m);font-size:14px;margin-bottom:12px"></p><ul id="why"></ul></div>
 </div>
 <div class="ckb"><h3 data-i="c_h"></h3>
  <div class="ckrow"><input id="ckq" data-ph="c_ph" maxlength="80"><button class="btn red sm" id="ckgo" data-i="c_go"></button></div>
  <div class="res" id="ckr"></div></div>
</section>

<section id="platforms" class="rv"><h2><small>// 05 KNOW YOUR ENEMY</small><span data-i="t_h"></span></h2>
 <p class="lead" data-i="t_l"></p><div class="grid" id="grid"></div></section>

<section id="play" class="rv"><h2><small>// 06 SCAM SIMULATOR</small><span data-i="p_h"></span></h2>
 <p class="lead" data-i="p_l"></p>
 <div style="text-align:center;margin-bottom:18px"><button class="btn" id="sa" data-i="p_a"></button><button class="btn" id="sb" data-i="p_b"></button></div>
 <div class="phone"><div class="chat" id="chat"></div><div class="opts" id="opts"></div></div></section>

<section id="quiz" class="rv"><h2><small>// 07 SCAM OR SAFE?</small><span data-i="q_h"></span></h2>
 <p class="lead" data-i="q_l"></p>
 <div class="quiz"><div class="mono" id="qp" style="color:var(--y)"></div><div class="qt" id="qt"></div>
  <div class="qb" id="qb"><button class="btn red" id="qs" data-i="q_scam"></button><button class="btn" id="qf" data-i="q_safe" style="border-color:var(--g);color:var(--g)"></button></div>
  <div class="qfb" id="qfb"></div><div class="qb" id="qx" style="margin-top:12px"></div></div></section>

<section id="call" class="rv"><h2><small>// 08 LIVE CALL CHECK</small><span data-i="k_h"></span></h2>
 <p class="lead" data-i="k_l"></p>
 <div class="cl"><div id="calls"></div><div class="meter"><i id="mt"></i></div><div class="vd mono" id="vd"></div><p id="hg" style="color:#ffb3c6;margin-top:6px"></p></div></section>

<section id="help" class="rv"><h2><small>// 09 EMERGENCY</small><span data-i="e_h"></span></h2>
 <p class="lead" data-i="e_l"></p><div class="mono" id="ep" style="color:var(--g);margin-bottom:14px"></div><div id="est"></div>
 <div class="sos"><div class="mono" style="letter-spacing:4px;color:var(--m)" data-i="o_sos"></div><b>1930</b>
  <p><span data-i="o_sos2"></span> <span style="color:var(--c)">cybercrime.gov.in</span></p></div></section>

<section id="report" class="rv"><h2><small>// 10 COMMUNITY</small><span data-i="o_h"></span></h2>
 <div class="stats"><div><b id="s1">0</b><span data-i="o_rep"></span></div><div><b id="s2">0</b><span data-i="o_lost"></span></div><div><b id="s3">0</b><span data-i="o_news"></span></div></div>
 <div class="two"><form id="f"><select id="fp"></select><select id="fs"></select><input id="ft" data-ph="o_pt" maxlength="60">
  <input id="fa" type="number" min="0" data-ph="o_amt"><input id="fi" data-ph="o_id" maxlength="80"><textarea id="fd" data-ph="o_ds" maxlength="500"></textarea>
  <button class="btn" type="submit" data-i="o_sub"></button><span id="fm" style="color:var(--g)"></span></form>
  <div class="feed" id="feed"></div></div></section>

<section id="family" class="rv"><h2><small>// 11 PROTECT YOUR FAMILY</small><span data-i="f_h"></span></h2>
 <p class="lead" data-i="f_l"></p>
 <div class="fam"><canvas id="fc" width="1080" height="1350"></canvas>
  <div><button class="btn" id="fd1" data-i="f_dl"></button><br><button class="btn red" id="fw" data-i="f_wa"></button></div></div></section>

<footer data-i="foot"></footer>
<div class="ticker mono"><div id="tk"></div></div><div id="toast" class="mono"></div>

<script>
var $=function(i){return document.getElementById(i)};
function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function col(r){return r<25?'#2ee6a6':r<50?'#ffd23f':r<75?'#ff8a3d':'#ff2e63'}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function api(u,b){return fetch(u,b===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json()})}
function ago(t){var s=(Date.now()-t)/1000;return s<60?'just now':s<3600?Math.floor(s/60)+' min ago':s<86400?Math.floor(s/3600)+' h ago':Math.floor(s/86400)+' d ago'}
function countTo(el,to,ms){var t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/ms);el.textContent=Math.round(to*(1-Math.pow(1-k,3))).toLocaleString('en-IN');if(k<1)requestAnimationFrame(f)})(t0)}

/* ---------- language ---------- */
var I={en:{
nRadar:'Radar',nNews:'News',nMap:'Map',nScan:'Scanner',nPlay:'Play',nHelp:'Help',
h1a:'YOU ARE',h1b:'THE TARGET.',
sub:'Scammers do not hack computers, they hack trust. See where the danger hides, read live scam news, scan anything suspicious, and warn others before they lose money.',
b1:'⚡ SCAN A LINK / MESSAGE',b2:'LIVE SCAM NEWS',b3:'🚨 I GOT SCAMMED',wk:'SCAM OF THE WEEK',
r_h:'Where is the danger right now?',r_l:'Each blip is a scam type. The closer to the center, the higher the risk. Click one to see how it works.',
n_h:'Scam news, live',n_l:'Fresh stories from news sites across India and the world. Every story is tagged with the scam type and where it happened.',n_all:'All scam types',n_allp:'All places',n_none:'No stories match this filter yet.',n_load:'Fetching the latest stories…',n_note:'Tags are detected automatically from headlines, so a few may be off. Open the story to confirm. Headlines belong to their publishers.',n_nos:'No stories for this state yet.',
m_h:'India scam heatmap',m_l:'Darker means more reports and news stories in the last 30 days. Tap a state to see its stories.',m_key:'fewer → more reports and stories',
s_h:'Paste it. We will tell you the risk.',s_l:'Drop in a suspicious link, SMS, DM or email, or upload a screenshot. The server checks the domain, wording and pressure tactics. Nothing you paste is stored.',
s_ph:'e.g. Dear user your SBI KYC expires today. Update now: http://sbi-kyc-update.xyz/login  Share OTP to confirm',s_go:'▶ ANALYSE THREAT',s_img:'📷 UPLOAD SCREENSHOT',s_rd:'READING SCREENSHOT',s_fail:'Could not read that image here. Please type or paste the text instead.',s_wait:'AWAITING INPUT',s_scan:'SCANNING…',s_risk:'RISK',s_none:'No known scam patterns detected.',
c_h:'Check a UPI ID, phone number or website',c_ph:'e.g. name@okbank, 98xxxxxx10 or fast-cash.xyz',c_go:'CHECK',c_none:'No community reports found. That does not mean it is safe. Stay careful.',c_some:'Reported by the community. Do not pay.',c_many:'Reported many times. Treat it as a scam.',c_cnt:'reports',c_note:'Based only on reports from visitors, not verified by police.',
t_h:'Every way you can get scammed',t_l:'Hover the cards. Click one to open it on the radar.',t_flags:'RED FLAGS',t_safe:'HOW TO STAY SAFE',t_share:'📲 WARN FAMILY',
p_h:'You are the victim. What do you do?',p_l:'A scammer messages you. Every choice counts. See what you would lose.',p_a:'📞 The Courier Call',p_b:'💼 The Easy Job',p_lost:'YOU LOST',p_safe:'YOU STAYED SAFE',p_type:'Pick a scenario above to begin.',p_again:'Play again',
q_h:'Scam or safe?',q_l:'8 messages. Decide fast. Real scammers do not give you time to think.',q_scam:'🚩 SCAM',q_safe:'✅ SAFE',q_next:'Next →',q_done:'YOUR SCORE',q_share:'📲 CHALLENGE A FRIEND',q_retry:'Try again',q_ok:'Correct! ',q_no:'Not quite. ',
k_h:'Live call check',k_l:'On a suspicious call right now? Tick what is happening. Nobody can see your answers.',k_v0:'TICK WHAT IS HAPPENING',k_v1:'LOW SIGNS. STAY ALERT',k_v2:'SUSPICIOUS. SHARE NOTHING',k_v3:'HANG UP NOW. THIS IS A SCAM',k_hang:'Hang up, then call 1930 from your own phone.',
c1:'They say they are police, CBI, customs, TRAI or a bank officer',c2:'They want you to stay on the call or video',c3:'They told you not to tell anyone',c4:'They want money moved for "verification"',c5:'They ask for OTP, PIN or CVV',c6:'They want you to install an app (AnyDesk, TeamViewer)',c7:'They threaten arrest or blocking your account',c8:'They push a deadline or urgency',c9:'Unknown or foreign number, or a WhatsApp video call',
e_h:'I just got scammed. What now?',e_l:'Speed matters. Work through these in order. The first hour is your best chance to stop the money.',e_prog:'done',
e1t:'Call 1930',e1d:'Call the National Cyber Crime Helpline right away. Have the transaction ID, amount and time ready.',
e2t:'Tell your bank or UPI app',e2d:'Call your bank or payment app helpline. Ask them to hold the transaction and block your card and UPI.',
e3t:'Save the evidence',e3d:'Keep screenshots of chats, call logs, SMS and the payment. Note UPI IDs, numbers and links. Delete nothing.',
e4t:'File the online complaint',e4d:'Report on cybercrime.gov.in with all the details and keep your complaint number safe.',
e5t:'Lock down your accounts',e5d:'Change passwords, turn on 2-factor login, log out of other devices. Remove AnyDesk or TeamViewer if you installed them.',
e6t:'Block and report',e6d:'Report and block the account on the platform. Report suspicious numbers on sancharsaathi.gov.in.',
e7t:'Tell someone you trust',e7d:'Do not feel ashamed. Scammers fool smart people every day. Tell family and ask local police for help if needed.',
f_h:'Protect your family',f_l:'Make a card for your parents and relatives. Download it and send it on WhatsApp.',f_dl:'⬇ DOWNLOAD CARD',f_wa:'📲 SEND ON WHATSAPP',f_t:'5 RULES FOR MY FAMILY',
r1:'No bank, police or government officer will ever ask for your OTP or PIN.',r2:'"Digital arrest" does not exist. Hang up and call 1930.',r3:'You never need a PIN to RECEIVE money.',r4:'Real jobs and real prizes never ask you to pay first.',r5:'Panic is their weapon. Stop, breathe and call family before paying.',
o_h:'Got scammed or nearly? Warn others.',o_rep:'REPORTS',o_lost:'₹ REPORTED LOST',o_news:'STORIES TRACKED',o_pt:'Scam type (e.g. fake job, QR scam)',o_amt:'Amount lost in ₹ (optional)',o_id:'Scammer UPI ID / phone / website (optional, helps others check)',o_ds:'What happened? Do not include your own phone number or personal details.',o_st:'Where did it happen? (state)',o_sub:'📡 SUBMIT REPORT',o_ok:'Report received. Thank you!',o_empty:'No reports yet. Be the first to warn others.',o_sos:'LOST MONEY? ACT WITHIN HOURS',o_sos2:'India’s National Cyber Crime Helpline · report at',
foot:'SCAMRADAR · Educational awareness project. The risk score is an estimate, not a guarantee. Always verify with the official source.',pts:'pts'},
hi:{
nRadar:'रडार',nNews:'ख़बरें',nMap:'नक्शा',nScan:'स्कैनर',nPlay:'खेल',nHelp:'मदद',
h1a:'आप ही',h1b:'निशाना हैं।',
sub:'ठग कंप्यूटर हैक नहीं करते, वे भरोसा हैक करते हैं। देखिए ख़तरा कहाँ छिपा है, ताज़ा स्कैम ख़बरें पढ़िए, कुछ भी शक वाला स्कैन कीजिए और दूसरों को पैसे गंवाने से पहले सावधान कीजिए।',
b1:'⚡ लिंक / मैसेज स्कैन करें',b2:'लाइव स्कैम ख़बरें',b3:'🚨 मेरे साथ ठगी हुई है',wk:'इस हफ़्ते का स्कैम',
r_h:'अभी ख़तरा कहाँ है?',r_l:'हर बिंदु एक स्कैम का प्रकार है। जितना केंद्र के पास, उतना ज़्यादा ख़तरा। किसी पर क्लिक करके देखें यह कैसे काम करता है।',
n_h:'लाइव स्कैम ख़बरें',n_l:'भारत और दुनिया भर की ताज़ा ख़बरें। हर ख़बर पर स्कैम का प्रकार और जगह का टैग है।',n_all:'सभी प्रकार',n_allp:'सभी जगहें',n_none:'इस फ़िल्टर में अभी कोई ख़बर नहीं है।',n_load:'ताज़ा ख़बरें लाई जा रही हैं…',n_note:'टैग हेडलाइन से अपने-आप पहचाने जाते हैं, इसलिए कुछ ग़लत हो सकते हैं। पक्का करने के लिए ख़बर खोलें। हेडलाइन उनके प्रकाशकों की हैं।',n_nos:'इस राज्य की अभी कोई ख़बर नहीं है।',
m_h:'भारत स्कैम हीटमैप',m_l:'गहरा रंग यानी पिछले 30 दिनों में ज़्यादा रिपोर्ट और ख़बरें। राज्य पर टैप करके उसकी ख़बरें देखें।',m_key:'कम → ज़्यादा रिपोर्ट और ख़बरें',
s_h:'पेस्ट कीजिए। हम बताएँगे ख़तरा कितना है।',s_l:'कोई शक वाला लिंक, SMS, DM या ईमेल डालिए, या स्क्रीनशॉट अपलोड कीजिए। सर्वर डोमेन, भाषा और दबाव की चालें जाँचता है। आप जो पेस्ट करते हैं वह सेव नहीं होता।',
s_ph:'जैसे: प्रिय ग्राहक, आपका SBI KYC आज ख़त्म हो रहा है। अभी अपडेट करें: http://sbi-kyc-update.xyz/login OTP शेयर करें',s_go:'▶ ख़तरा जाँचें',s_img:'📷 स्क्रीनशॉट अपलोड करें',s_rd:'स्क्रीनशॉट पढ़ा जा रहा है',s_fail:'यह तस्वीर यहाँ पढ़ी नहीं जा सकी। कृपया टेक्स्ट टाइप या पेस्ट करें।',s_wait:'इनपुट का इंतज़ार',s_scan:'जाँच हो रही है…',s_risk:'जोखिम',s_none:'कोई जाना-पहचाना स्कैम पैटर्न नहीं मिला।',
c_h:'UPI ID, फ़ोन नंबर या वेबसाइट जाँचें',c_ph:'जैसे name@okbank, 98xxxxxx10 या fast-cash.xyz',c_go:'जाँचें',c_none:'समुदाय की कोई रिपोर्ट नहीं मिली। इसका मतलब सुरक्षित होना नहीं है। सावधान रहें।',c_some:'समुदाय ने रिपोर्ट किया है। पैसे न भेजें।',c_many:'कई बार रिपोर्ट हुआ है। इसे स्कैम मानें।',c_cnt:'रिपोर्ट',c_note:'यह सिर्फ़ विज़िटर्स की रिपोर्ट पर आधारित है, पुलिस से सत्यापित नहीं।',
t_h:'ठगी के सारे तरीक़े',t_l:'कार्ड पर माउस ले जाएँ। रडार पर खोलने के लिए क्लिक करें।',t_flags:'ख़तरे के संकेत',t_safe:'कैसे बचें',t_share:'📲 घरवालों को बताएँ',
p_h:'आप शिकार हैं। अब क्या करेंगे?',p_l:'एक ठग आपको मैसेज करता है। हर चुनाव मायने रखता है। देखिए आप क्या खो सकते हैं।',p_a:'📞 कूरियर वाली कॉल',p_b:'💼 आसान नौकरी',p_lost:'आपने गंवाए',p_safe:'आप बच गए',p_type:'शुरू करने के लिए ऊपर से एक सीन चुनें।',p_again:'फिर खेलें',
q_h:'स्कैम या सुरक्षित?',q_l:'8 मैसेज। जल्दी तय कीजिए। असली ठग आपको सोचने का समय नहीं देते।',q_scam:'🚩 स्कैम',q_safe:'✅ सुरक्षित',q_next:'अगला →',q_done:'आपका स्कोर',q_share:'📲 दोस्त को चुनौती दें',q_retry:'फिर कोशिश करें',q_ok:'सही! ',q_no:'सही नहीं। ',
k_h:'लाइव कॉल चेक',k_l:'अभी किसी शक वाली कॉल पर हैं? जो हो रहा है उस पर टिक करें। आपके जवाब कोई नहीं देख सकता।',k_v0:'जो हो रहा है उस पर टिक करें',k_v1:'कम संकेत। सतर्क रहें',k_v2:'शक वाली कॉल। कुछ भी शेयर न करें',k_v3:'अभी फ़ोन काटें। यह स्कैम है',k_hang:'फ़ोन काटें, फिर अपने फ़ोन से 1930 पर कॉल करें।',
c1:'वे ख़ुद को पुलिस, CBI, कस्टम्स, TRAI या बैंक अफ़सर बताते हैं',c2:'वे आपको कॉल या वीडियो पर बनाए रखना चाहते हैं',c3:'वे कहते हैं किसी को मत बताना',c4:'वे "वेरिफ़िकेशन" के नाम पर पैसे ट्रांसफ़र करने को कहते हैं',c5:'वे OTP, PIN या CVV माँगते हैं',c6:'वे कोई ऐप (AnyDesk, TeamViewer) इंस्टॉल कराना चाहते हैं',c7:'वे गिरफ़्तारी या अकाउंट बंद करने की धमकी देते हैं',c8:'वे जल्दबाज़ी या डेडलाइन का दबाव बनाते हैं',c9:'अनजान या विदेशी नंबर, या व्हाट्सऐप वीडियो कॉल',
e_h:'मेरे साथ अभी ठगी हुई है। अब क्या करूँ?',e_l:'रफ़्तार ज़रूरी है। इन्हें क्रम से कीजिए। पहला घंटा पैसा रोकने का सबसे अच्छा मौक़ा है।',e_prog:'पूरे',
e1t:'1930 पर कॉल करें',e1d:'राष्ट्रीय साइबर क्राइम हेल्पलाइन पर तुरंत कॉल करें। ट्रांज़ैक्शन ID, रक़म और समय तैयार रखें।',
e2t:'बैंक या UPI ऐप को बताएँ',e2d:'अपने बैंक या पेमेंट ऐप की हेल्पलाइन पर कॉल करें। ट्रांज़ैक्शन रोकने और कार्ड व UPI ब्लॉक करने को कहें।',
e3t:'सबूत सहेजें',e3d:'चैट, कॉल लॉग, SMS और पेमेंट के स्क्रीनशॉट रखें। UPI ID, नंबर और लिंक नोट करें। कुछ भी डिलीट न करें।',
e4t:'ऑनलाइन शिकायत दर्ज करें',e4d:'cybercrime.gov.in पर सारी जानकारी के साथ शिकायत दर्ज करें और अपना शिकायत नंबर सुरक्षित रखें।',
e5t:'अपने अकाउंट सुरक्षित करें',e5d:'पासवर्ड बदलें, 2-फ़ैक्टर लॉगिन चालू करें, दूसरे डिवाइस से लॉग आउट करें। AnyDesk या TeamViewer इंस्टॉल किया हो तो हटा दें।',
e6t:'ब्लॉक और रिपोर्ट करें',e6d:'प्लेटफ़ॉर्म पर अकाउंट को रिपोर्ट और ब्लॉक करें। शक वाले नंबर sancharsaathi.gov.in पर रिपोर्ट करें।',
e7t:'किसी भरोसेमंद को बताएँ',e7d:'शर्म न करें, ठग रोज़ समझदार लोगों को भी फँसाते हैं। घरवालों को बताएँ और ज़रूरत हो तो स्थानीय पुलिस से मदद लें।',
f_h:'अपने परिवार को सुरक्षित करें',f_l:'माता-पिता और रिश्तेदारों के लिए कार्ड बनाइए। डाउनलोड करके व्हाट्सऐप पर भेजिए।',f_dl:'⬇ कार्ड डाउनलोड करें',f_wa:'📲 व्हाट्सऐप पर भेजें',f_t:'मेरे परिवार के 5 नियम',
r1:'कोई भी बैंक, पुलिस या सरकारी अधिकारी आपसे OTP या PIN कभी नहीं माँगता।',r2:'"डिजिटल अरेस्ट" जैसा कुछ नहीं होता। फ़ोन काटें और 1930 पर कॉल करें।',r3:'पैसे पाने के लिए कभी PIN नहीं डालना पड़ता।',r4:'असली नौकरी या इनाम के लिए कभी पहले पैसे नहीं देने पड़ते।',r5:'घबराहट ही उनका हथियार है। रुकिए, गहरी साँस लीजिए और पैसे भेजने से पहले घरवालों से बात कीजिए।',
o_h:'ठगे गए या बाल-बाल बचे? दूसरों को सावधान करें।',o_rep:'रिपोर्ट',o_lost:'₹ गंवाए (रिपोर्ट के अनुसार)',o_news:'ट्रैक की गई ख़बरें',o_pt:'स्कैम का प्रकार (जैसे नकली नौकरी, QR स्कैम)',o_amt:'गंवाई रक़म ₹ में (वैकल्पिक)',o_id:'ठग की UPI ID / फ़ोन / वेबसाइट (वैकल्पिक, दूसरों को जाँचने में मदद)',o_ds:'क्या हुआ? अपना फ़ोन नंबर या निजी जानकारी न लिखें।',o_st:'यह कहाँ हुआ? (राज्य)',o_sub:'📡 रिपोर्ट भेजें',o_ok:'रिपोर्ट मिल गई। धन्यवाद!',o_empty:'अभी कोई रिपोर्ट नहीं। पहले आप दूसरों को सावधान करें।',o_sos:'पैसे गंवाए? कुछ घंटों में कार्रवाई करें',o_sos2:'भारत की राष्ट्रीय साइबर क्राइम हेल्पलाइन · शिकायत करें:',
foot:'SCAMRADAR · जागरूकता के लिए बना प्रोजेक्ट। जोखिम स्कोर एक अनुमान है, गारंटी नहीं। हमेशा आधिकारिक स्रोत से पुष्टि करें।',pts:'अंक'}};
var L=ls('lang')==='hi'?'hi':'en';
function T(k){return (I[L]&&I[L][k])||I.en[k]||k}

/* ---------- points + toast ---------- */
var pts=parseInt(ls('pts')||'0',10)||0;
var RANKS=[[0,'Rookie','नौसिखिया'],[30,'Watcher','निगरानीकर्ता'],[80,'Scam Spotter','स्कैम पहचानकर्ता'],[150,'Scam Hunter','स्कैम शिकारी'],[300,'Cyber Guardian','साइबर रक्षक']];
function pill(){var r=RANKS[0];RANKS.forEach(function(x){if(pts>=x[0])r=x});$('pts').textContent='🛡 '+(L==='hi'?r[2]:r[1])+' · '+pts}
var tt=0;function toast(m){var t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},2600)}
function addPts(n){pts+=n;ls('pts',String(pts));pill();toast('+'+n+' '+T('pts'))}
function shareWA(text){window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');addPts(5)}

/* ---------- background + cursor + reveal ---------- */
var mx=-999,my=-999;document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;var g=$('glow');g.style.left=mx+'px';g.style.top=my+'px'});
(function(){var t=$('title');setTimeout(function(){t.classList.remove('gl')},400);setInterval(function(){t.classList.remove('gl');void t.offsetWidth;t.classList.add('gl')},7000)})();
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in')})},{threshold:.08});
document.querySelectorAll('.rv').forEach(function(e){io.observe(e)});
(function(){var c=$('bg'),x=c.getContext('2d'),N=[],W,H;
 function rs(){W=c.width=innerWidth;H=c.height=innerHeight;N=[];for(var i=0;i<Math.min(90,W/14);i++)N.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,bad:Math.random()<.1})}
 rs();addEventListener('resize',rs);
 (function loop(){x.clearRect(0,0,W,H);
  N.forEach(function(a,i){a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;
   var dx=a.x-mx,dy=a.y-my,d=Math.sqrt(dx*dx+dy*dy);if(d<130&&d>0){a.x+=dx/d*1.5;a.y+=dy/d*1.5}
   for(var j=i+1;j<N.length;j++){var b=N[j],q=Math.hypot(a.x-b.x,a.y-b.y);if(q<130){x.strokeStyle=(a.bad||b.bad)?'rgba(255,46,99,'+(1-q/130)*.5+')':'rgba(24,240,255,'+(1-q/130)*.25+')';x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}}
   x.fillStyle=a.bad?'#ff2e63':'#18f0ff';x.beginPath();x.arc(a.x,a.y,a.bad?3.2:1.8,0,6.3);x.fill()});
  requestAnimationFrame(loop)})()})();

/* ---------- data ---------- */
var S=[],ST=[],PL=[],WK=0,sel=0,ang=0,HM={},NEWS=[],newsOk=false,nt='',np='';
function sc(s,f){return (L==='hi'&&s.hi&&s.hi[f])||s[f]}
function panel(i){if(!S.length)return;sel=i;var s=S[i],p=$('detail');p.innerHTML='';var c=col(s.risk);
 var pl=h('span','pill mono',s.platform.toUpperCase());pl.style.color=c;pl.style.borderColor=c;p.appendChild(pl);
 p.appendChild(h('h3','',sc(s,'title')));var b=h('div','bar'),f=h('i');f.style.background=c;f.style.boxShadow='0 0 14px '+c;b.appendChild(f);p.appendChild(b);
 var rk=h('div','mono',T('s_risk')+' '+s.risk+'/100');rk.style.color=c;rk.style.fontSize='13px';rk.style.marginBottom='12px';p.appendChild(rk);
 setTimeout(function(){f.style.width=s.risk+'%'},50);p.appendChild(h('p','',sc(s,'how')));
 [[T('t_flags'),s.flags],[T('t_safe'),s.protect]].forEach(function(g){p.appendChild(h('h4','mono',g[0]));var u=h('ul');g[1].forEach(function(t){u.appendChild(h('li','',t))});p.appendChild(u)})}
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

function renderCards(){var g=$('grid');g.innerHTML='';
 S.forEach(function(s,i){var c=h('div','card rv in');c.appendChild(h('div','plat mono',s.platform.toUpperCase()));c.appendChild(h('h3','',sc(s,'title')));
  var r=h('div','rk mono');r.appendChild(h('span','',T('s_risk')));var v=h('span','',s.risk+'/100');v.style.color=col(s.risk);r.appendChild(v);c.appendChild(r);
  var b=h('div','bar'),f=h('i');f.style.background=col(s.risk);f.style.width=s.risk+'%';b.appendChild(f);c.appendChild(b);
  var sh=h('button','btn red sm',T('t_share'));sh.addEventListener('click',function(e){e.stopPropagation();
   shareWA((L==='hi'?'⚠️ स्कैम अलर्ट: ':'⚠️ SCAM ALERT: ')+sc(s,'title')+'\n'+s.protect[0]+'\n'+location.origin)});c.appendChild(sh);
  c.addEventListener('mousemove',function(e){var q=c.getBoundingClientRect(),px=(e.clientX-q.left)/q.width-.5,py=(e.clientY-q.top)/q.height-.5;c.style.transform='perspective(700px) rotateY('+px*12+'deg) rotateX('+(-py*12)+'deg) scale(1.03)'});
  c.addEventListener('mouseleave',function(){c.style.transform=''});
  c.addEventListener('click',function(){panel(i);$('radar').scrollIntoView({behavior:'smooth'})});g.appendChild(c)})}
function renderWk(){var s=S[WK],a=$('wk');if(!s)return;a.style.display='inline-flex';a.innerHTML='';a.appendChild(h('b','mono','⭐ '+T('wk')));a.appendChild(h('span','',sc(s,'title')+' · '+s.risk+'/100'));
 a.onclick=function(){panel(WK)}}

/* ---------- news + heatmap ---------- */
function fillFilters(){var cnt=function(k){var m={};NEWS.forEach(function(n){m[n[k]]=(m[n[k]]||0)+1});return Object.keys(m).sort(function(a,b){return m[b]-m[a]})};
 var a=$('nt'),b=$('np');a.innerHTML='';b.innerHTML='';
 var o=h('option','',T('n_all'));o.value='';a.appendChild(o);cnt('type').forEach(function(t){var e=h('option','',t);e.value=t;a.appendChild(e)});
 o=h('option','',T('n_allp'));o.value='';b.appendChild(o);cnt('place').forEach(function(t){var e=h('option','',t);e.value=t;b.appendChild(e)});
 a.value=nt;b.value=np}
function renderNews(){var box=$('nlist');box.innerHTML='';
 if(!NEWS.length){box.appendChild(h('div','item',T(newsOk?'n_none':'n_load')));return}
 var f=NEWS.filter(function(x){return(!nt||x.type===nt)&&(!np||x.place===np)});
 if(!f.length){box.appendChild(h('div','item',T('n_none')));return}
 f.slice(0,30).forEach(function(x){var a=h('a','nw');a.href=x.link;a.target='_blank';a.rel='noopener noreferrer';
  var tg=h('div','tg');tg.appendChild(h('span','chip',x.type));tg.appendChild(h('span','chip pl','📍 '+x.place));a.appendChild(tg);
  a.appendChild(h('h4','',x.title));a.appendChild(h('small','mono',x.source+' · '+ago(x.ts)));box.appendChild(a)})}
function ticker(){var tips=['NO BANK EVER ASKS FOR YOUR OTP','DIGITAL ARREST DOES NOT EXIST','NEVER ENTER A PIN TO RECEIVE MONEY','REAL JOBS NEVER CHARGE A FEE','GUARANTEED RETURNS = GUARANTEED SCAM','1930 = CYBER CRIME HELPLINE'];
 var live=NEWS.slice(0,6).map(function(n){return '📰 '+n.place.toUpperCase()+': '+n.title});
 var a=tips.concat(live).join('   ///   ')+'   ///   ';$('tk').textContent=a+a}
function loadNews(){api('/api/news').then(function(d){NEWS=d.items||[];newsOk=true;fillFilters();renderNews();ticker();api('/api/stats').then(function(s){countTo($('s3'),s.news,900)})}).catch(function(){newsOk=true;renderNews()})}
$('nt').addEventListener('change',function(){nt=this.value;renderNews()});
$('np').addEventListener('change',function(){np=this.value;renderNews()});
function renderTiles(){var box=$('tiles');box.innerHTML='';var mxv=1;ST.forEach(function(s){var d=HM[s.c]||{r:0,n:0};mxv=Math.max(mxv,d.r*3+d.n)});
 ST.forEach(function(s){var d=HM[s.c]||{r:0,n:0},v=d.r*3+d.n,t=h('button','tile');t.style.gridColumn=String(s.x+1);t.style.gridRow=String(s.y+1);
  t.style.background='rgba(255,46,99,'+(v?(0.14+v/mxv*0.76):0.04)+')';t.appendChild(h('b','mono',s.c));t.appendChild(h('i','',(d.r+d.n)?String(d.r+d.n):''));
  t.title=s.n+': '+d.r+' reports, '+d.n+' stories';
  t.addEventListener('click',function(){if(!d.n&&np!==s.n){toast(T('n_nos'));return}np=(np===s.n?'':s.n);$('np').value=np;renderNews();$('news').scrollIntoView({behavior:'smooth'})});box.appendChild(t)})}
function loadHM(){api('/api/heatmap').then(function(d){HM=d.states||{};renderTiles()}).catch(function(){})}

/* ---------- scanner + screenshot + checker ---------- */
function runScan(){$('err').textContent='';var v=$('txt').value;
 $('lvl').textContent=T('s_scan');$('why').innerHTML='';$('arc').style.strokeDashoffset=283;
 api('/api/scan',{text:v}).then(function(d){
  if(d.error){$('err').textContent=' '+d.error;$('lvl').textContent=T('s_wait');return}
  setTimeout(function(){var c=col(d.score);$('arc').style.stroke=c;$('arc').style.color=c;$('arc').style.strokeDashoffset=283*(1-d.score/100);
   countTo($('num'),d.score,1600);$('num').style.color=c;$('lvl').textContent=d.level+' '+T('s_risk');$('lvl').style.color=c;$('adv').textContent=d.advice;
   d.reasons.forEach(function(r,i){var li=h('li','','+'+r.points+'  '+r.text);li.style.animationDelay=(i*.12)+'s';$('why').appendChild(li)});
   if(!d.reasons.length)$('why').appendChild(h('li','',T('s_none')));addPts(2)},300)}).catch(function(){$('err').textContent=' Server unreachable.'})}
$('go').addEventListener('click',runScan);
function loadTess(){return new Promise(function(ok,no){if(window.Tesseract)return ok();var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
$('img').addEventListener('change',function(){var f=this.files[0];this.value='';if(!f)return;
 if(f.size>8000000){$('err').textContent=' '+T('s_fail');return}
 $('err').textContent='';$('lvl').textContent=T('s_rd')+'…';
 loadTess().then(function(){return Tesseract.createWorker('eng',1,{langPath:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int',
   logger:function(m){if(m.status==='recognizing text')$('lvl').textContent=T('s_rd')+' '+Math.round(m.progress*100)+'%'}})})
 .then(function(w){return w.recognize(f).then(function(r){w.terminate();return r})})
 .then(function(r){var t=(r.data.text||'').trim();if(t.length<5)throw 0;$('txt').value=t;runScan()})
 .catch(function(){$('err').textContent=' '+T('s_fail');$('lvl').textContent=T('s_wait')})});
$('ckgo').addEventListener('click',function(){var box=$('ckr');
 api('/api/check',{q:$('ckq').value}).then(function(d){box.style.display='block';
  if(d.error){box.style.borderColor='#ff8a3d';box.style.background='rgba(255,138,61,.08)';box.textContent=d.error;return}
  var c=d.level==='many'?'#ff2e63':d.level==='some'?'#ff8a3d':'#ffd23f';box.style.borderColor=c;box.style.background='rgba(255,255,255,.04)';box.innerHTML='';
  var t=h('b','',d.q+' · '+d.count+' '+T('c_cnt'));t.style.color=c;box.appendChild(t);box.appendChild(h('div','',T('c_'+d.level)));
  d.signals.forEach(function(x){box.appendChild(h('div','','⚠ '+x))});box.appendChild(h('small','',T('c_note')))})});

/* ---------- scam simulator ---------- */
var SIMS={
arrest:{s:{m:['Hello, this is FedEx customer care. A parcel in your name was seized at Mumbai airport with illegal items.','I am connecting you to the Cyber Crime department.'],ch:[['Hang up. I will check with the courier myself.','g1'],['Stay on the call and listen','a']]},
 a:{m:['I am Inspector Rao from CBI. Your Aadhaar is linked to money laundering.','You are now under DIGITAL ARREST. Keep your camera on. Do not tell anyone and do not disconnect.'],ch:[['No agency arrests anyone over video call. Hang up.','g2'],['I am scared. Do what they say.','b']]},
 b:{m:['To prove you are innocent, transfer Rs 2,40,000 to the RBI safe account for verification. It will be refunded.','Hurry. The warrant is ready.'],ch:[['Transfer the money','bad'],['Say I need to call my family, then hang up','g3']]},
 g1:{end:'ok',t:'You stopped it at the first call',x:'Real couriers never hand you to the police. You checked on your own and the trap fell apart.'},
 g2:{end:'ok',t:'You saw through "digital arrest"',x:'Digital arrest does not exist. Anyone demanding secrecy while you stay on camera is a criminal. Hang up and call 1930.'},
 g3:{end:'ok',t:'You broke the isolation',x:'Scammers need you alone and scared. Speaking to family is the one thing they cannot allow. Well done.'},
 bad:{end:'bad',loss:240000,t:'There is no safe account',x:'Red flags missed: the officer demanded secrecy, kept you on camera, and asked you to move money to prove innocence. If this happens, call 1930 within the hour.'}},
job:{s:{m:['Hi! We are hiring for work from home. Earn Rs 5,000 a day by liking YouTube videos. Interested?'],ch:[['Reply: Yes, tell me more','a'],['Ignore, block and report the number','g1']]},
 a:{m:['Great! Like these 3 videos and send screenshots.','✅ Rs 150 sent to your account! See, it is real money.'],ch:[['It is real money! Continue','b'],['This is the bait. Stop here.','g2']]},
 b:{m:['You are selected for our VIP group. Deposit Rs 3,000 to unlock tasks that pay Rs 4,500.'],ch:[['Deposit Rs 3,000','c'],['Real jobs never charge. Stop and block.','g3']]},
 c:{m:['✅ Rs 4,500 credited in the app! Next level: deposit Rs 12,000 to earn Rs 20,000. Last chance today!'],ch:[['Deposit Rs 12,000','bad'],['Stop. I have seen enough.','part']]},
 g1:{end:'ok',t:'Block, report, done',x:'Unknown numbers offering easy money are the start of every task scam. Report them on sancharsaathi.gov.in.'},
 g2:{end:'ok',t:'You did not take the bait',x:'The first small payment is bait to build trust. It is designed to make the next deposit feel safe.'},
 g3:{end:'ok',t:'You refused to pay to earn',x:'Real employers never charge you to work. That single rule defeats this whole scam.'},
 part:{end:'part',loss:3000,t:'You stopped, but late',x:'You lost Rs 3,000 but saved Rs 12,000. The app balance was never real. Report on 1930 and cybercrime.gov.in.'},
 bad:{end:'bad',loss:15000,t:'It was never real money',x:'The credits were just numbers in a fake app. Every deposit unlocks another demand until you stop paying.'}}};
var cur=null;
function bub(t,me){var b=h('div','bub'+(me?' me':''),t);$('chat').appendChild(b);$('chat').scrollTop=1e5}
function simStart(id){cur=SIMS[id];$('chat').innerHTML='';$('opts').innerHTML='';simNode('s')}
function simNode(k){var n=cur[k];if(n.end)return simEnd(n);var i=0;
 (function nxt(){if(i<n.m.length){var ty=h('div','bub typing','• • •');$('chat').appendChild(ty);$('chat').scrollTop=1e5;
   setTimeout(function(){ty.remove();bub(n.m[i++]);setTimeout(nxt,350)},650)}
  else{$('opts').innerHTML='';n.ch.forEach(function(c){var b=h('button','opt',c[0]);b.addEventListener('click',function(){$('opts').innerHTML='';bub(c[0],1);simNode(c[1])});$('opts').appendChild(b)})}})()}
function simEnd(n){var r=h('div','end '+(n.end==='ok'?'ok':'bad'));r.appendChild(h('div','mono',n.end==='ok'?T('p_safe'):T('p_lost')));
 if(n.loss)r.appendChild(h('b','','₹'+n.loss.toLocaleString('en-IN')));r.appendChild(h('h4','',n.t));r.appendChild(h('p','',n.x));$('chat').appendChild(r);$('chat').scrollTop=1e5;
 addPts(n.end==='ok'?15:n.end==='part'?8:2);var b=h('button','opt',T('p_again'));b.addEventListener('click',function(){$('chat').innerHTML='';$('opts').innerHTML='';$('chat').appendChild(h('div','bub',T('p_type')))});$('opts').appendChild(b)}
$('sa').addEventListener('click',function(){simStart('arrest')});$('sb').addEventListener('click',function(){simStart('job')});

/* ---------- quiz ---------- */
var Q=[],qi=0,qsc=0,qlock=false;
function quizStart(){api('/api/quiz').then(function(d){Q=d.items;qi=0;qsc=0;$('qx').innerHTML='';$('qb').style.display='flex';showQ()})}
function showQ(){qlock=false;$('qfb').textContent='';$('qx').innerHTML='';$('qp').textContent=(qi+1)+' / '+Q.length;$('qt').textContent=Q[qi].text}
function answer(c){if(qlock||!Q.length)return;qlock=true;
 api('/api/quiz/answer',{id:Q[qi].id,choice:c}).then(function(d){if(d.correct)qsc++;var fb=$('qfb');fb.style.color=d.correct?'#2ee6a6':'#ff2e63';fb.textContent=T(d.correct?'q_ok':'q_no')+d.why;
  var n=h('button','btn sm',qi+1>=Q.length?'🏁':T('q_next'));n.addEventListener('click',function(){qi++;if(qi>=Q.length)endQ();else showQ()});$('qx').appendChild(n)})}
function endQ(){$('qb').style.display='none';$('qp').textContent='';$('qt').textContent=T('q_done')+': '+qsc+' / '+Q.length;$('qfb').textContent='';$('qx').innerHTML='';addPts(qsc*2);
 var s=h('button','btn red sm',T('q_share'));s.addEventListener('click',function(){shareWA((L==='hi'?'मैंने ScamRadar क्विज़ में ':'I scored ')+qsc+'/'+Q.length+(L==='hi'?' स्कोर किया। क्या आप हरा सकते हैं? ':' on the ScamRadar quiz. Can you beat me? ')+location.origin)});
 var r=h('button','btn sm',T('q_retry'));r.addEventListener('click',quizStart);$('qx').appendChild(s);$('qx').appendChild(r)}
$('qs').addEventListener('click',function(){answer('scam')});$('qf').addEventListener('click',function(){answer('safe')});

/* ---------- live call check ---------- */
var CALL=[25,20,25,30,30,25,20,15,10],CK={};
function renderCall(){var box=$('calls');box.innerHTML='';
 CALL.forEach(function(p,i){var l=h('label'),c=h('input');c.type='checkbox';c.checked=!!CK[i];c.addEventListener('change',function(){CK[i]=c.checked;callCalc()});l.appendChild(c);l.appendChild(h('span','',T('c'+(i+1))));box.appendChild(l)});callCalc()}
function callCalc(){var s=0,n=0;CALL.forEach(function(p,i){if(CK[i]){s+=p;n++}});var c=col(Math.min(100,s)),m=$('mt');m.style.width=Math.min(100,s)+'%';m.style.background=c;
 var v=$('vd');v.style.color=c;v.textContent=T(!n?'k_v0':s<30?'k_v1':s<60?'k_v2':'k_v3');$('hg').textContent=s>=60?T('k_hang'):''}

/* ---------- emergency checklist ---------- */
var DONE={};
var ELINK={1:['📞 1930','tel:1930'],4:['cybercrime.gov.in ↗','https://cybercrime.gov.in'],6:['sancharsaathi.gov.in ↗','https://sancharsaathi.gov.in']};
function renderEmerg(){var box=$('est');box.innerHTML='';
 for(var i=1;i<=7;i++)(function(i){var d=h('div','st'+(DONE[i]?' done':'')),c=h('input');c.type='checkbox';c.checked=!!DONE[i];
  c.addEventListener('change',function(){DONE[i]=c.checked;renderEmerg()});d.appendChild(c);var w=h('div');w.appendChild(h('h4','',i+'. '+T('e'+i+'t')));w.appendChild(h('p','',T('e'+i+'d')));
  if(ELINK[i]){var a=h('a','',ELINK[i][0]);a.href=ELINK[i][1];if(i!==1){a.target='_blank';a.rel='noopener noreferrer'}w.appendChild(a)}d.appendChild(w);box.appendChild(d)})(i);
 var n=0;for(var k in DONE)if(DONE[k])n++;$('ep').textContent=n+' / 7 '+T('e_prog')}

/* ---------- family card ---------- */
function wrap(x,t,w){var words=t.split(' '),lines=[],cu='';words.forEach(function(wd){var tt=cu?cu+' '+wd:wd;if(x.measureText(tt).width>w&&cu){lines.push(cu);cu=wd}else cu=tt});if(cu)lines.push(cu);return lines}
function drawCard(){var c=$('fc'),x=c.getContext('2d');x.clearRect(0,0,1080,1350);var g=x.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#05060d');g.addColorStop(1,'#2a0f3d');x.fillStyle=g;x.fillRect(0,0,1080,1350);
 x.fillStyle='#18f0ff';x.font='700 34px Consolas,monospace';x.fillText('● SCAMRADAR',70,100);
 x.fillStyle='#ff2e63';x.font='900 78px "Segoe UI","Nirmala UI",sans-serif';var y=210;wrap(x,T('f_t'),940).forEach(function(l){x.fillText(l,70,y);y+=92});y+=30;
 x.font='600 40px "Segoe UI","Nirmala UI",sans-serif';
 for(var i=1;i<=5;i++){x.fillStyle='#ff2e63';x.beginPath();x.arc(100,y-12,28,0,6.3);x.fill();x.fillStyle='#fff';x.font='800 32px "Segoe UI",sans-serif';x.fillText(String(i),90,y);
  x.font='600 40px "Segoe UI","Nirmala UI",sans-serif';x.fillStyle='#e8ecff';wrap(x,T('r'+i),800).forEach(function(l){x.fillText(l,160,y);y+=56});y+=34}
 x.fillStyle='#ffd23f';x.font='800 44px "Segoe UI",sans-serif';x.fillText('1930  ·  cybercrime.gov.in',70,1240);
 x.fillStyle='#7d86b8';x.font='30px Consolas,monospace';x.fillText(location.host||'scamradar',70,1295)}
$('fd1').addEventListener('click',function(){$('fc').toBlob(function(b){if(!b)return;var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='scamradar-family-card.png';document.body.appendChild(a);a.click();a.remove();addPts(10)})});
$('fw').addEventListener('click',function(){var t=T('f_t')+'\n';for(var i=1;i<=5;i++)t+=i+'. '+T('r'+i)+'\n';shareWA(t+'1930 · '+location.origin)});

/* ---------- community reports ---------- */
function fillForm(){var f=$('fp');if(!f.options.length)PL.forEach(function(p){var o=h('option','',p);o.value=p;f.appendChild(o)});
 var s=$('fs'),v=s.value;s.innerHTML='';var o=h('option','',T('o_st'));o.value='';s.appendChild(o);ST.slice().sort(function(a,b){return a.n<b.n?-1:1}).forEach(function(x){var e=h('option','',x.n);e.value=x.c;s.appendChild(e)});s.value=v}
function load(){api('/api/stats').then(function(d){countTo($('s1'),d.total,900);countTo($('s2'),d.amount,1200);countTo($('s3'),d.news,900)});
 api('/api/reports').then(function(a){var f=$('feed');f.innerHTML='';
  if(!a.length){f.appendChild(h('div','item',T('o_empty')));return}
  a.forEach(function(r){var i=h('div','item');var nm='';ST.forEach(function(s){if(s.c===r.state)nm=s.n});
   i.appendChild(h('small','mono',r.platform+' · '+r.type+(nm?' · 📍'+nm:'')+(r.amount?' · ₹'+r.amount:'')+(r.ident?' · 🔎'+r.ident:'')+' · '+ago(r.ts)));i.appendChild(h('p','',r.description));f.appendChild(i)})})}
$('f').addEventListener('submit',function(e){e.preventDefault();
 api('/api/report',{platform:$('fp').value,state:$('fs').value,type:$('ft').value,amount:$('fa').value,ident:$('fi').value,description:$('fd').value})
 .then(function(d){var m=$('fm');if(d.ok){m.style.color='#2ee6a6';m.textContent=' '+T('o_ok');$('f').reset();load();loadHM();addPts(20)}else{m.style.color='#ff2e63';m.textContent=' '+d.error}})});

/* ---------- language switch ---------- */
function applyLang(){document.documentElement.lang=L;$('lang').textContent=L==='hi'?'EN':'हिं';
 document.querySelectorAll('[data-i]').forEach(function(e){e.textContent=T(e.getAttribute('data-i'))});
 document.querySelectorAll('[data-ph]').forEach(function(e){e.placeholder=T(e.getAttribute('data-ph'))});
 if($('lvl').textContent===''||$('lvl').getAttribute('data-w')==='1'){$('lvl').textContent=T('s_wait');$('lvl').setAttribute('data-w','1')}
 pill();panel(sel);renderCards();renderWk();fillFilters();renderNews();renderTiles();renderCall();renderEmerg();fillForm();load();drawCard();
 if(!$('chat').children.length)$('chat').appendChild(h('div','bub',T('p_type')))}
$('lang').addEventListener('click',function(){L=L==='hi'?'en':'hi';ls('lang',L);$('lvl').removeAttribute('data-w');if($('lvl').textContent==='AWAITING INPUT'||$('lvl').textContent===I.hi.s_wait)$('lvl').setAttribute('data-w','1');applyLang()});

/* ---------- start ---------- */
applyLang();
api('/api/scams').then(function(d){S=d.scams;ST=d.states;PL=d.platforms;WK=d.weekly;applyLang();draw();loadHM();setInterval(loadHM,300000)});
loadNews();setInterval(loadNews,600000);quizStart();setInterval(load,20000);
</script></body></html>`;

const ADMIN_PAGE = String.raw`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ScamRadar Admin</title>
<style>body{font:15px 'Segoe UI',sans-serif;background:#05060d;color:#e8ecff;padding:24px;max-width:900px;margin:auto}input,button{padding:10px 14px;border-radius:8px;border:1px solid #333;background:#10132a;color:#fff;font:inherit}button{cursor:pointer}.r{border:1px solid #262a55;border-radius:10px;padding:12px;margin:10px 0}.r small{color:#7d86b8}.d{float:right;border-color:#ff2e63;color:#ff2e63}</style></head><body>
<h2>ScamRadar Admin</h2><div><input id="k" type="password" placeholder="Admin password"> <button id="go">Open</button> <span id="m" style="color:#ff2e63"></span></div><p id="info" style="color:#7d86b8"></p><div id="ls"></div>
<script>
var K='';function $(i){return document.getElementById(i)}
function post(u,b){return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json()})}
function load(){post('/api/admin/list',{key:K}).then(function(d){if(d.error){$('m').textContent=d.error;return}$('m').textContent='';
 $('info').textContent=d.reports.length+' reports shown · storage: '+(d.db?'Supabase database':'local file (not permanent on free hosting)');var box=$('ls');box.innerHTML='';
 d.reports.forEach(function(r){var el=document.createElement('div');el.className='r';var b=document.createElement('button');b.className='d';b.textContent='Delete';
  b.onclick=function(){if(confirm('Delete this report?'))post('/api/admin/delete',{key:K,id:r.id}).then(load)};el.appendChild(b);
  var s=document.createElement('small');s.textContent=r.platform+' · '+r.type+(r.state?' · '+r.state:'')+(r.amount?' · Rs '+r.amount:'')+(r.ident?' · '+r.ident:'')+' · '+new Date(r.ts).toLocaleString();el.appendChild(s);
  var p=document.createElement('p');p.textContent=r.description;el.appendChild(p);box.appendChild(el)})})}
$('go').onclick=function(){K=$('k').value;load()};
</script></body></html>`;

if (require.main === module) {
  loadData().then(() => {
    server.listen(PORT, () => console.log('SCAMRADAR running → http://localhost:' + PORT));
    refreshNews(); setInterval(refreshNews, 20 * 60 * 1000);
  });
}
module.exports = {parseRSS, tag, scan, normIdent, checkIdent, PAGE, ADMIN_PAGE, STATES, SCAMS};
