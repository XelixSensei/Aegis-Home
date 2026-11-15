const {jsonEndpoint, limiter} = require('../server/http.cjs');
const saathi = require('../server/saathi.cjs');

module.exports = jsonEndpoint(saathi.reply, {limit: limiter({windowMs: 60_000, max: 20})});
