/* SCAMRADAR "What's happening?" screen at /help. Loaded by server.js with: require('./what-now.js'); */
const http = require('http');
const PAGE = String.raw`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#05060d"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon-192.png"><title>ScamRadar - What's happening?</title>
<meta name="description" content="Getting a scam call or message, or already lost money? ScamRadar guides you step by step in Hindi and English.">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#05060d;color:#e8ecff;font:17px/1.6 'Segoe UI','Nirmala UI',system-ui,sans-serif;padding:16px 16px 70px;max-width:620px;margin:auto}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.logo{font-weight:800;letter-spacing:3px;font-family:Consolas,monospace;color:#e8ecff;text-decoration:none}.logo b{color:#ff2e63}
#lang{background:none;border:1px solid #18f0ff;color:#18f0ff;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer}
h1{font-size:28px;line-height:1.2;margin:6px 0}.lead{color:#9aa3d0;margin-bottom:16px}
.big{display:block;width:100%;text-align:left;background:#10132a;border:1px solid #262a55;border-left:5px solid;color:#e8ecff;font:inherit;font-weight:600;padding:18px 16px;margin-bottom:12px;border-radius:0 14px 14px 0;cursor:pointer}
.c1{border-left-color:#ff2e63}.c2{border-left-color:#ffd23f}.c3{border-left-color:#ff8a3d}.c4{border-left-color:#a98bff}
.sos{display:block;text-align:center;background:#ff2e63;color:#fff;font-weight:800;padding:16px;border-radius:14px;text-decoration:none;margin-top:8px;box-shadow:0 0 36px rgba(255,46,99,.4)}
.note{color:#7d86b8;font-size:13px;margin-top:14px}
.back{background:none;border:0;color:#18f0ff;font:inherit;cursor:pointer;margin-bottom:6px}
h1.hd{font-size:30px}h1.hd.c1{color:#ff2e63}h1.hd.c2{color:#ffd23f}h1.hd.c3{color:#ff8a3d}h1.hd.c4{color:#a98bff}
.st{display:flex;gap:12px;margin:16px 0}.st b{flex:none;width:30px;height:30px;border:2px solid #ff2e63;border-radius:50%;display:grid;place-items:center;color:#ff2e63}
.st h3{font-size:18px}.st p{color:#b9c0e6;font-size:15px}
textarea{width:100%;min-height:100px;background:#05060d;border:1px solid #262a55;color:#e8ecff;border-radius:10px;padding:12px;font:inherit;margin:6px 0}
.row{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.btn{display:inline-block;padding:13px 18px;border-radius:12px;border:1px solid #18f0ff;background:rgba(24,240,255,.08);color:#18f0ff;font:inherit;font-weight:700;cursor:pointer;text-decoration:none}
.btn.red{background:#ff2e63;border-color:#ff2e63;color:#fff}.btn.wa{background:#25d366;border-color:#25d366;color:#05060d}
#msg{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:#10132a;border:1px solid #ffd23f;color:#ffd23f;padding:10px 16px;border-radius:14px;font-size:14px;display:none;max-width:90vw;text-align:center}
</style></head><body>
<div class="top"><a class="logo" href="/">SCAM<b>●</b>RADAR</a><button id="lang"></button></div>
<div id="app"></div><div id="msg"></div>
<script>
var $=function(i){return document.getElementById(i)};
var L='en';try{if(localStorage.getItem('lang')==='hi')L='hi'}catch(e){}
var D={
en:{ttl:"What's happening?",sub:"Tap the one that fits. We will guide you step by step.",
b:["📞 Someone is calling me now","💬 I got a message or link","💸 I already lost money","🔒 Someone is blackmailing me"],
call:"📞 Call 1930 (Cyber Crime Helpline)",note:"ScamRadar is an independent awareness project, not connected to the police or government. In an emergency, call 1930.",
back:"← Back",read:"🔊 Read aloud",stop:"⏹ Stop",fam:"📲 Alert my family",paid:"I already paid",comp:"✍ Make my complaint",
ph:"Paste the message or link here",scan:"🔎 Check it now",fmsg:"⚠️ I may be getting scammed right now. Please call me. (via ScamRadar)",
nov:"A voice for this language was not found on this phone.",empty:"Paste something first."},
hi:{ttl:"क्या हो रहा है?",sub:"जो आपकी स्थिति से मेल खाए उसे दबाइए। हम कदम-दर-कदम बताएँगे।",
b:["📞 अभी कोई मुझे कॉल कर रहा है","💬 मुझे मैसेज या लिंक मिला","💸 मेरे पैसे चले गए","🔒 कोई मुझे ब्लैकमेल कर रहा है"],
call:"📞 1930 पर कॉल करें (साइबर क्राइम हेल्पलाइन)",note:"ScamRadar एक स्वतंत्र जागरूकता प्रोजेक्ट है, पुलिस या सरकार से जुड़ा नहीं है। आपात स्थिति में 1930 पर कॉल करें।",
back:"← वापस",read:"🔊 सुनें",stop:"⏹ रोकें",fam:"📲 घरवालों को बताएँ",paid:"मैं पैसे दे चुका/चुकी हूँ",comp:"✍ मेरी शिकायत बनाएँ",
ph:"मैसेज या लिंक यहाँ पेस्ट करें",scan:"🔎 अभी जाँचें",fmsg:"⚠️ शायद मेरे साथ अभी ठगी हो रही है। कृपया मुझे कॉल करें। (ScamRadar से)",
nov:"इस फ़ोन में इस भाषा की आवाज़ नहीं मिली।",empty:"पहले कुछ पेस्ट करें।"}};
var FL={
en:[{h:"Hang up now",s:[
["Hang up the call","Real police, CBI, customs, banks or courier staff never arrest anyone or ask for money over a call or video. Digital arrest does not exist."],
["Share nothing","No OTP, PIN, CVV, card number or Aadhaar. Do not install any app they ask for, such as AnyDesk or TeamViewer."],
["Send no money","Not even a small amount to verify. There is no safe account."],
["Tell someone near you","Scammers want you alone and scared. Talk to family now."],
["Report it","Call 1930 from your own phone. If you already paid, tap I already paid."]]},
{h:"Stop. Do not click yet",s:[
["Do not click or reply","Do not open the link, call the number in the message, or send any code."],
["Check it here","Paste the message below and we will check it."],
["Verify on your own","Open your bank or courier app yourself, or type the official website. Never use the link or number in the message."],
["Report and block","Report the number at sancharsaathi.gov.in and block the sender."]]},
{h:"Act in the first hour",s:[
["Call 1930 now","Say what happened. Keep the amount, time and transaction ID ready."],
["Call your bank or UPI app","Use the number on the back of your card or inside the official app. Ask them to block your card or UPI and flag the transaction."],
["Do not delete anything","Keep chats, call logs, screenshots and payment receipts."],
["Make your complaint","We will write the cybercrime.gov.in text, the bank letter and the call script for you."],
["Secure your accounts","Change passwords, turn on 2-step login, and remove remote apps like AnyDesk."]]},
{h:"It is not your fault",s:[
["Do not pay","Paying usually brings more demands."],
["Do not delete the chat","Take screenshots of the messages, the profile and any payment requests."],
["Block, then report","Report the account on the platform and file at cybercrime.gov.in or call 1930."],
["Stop images spreading","If private photos are involved and you are an adult, stopncii.org can help stop them spreading. If you are under 18, tell a trusted adult and call 1930 right away."],
["Tell someone you trust","Shame helps the blackmailer. You are not alone."]]}],
hi:[{h:"अभी फ़ोन काटिए",s:[
["कॉल काट दीजिए","असली पुलिस, CBI, कस्टम्स, बैंक या कूरियर वाले कॉल या वीडियो पर किसी को गिरफ़्तार नहीं करते और पैसे नहीं माँगते। डिजिटल अरेस्ट जैसा कुछ नहीं होता।"],
["कुछ भी शेयर न करें","OTP, PIN, CVV, कार्ड नंबर या आधार न बताएँ। वे जो भी ऐप कहें, जैसे AnyDesk या TeamViewer, इंस्टॉल न करें।"],
["पैसे न भेजें","वेरिफ़िकेशन के नाम पर थोड़े भी नहीं। कोई सेफ़ अकाउंट नहीं होता।"],
["पास के किसी को बताएँ","ठग चाहते हैं कि आप अकेले और डरे हुए रहें। अभी घरवालों से बात करें।"],
["रिपोर्ट करें","अपने फ़ोन से 1930 पर कॉल करें। अगर पैसे दे चुके हैं तो मैं पैसे दे चुका/चुकी हूँ दबाएँ।"]]},
{h:"रुकिए। अभी क्लिक न करें",s:[
["क्लिक या जवाब न दें","लिंक न खोलें, मैसेज वाले नंबर पर कॉल न करें और कोई कोड न भेजें।"],
["यहाँ जाँचें","नीचे मैसेज पेस्ट करें, हम उसे जाँच देंगे।"],
["ख़ुद पक्का करें","अपना बैंक या कूरियर ऐप ख़ुद खोलें, या आधिकारिक वेबसाइट ख़ुद टाइप करें। मैसेज वाला लिंक या नंबर कभी इस्तेमाल न करें।"],
["रिपोर्ट और ब्लॉक करें","नंबर को sancharsaathi.gov.in पर रिपोर्ट करें और भेजने वाले को ब्लॉक करें।"]]},
{h:"पहले घंटे में कार्रवाई करें",s:[
["अभी 1930 पर कॉल करें","जो हुआ बताइए। रक़म, समय और ट्रांज़ैक्शन ID तैयार रखें।"],
["बैंक या UPI ऐप को कॉल करें","कार्ड के पीछे या आधिकारिक ऐप में दिया नंबर इस्तेमाल करें। कार्ड या UPI ब्लॉक करने और ट्रांज़ैक्शन फ़्लैग करने को कहें।"],
["कुछ भी डिलीट न करें","चैट, कॉल लॉग, स्क्रीनशॉट और पेमेंट रसीद सँभालकर रखें।"],
["अपनी शिकायत बनाएँ","हम cybercrime.gov.in का टेक्स्ट, बैंक का पत्र और कॉल की स्क्रिप्ट आपके लिए लिख देंगे।"],
["अकाउंट सुरक्षित करें","पासवर्ड बदलें, 2-स्टेप लॉगिन चालू करें और AnyDesk जैसे रिमोट ऐप हटा दें।"]]},
{h:"आपकी ग़लती नहीं है",s:[
["पैसे न दें","पैसे देने से आमतौर पर और माँगें आती हैं।"],
["चैट डिलीट न करें","मैसेज, प्रोफ़ाइल और पेमेंट रिक्वेस्ट के स्क्रीनशॉट लें।"],
["ब्लॉक करें, फिर रिपोर्ट करें","प्लेटफ़ॉर्म पर अकाउंट रिपोर्ट करें और cybercrime.gov.in पर शिकायत करें या 1930 पर कॉल करें।"],
["तस्वीरें फैलने से रोकें","अगर निजी तस्वीरें हैं और आप वयस्क हैं, तो stopncii.org उन्हें फैलने से रोकने में मदद कर सकता है। अगर आप 18 साल से कम के हैं, तो किसी भरोसेमंद बड़े को बताएँ और तुरंत 1930 पर कॉल करें।"],
["भरोसेमंद को बताएँ","शर्म से ब्लैकमेलर को फ़ायदा होता है। आप अकेले नहीं हैं।"]]}]};
var t,F,sp=false,tm=0;
function toast(m){var e=$('msg');e.textContent=m;e.style.display='block';clearTimeout(tm);tm=setTimeout(function(){e.style.display='none'},3500)}
function ui(){t=D[L];F=FL[L];document.documentElement.lang=L;$('lang').textContent=L==='hi'?'EN':'हिं'}
function home(){var h='<h1>'+t.ttl+'</h1><p class="lead">'+t.sub+'</p>';
t.b.forEach(function(x,i){h+='<button class="big c'+(i+1)+'" data-f="'+(i+1)+'">'+x+'</button>'});
h+='<a class="sos" href="tel:1930">'+t.call+'</a><p class="note">'+t.note+'</p>';$('app').innerHTML=h}
function flow(n){var f=F[n-1],wa='https://wa.me/?text='+encodeURIComponent(t.fmsg+' '+location.origin);
var h='<button class="back" data-a="home">'+t.back+'</button><h1 class="hd c'+n+'">'+f.h+'</h1>';
f.s.forEach(function(s,i){h+='<div class="st"><b>'+(i+1)+'</b><div><h3>'+s[0]+'</h3><p>'+s[1]+'</p></div></div>';
if(n==2&&i==1)h+='<textarea id="pt" placeholder="'+t.ph+'"></textarea><button class="btn" data-a="scan">'+t.scan+'</button>'});
h+='<div class="row"><button class="btn" id="rd" data-a="read">'+t.read+'</button>';
if(n!=2)h+='<a class="btn wa" href="'+wa+'" target="_blank" rel="noopener">'+t.fam+'</a>';
h+='<a class="btn red" href="tel:1930">📞 1930</a>';
if(n==1)h+='<button class="btn" data-f="3">'+t.paid+'</button>';
if(n==3)h+='<a class="btn" href="/complaint">'+t.comp+'</a>';
h+='</div>';$('app').innerHTML=h;window.scrollTo(0,0)}
function stop(){try{speechSynthesis.cancel()}catch(e){}sp=false;var r=$('rd');if(r)r.textContent=t.read}
function route(){stop();var n=parseInt((location.hash||'').slice(1),10);if(n>=1&&n<=4)flow(n);else home()}
function read(){if(sp){stop();return}if(!('speechSynthesis' in window))return;
var n=parseInt(location.hash.slice(1),10),f=F[n-1];if(!f)return;
var txt=f.h+'. '+f.s.map(function(s,i){return (i+1)+'. '+s[0]+'. '+s[1]}).join(' ');
var hi=L==='hi',lang=hi?'hi-IN':'en-IN',vs=speechSynthesis.getVoices()||[];
var v=vs.filter(function(x){return x.lang.replace('_','-').toLowerCase()===lang.toLowerCase()})[0]||vs.filter(function(x){return x.lang.toLowerCase().indexOf(hi?'hi':'en')===0})[0];
if(hi&&!v){toast(t.nov);return}
var parts=txt.match(/[^.।!?]+[.।!?]*/g)||[txt],ch=[],c2='';
parts.forEach(function(p){if((c2+p).length>180){if(c2)ch.push(c2);c2=p}else c2+=p});if(c2)ch.push(c2);
speechSynthesis.cancel();sp=true;$('rd').textContent=t.stop;
ch.forEach(function(c,i){var u=new SpeechSynthesisUtterance(c.trim());u.lang=lang;if(v)u.voice=v;u.rate=.9;if(i===ch.length-1){u.onend=stop;u.onerror=stop}speechSynthesis.speak(u)})}
document.addEventListener('click',function(e){var b=e.target.closest('[data-f],[data-a]');if(!b)return;
var f=b.getAttribute('data-f'),a=b.getAttribute('data-a');
if(f){location.hash=f}else if(a==='home'){location.hash='0'}
else if(a==='scan'){var v=$('pt').value.trim();if(!v){toast(t.empty);return}location.href='/?text='+encodeURIComponent(v.slice(0,2000))}
else if(a==='read'){read()}});
$('lang').onclick=function(){L=L==='hi'?'en':'hi';try{localStorage.setItem('lang',L)}catch(e){}ui();route()};
window.addEventListener('hashchange',route);
if('speechSynthesis' in window)speechSynthesis.getVoices();
ui();route();
</script></body></html>`;

const BTN = String.raw`<script>(function(){var a=document.createElement('a');a.href='/help';a.textContent='🆘 What is happening?';a.style.cssText='position:fixed;left:16px;bottom:104px;z-index:70;padding:11px 16px;border-radius:99px;background:#ffd23f;color:#05060d;font:700 13px Consolas,monospace;text-decoration:none;box-shadow:0 0 30px rgba(255,210,63,.4)';document.body.appendChild(a)})();</script>`;

const orig = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex(a => typeof a === 'function');
  if (i >= 0) {
    const h = args[i];
    args[i] = function (req, res) {
      const url = (req.url || '').split('?')[0];
      if (req.method === 'GET' && url === '/help') {
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache',
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:",
          'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'});
        return res.end(PAGE);
      }
      if (req.method === 'GET' && url === '/') {
        const end = res.end.bind(res);
        res.end = function (chunk, ...rest) {
          if (typeof chunk === 'string') {
            const k = chunk.lastIndexOf('</body>');
            if (k > -1) chunk = chunk.slice(0, k) + BTN + chunk.slice(k);
          }
          return end(chunk, ...rest);
        };
      }
      return h.apply(this, arguments);
    };
  }
  return orig.apply(http, args);
};
