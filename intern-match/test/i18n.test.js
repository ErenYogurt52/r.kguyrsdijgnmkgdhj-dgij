import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t, setLang, getLang } from '../public/js/i18n.js';
import { VI } from '../public/js/i18n-vi.js';
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
  assert.equal(t('Saved to your account.'), 'Đã lưu vào tài khoản.');
  assert.equal(t('4M–6M VND a month'), '4M–6M VND/tháng');
  assert.equal(t('District 7, Ho Chi Minh City · Remote possible'), 'Quận 7, TP. Hồ Chí Minh · Có thể làm từ xa');
  assert.equal(t('Title matches “Marketing” · Part-time'), 'Tiêu đề khớp “Marketing” · Bán thời gian');
  assert.equal(t('Mentions weekends and evenings'), 'Có nhắc đến cuối tuần và buổi tối');
  assert.equal(t('Mentions your skills: Canva, SEO'), 'Có nhắc đến kỹ năng của bạn: Canva, SEO');
  assert.equal(t('Full-time, Part-time'), 'Toàn thời gian, Bán thời gian');
  assert.equal(t('Canva, Figma'), 'Canva, Figma', 'unknown lists stay as they are');
  assert.equal(t('Found 1 internship.'), 'Tìm thấy 1 việc thực tập.');
  assert.equal(t('You’ve used today’s 20 searches. Try again tomorrow.'), 'Bạn đã dùng hết 20 lượt tìm của hôm nay. Hãy thử lại vào ngày mai.');
  assert.equal(t('Hi An! I’ve read your profile and your top 7. Ask me anything about internships, or pick a question below.'),
    'Chào An! Mình đã đọc hồ sơ và top 7 của bạn. Hỏi mình bất cứ điều gì về thực tập, hoặc chọn một câu hỏi bên dưới.');
  assert.equal(t('Apply on TopCV (opens in a new tab)'), 'Ứng tuyển trên TopCV (mở trong thẻ mới)');
  assert.equal(t('Removed Excel.'), 'Đã xóa Excel.');
  assert.equal(t('Removed from saved.'), 'Đã bỏ lưu.');
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

test('no empty Vietnamese entries', () => {
  for (const [k, v] of Object.entries(VI)) assert.ok(typeof v === 'string' && v.trim(), `empty entry for "${k}"`);
});

test('trust signals have Vietnamese', async () => {
  const { WARNING_TEXT } = await import('../public/js/trust.js');
  inVi(() => {
    for (const w of Object.values(WARNING_TEXT)) assert.notEqual(t(w), w, `no Vietnamese for "${w}"`);
    assert.equal(t('Listed on 3 sites'), 'Đăng trên 3 trang');
    assert.equal(t('On well-known job sites: TopCV, LinkedIn'), 'Có trên trang tuyển dụng quen thuộc: TopCV, LinkedIn');
    assert.equal(t('Not on a well-known job site (Joboko)'), 'Không có trên trang tuyển dụng quen thuộc nào (Joboko)');
    assert.equal(t('Look up the company (opens in a new tab)'), 'Tra cứu công ty (mở trong thẻ mới)');
    assert.equal(t('Promises easy work for high pay · Says you only need a phone'), 'Hứa hẹn việc nhẹ lương cao · Nói chỉ cần có điện thoại');
  });
});
