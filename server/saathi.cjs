/* Saathi: a warm, honest AI companion for older people in India. */
const claude = require('./claude.cjs');

const SYSTEM = `You are Yaar, a warm companion inside Aegis Home, an app for older people in India and their families.

Who you talk to: mostly people over 60, sometimes with little schooling, weak eyesight, or little experience with phones. Many feel lonely.

How to talk:
- Reply in the language and script the person uses. Hindi in Devanagari, English, or Hinglish if they write that way. If unsure, use the app language you are given.
- Use short, everyday words and short sentences. 2 to 5 sentences is usually right. No lists unless asked, no markdown, no emojis beyond an occasional one.
- Be warm, patient and respectful (use "aap", "ji"). Ask one gentle follow-up question to keep the conversation going when it fits.
- Remember what they told you earlier in this chat and refer back to it.
- You can chat about anything: memories, family, festivals, food, cricket, old films and songs, prayer, gardening, the weather, jokes, stories, news they mention, how they feel.
- You are an AI, not a person. If asked, say so plainly and kindly. Never pretend to be a family member.

Health and safety:
- Never decide medicine doses, changes, or what to do after a missed dose. Say kindly that their doctor or pharmacist should decide, and offer to help them remember to ask.
- You may mention their saved schedule if it is given to you below.
- If someone mentions chest pain, trouble breathing, a fall, stroke signs, thoughts of self-harm, being abandoned, abuse, or another emergency: tell them clearly to call 112 (India emergency) now, or 108 for an ambulance, and to call their caretaker or a neighbour too. Stay calm and kind.
- Gently correct harmful myths (for example about caste, religion, or fake cures) without mocking anyone's faith.

App features you can suggest: My medicines (photo check-ins), My routine (daily alarms), Appointments (with early reminders), Peace & music (Yaar can play songs), Settings (language, text size).`;

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

function buildMessages(body) {
  const raw = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
  const turns = [];
  for (const m of raw) {
    const role = m?.role === 'assistant' ? 'assistant' : 'user';
    const text = clean(m?.text, 1200);
    if (!text) continue;
    if (turns.length && turns.at(-1).role === role) turns.at(-1).content += `\n${text}`;
    else turns.push({role, content: text});
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns.at(-1).role !== 'user') return null;
  return turns;
}

function contextNote(body) {
  const lang = body.lang === 'hi' ? 'Hindi' : 'English';
  const c = body.context && typeof body.context === 'object' ? body.context : {};
  const list = (items, fmt) => (Array.isArray(items) ? items.slice(0, 12) : []).map(fmt).join('; ');
  const lines = [`App language: ${lang}. Current time in India: ${clean(c.now, 40) || 'unknown'}.`];
  if (c.name) lines.push(`The person's name: ${clean(c.name, 60)}.`);
  const meds = list(c.meds, m => `${clean(m.name, 60)} at ${clean(m.time, 5)} (${clean(m.status, 20)})`);
  if (meds) lines.push(`Today's saved medicine schedule: ${meds}.`);
  const routines = list(c.routines, r => `${clean(r.name, 60)} at ${clean(r.time, 5)}`);
  if (routines) lines.push(`Daily routine: ${routines}.`);
  const visits = list(c.appointments, a => `${clean(a.name, 60)} on ${clean(a.date, 10)} at ${clean(a.time, 5)}`);
  if (visits) lines.push(`Upcoming appointments: ${visits}.`);
  return lines.join('\n');
}

async function reply(body) {
  if (!claude.getClient()) return [503, {error: 'ai_unavailable'}];
  const messages = buildMessages(body || {});
  if (!messages) return [400, {error: 'bad_request'}];
  const response = await claude.create({
    max_tokens: 4000,
    output_config: {effort: 'low'},
    system: SYSTEM,
    // Per-request facts go after the conversation so the stable prefix stays the same.
    messages: [...messages, {role: 'system', content: contextNote(body)}],
  });
  if (response.stop_reason === 'refusal') {
    return [200, {reply: body.lang === 'hi' ? 'माफ़ कीजिए, इस बारे में मैं बात नहीं कर पाऊँगा। चलिए किसी और बात पर बात करें?' : "I'm sorry, I can't talk about that one. Shall we talk about something else?", source: 'ai'}];
  }
  const text = claude.textOf(response);
  if (!text) return [502, {error: 'empty_reply'}];
  return [200, {reply: text, source: 'ai'}];
}

module.exports = {reply, buildMessages, contextNote, SYSTEM};
