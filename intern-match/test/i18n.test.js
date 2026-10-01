import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t, setLang, getLang } from '../public/js/i18n.js';
import { VI, VI_PATTERNS } from '../public/js/i18n-vi.js';
import { MAJORS, UNIVERSITIES, MODES, JOB_TYPES, FREE_TIMES, YEARS } from '../public/js/reference.js';
import { coachSuggestions } from '../public/js/views.js';

const inVi = (fn) => { const was = getLang(); setLang('vi'); try { return fn(); } finally { setLang(was); } };

test('English is the default and leaves text alone', () => {
  assert.equal(getLang(), 'en');
  assert.equal(t('Log in'), 'Log in');
});

test('fixed text is translated, surrounding spaces are kept', () => inVi(() => {
  assert.equal(t('Log in'), 'Đăng nhập');
  assert.equal(t('  Search again '), '  Tìm lại ');
  assert.equal(t('Some text we do not know'), 'Some text we do not know');
}));

test('text with numbers, names and dates', () => inVi(() => {
  assert.equal(t('Posted 3 days ago'), 'Đăng 3 ngày trước');
  assert.equal(t('Posted 30+ days ago'), 'Đăng 30+ ngày trước');
  assert.equal(t('Updated 5 min ago.'), 'Cập nhật 5 phút trước.');
  assert.equal(t('Saved yesterday'), 'Đã lưu hôm qua');
  assert.equal(t('Saved to your account.'), 'Đã lưu tin vào tài khoản.');
  assert.equal(t('4M–6M VND a month'), '4M–6M VND/tháng');
  assert.equal(t('District 7, Ho Chi Minh City · Remote possible'), 'Quận 7, TP.HCM · Có thể làm từ xa');
  assert.equal(t('Thu Duc, Ho Chi Minh City'), 'Thủ Đức, TP.HCM', 'accents are put back on district names');
  assert.equal(t('Updated just now.'), 'Vừa cập nhật.');
  assert.equal(t('Top 10 for “Data”.'), 'Top 10 cho từ khóa “Data”.');
  assert.equal(t('Title matches “Marketing” · Part-time'), 'Tiêu đề khớp từ khóa “Marketing” · Bán thời gian');
  assert.equal(t('Mentions weekends and evenings'), 'Có ca cuối tuần và ca tối');
  assert.equal(t('Mentions your skills: Canva, SEO'), 'Đúng kỹ năng bạn có: Canva, SEO');
  assert.equal(t('Full-time, Part-time'), 'Toàn thời gian, Bán thời gian');
  assert.equal(t('Canva, Figma'), 'Canva, Figma', 'unknown lists stay as they are');
  assert.equal(t('Found 1 internship.'), 'Tìm thấy 1 tin.');
  assert.equal(t('You’ve used today’s 20 searches. Try again tomorrow.'), 'Hôm nay bạn đã dùng hết 20 lượt tìm rồi. Mai quay lại nhé!');
  assert.equal(t('Hi An! I’ve read your profile and your top 7. Ask me anything about internships, or pick a question below.'),
    'Chào An! Mình đã xem qua hồ sơ và top 7 của bạn rồi. Bạn muốn hỏi gì về thực tập cứ hỏi nhé, hoặc chọn một câu gợi ý bên dưới.');
  assert.equal(t('Apply on TopCV (opens in a new tab)'), 'Ứng tuyển qua TopCV (mở trong thẻ mới)');
  assert.equal(t('Apply on Original listing (opens in a new tab)'), 'Ứng tuyển qua trang gốc (mở trong thẻ mới)', 'fallback site names are translated');
  assert.equal(t('Apply on LinkedIn: Marketing Intern, Lantern Travel'), 'Ứng tuyển qua LinkedIn: Marketing Intern, Lantern Travel');
  assert.equal(t('Removed Excel.'), 'Đã xóa Excel.');
  assert.equal(t('Removed from saved.'), 'Đã bỏ lưu tin.');
}));

test('every label in the reference lists and every coach suggestion has Vietnamese', () => inVi(() => {
  const labels = [
    ...MAJORS.map((m) => m.name).filter((n) => !['Marketing', 'Logistics'].includes(n)),
    ...UNIVERSITIES.map((u) => (u.id === 'other' ? u.name : `${u.short}: ${u.name}`)),
    ...[MODES, JOB_TYPES, FREE_TIMES, YEARS].flatMap((l) => l.map(([, n]) => n)),
    ...coachSuggestions(null), ...coachSuggestions({ title: 'Marketing Intern' }),
  ];
  for (const l of labels) assert.notEqual(t(l), l, `no Vietnamese for "${l}"`);
}));

test('every message the app and server show has Vietnamese', () => inVi(() => {
  const app = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const api = readFileSync(new URL('../server/api.js', import.meta.url), 'utf8');
  const auth = [...app.matchAll(/'auth\/[a-z-]+': '([^']+)'/g), ...app.matchAll(/^\s+'(?:permission-denied|unavailable|failed-precondition)': '([^']+)'/gm)].map((m) => m[1]);
  const toasts = [...app.matchAll(/(?:toast|announce)\('([^']+)'\)/g)].map((m) => m[1]);
  const server = [...api.matchAll(/message: '([^']+)'/g), ...api.matchAll(/fail\(\d+, '[a-z_]+', '([^']+)'\)/g)].map((m) => m[1])
    .filter((m) => !/^(Request too large|Invalid JSON|Use POST|Unknown API route)$/.test(m)); // developer-only
  assert.ok(auth.length > 15 && toasts.length > 5 && server.length > 3);
  for (const m of [...auth, ...toasts, ...server]) assert.notEqual(t(m), m, `no Vietnamese for "${m}"`);
}));

test('Vietnamese stays friendly: no stiff office wording', () => {
  const views = readFileSync(new URL('../public/js/views.js', import.meta.url), 'utf8');
  const texts = [...Object.values(VI), ...VI_PATTERNS.map(([, r]) => String(r)), views.match(/function shortfallVi[\s\S]*?\n}\n/)[0]];
  for (const w of ['Vui lòng', 'thao tác', 'thẩm định', 'vô hiệu hóa']) {
    for (const s of texts) assert.ok(!s.includes(w), `"${w}" sounds stiff: ${s.slice(0, 80)}`);
  }
});

test('no empty Vietnamese entries', () => {
  for (const [k, v] of Object.entries(VI)) assert.ok(typeof v === 'string' && v.trim(), `empty entry for "${k}"`);
});

test('trust signals have Vietnamese', async () => {
  const { WARNING_TEXT } = await import('../public/js/trust.js');
  inVi(() => {
    for (const w of Object.values(WARNING_TEXT)) assert.notEqual(t(w), w, `no Vietnamese for "${w}"`);
    assert.equal(t('Listed on 3 sites'), 'Đăng trên 3 trang');
    assert.equal(t('On well-known job sites: TopCV, LinkedIn'), 'Có trên trang tuyển dụng lớn: TopCV, LinkedIn');
    assert.equal(t('Not on a well-known job site (Joboko)'), 'Không có trên trang tuyển dụng lớn nào (Joboko)');
    assert.equal(t('Look up the company (opens in a new tab)'), 'Tra cứu công ty (mở trong thẻ mới)');
    assert.equal(t('Promises easy work for high pay · Says you only need a phone'), 'Quảng cáo “việc nhẹ lương cao” · Ghi “chỉ cần có điện thoại”');
  });
});
