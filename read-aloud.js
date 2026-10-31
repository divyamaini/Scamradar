/* SCAMRADAR read-aloud button (works with app-mode.js) */
const http = require('http');
const READ = String.raw`<script>(function(){
 if(!('speechSynthesis' in window))return;
 var ss=window.speechSynthesis,on=false,voices=[];
 function lv(){voices=ss.getVoices()||[]}lv();if(ss.onvoiceschanged!==undefined)ss.onvoiceschanged=lv;
 var b=document.createElement('button');b.textContent='🔊';b.setAttribute('aria-label','Read aloud');
 b.style.cssText='position:fixed;right:16px;bottom:150px;z-index:70;width:52px;height:52px;border-radius:50%;border:1px solid #2ee6a6;background:#05060d;color:#2ee6a6;font-size:22px;cursor:pointer;box-shadow:0 0 24px rgba(46,230,166,.4)';
 var tm=document.createElement('div');
 tm.style.cssText='position:fixed;left:50%;bottom:210px;transform:translateX(-50%);z-index:90;background:#10132a;border:1px solid #ffd23f;color:#ffd23f;padding:10px 16px;border-radius:14px;font:14px sans-serif;max-width:86vw;text-align:center;display:none';
 function toast(m){tm.textContent=m;tm.style.display='block';setTimeout(function(){tm.style.display='none'},4500)}
 function pageText(){
  var sel=String(window.getSelection?window.getSelection():'').trim();
  if(sel.length>3)return sel;
  var el=document.elementFromPoint(innerWidth/2,innerHeight/2);
  var sec=el&&el.closest?(el.closest('section')||el.closest('.box')||el.closest('main')):null;
  var c=(sec||document.body).cloneNode(true);
  c.querySelectorAll('script,style,canvas,button,select,input,textarea,svg,nav,.ticker,#toast,h2 small').forEach(function(n){n.remove()});
  return (c.textContent||'').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{25CF}\u{2B50}]/gu,' ').replace(/[\/]{2,}/g,' ').replace(/\s+/g,' ').trim();
 }
 function stop(){ss.cancel();on=false;b.textContent='🔊'}
 function speak(){
  var t=pageText().slice(0,1800);if(!t)return;
  var hi=(document.documentElement.lang||'en').indexOf('hi')===0,lang=hi?'hi-IN':'en-IN';
  lv();
  var v=voices.filter(function(x){return x.lang.replace('_','-').toLowerCase()===lang.toLowerCase()})[0]||
        voices.filter(function(x){return x.lang.toLowerCase().indexOf(hi?'hi':'en')===0})[0];
  if(hi&&!v){toast('Hindi voice not found on this phone. Add it in Settings > Text-to-speech.');return}
  var parts=t.match(/[^.।!?]+[.।!?]*/g)||[t],chunks=[],cur='';
  parts.forEach(function(p){if((cur+p).length>180){if(cur)chunks.push(cur);cur=p}else cur+=p});if(cur)chunks.push(cur);
  ss.cancel();on=true;b.textContent='⏹';
  chunks.forEach(function(c,i){var u=new SpeechSynthesisUtterance(c.trim());u.lang=lang;if(v)u.voice=v;u.rate=.9;
   if(i===chunks.length-1){u.onend=stop;u.onerror=stop}ss.speak(u)});
 }
 b.onclick=function(){on?stop():speak()};
 window.addEventListener('pagehide',function(){ss.cancel()});
 document.body.appendChild(b);document.body.appendChild(tm);
})();</script>`;
const orig = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex(a => typeof a === 'function');
  if (i >= 0) {
    const h = args[i];
    args[i] = function (req, res) {
      const url = (req.url || '').split('?')[0];
      if (req.method === 'GET' && (url === '/' || url === '/complaint')) {
        const end = res.end.bind(res);
        res.end = function (chunk, ...rest) {
          if (typeof chunk === 'string') {
            const k = chunk.lastIndexOf('</body>');
            if (k > -1) chunk = chunk.slice(0, k) + READ + chunk.slice(k);
          }
          return end(chunk, ...rest);
        };
      }
      return h.apply(this, arguments);
    };
  }
  return orig.apply(http, args);
};
