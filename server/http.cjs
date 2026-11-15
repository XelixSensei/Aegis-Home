/* Small request helpers shared by the local server and the Vercel functions. */
const MAX_BODY = 64 * 1024;

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel parses JSON already
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Request too large'), {status: 413});
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

/* A simple fixed-window limiter per client address. In-memory, so it is per instance. */
function limiter({windowMs, max}) {
  const hits = new Map();
  return function allow(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwarded || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now - entry.start > windowMs) { hits.set(ip, {start: now, count: 1}); return true; }
    entry.count += 1;
    if (hits.size > 5000) for (const [key, value] of hits) if (now - value.start > windowMs) hits.delete(key);
    return entry.count <= max;
  };
}

/* Wraps a handler with method checks, JSON parsing and uniform errors. */
function jsonEndpoint(handler, {limit} = {}) {
  return async function (req, res) {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, {error: 'method_not_allowed'}); }
    if (limit && !limit(req)) return send(res, 429, {error: 'rate_limited'});
    let body;
    try { body = await readJson(req); } catch (error) { return send(res, error.status || 400, {error: 'bad_request'}); }
    try {
      const [status, payload] = await handler(body);
      return send(res, status, payload);
    } catch (error) {
      console.error('[aegis]', error?.status || '', error?.message || error);
      return send(res, 502, {error: 'upstream_failed'});
    }
  };
}

module.exports = {readJson, send, limiter, jsonEndpoint};
