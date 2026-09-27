// App shell: state, hash router, rendering and event handling.
import * as FB from './firebase.js';
import { getConfig, searchJobs, coachStream } from './api.js';
import * as View from './views.js';
import { SPRITE, icon } from './icons.js';
import { toHtml, esc } from './html.js';
import { fold, AREAS, JOB_TYPES } from './reference.js';
import { htmlToText } from './text.js';

const EMPTY_PROFILE = () => ({ university: '', major: '', year: '', keywords: [], skills: [], areas: [], modes: [], jobType: 'any' });
const JOB_TYPE_IDS = new Set(JOB_TYPES.map(([id]) => id));
const AREA_IDS = new Set(AREAS.map((a) => a.id));
// Keeps only area ids that still exist.
const cleanProfile = (p) => ({ ...EMPTY_PROFILE(), ...(p || {}), keywords: [...((p && p.keywords) || [])], skills: [...((p && p.skills) || [])], areas: ((p && p.areas) || []).filter((id) => AREA_IDS.has(id)), modes: [...((p && p.modes) || [])], jobType: JOB_TYPE_IDS.has(p && p.jobType) ? p.jobType : 'any' });

const S = {
  config: null, coachAvatar: false, user: undefined, loadedUid: null, loadingUser: false, dataError: null,
  profile: null, saved: null, latest: null,
  searches: new Map(), jobs: new Map(),
  coach: { messages: [], busy: false, error: '', draft: '', focus: null, abort: null },
  ui: { menu: false, draft: null, draftFor: null, pfError: '', busy: false, resetSent: '' },
};
const $ = (sel) => document.querySelector(sel);
const els = {};

/* ---------------- Routing ---------------- */
const PUBLIC_ONLY = new Set(['login', 'signup', 'reset']);
const NEEDS_USER = new Set(['welcome', 'top', 'detail', 'saved', 'profile', 'coach']);

function parseHash() {
  const raw = decodeURI(location.hash.replace(/^#/, '')) || '/';
  const [path, qs] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return { name: 'home', params, path };
  if (parts[0] === 'internships' && parts[1]) return { name: 'detail', id: parts[1], params, path };
  const names = { login: 'login', signup: 'signup', reset: 'reset', welcome: 'welcome', top: 'top', saved: 'saved', profile: 'profile', coach: 'coach', 'how-it-works': 'how' };
  return { name: parts.length === 1 && names[parts[0]] ? names[parts[0]] : 'notfound', params, path };
}
let R = parseHash();

function go(path) {
  if (location.hash === `#${path}`) route(); else location.hash = path;
}

const hasKeywords = () => Boolean(S.profile && S.profile.keywords.length);
const maxKw = () => (S.config && S.config.maxKeywords) || 3;
const profileKey = (p) => JSON.stringify([p.keywords.slice(0, maxKw()), p.skills, p.areas, p.modes, p.jobType || 'any']);
const jobType = () => (S.profile && S.profile.jobType) || 'any';
const searchKey = (r) => (r.params.q ? `q:${fold(r.params.q).trim()}|${jobType()}` : `p:${profileKey(S.profile)}`);

function route(opts = {}) {
  R = parseHash();
  S.ui.menu = false;
  if (S.user && !S.loadingUser) {
    if (PUBLIC_ONLY.has(R.name)) return go(R.params.next || (hasKeywords() ? '/top' : '/welcome'));
    if ((R.name === 'top' || R.name === 'detail' || R.name === 'saved' || R.name === 'coach') && !hasKeywords()) return go('/welcome');
  } else if (S.user === null && NEEDS_USER.has(R.name)) {
    return go(`/login?next=${encodeURIComponent(R.path + (R.params.q ? `?q=${encodeURIComponent(R.params.q)}` : ''))}`);
  }
  if ((R.name === 'profile' || R.name === 'welcome') && S.ui.draftFor !== R.name) {
    S.ui.draft = cleanProfile(S.profile); S.ui.draftFor = R.name; S.ui.pfError = '';
  }
  if (R.name !== 'profile' && R.name !== 'welcome') S.ui.draftFor = null;
  if (R.name !== 'reset') S.ui.resetSent = '';
  if (R.name === 'top' && S.user && hasKeywords()) ensureSearch(R);
  if (R.name === 'coach') {
    const focus = R.params.job && S.jobs.has(R.params.job) ? R.params.job : null;
    if (focus !== S.coach.focus) resetCoach(focus); // a new topic starts a new chat
  }
  render({ focus: !opts.keepFocus });
}

/* ---------------- Data ---------------- */
const index = (jobs) => { for (const j of jobs || []) S.jobs.set(j.id, j); };

async function loadUserData(user) {
  S.loadingUser = true; S.dataError = null;
  render();
  try {
    const [doc, saved, latest] = await Promise.all([FB.getUserDoc(user.uid), FB.listSaved(user.uid), FB.getLatest(user.uid)]);
    S.profile = doc && doc.profile ? cleanProfile(doc.profile) : null;
    S.saved = new Map(saved.map((e) => [e.job.id, e]));
    index(saved.map((e) => e.job));
    S.latest = latest;
    if (latest) index(latest.jobs);
  } catch (e) {
    console.error(e);
    S.dataError = friendly(e) || 'Could not load your data from Firebase.';
    S.profile = S.profile || null; S.saved = S.saved || new Map();
  }
  S.loadedUid = user.uid;
  S.loadingUser = false;
}

function ensureSearch(r) {
  const key = searchKey(r);
  if (S.searches.has(key)) return;
  if (!r.params.q && S.latest && S.latest.keywordsKey === profileKey(S.profile)) {
    S.searches.set(key, { status: 'done', data: { jobs: S.latest.jobs, meta: S.latest.meta } });
    return;
  }
  runSearch(r, false);
}

async function runSearch(r, fresh) {
  const key = searchKey(r);
  const isProfile = !r.params.q;
  const keywords = isProfile ? S.profile.keywords.slice(0, maxKw()) : [r.params.q];
  const pKey = isProfile ? profileKey(S.profile) : null;
  S.searches.set(key, { status: 'loading' });
  const onPage = () => R.name === 'top' && searchKey(R) === key;
  if (onPage()) render({ keepFocus: true });
  try {
    const data = await searchJobs({ keywords, profile: S.profile, fresh });
    S.searches.set(key, { status: 'done', data });
    index(data.jobs);
    if (isProfile && S.user) {
      S.latest = { jobs: data.jobs, meta: data.meta, keywordsKey: pKey, createdAt: Date.now() };
      FB.saveLatest(S.user.uid, { jobs: data.jobs, meta: data.meta, keywordsKey: pKey }).catch((e) => console.warn('Could not store results', e));
    }
    if (onPage()) announce(data.jobs.length ? `Found ${View.plural(data.jobs.length, 'internship')}.` : 'No internships found.');
  } catch (e) {
    S.searches.set(key, { status: 'error', error: { code: e.code || 'error', message: e.message } });
  }
  if (onPage()) render({ keepFocus: true });
}


/* ---------------- Career coach ---------------- */
function resetCoach(focus = S.coach.focus) {
  if (S.coach.abort) S.coach.abort.abort();
  S.coach = { messages: [], busy: false, error: '', draft: '', focus, abort: null };
}

// What the coach sees: the student's top 10 (plus the job they're looking at), trimmed.
function coachJobs() {
  const list = [...((S.latest && S.latest.jobs) || [])];
  const f = S.coach.focus && S.jobs.get(S.coach.focus);
  if (f && !list.some((j) => j.id === f.id)) list.push(f);
  return list.slice(0, 12).map((j) => ({
    id: j.id, title: j.title, company: j.company, location: j.location, kind: j.kind, salary: j.salary, scheduleType: View.jobTypeText(j), postedAt: j.postedAt, via: j.via,
    summary: htmlToText([...(j.highlights || []).flatMap((hl) => [`${hl.title}:`, ...hl.items.slice(0, 6)]), j.description || ''].join(' ')).replace(/\s+/g, ' ').slice(0, 900),
  }));
}

function scrollLog(force) {
  const log = document.getElementById('coach-log');
  if (!log) return;
  const near = log.scrollHeight - log.scrollTop - log.clientHeight < 120;
  if (force || near) log.scrollTop = log.scrollHeight;
}

async function sendCoach(text) {
  const c = S.coach;
  const q = String(text || '').trim().slice(0, 2000);
  if (!q || c.busy) return;
  c.error = ''; c.draft = '';
  c.messages.push({ role: 'user', content: q });
  const reply = { role: 'assistant', content: '', pending: true };
  c.messages.push(reply);
  c.busy = true; c.abort = new AbortController();
  const mine = c;
  render({ keepFocus: true }); scrollLog(true);
  document.getElementById('coach-input')?.focus();
  try {
    await coachStream({
      messages: c.messages.filter((m) => m !== reply).map(({ role, content }) => ({ role, content })),
      profile: S.profile, jobs: coachJobs(), focusJobId: c.focus, name: S.user && S.user.name, signal: c.abort.signal,
      onText: (t) => {
        reply.content += t;
        const body = document.querySelector(`.msg[data-msg="${mine.messages.indexOf(reply)}"] .msg-body`);
        if (body && S.coach === mine) { body.innerHTML = View.md(reply.content); scrollLog(); }
      },
    });
    reply.pending = false;
    announce('The coach replied.');
  } catch (e) {
    if (e.name === 'AbortError' || S.coach !== mine) return;
    if (reply.content) { reply.pending = false; reply.content += '\n\n*(Reply cut off.)*'; }
    else mine.messages.pop();
    mine.error = e.message || 'Something went wrong. Try again.';
  } finally {
    mine.busy = false; mine.abort = null;
  }
  if (S.coach === mine && R.name === 'coach') { render({ keepFocus: true }); scrollLog(true); }
}

/* ---------------- Rendering ---------------- */
function ctx() {
  return {
    user: S.user, profile: S.profile, config: S.config || {}, menu: S.ui.menu,
    savedIds: new Set(S.saved ? S.saved.keys() : []), savedCount: S.saved ? S.saved.size : 0,
    savedList: S.saved ? [...S.saved.values()].sort((a, b) => b.savedAt - a.savedAt) : null,
    pfError: S.ui.pfError, busy: S.ui.busy, resetSent: S.ui.resetSent,
    topCount: S.latest && S.latest.jobs ? S.latest.jobs.length : 0,
    coachAvatar: S.coachAvatar,
  };
}

const TITLES = { home: 'Internships in Ho Chi Minh City', coach: 'Career coach', login: 'Log in', signup: 'Sign up', reset: 'Reset password', welcome: 'Set up your profile', top: 'Your top 10', saved: 'Saved internships', profile: 'Your profile', how: 'How it works', notfound: 'Page not found' };

function page(c) {
  if (S.config && !S.config.firebase) return View.setupNeeded('Firebase');
  if (S.user === undefined || S.loadingUser) return (R.name === 'home' || R.name === 'how') ? (R.name === 'home' ? View.home(c) : View.how()) : View.Loading();
  const dataErr = S.dataError && NEEDS_USER.has(R.name) ? `<div class="container"><p class="banner" role="alert">${esc(S.dataError)}</p></div>` : '';
  let body;
  switch (R.name) {
    case 'home': body = View.home(c); break;
    case 'how': body = View.how(); break;
    case 'login': body = View.login(R); break;
    case 'signup': body = View.signup(); break;
    case 'reset': body = View.reset(c); break;
    case 'welcome': body = View.welcome(S.ui.draft, c); break;
    case 'profile': body = View.profile(S.ui.draft, c); break;
    case 'top': body = View.top(c, R, S.searches.get(searchKey(R))); break;
    case 'saved': body = View.saved(c); break;
    case 'coach': body = View.coach(c, { ...S.coach, focusJob: S.coach.focus ? S.jobs.get(S.coach.focus) : null }); break;
    case 'detail': {
      const j = S.jobs.get(R.id);
      body = j ? View.detail(c, j) : View.notfound('This listing isn’t in your results any more.', 'Your top 10 may have been refreshed. Search again to find it, or check your saved list.');
      break;
    }
    default: body = View.notfound();
  }
  return dataErr + toHtml(body);
}

function render(opts = {}) {
  const active = document.activeElement;
  const fk = active && active.dataset ? active.dataset.fk : null;
  const sel = active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd, active.value] : null;
  const c = ctx();
  els.header.innerHTML = toHtml(View.Header(R, c));
  els.header.classList.toggle('is-over-hero', R.name === 'home');
  els.menu.hidden = !S.ui.menu;
  els.menu.innerHTML = S.ui.menu ? toHtml(View.MobileMenu(R, c)) : '';
  document.documentElement.classList.toggle('no-scroll', S.ui.menu);
  els.main.innerHTML = page(c);
  els.footer.innerHTML = toHtml(View.Footer(c));
  document.body.classList.toggle('has-apply-bar', R.name === 'detail' && Boolean($('.apply-bar')));
  document.title = `${TITLES[R.name] || 'Intern Match'} · Intern Match`;
  if (S.ui.menu) { $('#mobile-menu [data-fk="menu-close"]').focus(); return; }
  if (opts.focus) {
    window.scrollTo(0, 0);
    const t = els.main.querySelector('h1[tabindex="-1"]');
    if (t) t.focus({ preventScroll: true }); else if (document.activeElement !== document.body) els.main.focus({ preventScroll: true });
    return;
  }
  if (fk) {
    const el = document.querySelector(`[data-fk="${CSS.escape(fk)}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      if (sel && typeof el.setSelectionRange === 'function' && el.value === sel[2]) try { el.setSelectionRange(sel[0], sel[1]); } catch { /* not a text input */ }
    }
  }
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<p class="toast-msg">${esc(msg)}</p><button type="button" class="icon-btn toast-x" aria-label="Dismiss">${toHtml(icon('close'))}</button>`;
  t.querySelector('button').onclick = () => t.remove();
  els.toasts.append(t);
  setTimeout(() => t.remove(), 5000);
}
const announce = (msg) => { els.status.textContent = ''; setTimeout(() => { els.status.textContent = msg; }, 50); };

/* ---------------- Errors ---------------- */
const AUTH_ERRORS = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/email-already-in-use': 'An account with this email already exists. Log in instead.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-login-credentials': 'Email or password is incorrect.',
  'auth/wrong-password': 'The password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/user-disabled': 'This account has been turned off.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/popup-closed-by-user': '', 'auth/cancelled-popup-request': '', 'auth/user-cancelled': '',
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/operation-not-allowed': 'This sign-in method is turned off. Turn it on in the Firebase console under Authentication → Sign-in method.',
  'auth/unauthorized-domain': 'This address can’t sign in yet. Add it in the Firebase console under Authentication → Settings → Authorized domains.',
  'auth/network-request-failed': 'Network problem. Check your connection and try again.',
  'auth/requires-recent-login': 'For your security, log out, log in again, then retry.',
  'auth/account-exists-with-different-credential': 'This email already uses another sign-in method. Log in with your email and password.',
  'auth/invalid-api-key': 'The Firebase API key in .env is wrong.',
  'permission-denied': 'Firebase blocked this request. Publish the rules from firebase/firestore.rules (see README).',
  'unavailable': 'Can’t reach Firebase right now. Check your connection.',
  'failed-precondition': 'Cloud Firestore isn’t set up for this Firebase project yet (see README).',
};
function friendly(e) {
  if (e && e.code && e.code in AUTH_ERRORS) return AUTH_ERRORS[e.code];
  if (e && e.code && String(e.code).startsWith('auth/')) return 'Something went wrong. Try again.';
  return e && e.message ? e.message : 'Something went wrong. Try again.';
}

function formError(form, msg) {
  const el = form.querySelector('[data-role="error"]');
  if (!el) { if (msg) toast(msg); return; }
  el.textContent = msg || '';
  el.hidden = !msg;
}
async function busy(form, fn) {
  const btns = [...form.querySelectorAll('button[type="submit"]')];
  btns.forEach((b) => { b.disabled = true; b.setAttribute('aria-busy', 'true'); });
  formError(form, '');
  try { await fn(); } catch (e) { if (!(e && String(e.code).startsWith('auth/'))) console.error(e); const m = friendly(e); if (m) formError(form, m); if (form.isConnected && m) form.querySelector('[data-role="error"]')?.scrollIntoView({ block: 'nearest' }); }
  finally { btns.forEach((b) => { if (b.isConnected) { b.disabled = false; b.removeAttribute('aria-busy'); } }); }
}
const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/* ---------------- Profile draft ---------------- */
function addChip(list, value) {
  const d = S.ui.draft; if (!d) return;
  const v = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!v) return;
  const cap = list === 'keywords' ? 8 : 30;
  if (d[list].some((x) => fold(x) === fold(v))) { announce(`${v} is already added.`); return; }
  if (d[list].length >= cap) { toast(`You can add up to ${cap}.`); return; }
  d[list].push(v);
  if (list === 'keywords') S.ui.pfError = '';
  announce(`Added ${v}.`);
}

/* ---------------- Event handlers ---------------- */
const actions = {
  'menu-open': () => { S.ui.menu = true; render(); },
  'menu-close': () => { S.ui.menu = false; render(); $('[data-fk="menu-btn"]')?.focus(); },
  'toggle-pw': (el) => {
    const input = document.getElementById(el.dataset.for);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    el.setAttribute('aria-pressed', String(show));
    el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    el.innerHTML = toHtml(icon(show ? 'eye-off' : 'eye'));
  },
  google: async (el) => {
    el.disabled = true;
    const form = el.closest('.auth-card')?.querySelector('form');
    try { await FB.signInWithGoogle(); } catch (e) { const m = friendly(e); if (m && form) formError(form, m); } finally { if (el.isConnected) el.disabled = false; }
  },
  signout: async () => { await FB.signOutUser(); toast('You’re signed out.'); go('/'); },
  save: async (el) => {
    const id = el.dataset.id, job = S.jobs.get(id);
    if (!job || !S.user) return;
    const was = S.saved.get(id);
    if (was) S.saved.delete(id); else S.saved.set(id, { job, savedAt: Date.now() });
    render({ keepFocus: true });
    announce(was ? 'Removed from saved.' : 'Saved.');
    try {
      if (was) await FB.unsaveJob(S.user.uid, id); else await FB.saveJob(S.user.uid, job);
      toast(was ? 'Removed from saved.' : 'Saved to your account.');
    } catch (e) {
      if (was) S.saved.set(id, was); else S.saved.delete(id);
      render({ keepFocus: true });
      toast(friendly(e));
    }
  },
  'coach-suggest': (el) => sendCoach(el.dataset.q),
  'coach-reset': () => { resetCoach(); render(); document.getElementById('coach-input')?.focus(); },
  'coach-retry': () => {
    const c = S.coach;
    const lastUser = [...c.messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    c.messages.splice(c.messages.lastIndexOf(lastUser), 1);
    sendCoach(lastUser.content);
  },
  retry: () => runSearch(R, false),
  refresh: () => runSearch(R, true),
  // Job type filter on the Top 10 page: remembered in the profile, and a new search runs for it.
  jobtype: (el) => {
    const v = el.dataset.value;
    if (!S.profile || !JOB_TYPE_IDS.has(v) || jobType() === v) return;
    S.profile = { ...S.profile, jobType: v };
    if (S.user) FB.saveProfile(S.user.uid, S.profile).catch((e) => toast(friendly(e) || 'Could not save your job type.'));
    route({ keepFocus: true });
  },
  'chip-add': (el) => {
    const list = el.dataset.list;
    const input = document.getElementById(`pf-${list}`);
    addChip(list, el.dataset.value || (input && input.value));
    render({ keepFocus: true });
    const next = document.getElementById(`pf-${list}`);
    if (!el.dataset.value && next) next.focus();
  },
  'chip-remove': (el) => {
    const d = S.ui.draft, list = el.dataset.list;
    d[list] = d[list].filter((x) => x !== el.dataset.value);
    announce(`Removed ${el.dataset.value}.`);
    render();
    document.getElementById(`pf-${list}`)?.focus();
  },
  verify: async (el) => {
    el.disabled = true;
    try { await FB.sendVerification(); toast(`Verification email sent to ${S.user.email}.`); } catch (e) { toast(friendly(e)); } finally { if (el.isConnected) el.disabled = false; }
  },
  'delete-open': () => {
    els.dialog.innerHTML = toHtml(View.DeleteDialog(ctx()));
    els.dialog.showModal();
    els.dialog.querySelector('input, #dlg-title')?.focus();
  },
  'dlg-close': () => els.dialog.close(),
};

const submits = {
  coach: (form) => sendCoach(form.q.value),
  search: (form) => {
    const q = form.q.value.trim();
    if (!q) { form.q.focus(); return; }
    if (!S.user) return go('/signup');
    go(`/top?q=${encodeURIComponent(q)}`);
  },
  signup: (form) => busy(form, async () => {
    const name = form.name.value.trim(), email = form.email.value.trim(), password = form.password.value;
    if (!validEmail(email)) throw { code: 'auth/invalid-email' };
    if (password.length < 6) throw { code: 'auth/weak-password' };
    const user = await FB.signUp({ name, email, password });
    S.user = { ...(S.user || {}), ...user };
    render({ keepFocus: true });
  }),
  login: (form) => busy(form, async () => {
    const email = form.email.value.trim(), password = form.password.value;
    if (!validEmail(email)) throw { code: 'auth/invalid-email' };
    if (!password) throw { code: 'auth/missing-password' };
    await FB.signIn({ email, password });
  }),
  reset: (form) => busy(form, async () => {
    const email = form.email.value.trim();
    if (!validEmail(email)) throw { code: 'auth/invalid-email' };
    try { await FB.sendReset(email); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
    S.ui.resetSent = email; render({ focus: true });
  }),
  profile: async (form) => {
    const d = S.ui.draft;
    const pending = document.getElementById('pf-keywords');
    if (pending && pending.value.trim()) addChip('keywords', pending.value);
    const pendingSkill = document.getElementById('pf-skills');
    if (pendingSkill && pendingSkill.value.trim()) addChip('skills', pendingSkill.value);
    if (!d.keywords.length) {
      S.ui.pfError = 'Add at least one keyword so we know what to search for.';
      render(); document.getElementById('pf-keywords')?.focus(); return;
    }
    S.ui.busy = true; render({ keepFocus: true });
    try {
      const before = S.profile ? profileKey(S.profile) : '';
      await FB.saveProfile(S.user.uid, d);
      S.profile = cleanProfile(d);
      const wasWelcome = R.name === 'welcome';
      S.ui.busy = false; S.ui.draftFor = null;
      if (wasWelcome || profileKey(S.profile) !== before) { toast(wasWelcome ? 'Profile saved. Finding your top 10…' : 'Profile saved. Updating your top 10…'); go('/top'); }
      else { toast('Profile saved.'); route(); }
    } catch (e) {
      S.ui.busy = false; render(); toast(friendly(e));
    }
  },
  name: (form) => busy(form, async () => {
    const name = form.name.value.trim();
    S.user = { ...S.user, ...(await FB.updateName(name)) };
    toast('Name saved.'); render({ keepFocus: true });
  }),
  password: (form) => busy(form, async () => {
    if (form.next.value.length < 6) throw { code: 'auth/weak-password' };
    await FB.changePassword(form.current.value, form.next.value);
    form.reset(); toast('Password changed.');
  }),
  delete: (form) => busy(form, async () => {
    const pw = form.password ? form.password.value : null;
    if (form.password && !pw) throw { code: 'auth/missing-password' };
    await FB.deleteAccount(pw);
    els.dialog.close();
    toast('Your account and data were deleted.');
    go('/');
  }),
};

function bind() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && actions[el.dataset.action]) { e.preventDefault(); actions[el.dataset.action](el, e); return; }
    if (S.ui.menu && e.target.closest('#mobile-menu a')) { S.ui.menu = false; }
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-submit]');
    if (!form || !submits[form.dataset.submit]) return;
    e.preventDefault();
    submits[form.dataset.submit](form);
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.change !== 'pf' || !S.ui.draft) return;
    const d = S.ui.draft;
    if (el.type === 'checkbox') d[el.name] = el.checked ? [...new Set([...d[el.name], el.value])] : d[el.name].filter((v) => v !== el.value);
    else d[el.name] = el.value;
    render();
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.keydown === 'chip' && (e.key === 'Enter' || e.key === ',')) {
      e.preventDefault();
      addChip(el.dataset.list, el.value);
      el.value = '';
      render({ keepFocus: true });
    }
    if (el.dataset && el.dataset.keydown === 'coach' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendCoach(el.value);
    }
    if (e.key === 'Escape' && S.ui.menu) actions['menu-close']();
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'coach-input') S.coach.draft = e.target.value; });
  window.addEventListener('hashchange', () => route());
}

/* ---------------- Boot ---------------- */
async function boot() {
  Object.assign(els, { header: $('#site-header'), menu: $('#mobile-menu'), main: $('#main'), footer: $('#site-footer'), toasts: $('#toasts'), status: $('#sr-status'), dialog: $('#dlg') });
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  bind();
  render();
  // Use the coach mascot only if public/img/coach.png exists.
  const probe = new Image();
  probe.onload = () => { S.coachAvatar = true; if (R.name === 'coach') render({ keepFocus: true }); };
  probe.src = '/img/coach.png';
  try {
    S.config = await getConfig();
  } catch (e) {
    els.main.innerHTML = toHtml(View.notfound('Can’t reach the server.', 'Start it with npm start, then reload this page.'));
    return;
  }
  if (!S.config.firebase) { S.user = null; route(); return; }
  try {
    await FB.init(S.config.firebase);
  } catch (e) {
    console.error(e);
    els.main.innerHTML = toHtml(View.notfound('Couldn’t load Firebase.', 'Check your internet connection and the FIREBASE_* values in .env, then reload.'));
    return;
  }
  FB.onUser(async (user) => {
    S.user = user ? { ...user, name: user.name || (S.user && S.user.uid === user.uid ? S.user.name : '') } : null;
    if (user) {
      if (S.loadedUid !== user.uid) { S.searches.clear(); await loadUserData(user); }
    } else {
      S.profile = null; S.saved = null; S.latest = null; S.loadedUid = null; S.jobs.clear(); S.searches.clear(); resetCoach(null);
    }
    route();
  });
}

boot();
