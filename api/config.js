const {send} = require('../server/http.cjs');
const {publicConfig} = require('../server/supabase.cjs');

module.exports = (req, res) => {
  const config = publicConfig();
  return config ? send(res, 200, config) : send(res, 503, {error: 'backend_unavailable'});
};
