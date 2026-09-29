// English / Vietnamese interface. The views are written in English; after each render,
// translateDom() swaps the text it knows for Vietnamese when Vietnamese is chosen.
// Job listings, coach replies and anything the student typed are marked translate="no" and left alone.
import { VI, VI_PATTERNS } from './i18n-vi.js';

const KEY = 'im-lang';
let lang = 'en';
const setDocLang = () => { if (typeof document !== 'undefined') document.documentElement.lang = lang; };
try { lang = localStorage.getItem(KEY) === 'vi' ? 'vi' : 'en'; } catch { /* storage blocked or not a browser: English */ }
setDocLang();

export const getLang = () => lang;
export function setLang(l) {
  lang = l === 'vi' ? 'vi' : 'en';
  try { localStorage.setItem(KEY, lang); } catch { /* not saved: fine */ }
  setDocLang();
}

// Translate one piece of text (keeps surrounding spaces; "A · B" is translated part by part).
export function t(text) {
  if (lang !== 'vi' || text == null) return text;
  const s = String(text);
  const core = s.trim();
  if (!core) return s;
  const out = tr(core);
  return out === core ? s : s.replace(core, () => out);
}
const joined = (core, sep, all) => {
  const parts = core.split(sep);
  const done = parts.map(tr);
  const changed = done.filter((p, i) => p !== parts[i]).length;
  return (all ? changed === parts.length : changed > 0) ? done.join(sep) : null;
};
function tr(core) {
  if (Object.prototype.hasOwnProperty.call(VI, core)) return VI[core];
  // "Title matches “X” · Part-time": each part on its own.
  if (core.includes(' · ')) return joined(core, ' · ', false) ?? core;
  for (const [re, fn] of VI_PATTERNS) {
    const m = core.match(re);
    if (!m) continue;
    const out = typeof fn === 'function' ? fn(m, tr) : core.replace(re, fn);
    if (out != null) return out;
  }
  // "Full-time, Part-time": only when every part is known text.
  if (core.includes(', ')) return joined(core, ', ', true) ?? core;
  return core;
}

const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);
export function translateDom(root) {
  if (lang !== 'vi' || !root) return;
  const walk = (el) => {
    if (el.nodeType === 3) { const v = t(el.nodeValue); if (v !== el.nodeValue) el.nodeValue = v; return; }
    if (el.nodeType !== 1 || SKIP.has(el.tagName) || el.getAttribute('translate') === 'no') return;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const n = t(v); if (n !== v) el.setAttribute(a, n); } }
    for (const c of el.childNodes) walk(c);
  };
  walk(root);
}
