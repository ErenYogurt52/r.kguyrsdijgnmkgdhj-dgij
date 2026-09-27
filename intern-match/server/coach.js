// Career coach: chats with an open model through an OpenAI-compatible API:
//   - Google Gemini (GEMINI_API_KEY from Google AI Studio) — https://ai.google.dev/gemini-api/docs/openai
//   - Ollama on this computer (OLLAMA_MODEL, e.g. gemma4:e4b) — https://ollama.com/library/gemma4
//   - or OpenRouter (OPENROUTER_API_KEY, default google/gemma-4-26b-a4b-it:free)
// The system prompt is built here on the server; the browser only sends the chat, the
// student's profile and the listings they can see, all trimmed to safe sizes.
import { MAJORS, AREAS, UNIVERSITIES, YEARS, MODES, JOB_TYPES } from '../public/js/reference.js';

export class CoachError extends Error {
  constructor(message, status, code = 'coach_failed', retryable = false) { super(message); this.name = 'CoachError'; this.status = status; this.code = code; this.retryable = retryable; }
}

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v, max, each) => (Array.isArray(v) ? v.map((x) => str(x, each)).filter(Boolean).slice(0, max) : []);
const label = (pairs, id) => (pairs.find((p) => p[0] === id) || [])[1] || '';

export function cleanChat(messages) {
  if (!Array.isArray(messages)) return [];
  const out = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, m.role === 'user' ? 2000 : 4000) }))
    .slice(-16);
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

export function cleanContext(body) {
  const p = body && typeof body.profile === 'object' && body.profile ? body.profile : {};
  const profile = {
    name: str(body && body.name, 60),
    university: str(p.university, 20), major: str(p.major, 30), year: str(p.year, 10),
    keywords: list(p.keywords, 8, 60), skills: list(p.skills, 30, 60), areas: list(p.areas, 30, 20), modes: list(p.modes, 3, 10), jobType: str(p.jobType, 10),
  };
  const jobs = (Array.isArray(body && body.jobs) ? body.jobs : []).slice(0, 12).map((j, i) => ({
    n: i + 1,
    title: str(j && j.title, 160), company: str(j && j.company, 120), location: str(j && j.location, 120),
    kind: j && j.kind === 'internship' ? 'Internship' : 'No experience needed',
    salary: str(j && j.salary, 60), schedule: str(j && j.scheduleType, 40), posted: str(j && j.postedAt, 40), via: str(j && j.via, 60),
    summary: str(j && j.summary, 900),
  })).filter((j) => j.title);
  const focus = str(body && body.focusJobId, 40);
  const focusIndex = focus && Array.isArray(body.jobs) ? body.jobs.findIndex((j) => j && j.id === focus) : -1;
  return { profile, jobs, focus: focusIndex >= 0 && focusIndex < jobs.length ? focusIndex + 1 : null };
}

export function systemPrompt({ profile, jobs, focus }) {
  const uni = UNIVERSITIES.find((u) => u.id === profile.university);
  const major = MAJORS.find((m) => m.id === profile.major);
  const areas = profile.areas.map((id) => (AREAS.find((a) => a.id === id) || {}).name).filter(Boolean);
  const lines = [
    'You are the Intern Match career coach. You help one university student in Ho Chi Minh City, Vietnam, find and win an internship or a job that needs no experience.',
    '',
    'How to answer:',
    '- Language: always reply in English, even when the student writes in Vietnamese or a listing is in Vietnamese. Reply in Vietnamese only when the student explicitly asks for it (for example "trả lời bằng tiếng Việt", "nói tiếng Việt" or "answer in Vietnamese"); then keep using Vietnamese until they ask for English again. Keep job titles and company names exactly as they appear in the listings.',
    '- Keep a warm, direct, practical tone.',
    '- Be concise: short paragraphs or bullet lists, usually under 200 words unless the student asks for a full draft.',
    '- When you talk about specific jobs, use ONLY the listings below and refer to them by number and title. Never invent jobs, companies, salaries, deadlines or requirements. If something is not in a listing, say you don\'t know and suggest checking the original website.',
    '- You can: suggest which listings to apply to first and why; point out skill gaps and how to close them with free resources; draft CV bullet points, a short cover letter or an email from what the student tells you; run a mock interview one question at a time and give feedback.',
    '- Students always apply on the original website. Intern Match never collects CVs, so don\'t ask the student to send their CV or personal documents; work from what they type.',
    '- Stay on study, internships, jobs and career skills. For anything else, briefly say that you only help with internships and careers.',
    '- Don\'t invent facts about the student. If you need information (for example their projects or GPA), ask one short question.',
    '',
    'Student profile:',
    `- Name: ${profile.name || 'not given'}`,
    `- University: ${uni ? uni.name : 'not given'}`,
    `- Major: ${major ? major.name : 'not given'}`,
    `- Year of study: ${label(YEARS, profile.year) || 'not given'}`,
    `- Looking for: ${profile.keywords.join(', ') || 'not given'}`,
    `- Skills: ${profile.skills.join(', ') || 'not given'}`,
    `- Preferred areas: ${areas.join(', ') || 'any'}`,
    `- Working mode: ${profile.modes.map((m) => label(MODES, m)).join(', ') || 'any'}`,
    `- Job type: ${profile.jobType && profile.jobType !== 'any' ? label(JOB_TYPES, profile.jobType) : 'any'}`,
    '',
    jobs.length ? `The student's current top ${jobs.length} listings (Ho Chi Minh City):` : 'The student has no listings loaded yet. Suggest they open their Top 10 first if they ask about specific jobs.',
    ...jobs.map((j) => `${j.n}. ${j.title} — ${j.company} | ${j.location || 'Ho Chi Minh City'} | ${j.kind}${j.schedule ? ` | ${j.schedule}` : ''}${j.salary ? ` | Pay: ${j.salary}` : ''}${j.posted ? ` | Posted ${j.posted}` : ''}${j.via ? ` | via ${j.via}` : ''}${j.summary ? `\n   Details: ${j.summary}` : ''}`),
  ];
  if (focus) lines.push('', `The student is currently looking at listing ${focus}. Assume questions are about it unless they say otherwise.`);
  lines.push('', 'Reminder: answer in English unless the student has explicitly asked you to use Vietnamese in this chat.');
  return lines.join('\n');
}

// Streams the reply. onText(chunk) is called for each piece of text. Returns the full text.
export function createCoach({ provider = 'openrouter', apiKey, baseUrl, model, siteUrl, timeoutMs, fetchImpl = fetch }) {
  const ollama = provider === 'ollama', gemini = provider === 'gemini';
  const name = { ollama: 'Ollama', gemini: 'Gemini' }[provider] || 'OpenRouter';
  const keyVar = { ollama: 'OLLAMA_API_KEY', gemini: 'GEMINI_API_KEY' }[provider] || 'OPENROUTER_API_KEY';
  return async function reply({ system, messages, onText, signal }) {
    if (!apiKey) throw new CoachError(`The coach is not set up: add ${keyVar} to .env`, 503, 'coach_not_configured');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs);
    if (signal) signal.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });
    let res;
    try {
      res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'http-referer': siteUrl, 'x-title': 'Intern Match' },
        body: JSON.stringify({ model, stream: true, temperature: 0.5, max_tokens: 1200, ...(provider === 'openrouter' ? { reasoning: { exclude: true } } : {}), messages: [{ role: 'system', content: system }, ...messages] }),
      });
    } catch (e) {
      clearTimeout(timer);
      if (signal && signal.aborted) throw new CoachError('Stopped.', 499, 'aborted');
      if (ctrl.signal.aborted) throw new CoachError('The AI took too long to answer. Try again.', 502, 'coach_timeout', true);
      throw new CoachError(ollama ? 'Can’t reach Ollama. Make sure the Ollama app is running on this computer.' : `Could not reach ${name} (${e.message})`, 502, ollama ? 'coach_offline' : 'coach_failed', true);
    }
    if (!res.ok) {
      clearTimeout(timer);
      let msg = '';
      try { const b = await res.json(); const e = Array.isArray(b) ? b[0] && b[0].error : b.error; msg = (e && (e.metadata?.raw || e.message)) || ''; } catch { /* not JSON */ }
      if (ollama && res.status === 404) throw new CoachError(`Ollama doesn't have the model "${model}" yet. Run: ollama pull ${model}`, 502, 'coach_no_model');
      if (gemini && (res.status === 400 || res.status === 403) && /api key|API_KEY|permission/i.test(msg)) throw new CoachError('Gemini rejected the API key. Check GEMINI_API_KEY in .env.', 502);
      if (gemini && res.status === 404) throw new CoachError(`Gemini can't find the model "${model}". Check GEMINI_MODEL in .env.`, 502);
      if (res.status === 401) throw new CoachError(`${name} rejected the API key. Check ${keyVar} in .env.`, 502);
      if (res.status === 402) throw new CoachError('OpenRouter says this account needs credits for this model.', 502, 'coach_no_credit', true);
      if (res.status === 404) throw new CoachError(`OpenRouter can't find the model "${model}". Check OPENROUTER_MODEL in .env.`, 502);
      if (res.status === 429) throw new CoachError(`${name} is busy or the free limit is used up. Wait a minute and try again.`, 429, 'coach_busy', true);
      if (res.status >= 500) throw new CoachError(`${name} is very busy right now. Wait a minute and try again.`, 503, 'coach_busy', true);
      throw new CoachError(`${name} error ${res.status}${msg ? `: ${String(msg).slice(0, 200)}` : ''}`, 502);
    }

    let full = '', buf = '', thinking = false;
    const decoder = new TextDecoder();
    // Some models wrap private reasoning in <think>…</think>; never show it.
    const emit = (text) => {
      let out = '';
      let rest = text;
      while (rest) {
        if (thinking) {
          const end = rest.indexOf('</think>');
          if (end < 0) return;
          thinking = false; rest = rest.slice(end + 8);
        } else {
          const start = rest.indexOf('<think>');
          if (start < 0) { out += rest; break; }
          out += rest.slice(0, start); thinking = true; rest = rest.slice(start + 7);
        }
      }
      if (!full) out = out.replace(/^\s+/, '');
      if (out) { full += out; onText(out); }
    };
    try {
      for await (const chunk of res.body) {
        buf += decoder.decode(chunk, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith('data:')) continue; // ": OPENROUTER PROCESSING" keep-alives
          const data = line.slice(5).trim();
          if (data === '[DONE]') return full;
          let json;
          try { json = JSON.parse(data); } catch { continue; }
          if (json.error) throw new CoachError(`The AI stopped: ${String(json.error.message || 'unknown error').slice(0, 200)}`, 502);
          const delta = json.choices && json.choices[0] && json.choices[0].delta;
          if (delta && typeof delta.content === 'string' && delta.content) emit(delta.content);
        }
      }
      return full;
    } catch (e) {
      if (e instanceof CoachError) throw e;
      throw new CoachError(ctrl.signal.aborted ? 'The AI took too long to answer. Try again.' : 'The connection to the AI was interrupted.', 502);
    } finally {
      clearTimeout(timer);
    }
  };
}

// Tries each provider in turn. A provider that fails before it has sent any text is skipped
// (and logged); one quick retry is made on the first busy provider.
export function createCoachChain(configs, { fetchImpl = fetch, wait = (ms) => new Promise((r) => setTimeout(r, ms)), log = console } = {}) {
  const coaches = configs.map((c) => ({ c, reply: createCoach({ ...c, fetchImpl }) }));
  return async function reply({ system, messages, onText, signal }) {
    if (!coaches.length) throw new CoachError('The coach is not set up: add GEMINI_API_KEY to .env', 503, 'coach_not_configured');
    let lastError, retried = false;
    for (let i = 0; i < coaches.length; i++) {
      const { c, reply: one } = coaches[i];
      let sent = false;
      try {
        return await one({ system, messages, signal, onText: (t) => { sent = true; onText(t); } });
      } catch (e) {
        lastError = e;
        // Any failure before text was sent moves on to the next provider (a wrong key or a region
        // block on one provider shouldn't stop the coach); only a busy provider is retried.
        if (sent || !(e instanceof CoachError) || e.code === 'aborted' || (signal && signal.aborted)) throw e;
        if (!retried && e.code === 'coach_busy') { retried = true; log.warn(`[coach] ${c.provider} busy, retrying once`); await wait(1500); i--; continue; }
        if (i + 1 < coaches.length) log.warn(`[coach] ${c.provider} failed (${e.message}); trying ${coaches[i + 1].c.provider}`);
      }
    }
    throw lastError;
  };
}
