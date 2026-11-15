const {send} = require('../server/http.cjs');
const {getClient} = require('../server/claude.cjs');

/* Lets the app show whether live AI and music search are switched on. Reveals no secrets. */
module.exports = (req, res) => send(res, 200, {ai: Boolean(getClient()), music: Boolean(process.env.YOUTUBE_API_KEY || getClient())});
