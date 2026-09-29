// Trust signals for one listing. Shared by the server (it leaves out listings that ask for money
// and moves listings with warnings down) and the browser (it shows the signals on the job page).
// Nothing here contacts another website: it reads only the listing's own text and links.
// These are signals, not a check of the company. Intern Match does not verify companies.
import { fold } from './reference.js';

/* ---------- Words in the listing ---------- */
// Text is compared folded (lower case, no diacritics), one sentence at a time.
const textOf = (job) => [job.title, job.description, ...(job.highlights || []).flatMap((h) => h.items || [])].filter(Boolean).join('\n');
// "Không cần kinh nghiệm" is not a negation of what follows it ("…việc nhẹ lương cao"), so it is cut out first.
const NO_NEED = /(?<![a-z])((khong|chua) (yeu cau|can|doi hoi|bat buoc)( co)? (kinh nghiem|bang cap|ngoai hinh|von)|khong gioi han (thu nhap|do tuoi)|no (prior |previous )?experience( is)?( required| needed)?)(?![a-z])/g;
const sentencesOf = (job) => fold(textOf(job)).replace(NO_NEED, ',').split(/(?<=[.!?;])\s+|\n+/).filter((s) => s.trim());

// "Không yêu cầu đặt cọc", "miễn phí đào tạo", "we never ask for a deposit"…
const NEG = /(?<![a-z])(khong|chua|mien|ho tro|tai tro|chi tra|dai tho|no|not|never|without|free|zero|waive[sd]?|covers?|covered|reimburse[sd]?|dont|don't|do not|does not)(?![a-z])/;
// "Phí đào tạo: 0đ", "…do công ty chi trả", "…is covered by the company"
const FREE_AFTER = /^\s*[:\-–]?\s*(0\s*(d|dong|vnd|₫)?(?![0-9a-z])|khong(?![a-z])|mien|free|none|waived)|(?<![a-z])(do|boi) (cong ty|doanh nghiep|chung toi)|cong ty (chi tra|chiu|ho tro|tai tro|tra|cap)|(is|are|will be) (covered|waived|free|reimbursed|paid by)|paid by (the )?(company|employer|us)/;
// Sentences about customers or suppliers ("tư vấn khách hàng đặt cọc căn hộ", "process customer deposits")
// and anti-scam notices ("nếu ai yêu cầu đóng phí, đó là lừa đảo") are not the listing asking the student for money.
const NOT_ABOUT_YOU = /(?<![a-z])(khach hang|customers?|clients?|buyers?|tenants?|nguoi mua|chu nha|nha cung cap|suppliers?|doi tac|nguoi choi|players?|lua dao|gia mao|mao danh|scams?|fraud|canh giac|beware)(?![a-z])/;
const AMOUNT = /\d[\d.,]*\s*(k|nghin|ngan|trieu|tr|d|dong|vnd|usd|₫|m|million|thousand)(?![a-z])|[$₫]\s*\d/;
const CANDIDATE = /(?<![a-z])(ung vien|ban (can|phai|chi can|se phai|vui long)|nguoi (lam|tham gia|ung tuyen)|nhan vien moi|candidates?|applicants?|you (must|need|will need|have to|should)|new (hires?|staff))(?![a-z])/;
const PAY_VERB = /(?<![a-z])(dong|nop|tra|chuyen khoan|chuyen tien|thanh toan|mat|thu|can|phai|co|pay|paid|paying|transfer|send|required|must|need to|have to)(?![a-z])/;
const DEPOSIT_FOR = /(?<![a-z])(nhan viec|dong phuc|thiet bi|may moc|tai lieu|nguyen lieu|vat tu|tien hang|hang mau|truoc khi (lam|nhan|di lam|bat dau)|de (duoc )?(nhan|lam))(?![a-z])/;
const GET_WORK = /(?<![a-z])(nhiem vu|nhan don|lam don|hoa hong|kich hoat|nhan viec|de (duoc )?(lam|nhan)|thanh vien|vip|tai khoan (ctv|lam viec|cong tac vien))(?![a-z])/;

// Asking the student to pay to get the job: these listings are left out.
const MONEY_RULES = [
  { re: /(?<![a-z])((dat|dong|nop|chuyen|gui)\s+(truoc\s+)?(tien\s+)?coc|tien coc)(?![a-z])/g, needs: (s) => CANDIDATE.test(s) || DEPOSIT_FOR.test(s) },
  { re: /(?<![a-z])(le )?phi (ho so|dao tao|dong phuc|dang ky|tham gia|kich hoat|nhan viec|xu ly ho so|mo tai khoan)(?![a-z])/g, needs: (s, before) => AMOUNT.test(s) || PAY_VERB.test(before) || CANDIDATE.test(s), notAfter: /(?<![a-z])chi $/ },
  { re: /(?<![a-z])nap (tien|truoc|\d)/g, needs: (s) => GET_WORK.test(s) },
  { re: /(?<![a-z])(chuyen khoan|chuyen tien|thanh toan) (truoc|\d)/g, needs: (s) => CANDIDATE.test(s) || GET_WORK.test(s) || DEPOSIT_FOR.test(s) },
  { re: /(?<![a-z])(?<!tam )ung (truoc )?(tien|\d)/g, needs: (s) => /(?<![a-z])(tien hang|don hang|nhap hang|hang hoa)(?![a-z])/.test(s) },
  { re: /(?<![a-z])(registration|application|training|processing|joining|onboarding|uniform|activation|membership|admin|administration|administrative|starter kit|placement|recruitment) fees?(?![a-z])/g, needs: (s, before) => AMOUNT.test(s) || PAY_VERB.test(before) || CANDIDATE.test(s) },
  { re: /(?<![a-z])((pay|paid|paying|transfer|send|make|submit|place)\s+(a |an |the |your )?((small|refundable|security|initial) )*deposit|(refundable|security) deposit|deposit (is |of )?(required|needed|\d))/g },
  { re: /(?<![a-z])((top.?up|recharge) (your |the |an? )?(account|balance|wallet)|pay (to|in order to|before you|before) (start|join|get|receive|begin)|upfront (fee|payment|cost)s?)(?![a-z])/g },
];

// Common signs of fake job ads (Vietnamese police warnings): shown as warnings, the listing stays.
const WARN_RULES = [
  ['easy', /(?<![a-z])(viec nhe\W{0,4}(luong|thu nhap) cao|easy (work|jobs?|tasks?)\W{0,4}(high|big|great) (pay|income|salary|earnings)|easy money)(?![a-z])/g],
  ['phone', /(?<![a-z])(chi can (co )?(1 |mot )?(chiec )?(dien thoai|smartphone)|(only|just) (need|needs|require|requires)( to have)? (a |your )?(smart)?phone)(?![a-z])/g],
  ['ctv', /(?<![a-z])((ctv|cong tac vien)( ban hang)? (online|tai nha|lam tai nha|qua mang|tren mang)|online (collaborators?|ctv))(?![a-z])/g],
  ['tasks', /(?<![a-z])((lam|thuc hien|nhan) nhiem vu (online|tren (app|ung dung|mang|web|he thong))|(like|share|tha tim|xem video|danh gia)[^.;\n]{0,20}(de |va )?(nhan|kiem) (tien|thuong|hoa hong)|(paid|earn|get paid) (to|for|per) (likes?|reviews?|ratings?|watching))(?![a-z])/g],
  ['homework', /(?<![a-z])(gia cong tai nha|(home|at.home) assembly)(?![a-z])/g],
  ['telegram', /(?<![a-z])telegram(?![a-z])/g],
  ['nointerview', /(?<![a-z])(khong (can |qua )?phong van|no interview|without (an )?interview)(?![a-z])/g],
];

export const WARNING_TEXT = {
  money: 'Asks you to pay a deposit or a fee',
  easy: 'Promises easy work for high pay',
  phone: 'Says you only need a phone',
  ctv: 'Online collaborator (CTV) job',
  tasks: 'Pays for online tasks like likes or reviews',
  homework: 'Home assembly work',
  telegram: 'Asks you to talk on Telegram',
  nointerview: 'Hires without an interview',
};

// The words just before a match, in the same part of the sentence.
const clauseBefore = (s, i) => s.slice(Math.max(0, i - 30), i).split(/[,:(]/).pop();
const clauseAfter = (s, end) => s.slice(end, end + 40).split(/[,;(]/)[0];

function found(sentences, re, needs, notAfter) {
  for (const s of sentences) {
    for (const m of s.matchAll(re)) {
      const before = clauseBefore(s, m.index);
      if (NEG.test(before) || (notAfter && notAfter.test(before))) continue;
      if (FREE_AFTER.test(clauseAfter(s, m.index + m[0].length))) continue;
      if (needs && !needs(s, before)) continue;
      return true;
    }
  }
  return false;
}

// True when the listing asks the student to pay (a deposit, a fee, a top-up) to get the job.
export function asksForMoney(job) {
  const sentences = sentencesOf(job).filter((s) => !NOT_ABOUT_YOU.test(s));
  return MONEY_RULES.some((r) => found(sentences, r.re, r.needs, r.notAfter));
}

// Warning ids (see WARNING_TEXT), in a fixed order.
export function warningsOf(job) {
  const sentences = sentencesOf(job);
  return WARN_RULES.filter(([, re]) => found(sentences, re)).map(([id]) => id);
}

/* ---------- Where the listing is posted ---------- */
const BOARDS = [
  ['linkedin.com', 'LinkedIn'], ['topcv.vn', 'TopCV'], ['vietnamworks.com', 'VietnamWorks'], ['careerviet.vn', 'CareerViet'],
  ['careerbuilder.vn', 'CareerViet'], ['itviec.com', 'ITviec'], ['topdev.vn', 'TopDev'], ['glints.com', 'Glints'], ['indeed.com', 'Indeed'],
  ['jobsgo.vn', 'JobsGO'], ['careerlink.vn', 'CareerLink'], ['vieclam24h.vn', 'Vieclam24h'], ['123job.vn', '123job'], ['mywork.com.vn', 'MyWork'],
  ['ybox.vn', 'YBOX'], ['glassdoor.com', 'Glassdoor'], ['jobstreet.vn', 'JobStreet'], ['jobstreet.com', 'JobStreet'],
];
export const hostOf = (link) => { try { return new URL(link).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const boardOf = (host) => { const b = host && BOARDS.find(([d]) => host === d || host.endsWith(`.${d}`)); return b ? b[1] : null; };

// Words in company names that don't tell companies apart.
const GENERIC = /(?<![a-z0-9])(cong ty|cty|tnhh|mtv|co phan|cp|tmcp|jsc|ltd|llc|inc|co|company|corporation|corp|group|tap doan|holdings?|limited|viet nam|vietnam|vn|thuong mai|dich vu|tm|dv|tmdv|xuat nhap khau|xnk|san xuat|dau tu|phat trien|cong nghe|giai phap|quoc te|the|and|va)(?![a-z0-9])/g;
const GENERIC_SHORT = new Set(['tnhh', 'mtv', 'tmcp', 'jsc', 'ltd', 'llc', 'inc', 'co', 'cp', 'vn', 'tm', 'dv', 'tmdv', 'xnk', 'corp', 'cty']);
const SUBDOMAIN = new Set(['www', 'm', 'careers', 'career', 'jobs', 'job', 'tuyendung', 'hr', 'apply', 'recruit', 'recruitment', 'talent', 'join', 'work']);
const SECOND_LEVEL = new Set(['com', 'net', 'org', 'edu', 'gov', 'co', 'ac', 'biz', 'info', 'pro', 'int']);

function hostLabels(host) {
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return [];
  parts.pop(); // .vn, .com …
  if (parts.length >= 2 && SECOND_LEVEL.has(parts[parts.length - 1])) parts.pop(); // .com.vn
  return parts.filter((p) => !SUBDOMAIN.has(p)).map((p) => p.replace(/[^a-z0-9]/g, '')).filter(Boolean);
}
function companyNames(company) {
  const rawName = String(company || '');
  const main = fold(rawName).replace(/\([^)]*\)/g, ' ').replace(GENERIC, ' ').replace(/[^a-z0-9]/g, '');
  // Short names: "(ACB)", or a word in capitals such as "VNG" or "FPT".
  const short = [...rawName.matchAll(/\(([^)]{2,20})\)/g)].map((m) => fold(m[1]).replace(/[^a-z0-9]/g, ''))
    .concat([...rawName.matchAll(/(?<![\p{L}\d])[A-Z][A-Z0-9]{1,5}(?![\p{L}\d])/gu)].map((m) => m[0].toLowerCase()))
    .filter((s) => s.length >= 2 && !GENERIC_SHORT.has(s));
  return { main, short };
}
// Is this address the company's own website ("careers.vng.com.vn" for "VNG Corporation")?
export function isCompanySite(host, company) {
  if (!host || boardOf(host)) return false;
  const { main, short } = companyNames(company);
  return hostLabels(host).some((l) => short.includes(l)
    || (main.length >= 3 && l.length >= 3 && (l === main || (l.length >= 5 && main.includes(l)) || (main.length >= 5 && l.includes(main)))));
}

export function sourcesOf(job) {
  const boards = [], others = [], hosts = new Set();
  let companySite = false;
  for (const o of job.applyOptions || []) {
    const host = hostOf(o.link);
    if (host) hosts.add(host);
    const board = boardOf(host);
    if (board) { if (!boards.includes(board)) boards.push(board); continue; }
    if (isCompanySite(host, job.company)) { companySite = true; continue; }
    const name = o.title || host;
    if (name && !others.includes(name)) others.push(name);
  }
  return { sites: hosts.size, boards, companySite, others };
}

// Everything the job page shows. Cached per job object (the browser renders often).
const memo = new WeakMap();
export function trustOf(job) {
  if (memo.has(job)) return memo.get(job);
  const money = asksForMoney(job);
  const t = { money, warnings: [...(money ? ['money'] : []), ...warningsOf(job)], sources: sourcesOf(job) };
  memo.set(job, t);
  return t;
}
