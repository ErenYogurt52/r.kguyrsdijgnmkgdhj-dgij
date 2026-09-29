// Page and component templates. Pure functions: (state) → escaped HTML.
import { h, raw, esc } from './html.js';
import { icon, Logo, HERO_ART } from './icons.js';
import { htmlToText } from './text.js';
import { MAJORS, MAJOR_KEYWORDS, MAJOR_SKILLS, SKILL_NAMES, UNIVERSITIES, AREAS, MODES, YEARS, JOB_TYPES, fold } from './reference.js';

const VI_RE = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
export const txt = (t) => (VI_RE.test(t || '') ? h`<span lang="vi">${t}</span>` : t);
const pad = (n) => String(n).padStart(2, '0');
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export function ago(ms) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
export const queryFor = (k) => (VI_RE.test(k) ? `thực tập sinh ${k}` : `${k} intern`);
const kindLabel = (j) => (j.kind === 'internship' ? 'Internship' : 'No experience needed');
// Job type tags: the schedule the listing shows, plus Full-time / Part-time when only the text says so.
const TYPE_TEXT = { fulltime: ['Full-time', /full[ \-–]?time|toan thoi gian/], parttime: ['Part-time', /part[ \-–]?time|partime|ban thoi gian/] };
export function jobTypeTags(j) {
  const sched = j.scheduleType && fold(j.scheduleType) !== fold(kindLabel(j)) ? j.scheduleType : '';
  const tags = sched ? [sched] : [];
  for (const t of j.jobTypes || []) if (TYPE_TEXT[t] && !TYPE_TEXT[t][1].test(fold(sched))) tags.push(TYPE_TEXT[t][0]);
  return tags;
}
export const jobTypeText = (j) => [...new Set([j.scheduleType, ...jobTypeTags(j)].filter(Boolean))].join(', ');
const typeName = (id) => (JOB_TYPES.find(([v]) => v === id) || [, ''])[1];
export const applyTarget = (j) => j.applyOptions[0] || (j.shareLink ? { title: 'Original listing', link: j.shareLink } : null);
const locLine = (j) => {
  if (j.remote && !j.area && !j.location) return 'Remote, Vietnam';
  return h`${txt(j.location || 'Ho Chi Minh City')}${j.remote ? ' · Remote possible' : ''}`;
};
const ext = (href, cls, label, content) => h`<a class="${cls}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label} (opens in a new tab)">${content}</a>`;

/* ---------------- Chrome ---------------- */
export function Header(route, ctx) {
  const n = ctx.savedCount;
  const nav = ctx.user
    ? [['top', '#/top', 'Top 10'], ['coach', '#/coach', 'Coach'], ['saved', '#/saved', 'Saved'], ['how', '#/how-it-works', 'How it works']]
    : [['how', '#/how-it-works', 'How it works']];
  const cur = (k) => route.name === k || (k === 'top' && route.name === 'detail');
  return h`<div class="container header-row">
    <a class="brand" href="#/">${Logo()}<span>Intern Match</span></a>
    <nav class="main-nav" aria-label="Main"><ul>${nav.map(([k, href, label]) => h`<li><a href="${href}"${cur(k) ? raw(' aria-current="page"') : ''}>${label}${k === 'saved' && n ? h`<span class="nav-count"><span class="sr-only">, </span>${n}<span class="sr-only"> saved</span></span>` : ''}</a></li>`)}</ul></nav>
    <div class="header-actions">${ctx.user
      ? h`<a class="btn btn-outline btn-sm header-profile" href="#/profile" aria-label="Your profile"${route.name === 'profile' ? raw(' aria-current="page"') : ''}>${icon('user')}<span>${ctx.user.name ? ctx.user.name.split(' ').slice(-1)[0] : 'Your profile'}</span></a>`
      : h`<a class="btn btn-sm header-login" href="#/login">Log in</a><a class="btn btn-primary btn-sm" href="#/signup">Sign up</a>`}
      <button class="icon-btn menu-btn" type="button" data-action="menu-open" aria-label="Open menu" aria-expanded="${ctx.menu ? 'true' : 'false'}" aria-controls="mobile-menu" data-fk="menu-btn">${icon('menu')}</button>
    </div>
  </div>`;
}

export function MobileMenu(route, ctx) {
  const links = ctx.user
    ? [['#/', 'Home', 'home'], ['#/top', 'Top 10', 'top'], ['#/coach', 'Career coach', 'coach'], ['#/saved', 'Saved', 'saved'], ['#/profile', 'Your profile', 'profile'], ['#/how-it-works', 'How it works', 'how']]
    : [['#/', 'Home', 'home'], ['#/how-it-works', 'How it works', 'how'], ['#/login', 'Log in', 'login'], ['#/signup', 'Sign up', 'signup']];
  return h`<div class="container mm-head"><a class="brand" href="#/">${Logo()}<span>Intern Match</span></a><button class="icon-btn" type="button" data-action="menu-close" aria-label="Close menu" data-fk="menu-close">${icon('close')}</button></div>
  <nav class="container mm-nav" aria-label="Menu"><ol>${links.map(([href, label, k], i) => h`<li><a href="${href}"${route.name === k ? raw(' aria-current="page"') : ''}><span class="mm-num" aria-hidden="true">${pad(i + 1)}</span>${label}</a></li>`)}</ol>
  ${ctx.user ? h`<p class="mm-soon">Signed in as ${ctx.user.email}. <button type="button" class="link-btn mm-signout" data-action="signout">Sign out</button></p>` : ''}</nav>`;
}

export function Footer(ctx) {
  return h`<div class="container">
    <p class="footer-mark" aria-hidden="true">Intern Match.</p>
    <div class="footer-grid">
      <p class="footer-lead">Internships and no-experience jobs. Ho Chi Minh City only. You apply on the original website.</p>
      <nav aria-label="Footer"><h2 class="footer-h">Explore</h2><ul>${ctx.user
        ? h`<li><a href="#/top">Top 10</a></li><li><a href="#/coach">Career coach</a></li><li><a href="#/saved">Saved</a></li><li><a href="#/profile">Your profile</a></li>`
        : h`<li><a href="#/signup">Sign up</a></li><li><a href="#/login">Log in</a></li>`}<li><a href="#/how-it-works">How it works</a></li></ul></nav>
      <div><h2 class="footer-h">Listings</h2><p class="footer-note">Each listing links to the website that posted it.</p></div>
      <div><h2 class="footer-h">Your data</h2><p class="footer-note">Your account, profile and saved list are stored in Firebase. Intern Match never asks for your CV.</p></div>
    </div>
    <div class="footer-base">   <span>© 2026 InternMatch by Nhom 6 STKN</span><span>Built for university students in Ho Chi Minh City</span></div>
  </div>`;
}

/* ---------------- Shared components ---------------- */
export function SearchForm(q, variant, placeholder = 'Search by role or field, e.g. Marketing') {
  return h`<form class="search search-${variant}" role="search" data-submit="search">
    <div class="search-field">${icon('search', 'search-ic')}<label class="sr-only" for="q-${variant}">Keywords</label>
      <input id="q-${variant}" name="q" type="search" value="${q}" placeholder="${placeholder}" autocomplete="off" enterkeyhint="search" maxlength="60" data-fk="q-${variant}"></div>
    <div class="search-loc"><span class="sr-only">Location: </span>${icon('lock')}<span>Ho Chi Minh City</span><span class="sr-only"> (fixed)</span></div>
    <button class="btn btn-primary search-btn" type="submit">Search</button>
  </form>`;
}

// Why the list has fewer than 10 jobs, from what the search removed. Empty when nothing to say.
function shortfall(n, meta, jt) {
  const st = meta.stats || {}, rm = st.removed || {};
  const seen = st.seen || 0;
  const head = n ? `Only ${n} ${n === 1 ? 'job fits' : 'jobs fit'} right now.` : '';
  if (!seen) return `${head} No listings came back for these keywords. Try a broader keyword, like a field instead of a job title.`.trim();
  const parts = [];
  const exp = (rm.experience || 0) + (rm.senior || 0);
  if (jt !== 'any' && rm.jobType) parts.push(`${rm.jobType} didn’t say they’re ${typeName(jt).toLowerCase()}`);
  if (exp) parts.push(`${exp} asked for experience or were senior roles`);
  if ((rm.location || 0) + (rm.abroad || 0)) parts.push(`${(rm.location || 0) + (rm.abroad || 0)} were outside Ho Chi Minh City`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `${head} We checked ${seen} ${seen === 1 ? 'listing' : 'listings'}${list ? `: ${list}.` : ' for these keywords.'}`.trim();
}

// Full-time / part-time filter shown under the search bar on the Top 10 page.
function JobTypeFilter(ctx) {
  const cur = (ctx.profile && ctx.profile.jobType) || 'any';
  return h`<div class="jt-filter" role="group" aria-label="Job type"><span class="jt-label">Job type</span>${JOB_TYPES.map(([v, l]) => h`<button type="button" class="jt-opt" data-action="jobtype" data-value="${v}" aria-pressed="${cur === v ? 'true' : 'false'}" data-fk="jt-${v}">${l}</button>`)}</div>`;
}

export function SaveButton(j, ctx, variant = 'card', prefix = 'c') {
  const on = ctx.savedIds.has(j.id);
  return h`<button type="button" class="btn btn-save btn-save-${variant}" data-action="save" data-id="${j.id}" aria-pressed="${on ? 'true' : 'false'}" aria-label="${on ? 'Remove from saved' : 'Save'}: ${j.title}, ${j.company}" title="${on ? 'Saved' : 'Save'}" data-fk="save-${variant}-${prefix}-${j.id}">${icon(on ? 'bookmark-fill' : 'bookmark')}${variant === 'card' ? '' : h`<span class="save-text">${on ? 'Saved' : 'Save'}</span>`}</button>`;
}

const SourceBadge = (j) => h`<p class="src"><span class="src-badge"><span class="src-k">Via</span><span class="src-v">${txt(j.via || 'Original site')}</span></span>${j.applyOptions.length > 1 ? h`<span class="src-more">+${j.applyOptions.length - 1}<span class="sr-only"> more ${j.applyOptions.length === 2 ? 'site' : 'sites'}</span></span>` : ''}</p>`;

export function JobCard(j, ctx, opts = {}) {
  const p = opts.prefix || 'c', tid = `t-${p}-${j.id}`;
  const target = applyTarget(j);
  return h`<article class="job-card" aria-labelledby="${tid}">
    <div class="jc-top">${SourceBadge(j)}${opts.rank ? h`<span class="jc-rank" aria-label="Number ${opts.rank}">${pad(opts.rank)}</span>` : ''}</div>
    <div><h3 class="jc-title" id="${tid}"><a href="#/internships/${j.id}" data-fk="card-${p}-${j.id}">${txt(j.title)}</a></h3><p class="jc-company">${txt(j.company)}</p></div>
    ${j.salary ? h`<p class="jc-salary">${txt(j.salary)}</p>` : ''}
    <p class="jc-loc">${icon('pin')}<span>${locLine(j)}</span></p>
    <ul class="tags" aria-label="Details"><li class="tag tag-kind">${kindLabel(j)}</li>${jobTypeTags(j).map((t) => h`<li class="tag">${txt(t)}</li>`)}</ul>
    ${j.reasons && j.reasons.length ? h`<p class="jc-reason">${icon('sparkle')}<span>${txt(j.reasons.slice(0, 2).join(' · '))}</span></p>` : ''}
    <div class="jc-dates"><span>${j.postedAt ? h`Posted ${txt(j.postedAt)}` : 'Posting date not listed'}</span>${opts.savedAt ? h`<span>Saved ${ago(opts.savedAt)}</span>` : ''}</div>
    <div class="jc-actions">${target
      ? ext(target.link, 'btn btn-primary btn-card', `Apply on ${target.title}: ${j.title}, ${j.company}`, h`Apply on ${txt(target.title)} ${icon('external')}`)
      : h`<a class="btn btn-outline btn-card" href="#/internships/${j.id}">View details ${icon('arrow')}</a>`}
      ${SaveButton(j, ctx, 'card', p)}</div>
  </article>`;
}

const Grid = (jobs, ctx, opts = {}) => h`<ol class="card-grid${opts.ranked ? ' is-ranked' : ''}">${jobs.map((j, i) => h`<li>${JobCard(j, ctx, { ...opts, rank: opts.ranked ? i + 1 : 0, savedAt: opts.savedAt && opts.savedAt(j) })}</li>`)}</ol>`;
export const SkeletonGrid = (n = 6) => h`<ul class="card-grid" aria-hidden="true">${Array.from({ length: n }, () => h`<li><div class="job-card skel"><div class="sk sk-badge"></div><div class="sk sk-title"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div><div class="sk sk-tags"></div><div class="sk sk-btn"></div></div></li>`)}</ul>`;
const Mark = () => h`<div class="empty-mark" aria-hidden="true"><span></span><span></span><span></span></div>`;
const Empty = (title, text, actions, alert) => h`<div class="empty"${alert ? raw(' role="alert"') : ''}>${Mark()}<h2 class="empty-title">${title}</h2><p class="empty-text">${text}</p>${actions ? h`<div class="empty-actions">${actions}</div>` : ''}</div>`;
export const Loading = (text = 'Loading…') => h`<div class="container page-pad"><p class="loading-line" role="status">${text}</p>${SkeletonGrid(3)}</div>`;

/* ---------------- Home ---------------- */
const STEPS = [
  ['Create your profile', 'Your major, skills, and the kinds of roles you want. These become your search keywords.'],
  ['We search for you', 'We look for internships and entry-level jobs in Ho Chi Minh City that match your keywords.'],
  ['We keep what fits a student', 'Only internships, or jobs that clearly say no experience is needed. Everything else is removed.'],
  ['You get your top 10', 'Ordered by how well each listing fits your keywords, skills and preferred areas.'],
  ['Apply on the original website', 'Save the ones you like, then finish on the site that posted them. We never collect your CV.'],
];

export function home(ctx) {
  const kws = (ctx.profile && ctx.profile.keywords) || [];
  return h`<section class="hero grain" aria-labelledby="hero-title">${raw(HERO_ART)}
    <div class="container hero-inner">
      <dl class="hero-facts"><div><dt>Picks</dt><dd>Your top 10</dd></div><div><dt>Location</dt><dd>Ho Chi Minh City</dd></div><div><dt>Apply</dt><dd>On the original website</dd></div></dl>
      <h1 id="hero-title" class="display">Find the right internship for your future.</h1>
      <p class="hero-sub">Tell us what you study and what you’re looking for. We show your 10 best internships and no-experience jobs in Ho Chi Minh City.</p>
      ${ctx.user
        ? h`${SearchForm('', 'hero')}${kws.length ? h`<div class="quick quick-hero" role="group" aria-label="Your keywords">${kws.map((k) => h`<a class="chip" href="#/top?q=${encodeURIComponent(k)}">${txt(k)}</a>`)}<a class="chip chip-strong" href="#/top">${icon('sparkle', 'chip-ic')}See your top 10</a></div>` : ''}`
        : h`<div class="hero-cta"><a class="btn btn-primary search-btn" href="#/signup">Create a free account ${icon('arrow')}</a><a class="btn btn-ghost-dark search-btn" href="#/login">Log in</a></div>`}
    </div></section>
  <section class="section" aria-labelledby="how-title"><div class="container how-grid">
    <div class="how-panel grain"><p class="how-big">Unlock your potential<br>right now.</p><p class="how-cap">Internships and no-experience roles in Ho Chi Minh City, picked for your major and skills.</p></div>
    <div><p class="eyebrow">How it works</p><h2 id="how-title" class="h-section">How Intern Match works.</h2>
      <ol class="steps">${STEPS.map(([t, d], i) => h`<li><span class="step-n" aria-hidden="true">${pad(i + 1)}</span><h3 class="step-t">${t}</h3><p class="step-d">${d}</p></li>`)}</ol>
      <a class="link-arrow" href="#/how-it-works">What we keep and remove ${icon('arrow')}</a></div>
  </div></section>
  <section class="section section-tight" aria-labelledby="cat-title"><div class="container">
    <div class="section-head"><div><p class="eyebrow">Search by field</p><h2 id="cat-title" class="h-section">Popular internship fields.</h2></div><p class="section-sub">${ctx.user ? 'Pick a field to see its top 10 right now.' : 'Create a free account to search any field.'}</p></div>
    ${Tiles(ctx)}
  </div></section>
  <section class="section section-sources" aria-labelledby="rules-title"><div class="container">
    <div class="section-head"><div><p class="eyebrow eyebrow-light">What makes the list</p><h2 id="rules-title" class="h-section">Four rules, every time.</h2></div><p class="section-sub">Listings come from company sites and job boards. You always apply on the original site.</p></div>
    <ul class="sources rules">${[['01', 'Internship', 'Or a job that asks for no experience'], ['02', 'No experience', 'Listings that ask for years of experience are removed'], ['03', 'Ho Chi Minh City', 'Jobs in other cities are removed'], ['04', 'Your top 10', 'Ordered by fit with your profile'], ['05', 'Original website', 'Apply where the job was posted']].map(([c, n, d]) => h`<li class="source"><span class="source-circle" aria-hidden="true">${c}</span><span class="source-name">${n}</span><span class="source-n">${txt(d)}</span></li>`)}</ul>
  </div></section>`;
}

const TILE = ['#7A150F', '#9B1C14', '#B0301A', '#C8481A', '#D8561F', '#E8662B', '#EC7433', '#F0823A', '#F28E3D', '#F5993F', '#F7A95A'];
function Tiles(ctx) {
  return h`<ul class="tiles">${MAJORS.map((m, i) => h`<li><a class="tile${i >= 4 ? ' tile-light' : ''}" style="--tile:${TILE[i]}" href="${ctx.user ? `#/top?q=${encodeURIComponent(MAJOR_KEYWORDS[m.id][0])}` : '#/signup'}"><span class="tile-ic">${icon(m.icon)}</span><span class="tile-name">${m.name}</span><span class="tile-count">${txt(MAJOR_KEYWORDS[m.id].slice(0, 3).join(', '))}</span>${icon('arrow', 'tile-arrow')}</a></li>`)}</ul>`;
}

export function how() {
  return h`<div class="page-head container"><p class="eyebrow">How it works</p><h1 class="page-title">How Intern Match works.</h1><p class="lead">We turn your profile into searches, remove anything that isn’t right for a student, and show you the 10 best matches. You always apply on the original website.</p></div>
  <div class="container page-body narrow how-page">
    <ol class="steps">${STEPS.map(([t, d], i) => h`<li><span class="step-n" aria-hidden="true">${pad(i + 1)}</span><h2 class="step-t">${t}</h2><p class="step-d">${d}</p></li>`)}</ol>
    <section class="rules-cols" aria-label="Rules"><div><h2 class="h2">What we keep</h2><ul class="ticks">
      <li>Listings whose title or job type says internship, intern or trainee, in English or Vietnamese.</li>
      <li>Other entry-level jobs only when the listing clearly says no experience is needed.</li>
      <li>Jobs in Ho Chi Minh City, and remote jobs based in Vietnam.</li></ul></div>
    <div><h2 class="h2">What we remove</h2><ul class="ticks">
      <li>Jobs asking for months or years of experience. Experience that’s only “a plus” doesn’t count against a job.</li>
      <li>Senior, lead and manager roles.</li>
      <li>Jobs in other provinces, and overseas labour programmes.</li>
      <li>The same job posted on several sites. We keep one and list every site you can apply on.</li></ul></div></section>
    <section><h2 class="h2">How the top 10 is ordered</h2><p>A listing ranks higher when its title matches one of your keywords, when it mentions skills you have, and when it’s in one of your preferred areas. We show the reasons on each card rather than a score.</p></section>
    <section><h2 class="h2">Full-time or part-time</h2><p>Pick a job type on your Top 10 page or in your profile. With Full-time or Part-time, we search for that type and only show listings that say they are full-time or part-time. Many listings don’t say, so choose Any to see everything.</p></section>
    <section><h2 class="h2">Career coach</h2><p>The coach is an AI assistant. It reads your profile and your top 10 to suggest where to apply first, which skills to build, and to help with CV lines and interview practice. It only talks about listings you can see and can still make mistakes, so check details on the original website.</p></section>
    <section><h2 class="h2">Your data</h2><p>Your account, profile, latest results and saved list are stored in your Firebase account and only you can read them. Intern Match never takes applications or CVs.</p></section>
  </div>`;
}

/* ---------------- Auth ---------------- */
const Field = (id, label, input, hint) => h`<div class="field"><label for="${id}">${label}</label>${input}${hint ? h`<p class="hint" id="${id}-hint">${hint}</p>` : ''}</div>`;
const Password = (id, name, auto, label = 'Password', hint = '') => Field(id, label, h`<div class="pw"><input id="${id}" name="${name}" type="password" autocomplete="${auto}" required minlength="6" data-fk="${id}"${hint ? raw(` aria-describedby="${id}-hint"`) : ''}><button type="button" class="icon-btn pw-toggle" data-action="toggle-pw" data-for="${id}" aria-label="Show password" aria-pressed="false">${icon('eye')}</button></div>`, hint);
const GoogleBtn = () => h`<button type="button" class="btn btn-outline btn-block btn-google" data-action="google" data-fk="google"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z"/></svg>Continue with Google</button>`;

function AuthShell(eyebrow, title, body, panelBig) {
  return h`<div class="container auth">
    <div class="auth-panel grain" aria-hidden="true">${raw(HERO_ART)}<p class="how-big">${raw(panelBig)}</p><p class="how-cap">Internships and no-experience jobs in Ho Chi Minh City, picked for your profile.</p></div>
    <div class="auth-card"><p class="eyebrow">${eyebrow}</p><h1 class="page-title auth-title" tabindex="-1">${title}</h1>${body}</div>
  </div>`;
}
const FormError = () => h`<p class="form-error" data-role="error" role="alert" hidden></p>`;

export function signup() {
  return AuthShell('Create your account', 'Sign up.', h`<form class="auth-form" data-submit="signup" novalidate>
      ${Field('su-name', 'Your name', h`<input id="su-name" name="name" type="text" autocomplete="name" maxlength="80" data-fk="su-name">`)}
      ${Field('su-email', 'Email', h`<input id="su-email" name="email" type="email" autocomplete="email" required data-fk="su-email">`)}
      ${Password('su-pw', 'password', 'new-password', 'Password', 'At least 6 characters.')}
      ${FormError()}
      <button type="submit" class="btn btn-primary btn-block" data-fk="su-submit">Create account</button></form>
    <div class="or"><span>or</span></div>${GoogleBtn()}
    <p class="auth-alt">Already have an account? <a href="#/login">Log in</a></p>`, 'Your top 10.<br>One sign-up away.');
}

export function login(route) {
  return AuthShell('Welcome back', 'Log in.', h`<form class="auth-form" data-submit="login" novalidate>
      ${Field('li-email', 'Email', h`<input id="li-email" name="email" type="email" autocomplete="email" required data-fk="li-email">`)}
      ${Password('li-pw', 'password', 'current-password')}
      ${FormError()}
      <button type="submit" class="btn btn-primary btn-block" data-fk="li-submit">Log in</button></form>
    <p class="auth-alt"><a href="#/reset">Forgot your password?</a></p>
    <div class="or"><span>or</span></div>${GoogleBtn()}
    <p class="auth-alt">New to Intern Match? <a href="#/signup${route.params.next ? `?next=${encodeURIComponent(route.params.next)}` : ''}">Create an account</a></p>`, 'Welcome<br>back.');
}

export function reset(ctx) {
  return AuthShell('Reset password', 'Forgot your password?', ctx.resetSent
    ? h`<p class="lead-sm" role="status">If an account exists for <strong>${ctx.resetSent}</strong>, a reset link is on its way. Check your inbox and spam folder.</p><p class="auth-alt"><a class="btn btn-primary" href="#/login">Back to log in</a></p>`
    : h`<p class="lead-sm">We’ll email you a link to choose a new password.</p><form class="auth-form" data-submit="reset" novalidate>
      ${Field('rs-email', 'Email', h`<input id="rs-email" name="email" type="email" autocomplete="email" required data-fk="rs-email">`)}
      ${FormError()}
      <button type="submit" class="btn btn-primary btn-block" data-fk="rs-submit">Send reset link</button></form>
      <p class="auth-alt"><a href="#/login">Back to log in</a></p>`, 'Back in<br>a minute.');
}

/* ---------------- Profile form ---------------- */
const Select = (id, name, label, opts, value) => h`<div class="field"><label for="${id}">${label}</label><select id="${id}" name="${name}" data-change="pf" data-fk="${id}">${opts.map(([v, l]) => h`<option value="${v}"${String(v) === String(value || '') ? raw(' selected') : ''}>${l}</option>`)}</select></div>`;
const Seg = (name, legend, opts, value) => h`<fieldset class="field"><legend>${legend}</legend><div class="seg">${opts.map(([v, l]) => h`<label class="seg-opt"><input type="radio" name="${name}" value="${v}" data-change="pf" data-fk="pf-${name}-${v}"${value === v ? raw(' checked') : ''}><span>${l}</span></label>`)}</div></fieldset>`;
const Checks = (name, legend, opts, values) => h`<fieldset class="field"><legend>${legend}</legend><div class="check-grid">${opts.map(([v, l]) => h`<label class="opt"><input type="checkbox" name="${name}" value="${v}" data-change="pf" data-fk="pf-${name}-${v}"${values.includes(v) ? raw(' checked') : ''}><span class="opt-box" aria-hidden="true">${icon('check')}</span><span class="opt-l">${txt(l)}</span></label>`)}</div></fieldset>`;

function ChipInput(list, label, values, placeholder, suggestions, hint, error) {
  const id = `pf-${list}`;
  return h`<div class="field"><label for="${id}">${label}</label>
    <div class="chip-input${error ? ' is-invalid' : ''}">${values.map((s) => h`<span class="skill-chip">${txt(s)}<button type="button" data-action="chip-remove" data-list="${list}" data-value="${s}" aria-label="Remove ${s}" data-fk="rm-${list}-${s}">${icon('close')}</button></span>`)}
      <input id="${id}" type="text" ${list === 'skills' ? raw('list="skill-options"') : ''} placeholder="${values.length ? 'Add another' : placeholder}" data-keydown="chip" data-list="${list}" data-fk="${id}" autocomplete="off" maxlength="60" aria-describedby="${id}-hint${error ? ` ${id}-err` : ''}"${error ? raw(' aria-invalid="true"') : ''}>
      <button type="button" class="btn btn-outline btn-sm" data-action="chip-add" data-list="${list}" data-fk="${id}-add">Add</button></div>
    ${error ? h`<p class="form-error" id="${id}-err">${error}</p>` : ''}
    <p class="hint" id="${id}-hint">${hint}</p>
    ${suggestions.length ? h`<div class="suggest">${suggestions.map((s) => h`<button type="button" class="sug" data-action="chip-add" data-list="${list}" data-value="${s}" data-fk="sug-${list}-${s}">+ ${txt(s)}</button>`)}</div>` : ''}</div>`;
}

export function ProfileForm(d, ctx, mode) {
  const max = ctx.config.maxKeywords || 3;
  const kwSug = (d.major ? MAJOR_KEYWORDS[d.major] : ['Marketing', 'Data analyst', 'Accounting', 'Business development', 'Software engineer', 'Graphic design']).filter((k) => !d.keywords.includes(k));
  const skSug = (d.major ? MAJOR_SKILLS[d.major] : ['Excel', 'PowerPoint', 'Canva', 'Content writing', 'SQL', 'Python', 'Figma']).filter((s) => !d.skills.includes(s)).slice(0, 8);
  const used = d.keywords.slice(0, max);
  const parts = [['Study', d.major], ['Keywords', d.keywords.length], ['Skills', d.skills.length], ['Preferences', d.areas.length || d.modes.length]];
  return h`<div class="container profile">
    <form class="profile-form" data-submit="profile" novalidate>
      <section class="pf-sec" aria-labelledby="pf-s1"><p class="pf-num" aria-hidden="true">01</p><div class="pf-fields"><h2 class="h2" id="pf-s1">Study</h2>
        ${Select('pf-university', 'university', 'University', [['', 'Choose your university'], ...UNIVERSITIES.map((u) => [u.id, u.id === 'other' ? u.name : `${u.short}: ${u.name}`])], d.university)}
        ${Select('pf-major', 'major', 'Major', [['', 'Choose your major'], ...MAJORS.map((m) => [m.id, m.name])], d.major)}
        ${Seg('year', 'Year of study', YEARS, d.year)}</div></section>
      <section class="pf-sec" aria-labelledby="pf-s2"><p class="pf-num" aria-hidden="true">02</p><div class="pf-fields"><h2 class="h2" id="pf-s2">What you’re looking for</h2>
        ${ChipInput('keywords', 'Search keywords', d.keywords, 'e.g. Marketing, Data analyst, Accounting', kwSug, `Roles or fields, in English or Vietnamese. We search with your first ${max}.`, ctx.pfError)}</div></section>
      <section class="pf-sec" aria-labelledby="pf-s3"><p class="pf-num" aria-hidden="true">03</p><div class="pf-fields"><h2 class="h2" id="pf-s3">Skills</h2>
        ${ChipInput('skills', 'Skills you have', d.skills, 'Type a skill, then press Enter', skSug, 'Listings that mention your skills move up your list.')}
        <datalist id="skill-options">${SKILL_NAMES.map((s) => h`<option value="${s}"></option>`)}</datalist></div></section>
      <section class="pf-sec" aria-labelledby="pf-s4"><p class="pf-num" aria-hidden="true">04</p><div class="pf-fields"><h2 class="h2" id="pf-s4">Preferences</h2>
        ${Checks('areas', 'Preferred areas', AREAS.map((a) => [a.id, a.name]), d.areas)}
        ${Checks('modes', 'Working mode', MODES, d.modes)}
        ${Seg('jobType', 'Job type', JOB_TYPES, d.jobType || 'any')}</div></section>
      <div class="pf-actions"><button class="btn btn-primary" type="submit" data-fk="pf-save"${ctx.busy ? raw(' disabled aria-busy="true"') : ''}>${mode === 'welcome' ? h`Find my top 10 ${icon('arrow')}` : 'Save profile'}</button>
        ${mode === 'welcome' ? '' : h`<a class="btn btn-outline" href="#/top">Cancel</a>`}</div>
      <p class="hint">Stored in your account. Nothing is sent to employers.</p>
    </form>
    <aside class="pf-aside" aria-labelledby="pf-meter-t"><p class="pf-aside-t" id="pf-meter-t">Your search</p>
      <div class="meter meter-4" aria-hidden="true">${parts.map((f) => h`<span${f[1] ? raw(' class="on"') : ''}></span>`)}</div>
      <ul class="factor-list">${parts.map(([n, ok]) => h`<li class="${ok ? 'is-set' : ''}">${icon(ok ? 'check' : 'minus')}<span>${n}</span><span class="sr-only">${ok ? ': set' : ': not set'}</span></li>`)}</ul>
      <div class="pf-preview">${used.length
        ? h`<p class="hint">We’ll search for:</p><ul class="q-list">${used.map((k) => h`<li>${txt(`“${queryFor(k)}”`)}</li>`)}</ul><p class="hint">Only internships or jobs asking for no experience, in Ho Chi Minh City.</p>`
        : h`<p class="hint">Add at least one keyword to see your top 10.</p>`}</div></aside>
  </div>`;
}

export function welcome(d, ctx) {
  return h`<div class="page-head container"><p class="eyebrow">Step 1 of 1</p><h1 class="page-title" tabindex="-1">Set up your profile.</h1><p class="lead">Your keywords decide what we search for. Skills and areas decide the order of your top 10.</p></div>${ProfileForm(d, ctx, 'welcome')}`;
}

export function profile(d, ctx) {
  const u = ctx.user, pw = u.providers.includes('password');
  return h`<div class="page-head container"><p class="eyebrow">Your profile</p><h1 class="page-title" tabindex="-1">Tell us about you.</h1><p class="lead">Change your keywords any time. Your top 10 updates the next time you open it.</p>
    ${pw && !u.emailVerified ? h`<p class="nudge">${icon('mail')}<span>Please verify ${u.email}. It helps you recover your account.</span><button type="button" class="link-btn" data-action="verify" data-fk="verify">Send the email again</button></p>` : ''}</div>
  ${ProfileForm(d, ctx, 'profile')}
  <section class="container account" aria-labelledby="acc-title">
    <div class="section-head"><div><p class="eyebrow">Account</p><h2 id="acc-title" class="h-section">Your account.</h2></div></div>
    <div class="acc-grid">
      <form class="acc-card" data-submit="name" novalidate><h3 class="h2">Name and email</h3>
        ${Field('ac-name', 'Name', h`<input id="ac-name" name="name" type="text" autocomplete="name" maxlength="80" value="${u.name}" data-fk="ac-name">`)}
        <p class="acc-email">${icon('mail')}<span>${u.email}</span>${u.emailVerified ? h`<span class="tag">Verified</span>` : pw ? h`<span class="tag tag-soon">Not verified</span>` : ''}</p>
        <p class="hint">Signed in with ${pw ? 'email and password' : 'Google'}.</p>${FormError()}
        <div><button class="btn btn-outline btn-sm" type="submit">Save name</button></div></form>
      ${pw ? h`<form class="acc-card" data-submit="password" novalidate><h3 class="h2">Password</h3>
        ${Password('ac-cur', 'current', 'current-password', 'Current password')}
        ${Password('ac-new', 'next', 'new-password', 'New password', 'At least 6 characters.')}${FormError()}
        <div><button class="btn btn-outline btn-sm" type="submit">Change password</button></div></form>` : ''}
      <div class="acc-card"><h3 class="h2">Sign out</h3><p class="muted">Your profile and saved list stay in your account.</p><div><button class="btn btn-outline btn-sm" type="button" data-action="signout" data-fk="signout">${icon('logout')}Sign out</button></div></div>
      <div class="acc-card acc-danger"><h3 class="h2">Delete account</h3><p class="muted">Deletes your profile, saved list and results for good.</p><div><button class="btn btn-danger btn-sm" type="button" data-action="delete-open" data-fk="delete-open">${icon('trash')}Delete account</button></div></div>
    </div>
  </section>`;
}

export function DeleteDialog(ctx) {
  const pw = ctx.user.providers.includes('password');
  return h`<form method="dialog" data-submit="delete" novalidate>
    <div class="dlg-head"><h2 class="dlg-title" id="dlg-title" tabindex="-1">Delete your account?</h2><button type="button" class="icon-btn" data-action="dlg-close" aria-label="Close">${icon('close')}</button></div>
    <div class="dlg-body"><p>This deletes your profile, saved internships and results, then your sign-in. It can’t be undone.</p>
      ${pw ? Password('dl-pw', 'password', 'current-password', 'Enter your password to confirm') : h`<p class="muted">Google will ask you to confirm it’s you.</p>`}${FormError()}</div>
    <div class="dlg-foot"><button type="button" class="btn btn-outline" data-action="dlg-close">Keep my account</button><button type="submit" class="btn btn-danger">${icon('trash')}Delete for good</button></div>
  </form>`;
}

/* ---------------- Top 10 ---------------- */
export function top(ctx, route, s) {
  const q = route.params.q;
  const kws = q ? [q] : ctx.profile.keywords.slice(0, ctx.config.maxKeywords || 3);
  const head = h`<div class="page-head container">
    ${q ? h`<p class="eyebrow">Search</p><h1 class="page-title" tabindex="-1">Top ${ctx.config.results || 10} for “${txt(q)}”.</h1>` : h`<p class="eyebrow">Your top ${ctx.config.results || 10}</p><h1 class="page-title" tabindex="-1">Picked for you.</h1>`}
    <p class="lead">Internships and jobs that need no experience, in Ho Chi Minh City.</p>
    <div class="rec-summary">${q
      ? h`<a class="link-arrow" href="#/top">${icon('arrow', 'flip')}Back to your top 10</a>`
      : h`<span class="muted">Your keywords:</span>${kws.map((k) => h`<span class="af-locked">${txt(k)}</span>`)}<a class="link-btn" href="#/profile">Edit keywords</a>`}</div>
    ${SearchForm(q || '', 'page', 'Try other keywords')}
    ${JobTypeFilter(ctx)}</div>`;
  let body;
  const jt = (ctx.profile && ctx.profile.jobType) || 'any';
  if (!s || s.status === 'loading') body = h`<p class="loading-line" role="status">${icon('search')}Searching for ${txt(kws.map((k) => `“${k}”`).join(', '))}${jt !== 'any' ? ` (${typeName(jt).toLowerCase()})` : ''}…</p>${SkeletonGrid(6)}`;
  else if (s.status === 'error') {
    const e = s.error;
    const actions = e.code === 'no_keywords' ? h`<a class="btn btn-primary" href="#/profile">Add keywords</a>`
      : e.code === 'unauthenticated' ? h`<a class="btn btn-primary" href="#/login">Log in again</a>`
      : e.code === 'daily_limit' || e.code === 'search_not_configured' ? '' : h`<button type="button" class="btn btn-primary" data-action="retry" data-fk="retry">${icon('refresh')}Try again</button>`;
    body = Empty(e.code === 'daily_limit' ? 'That’s all the searches for today.' : e.code === 'search_not_configured' ? 'Search isn’t set up yet.' : 'We couldn’t finish the search.', e.message, actions, true);
  } else {
    const { jobs, meta } = s.data;
    const limit = ctx.config.results || 10;
    const why = jobs.length < limit ? shortfall(jobs.length, meta, jt) : '';
    const anyBtn = jt !== 'any' ? h`<button type="button" class="btn btn-primary" data-action="jobtype" data-value="any" data-fk="jt-any-empty">Show any job type</button>` : '';
    body = jobs.length
      ? h`${why ? h`<p class="shortfall" role="status">${txt(why)}${jt !== 'any' ? h` <button type="button" class="link-btn" data-action="jobtype" data-value="any">Show any job type</button>` : ''}</p>` : ''}
        ${Grid(jobs, ctx, { prefix: 'r', ranked: true })}
        <div class="results-foot"><p class="fine">${meta.searchedAt ? `Updated ${ago(Date.parse(meta.searchedAt))}.` : ''}</p>
          <button type="button" class="btn btn-outline btn-sm" data-action="refresh" data-fk="refresh">${icon('refresh')}Search again</button></div>`
      : Empty(jt !== 'any' ? `No ${typeName(jt).toLowerCase()} jobs right now.` : 'Nothing that fits right now.', why,
        h`${anyBtn}<a class="btn ${anyBtn ? 'btn-outline' : 'btn-primary'}" href="#/profile">Edit keywords</a><button type="button" class="btn btn-outline" data-action="refresh">${icon('refresh')}Search again</button>`);
  }
  return h`${head}<div class="container page-body">${body}</div>`;
}

/* ---------------- Detail ---------------- */
export function detail(ctx, j) {
  const target = applyTarget(j);
  const others = j.applyOptions.slice(1);
  // htmlToText also cleans results saved before descriptions were cleaned on the server.
  const paras = htmlToText(j.description || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return h`<div class="container"><nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="#/top">Top 10</a></li><li aria-current="page">${txt(j.title)}</li></ol></nav></div>
  <div class="container detail has-bar">
    <header class="detail-head"><div class="detail-tags">${SourceBadge(j)}<span class="tag tag-kind">${kindLabel(j)}</span></div>
      <h1 class="page-title detail-title" tabindex="-1">${txt(j.title)}</h1>
      <p class="detail-company">${icon('building')}<span>${txt(j.company)}</span></p>
      <p class="detail-loc">${icon('pin')}<span>${locLine(j)}</span></p>
      <dl class="facts">
        <div><dt>Pay</dt><dd>${j.salary ? txt(j.salary) : 'Not listed'}</dd></div>
        <div><dt>Job type</dt><dd>${jobTypeText(j) ? txt(jobTypeText(j)) : 'Not listed'}</dd></div>
        <div><dt>Experience</dt><dd>${j.kind === 'internship' ? 'Internship' : 'None needed'}</dd></div>
        <div><dt>Posted</dt><dd>${j.postedAt ? txt(j.postedAt) : 'Not listed'}</dd></div>
      </dl></header>
    <aside class="detail-side" aria-label="Apply">
      <div class="apply-panel"><p class="ap-label">Apply on the original website.</p><p class="ap-text">Intern Match doesn’t take applications. ${target ? h`You’ll finish on ${txt(target.title)}.` : ''}</p>
        ${target ? ext(target.link, 'btn btn-inverse btn-block', `Apply on ${target.title}`, h`Apply on ${txt(target.title)} ${icon('external')}`) : ''}
        ${SaveButton(j, ctx, 'panel', 'd')}
        <p class="ap-tools"><a href="#/coach?job=${j.id}" data-fk="ask-coach">${icon('sparkle')}Ask the coach about this job</a></p>
        ${others.length ? h`<div class="ap-also"><p class="ap-sub">Also listed on</p><ul>${others.map((o) => h`<li>${ext(o.link, 'ap-link', `Apply on ${o.title}`, h`${txt(o.title)}${icon('external')}`)}</li>`)}</ul></div>` : ''}</div>
      ${j.reasons && j.reasons.length ? h`<section class="match-panel" aria-labelledby="why-t"><h2 class="mp-title" id="why-t">Why it’s on your list</h2><ul class="ticks why">${[j.kindReason, ...j.reasons].filter(Boolean).map((r) => h`<li>${txt(r)}</li>`)}</ul></section>` : ''}
    </aside>
    <div class="detail-body">
      ${j.highlights.map((hl) => h`<section><h2 class="h2">${txt(htmlToText(hl.title))}</h2><ul class="ticks">${hl.items.map((i) => h`<li>${txt(htmlToText(i))}</li>`)}</ul></section>`)}
      ${paras.length ? h`<section><h2 class="h2">Full description</h2><div class="desc">${paras.map((p) => (p.startsWith('## ') ? h`<h3 class="desc-h">${txt(p.slice(3))}</h3>` : h`<p>${txt(p)}</p>`))}</div></section>` : ''}
      <section><h2 class="h2">Source</h2><p>${j.via ? h`Listed via ${txt(j.via)}. ` : ''}The original website has the final word on details and deadlines.</p>
        ${j.shareLink ? h`<p>${ext(j.shareLink, 'link-arrow', 'View the original listing', h`View the original listing ${icon('external')}`)}</p>` : ''}</section>
    </div>
  </div>
  ${target ? h`<div class="apply-bar">${ext(target.link, 'btn btn-primary', `Apply on ${target.title}`, h`Apply on ${txt(target.title)} ${icon('external')}`)}${SaveButton(j, ctx, 'bar', 'b')}</div>` : ''}`;
}

/* ---------------- Saved ---------------- */
export function saved(ctx) {
  const list = ctx.savedList;
  const head = h`<div class="page-head container"><p class="eyebrow">Your shortlist</p><h1 class="page-title" tabindex="-1">Saved internships.</h1><p class="lead">${list ? (list.length ? `${plural(list.length, 'internship')} saved to your account.` : 'Saved to your account, on every device.') : ''}</p></div>`;
  if (!list) return h`${head}<div class="container page-body">${SkeletonGrid(3)}</div>`;
  if (!list.length) return h`${head}<div class="container page-body">${Empty('Nothing saved yet.', 'Save internships from your top 10 to compare them here.', h`<a class="btn btn-primary" href="#/top">See your top 10</a>`)}</div>`;
  const when = new Map(list.map((e) => [e.job.id, e.savedAt]));
  return h`${head}<div class="container page-body">${Grid(list.map((e) => e.job), ctx, { prefix: 'v', savedAt: (j) => when.get(j.id) })}</div>`;
}

export function notfound(title = 'Page not found.', text = 'The link may be old or mistyped.') {
  return h`<div class="container page-pad">${Empty(title, text, h`<a class="btn btn-primary" href="#/">Go to the home page</a>`)}</div>`;
}

export function setupNeeded(missing) {
  return h`<div class="page-head container"><p class="eyebrow">Setup</p><h1 class="page-title" tabindex="-1">Almost there.</h1><p class="lead">The server is running, but ${missing} ${missing.includes(' and ') ? 'are' : 'is'} not set up yet. Fill in the <code>.env</code> file as described in README.md, then restart the server.</p></div>`;
}

/* ---------------- Career coach ---------------- */
// Small, safe Markdown: **bold**, *italic*, `code`, headings, bullet and numbered lists, paragraphs.
export function md(src) {
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  const out = []; let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const rawLine of String(src || '').replace(/\r/g, '').split('\n')) {
    const line = rawLine.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/), num = line.match(/^\s*\d+[.)]\s+(.*)$/), head = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (bullet || num) {
      flushPara();
      const tag = bullet ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push((bullet || num)[1]);
    } else if (head) { flushPara(); flushList(); out.push(`<p class="md-h">${inline(head[1])}</p>`); }
    else if (!line.trim()) { flushPara(); flushList(); }
    else { flushList(); para.push(line.trim()); }
  }
  flushPara(); flushList();
  return out.join('');
}

export const coachSuggestions = (focusJob) => (focusJob
  ? [`Help me prepare for “${focusJob.title}”`, 'Write a short cover letter for this job', 'Which of my skills fit this job, and what am I missing?', 'Practise an interview for this job with me']
  : ['Which of my top 10 should I apply to first?', 'What skills should I learn next?', 'Write 3 CV bullet points for listing #1', 'Practise an interview for listing #1 with me']);

// Coach mascot: your own image at public/img/coach.png (transparent PNG works best).
// If the file isn't there, a small chat bubble is shown instead.
const COACH_IMG = '/img/coach.png';
const Avatar = (ctx, size = 'sm') => (ctx.coachAvatar
  ? h`<img class="coach-avatar coach-avatar-${size}" src="${COACH_IMG}" alt="" aria-hidden="true">`
  : h`<span class="coach-avatar coach-avatar-${size} coach-avatar-default" aria-hidden="true">${icon('sparkle')}</span>`);

export function coach(ctx, c) {
  const focus = c.focusJob;
  const head = h`<div class="page-head container"><p class="eyebrow">Career coach</p><h1 class="page-title" tabindex="-1">Ask your coach.</h1>
    <p class="lead">Where to apply first, which skills to build, CV lines and interview practice, based on your profile and your top 10.</p></div>`;
  if (!ctx.config.coachReady) return h`${head}<div class="container page-body">${Empty('The coach isn’t available yet.', 'Please check back later.', '', false)}</div>`;
  const msgs = c.messages;
  const name = ctx.user && ctx.user.name ? ctx.user.name.split(' ').slice(-1)[0] : '';
  return h`${head}<div class="container coach">
    <section class="coach-chat" aria-label="Conversation">
      ${focus ? h`<p class="coach-focus">${icon('info')}<span>Talking about <strong>${txt(focus.title)}</strong>, ${txt(focus.company)}.</span><a class="link-btn" href="#/coach">Talk about my top 10 instead</a></p>` : ''}
      <div class="coach-log" id="coach-log" aria-live="polite">
        <div class="msg msg-ai"><span class="msg-who" aria-hidden="true">${Avatar(ctx)}Coach</span><div class="msg-body"><p>Hi${name ? ` ${name}` : ''}! I’ve read your profile${ctx.topCount ? ` and your top ${ctx.topCount}` : ''}. Ask me anything about internships, or pick a question below.</p></div></div>
        ${msgs.map((m, i) => (m.role === 'user'
          ? h`<div class="msg msg-user"><span class="sr-only">You said: </span><div class="msg-body">${txt(m.content)}</div></div>`
          : h`<div class="msg msg-ai${m.pending ? ' is-pending' : ''}" data-msg="${i}"><span class="msg-who" aria-hidden="true">${Avatar(ctx)}Coach</span><span class="sr-only">Coach said: </span><div class="msg-body">${m.content ? raw(md(m.content)) : h`<span class="typing" aria-label="Coach is typing"><span></span><span></span><span></span></span>`}</div></div>`))}
        ${c.error ? h`<div class="msg msg-error" role="alert"><div class="msg-body"><p>${c.error}</p><button type="button" class="btn btn-outline btn-sm" data-action="coach-retry" data-fk="coach-retry">${icon('refresh')}Try again</button></div></div>` : ''}
      </div>
      ${msgs.length ? '' : h`<div class="suggest coach-suggest">${coachSuggestions(focus).map((q, i) => h`<button type="button" class="sug" data-action="coach-suggest" data-q="${q}" data-fk="coach-sug-${i}">${txt(q)}</button>`)}</div>`}
      <form class="coach-form" data-submit="coach" novalidate>
        <label class="sr-only" for="coach-input">Message the coach</label>
        <textarea id="coach-input" name="q" rows="2" maxlength="2000" placeholder="Ask in English or Vietnamese…" data-keydown="coach" data-fk="coach-input">${c.draft || ''}</textarea>
        <button type="submit" class="btn btn-primary" data-fk="coach-send"${c.busy ? raw(' disabled aria-busy="true"') : ''}>${c.busy ? 'Thinking…' : h`Send ${icon('arrow')}`}</button>
      </form>
      <p class="fine">Enter to send, Shift+Enter for a new line. The coach can make mistakes: check details on the original website before you apply.</p>
    </section>
    <aside class="pf-aside coach-aside" aria-labelledby="coach-knows">${ctx.coachAvatar ? h`<div class="coach-hero">${Avatar(ctx, 'lg')}</div>` : ''}<p class="pf-aside-t" id="coach-knows">What your coach knows</p>
      <ul class="factor-list">
        <li class="${ctx.profile.major ? 'is-set' : ''}">${icon(ctx.profile.major ? 'check' : 'minus')}<span>Major: ${(MAJORS.find((m) => m.id === ctx.profile.major) || {}).name || 'not set'}</span></li>
        <li class="is-set">${icon('check')}<span>Keywords: ${txt(ctx.profile.keywords.join(', '))}</span></li>
        <li class="${ctx.profile.skills.length ? 'is-set' : ''}">${icon(ctx.profile.skills.length ? 'check' : 'minus')}<span>${ctx.profile.skills.length ? plural(ctx.profile.skills.length, 'skill') : 'No skills yet'}</span></li>
        <li class="${ctx.topCount ? 'is-set' : ''}">${icon(ctx.topCount ? 'check' : 'minus')}<span>${ctx.topCount ? `Your top ${ctx.topCount} listings` : 'No top 10 loaded yet'}</span></li>
      </ul>
      <p class="hint">${ctx.topCount ? '' : h`<a href="#/top">Open your top 10</a> so the coach can talk about real listings. `}<a href="#/profile">Edit profile</a></p>
      <div class="pf-preview"><p class="hint">Chats aren’t saved: they’re cleared when you reload.</p>
        ${msgs.length ? h`<button type="button" class="btn btn-outline btn-sm" data-action="coach-reset" data-fk="coach-reset">${icon('refresh')}Start over</button>` : ''}</div>
    </aside>
  </div>`;
}
