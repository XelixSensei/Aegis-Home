const {send} = require('../server/http.cjs');
const {getClient} = require('../server/claude.cjs');
const {configured} = require('../server/supabase.cjs');

/* Lets the app show which live services are switched on. Reveals no secrets. */
module.exports = (req, res) => send(res, 200, {
  ai: Boolean(getClient()),
  music: Boolean(process.env.YOUTUBE_API_KEY || getClient()),
  accounts: configured(),
});
