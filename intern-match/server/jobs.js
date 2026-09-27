// Turns a student's keywords into Google Jobs searches, keeps only internships or
// jobs that ask for no experience, only in Ho Chi Minh City, and returns the top N.
// Pure functions except runSearch(), which takes the SearchApi client as a parameter.
import { createHash } from 'node:crypto';
import { fold, WARDS, FORMER, areaByKey, SKILL_ALIASES } from '../public/js/reference.js';

const clean = (s, max = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const isVietnamese = (s) => fold(s) !== String(s).toLowerCase();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Word-bounded phrase test on folded text; `suffix` allows endings like "recruit" → "recruitment".
const SUFFIX = '(?:s|es|ing|ment|ments|ed|er|ers|or|ors|ion|ions|ic|ics|y|ies|al)?';
const phraseRe = (phrase, suffix = false) => new RegExp(`(?<![a-z0-9])${esc(phrase)}${suffix ? SUFFIX : ''}(?![a-z0-9])`);
const has = (text, phrase, suffix) => phraseRe(phrase, suffix).test(text);

/* ---------- Queries ---------- */
export function queriesFor(keyword) {
  const k = clean(keyword, 60);
  const vi = isVietnamese(k);
  return [vi ? `thực tập sinh ${k}` : `${k} intern`, vi ? `${k} intern` : `thực tập sinh ${k}`, `${k} không yêu cầu kinh nghiệm`];
}

export function cleanKeywords(list, max) {
  const out = [], seen = new Set();
  for (const k of Array.isArray(list) ? list : []) {
    const c = clean(k, 60).replace(/[<>"]/g, '');
    const f = fold(c);
    if (c.length < 2 || seen.has(f)) continue;
    seen.add(f); out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

/* ---------- Normalise one Google Jobs result (SearchApi.io format) ---------- */
// https://www.searchapi.io/docs/google-jobs : jobs[].{title, company_name, location, via, description,
// job_highlights[{title, items}], extensions[], detected_extensions{posted_at, schedule, ...},
// apply_link, apply_links[{link, source}], sharing_link, thumbnail}
const MONEY = /(₫|vnd|vnđ|triệu|trieu|\$|usd|\/tháng|a month|per month|mỗi tháng|một tháng)/i;
const WFH = /(work from home|remote|làm việc tại nhà|làm việc từ xa|từ xa)/i;
const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

export function normalize(raw) {
  const de = raw.detected_extensions || {};
  const extensions = (raw.extensions || []).map((e) => clean(e, 60)).slice(0, 10);
  const title = clean(raw.title, 200), company = clean(raw.company_name, 160), location = clean(raw.location, 160);
  const via = clean(raw.via, 80).replace(/^(via|qua|thông qua|trên)\s+/i, '');
  let applyOptions = (raw.apply_links || [])
    .filter((o) => o && isHttp(o.link))
    .map((o) => ({ title: clean(o.source || o.title, 80).replace(/^(via|qua)\s+/i, '') || 'Original website', link: o.link.slice(0, 2000) }));
  if (isHttp(raw.apply_link) && !applyOptions.some((o) => o.link === raw.apply_link)) applyOptions.unshift({ title: via || 'Original website', link: raw.apply_link.slice(0, 2000) });
  // Put the site Google says it came from first.
  const fv = fold(via);
  applyOptions.sort((a, b) => (fold(b.title) === fv) - (fold(a.title) === fv));
  const highlights = (raw.job_highlights || [])
    .map((h) => ({ title: clean(h.title, 80), items: (h.items || []).map((i) => clean(i, 700)).filter(Boolean).slice(0, 25) }))
    .filter((h) => h.items.length);
  const schedule = de.schedule || de.schedule_type;
  const salary = de.salary || extensions.find((e) => MONEY.test(e));
  return {
    id: createHash('sha256').update(`${fold(title)}|${fold(company)}|${fold(location)}`).digest('hex').slice(0, 20),
    title, company, location, via,
    thumbnail: typeof raw.thumbnail === 'string' && /^https:\/\//.test(raw.thumbnail) ? raw.thumbnail.slice(0, 1000) : null,
    postedAt: de.posted_at ? clean(de.posted_at, 40) : null,
    scheduleType: schedule ? clean(schedule, 40) : null,
    workFromHome: Boolean(de.work_from_home) || extensions.some((e) => WFH.test(e)),
    salary: salary ? clean(salary, 80) : null,
    extensions,
    description: String(raw.description ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000),
    highlights, applyOptions,
    shareLink: isHttp(raw.sharing_link) ? raw.sharing_link : null,
  };
}

/* ---------- Location: Ho Chi Minh City only ---------- */
const HCM_STRONG = ['ho chi minh', 'hcm', 'tp hcm', 'tphcm', 'hcmc', 'sai gon', 'saigon', 'thu duc', 'binh duong', 'thu dau mot', 'di an', 'thuan an', 'vung tau', 'ba ria'];
const OTHER_PLACES = ['ha noi', 'hanoi', 'da nang', 'hai phong', 'can tho', 'dong nai', 'bien hoa', 'long an', 'bac ninh', 'bac giang', 'binh phuoc', 'tay ninh',
  'tien giang', 'ben tre', 'vinh long', 'khanh hoa', 'nha trang', 'quang ninh', 'hai duong', 'hung yen', 'vinh phuc', 'thai nguyen', 'nghe an', 'hue',
  'quang nam', 'quang ngai', 'binh dinh', 'lam dong', 'da lat', 'dak lak', 'gia lai', 'kien giang', 'phu quoc', 'an giang', 'dong thap', 'soc trang',
  'thanh hoa', 'ha nam', 'nam dinh', 'ninh binh', 'singapore', 'thailand', 'malaysia', 'japan', 'korea', 'philippines', 'indonesia', 'nhat ban', 'han quoc'];
const ANYWHERE = /(?<![a-z])(anywhere|moi noi|bat ky dau|worldwide|toan cau)(?![a-z])/;

// Finds which area a location is in, from an area name ("Quận 1", "District 1") or a
// ward/commune name ("Phường Bến Thành", "Bến Thành Ward").
const AREAS_BY_LENGTH = [...WARDS].sort((a, b) => b.name.length - a.name.length);
const FORMER_ALIASES = Object.entries(FORMER).flatMap(([key, list]) => list.map((alias) => [alias, key])).sort((a, b) => b[0].length - a[0].length);
// Names that on their own usually mean something bigger: an area name, a province, or the whole city.
const FORMER_WORDS = new Set([...FORMER_ALIASES.map(([alias]) => alias), 'binh duong', 'sai gon']);
const explicitRe = (n) => new RegExp(`(?<![a-z0-9])(?:(?:phuong|xa|dac khu|p\\.|x\\.)\\s*${esc(n)}|${esc(n)}\\s+(?:ward|commune))(?![a-z0-9])`);

export function findArea(text) {
  const t = fold(text);
  const formerHit = FORMER_ALIASES.find(([alias]) => has(t, alias));
  let former = formerHit ? formerHit[1] : null;
  let ward = null, explicit = false;
  for (const a of AREAS_BY_LENGTH) {
    const n = fold(a.name);
    if (explicitRe(n).test(t)) { ward = a; explicit = true; break; }
  }
  if (!ward) {
    // A bare name counts only if it isn't also an area name ("Gò Vấp") and doesn't
    // contradict the area the text names ("An Phú, Thủ Đức" is not the An Phú in Thuận An).
    ward = AREAS_BY_LENGTH.find((a) => { const n = fold(a.name); return !FORMER_WORDS.has(n) && has(t, n) && (!former || a.was === former); }) || null;
  }
  const namedDistrict = Boolean(former);
  if (ward) former = ward.was;
  const area = former ? areaByKey(former) : null;
  return { ward: ward ? ward.id : null, explicit, namedDistrict, former, area: area ? area.id : null };
}

export function checkLocation(job) {
  const loc = fold(job.location), title = fold(job.title);
  const strong = HCM_STRONG.some((p) => has(loc, p));
  const other = OTHER_PLACES.some((p) => has(loc, p));
  const titleOther = OTHER_PLACES.some((p) => has(title, p)) && !HCM_STRONG.some((p) => has(title, p));
  if (titleOther) return { ok: false };
  const a = findArea(`${job.location} | ${job.title}`);
  const place = { area: a.area };
  if (strong || (!other && (a.explicit || a.namedDistrict))) return { ok: true, ...place, remote: job.workFromHome };
  if (other) return { ok: false };
  if (job.workFromHome && /viet ?nam/.test(loc) && !ANYWHERE.test(loc)) return { ok: true, area: null, remote: true };
  return { ok: false };
}

/* ---------- Eligibility: an internship, or no experience required ---------- */
const INTERN = /(?<![a-z])(interns?|internships?|trainees?|thuc tap|thuc tap sinh|tts|tap su|apprentice|apprenticeship)(?![a-z])/;
const SENIOR_ANY = /(?<![a-z])(senior|sr|director|head of|giam doc|truong phong|pho phong|chief)(?![a-z])/;
const SENIOR_STAFF = /(?<![a-z])(lead|leader|manager|supervisor|truong nhom|quan ly|giam sat|principal|expert|chuyen gia|middle|mid level)(?![a-z])/;
const ABROAD = /(xuat khau lao dong|xkld|tokutei|ky nang (di |sang )?nhat|(di|sang|tai|lam viec tai) (nhat|nhat ban|han quoc|dai loan|duc|japan|korea|taiwan|germany)(?![a-z]))/;
const ZERO_EXP = [
  /khong (yeu cau|can|doi hoi|bat buoc|can phai co)( co)? kinh nghiem/,
  /chua (co|can) kinh nghiem/,
  /kinh nghiem\s*[:\-]?\s*(khong yeu cau|khong can|chua co|0 nam)/,
  /(?<![0-9.,])0\s*(nam|years?)\s*(kinh nghiem|experience|of experience)/,
  /no (prior |previous |work |relevant )?experience( is)?( required| needed| necessary)?(?![a-z])/,
  /(without|zero) (any )?(prior |previous )?experience/,
  /experience (is )?not (required|necessary)/,
];
const PREF_BEFORE = /(uu tien|preferred|prefer|nice to have|loi the|bonus)[^.;\n]{0,30}$/;
const PREF_AFTER = /^[^.;\n]{0,25}(la (mot )?loi the|is a plus|a plus|preferred|uu tien|is an advantage)/;
const REQ = [
  /(\d+(?:[.,]\d+)?)\s*\+?\s*(?:(?:-|–|~|den|to)\s*\d+(?:[.,]\d+)?\s*)?(nam|years?|yrs?|thang|months?)\s*(?:tro len\s*)?(?:kinh nghiem|of (?:relevant |related |work |working )?experience|experience|kn)(?![a-z])/g,
  /(?:kinh nghiem|experience)\s*(?:lam viec\s*)?(?:toi thieu|it nhat|tu|tren|at least|minimum|min|over|more than|:|-)?\s*(\d+(?:[.,]\d+)?)\s*\+?\s*(nam|years?|yrs?|thang|months?)(?![a-z])/g,
];

// Largest experience requirement in years that isn't phrased as a preference; 0 if none.
export function requiredYears(text) {
  let max = 0;
  for (const re of REQ) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const before = text.slice(Math.max(0, m.index - 40), m.index);
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 30);
      if (PREF_BEFORE.test(before) || PREF_AFTER.test(after)) continue;
      const n = Number(m[1].replace(',', '.'));
      const years = /thang|month/.test(m[2]) ? n / 12 : n;
      if (years > max && years < 40) max = years;
    }
  }
  return max;
}

export function checkEligibility(job) {
  const title = fold(job.title), sched = fold(job.scheduleType || ''), ext = fold(job.extensions.join(' | '));
  const body = fold([job.description, ...job.highlights.flatMap((h) => h.items)].join('\n'));
  if (ABROAD.test(title) || ABROAD.test(body)) return { ok: false, why: 'abroad' };
  const internTitle = INTERN.test(title), internSched = /intern|thuc tap/.test(sched);
  if (internTitle || internSched) {
    if (SENIOR_ANY.test(title)) return { ok: false, why: 'senior' };
    return { ok: true, kind: 'internship', reason: internTitle ? 'The job title says it’s an internship.' : 'Google Jobs lists it as an internship.' };
  }
  if (SENIOR_ANY.test(title) || SENIOR_STAFF.test(title)) return { ok: false, why: 'senior' };
  const zero = ZERO_EXP.some((r) => r.test(title) || r.test(ext) || r.test(body));
  if (!zero) return { ok: false, why: 'experience' };
  if (requiredYears(`${title}\n${body}`) > 0) return { ok: false, why: 'experience' };
  return { ok: true, kind: 'no_experience', reason: 'The listing says no experience is required.' };
}

/* ---------- Duplicates ---------- */
const LEGAL = /(?<![a-z])(cong ty|cty|tnhh|mtv|co phan|cp|jsc|ltd|llc|inc|co|company|corporation|corp|group|tap doan|viet nam|vietnam|vn)(?![a-z])/g;
export const dedupeKey = (j) => `${fold(j.title).replace(/[^a-z0-9]+/g, '')}|${fold(j.company).replace(LEGAL, '').replace(/[^a-z0-9]+/g, '')}`;

/* ---------- Relevance to the student (used for ordering only; never shown as a number) ---------- */
const STOP = new Set(['and', 'the', 'of', 'for', 'va', 'cac', 'nhan', 'vien']);
function keywordHit(text, keyword) {
  const k = fold(keyword);
  if (has(text, k)) return true;
  const words = k.split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w));
  return words.length > 1 && words.every((w) => has(text, w));
}
export function skillHits(text, skills) {
  return (skills || []).filter((s) => {
    const aliases = SKILL_ALIASES[s] || [fold(s)];
    return aliases.some((a) => has(text, a, true));
  });
}

export function relevance(entry, profile, keywords) {
  const j = entry.job;
  const title = fold(j.title);
  const body = fold([j.description, ...j.highlights.flatMap((h) => h.items)].join('\n'));
  let score = 0; const reasons = [];
  const inTitle = keywords.find((k) => keywordHit(title, k));
  const inBody = !inTitle && keywords.find((k) => keywordHit(body, k));
  if (inTitle) { score += 3; reasons.push(`Title matches “${inTitle}”`); }
  else if (inBody) { score += 1; reasons.push(`Mentions “${inBody}”`); }
  else reasons.push(`Found when searching “${entry.keywords[0]}”`);
  const skills = skillHits(`${title}\n${body}`, profile.skills);
  if (skills.length) { score += Math.min(2, skills.length); reasons.push(`Mentions your skills: ${skills.slice(0, 3).join(', ')}`); }
  const mine = profile.areas || [];
  if (j.area && mine.includes(j.area)) { score += 1; reasons.push('In one of your preferred areas'); }
  if (j.remote && (profile.modes || []).includes('remote')) { score += 1; reasons.push('Can be done remotely'); }
  if (j.kind === 'internship') score += 0.5;
  return { score, reasons };
}

/* ---------- Orchestration ---------- */
export async function runSearch({ keywords, profile = {}, serp, limit = 10, maxCalls = 4, fresh = false }) {
  const stats = { calls: 0, cachedCalls: 0, seen: 0, kept: 0, removed: { experience: 0, senior: 0, abroad: 0, location: 0, duplicate: 0 } };
  const queries = [], errors = [];
  const pool = new Map();

  const consider = (raw, meta) => {
    stats.seen++;
    const job = normalize(raw);
    if (!job.title) return;
    const loc = checkLocation(job);
    if (!loc.ok) { stats.removed.location++; return; }
    const el = checkEligibility(job);
    if (!el.ok) { stats.removed[el.why]++; return; }
    const key = dedupeKey(job);
    const prev = pool.get(key);
    if (prev) {
      stats.removed.duplicate++;
      if (!prev.keywords.includes(meta.kw)) prev.keywords.push(meta.kw);
      for (const o of job.applyOptions) if (!prev.job.applyOptions.some((p) => p.link === o.link)) prev.job.applyOptions.push(o);
      return;
    }
    pool.set(key, { job: { ...job, area: loc.area, remote: Boolean(loc.remote), kind: el.kind, kindReason: el.reason }, keywords: [meta.kw], order: meta.order });
  };

  // Rounds: first query per keyword → page 2 of those → second query form → "no experience" query.
  let round = 0, current = keywords.map((kw) => ({ kw, q: queriesFor(kw)[0], page: 1 }));
  const nextForms = [1, 2];
  while (current.length && pool.size < limit) {
    const batch = current.slice(0, Math.max(0, maxCalls - stats.calls));
    if (!batch.length) break;
    const settled = await Promise.all(batch.map((t) => serp.jobs({ q: t.q, nextPageToken: t.token, fresh }).then((r) => ({ t, r }), (e) => ({ t, e }))));
    const nextPages = [];
    settled.forEach(({ t, r, e }, ti) => {
      if (e) { errors.push(e); return; }
      if (r.cached) stats.cachedCalls++; else stats.calls++;
      queries.push({ q: t.q, page: t.page, results: r.data.jobs_results.length, cached: r.cached });
      r.data.jobs_results.forEach((raw, pos) => consider(raw, { kw: t.kw, order: [round, pos, ti] }));
      if (r.data.next_page_token && t.page < 2) nextPages.push({ ...t, token: r.data.next_page_token, page: t.page + 1 });
    });
    if (!queries.length && errors.length) throw errors[0]; // nothing worked (bad key, no credits…)
    round++;
    if (round === 1 && nextPages.length) current = nextPages;
    else { const f = nextForms.shift(); current = f === undefined ? [] : keywords.map((kw) => ({ kw, q: queriesFor(kw)[f], page: 1 })); }
  }

  const ranked = [...pool.values()].map((entry) => ({ entry, ...relevance(entry, profile, keywords) }))
    .sort((a, b) => b.score - a.score || a.entry.order[0] - b.entry.order[0] || a.entry.order[1] - b.entry.order[1] || a.entry.order[2] - b.entry.order[2]);
  const jobs = ranked.slice(0, limit).map(({ entry, reasons }) => ({ ...entry.job, keywords: entry.keywords, reasons }));
  stats.kept = pool.size;
  return { jobs, meta: { keywords, queries, stats, partial: errors.length > 0, warning: errors.length ? errors[0].message : null } };
}
