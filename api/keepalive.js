const {send} = require('../server/http.cjs');
const {ping} = require('../server/supabase.cjs');

/* Called daily by the Vercel cron in vercel.json. */
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, {error: 'unauthorized'});
  try { const [status, body] = await ping(); return send(res, status, body); }
  catch { return send(res, 502, {ok: false}); }
};
