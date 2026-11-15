/* One shared Claude client. Returns null when no credentials are configured. */
const MODEL = 'claude-opus-5-5';
let client;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk').default;
    client = new Anthropic({timeout: 60_000, maxRetries: 1});
  }
  return client;
}

/* Server-side fallbacks re-run a declined request on Anthropic's recommended model. */
function create(params) {
  return getClient().beta.messages.create({
    model: MODEL,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    ...params,
  });
}

const textOf = message => (message.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

module.exports = {MODEL, getClient, create, textOf};
