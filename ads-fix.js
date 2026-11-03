/* SCAMRADAR ads fix: lets Google AdSense and Google Analytics load on the home page. */
const http = require('http');
const G = 'https://pagead2.googlesyndication.com https://*.googlesyndication.com https://tpc.googlesyndication.com https://partner.googleadservices.com https://*.doubleclick.net https://*.adtrafficquality.google https://www.google.com https://*.google.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com';
const CSP = "default-src 'self'; style-src 'unsafe-inline'; " +
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net 'wasm-unsafe-eval' blob: " + G + "; " +
  "worker-src 'self' blob: https://cdn.jsdelivr.net; " +
  "connect-src 'self' https://cdn.jsdelivr.net https://tessdata.projectnaptha.com " + G + "; " +
  "img-src 'self' data: blob: https:; " +
  "frame-src " + G + "; font-src 'self' data:";
const orig = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex(a => typeof a === 'function');
  if (i >= 0) {
    const handler = args[i];
    args[i] = function (req, res) {
      if (req.method === 'GET' && (req.url || '').split('?')[0] === '/') {
        const w = res.writeHead.bind(res);
        res.writeHead = function (code, a, b) {
          const h = (a && typeof a === 'object') ? a : b;
          if (h && typeof h === 'object') for (const k of Object.keys(h)) if (k.toLowerCase() === 'content-security-policy') h[k] = CSP;
          return w.apply(null, arguments);
        };
      }
      return handler.apply(this, arguments);
    };
  }
  return orig.apply(http, args);
};
