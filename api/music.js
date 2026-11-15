const {jsonEndpoint, limiter} = require('../server/http.cjs');
const music = require('../server/music.cjs');

module.exports = jsonEndpoint(music.find, {limit: limiter({windowMs: 60_000, max: 15})});
