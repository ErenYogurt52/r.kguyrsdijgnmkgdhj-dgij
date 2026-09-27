// Calls to our own server.
import { idToken } from './firebase.js';

export class ApiError extends Error {
  constructor(message, code, status) { super(message); this.code = code; this.status = status; }
}

export async function getConfig() {
  const res = await fetch('/api/config', { cache: 'no-store' });
  if (!res.ok) throw new ApiError('Could not load the app settings.', 'config', res.status);
  return res.json();
}

export async function searchJobs({ keywords, profile, fresh = false }) {
  const token = await idToken();
  let res;
  try {
    res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ keywords, profile: { skills: profile.skills || [], areas: profile.areas || [], modes: profile.modes || [], jobType: profile.jobType || 'any' }, fresh }),
    });
  } catch {
    throw new ApiError('Can’t reach the Intern Match server. Check that it is running and try again.', 'network', 0);
  }
  const body = await res.json().catch(() => ({}));
  // On Netlify the search is streamed, so errors can arrive with status 200.
  if (!res.ok || body.error) throw new ApiError(body.error?.message || `Search failed (HTTP ${res.status}).`, body.error?.code || 'error', res.status);
  return body;
}

// Career coach: streams newline-delimited JSON from /api/coach and calls onText for each piece.
export async function coachStream({ messages, profile, jobs, focusJobId, name, onText, signal }) {
  const token = await idToken();
  let res;
  try {
    res = await fetch('/api/coach', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ messages, profile, jobs, focusJobId, name }),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Can’t reach the Intern Match server. Check that it is running and try again.', 'network', 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error?.message || `The coach failed (HTTP ${res.status}).`, body.error?.code || 'error', res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', done = null;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.t) onText(msg.t);
      else if (msg.error) throw new ApiError(msg.error.message, msg.error.code, 200);
      else if (msg.done) done = msg;
    }
  }
  if (!done) throw new ApiError('The reply was cut off. Try again.', 'cut_off', 200);
  return done;
}
