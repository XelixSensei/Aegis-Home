/* Music finder: turns a request into a search, then finds embeddable YouTube videos. */
const claude = require('./claude.cjs');

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const VIDEO_ID = /(?:youtube\.com\/(?:watch\?(?:[^"\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/g;
const searchUrl = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/* Free-text wishes ("something for Diwali evening") become one good search query. */
async function queryFromWish(wish, lang) {
  if (!claude.getClient()) return wish;
  const response = await claude.create({
    max_tokens: 2000,
    output_config: {
      effort: 'low',
      format: {type: 'json_schema', schema: {
        type: 'object',
        properties: {query: {type: 'string', description: 'A YouTube search query, at most 8 words'}},
        required: ['query'], additionalProperties: false,
      }},
    },
    system: 'You pick music for older people in India. Turn the wish into one YouTube search query that will find a well-known, full song or long playlist suited to it. Prefer classic, widely loved recordings. Keep religious requests respectful and specific to the faith named.',
    messages: [{role: 'user', content: `App language: ${lang === 'hi' ? 'Hindi' : 'English'}. Wish: ${wish}`}],
  });
  if (response.stop_reason === 'refusal') return wish;
  try { return clean(JSON.parse(claude.textOf(response)).query, 120) || wish; } catch { return wish; }
}

async function searchYouTubeApi(q) {
  const params = new URLSearchParams({part: 'snippet', type: 'video', videoEmbeddable: 'true', safeSearch: 'strict',
    maxResults: '8', regionCode: 'IN', q, key: process.env.YOUTUBE_API_KEY});
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {signal: AbortSignal.timeout(10_000)});
  if (!response.ok) throw Object.assign(new Error(`YouTube search ${response.status}`), {status: response.status});
  const data = await response.json();
  return (data.items || []).filter(i => i.id?.videoId).map(i => ({
    id: i.id.videoId, title: i.snippet?.title || '', channel: i.snippet?.channelTitle || '',
  }));
}

/* Without a YouTube key, Claude's web search finds YouTube pages for the query. */
async function searchWithClaude(q) {
  const response = await claude.create({
    max_tokens: 4000,
    output_config: {effort: 'low'},
    tools: [{type: 'web_search_20260209', name: 'web_search', max_uses: 2, allowed_domains: ['youtube.com']}],
    messages: [{role: 'user', content: `Find up to 6 YouTube videos (full songs, not shorts) for: ${q}. Reply with only their youtube.com/watch URLs, one per line, each followed by " | " and the video title.`}],
  });
  const found = new Map();
  for (const block of response.content || []) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content) for (const m of String(r.url || '').matchAll(VIDEO_ID)) if (!found.has(m[1])) found.set(m[1], clean(r.title, 140));
    }
    if (block.type === 'text') {
      for (const line of block.text.split('\n')) for (const m of line.matchAll(VIDEO_ID)) {
        if (!found.has(m[1])) found.set(m[1], clean(line.split('|')[1] || '', 140));
      }
    }
  }
  return [...found].slice(0, 8).map(([id, title]) => ({id, title: title.replace(/\s*-\s*YouTube$/, ''), channel: ''}));
}

async function find(body) {
  const lang = body?.lang === 'hi' ? 'hi' : 'en';
  const wish = clean(body?.wish, 200);
  let query = clean(body?.query, 120);
  if (!query && !wish) return [400, {error: 'bad_request'}];
  if (!query) query = await queryFromWish(wish, lang);
  let results = [], via = 'none';
  if (process.env.YOUTUBE_API_KEY) { results = await searchYouTubeApi(query); via = 'youtube'; }
  else if (claude.getClient()) { results = await searchWithClaude(query); via = 'ai-search'; }
  else return [503, {error: 'search_unavailable', query, searchUrl: searchUrl(query)}];
  return [200, {query, via, results, searchUrl: searchUrl(query)}];
}

module.exports = {find, VIDEO_ID, searchUrl};
