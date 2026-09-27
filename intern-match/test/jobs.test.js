import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, checkEligibility, checkLocation, requiredYears, runSearch, queriesFor, cleanKeywords, dedupeKey, skillHits, jobTypesOf } from '../server/jobs.js';
import { fold } from '../public/js/reference.js';
import { MARKETING_P1, MARKETING_P2, mockRoutes } from './fixtures/google-jobs.js';

const J = (raw) => normalize({ title: 'x', company_name: 'c', location: 'Hồ Chí Minh', ...raw });

test('queries use Vietnamese or English wording by keyword', () => {
  assert.deepEqual(queriesFor('Marketing'), ['Marketing intern', 'thực tập sinh Marketing', 'Marketing không yêu cầu kinh nghiệm']);
  assert.equal(queriesFor('Kế toán')[0], 'thực tập sinh Kế toán');
  assert.deepEqual(cleanKeywords(['  Data ', 'data', 'x', 'SQL', 'Python', 'Excel'], 3), ['Data', 'SQL', 'Python']);
});

test('eligibility: internships pass, experience demands fail', () => {
  assert.equal(checkEligibility(J({ title: 'Thực tập sinh Kế toán' })).kind, 'internship');
  assert.equal(checkEligibility(J({ title: 'Nhân viên', detected_extensions: { schedule: 'Thực tập' } })).kind, 'internship');
  assert.equal(checkEligibility(J({ title: 'Senior Data Intern' })).ok, false);
  assert.equal(checkEligibility(J({ title: 'Nhân viên kế toán', description: 'Kinh nghiệm: không yêu cầu.' })).kind, 'no_experience');
  assert.equal(checkEligibility(J({ title: 'Nhân viên kế toán', description: 'Có 1-2 năm kinh nghiệm.' })).ok, false);
  assert.equal(checkEligibility(J({ title: 'Nhân viên kế toán', description: 'Không yêu cầu kinh nghiệm, nhưng cần 6 tháng kinh nghiệm MISA.' })).ok, false);
  assert.equal(checkEligibility(J({ title: 'Sales Executive', extensions: ['No experience'] })).kind, 'no_experience');
  assert.equal(checkEligibility(J({ title: 'Team Leader', description: 'Không yêu cầu kinh nghiệm' })).why, 'senior');
  assert.equal(checkEligibility(J({ title: 'Kỹ sư', description: 'Yêu cầu tối thiểu 3 năm kinh nghiệm' })).why, 'experience');
  assert.equal(checkEligibility(J({ title: 'Tuyển thực tập sinh kỹ năng đi Nhật' })).why, 'abroad');
});

test('required years ignores preferences and study-year wording', () => {
  const f = (s) => requiredYears(fold(s));
  assert.equal(f('Ít nhất 2 năm kinh nghiệm'), 2);
  assert.equal(f('At least 3 years of experience'), 3);
  assert.equal(f('1+ year experience is a plus'), 0);
  assert.equal(f('Ưu tiên có 1 năm kinh nghiệm'), 0);
  assert.equal(f('Sinh viên năm 3, thực tập tối thiểu 3 tháng'), 0);
  assert.equal(f('Kinh nghiệm tối thiểu 6 tháng'), 0.5);
});

test('location keeps Ho Chi Minh City and the merged provinces only', () => {
  const L = (location, extra = {}) => checkLocation(J({ location, ...extra }));
  assert.equal(L('Quận 7, Thành phố Hồ Chí Minh').area, 'd7');
  assert.equal(L('District 10, Ho Chi Minh City').area, 'd10');
  assert.equal(L('Phường Bến Thành, Thành phố Hồ Chí Minh').area, 'd1', 'a ward name maps to its area');
  assert.equal(L('Tân Sơn Nhất, Hồ Chí Minh').area, 'tb');
  assert.equal(L('An Phú, Thủ Đức, Hồ Chí Minh').area, 'td');
  assert.equal(L('Quận 1').ok, true, 'an area name alone is enough');
  assert.equal(L('Tân Hiệp').ok, false, 'a bare ward name that exists in many provinces is not enough');
  assert.equal(L('Dĩ An, Bình Dương').ok, true);
  assert.equal(L('Hà Nội').ok, false);
  assert.equal(L('Tân Phú, Đồng Nai').ok, false);
  assert.equal(L('Việt Nam').ok, false);
  assert.equal(L('Việt Nam', { extensions: ['Làm việc tại nhà'] }).remote, true);
  assert.equal(L('Mọi nơi', { extensions: ['Làm việc tại nhà'] }).ok, false);
  assert.equal(L('Hồ Chí Minh', { title: 'Thực tập sinh [Hà Nội]' }).ok, false);
});

test('duplicates collapse across company spellings; skills are matched on words', () => {
  assert.equal(dedupeKey(J({ title: 'TTS Marketing', company_name: 'Công ty TNHH Ánh Dương' })), dedupeKey(J({ title: 'TTS marketing', company_name: 'Ánh Dương Co., Ltd' })));
  assert.deepEqual(skillHits(fold('Biết JavaScript và SQL, recruitment'), ['Java', 'SQL', 'Recruitment']), ['SQL', 'Recruitment']);
});

function fakeSerp(routes, log = []) {
  return {
    async jobs({ q, nextPageToken }) {
      log.push(nextPageToken || q);
      const data = routes[nextPageToken || q] || { jobs: [] };
      return { data: { jobs_results: data.jobs, next_page_token: data.pagination?.next_page_token || null }, cached: false };
    },
  };
}

test('runSearch filters, merges and ranks within the call budget', async () => {
  const log = [];
  const out = await runSearch({ keywords: ['Marketing'], profile: { skills: ['Canva', 'SEO'], areas: ['td'], modes: [] }, serp: fakeSerp(mockRoutes(), log), limit: 10, maxCalls: 4 });
  assert.deepEqual(log, ['Marketing intern', 'mkt-p2', 'thực tập sinh Marketing', 'Marketing không yêu cầu kinh nghiệm']);
  const titles = out.jobs.map((j) => `${j.title} | ${j.company}`);
  assert.equal(out.jobs.length, 7, titles.join('\n'));
  assert.ok(!titles.some((t) => /Senior|Hà Nội|Blue Harbor|Nhật|Đông Á|Global Remote/.test(t)), titles.join('\n'));
  // Title + skill + preferred area ranks the Thủ Đức internship first.
  assert.equal(out.jobs[0].title, 'Digital Marketing Intern');
  assert.ok(out.jobs[0].reasons.some((r) => r.includes('SEO')));
  assert.ok(out.jobs[0].reasons.includes('In one of your preferred areas'));
  const dup = out.jobs.find((j) => j.company === 'Công ty TNHH Ánh Dương');
  assert.equal(dup.applyOptions.length, 2);
  assert.equal(out.meta.stats.removed.duplicate, 1);
  assert.equal(out.meta.stats.calls, 4);
  assert.ok(out.jobs.every((j) => j.kind === 'internship' || j.kind === 'no_experience'));
  assert.ok(!('score' in out.jobs[0]));
});

test('runSearch stops once it has enough and interleaves keywords', async () => {
  const many = { jobs: Array.from({ length: 10 }, (_, i) => ({ title: `Data Intern ${i}`, company_name: `Co ${i}`, location: 'Hồ Chí Minh' })) };
  const log = [];
  const out = await runSearch({ keywords: ['Data analyst', 'Marketing'], serp: fakeSerp({ 'Data analyst intern': many, 'Marketing intern': MARKETING_P1 }, log), limit: 10, maxCalls: 6 });
  assert.equal(log.length, 2);
  assert.equal(out.jobs.length, 10);
});

test('runSearch surfaces SearchApi errors when nothing succeeded', async () => {
  const serp = { jobs: async () => { throw Object.assign(new Error('SearchApi: Invalid API key.'), { status: 502 }); } };
  await assert.rejects(runSearch({ keywords: ['Data'], serp }), /Invalid API key/);
});

test('page 2 fixture parses', () => { assert.equal(normalize(MARKETING_P2.jobs[0]).via, 'TopCV'); assert.equal(normalize(MARKETING_P1.jobs[0]).salary, '3–5 triệu ₫ mỗi tháng'); });

test('every ward or commune name maps to its area', async () => {
  const { WARDS, AREAS } = await import('../public/js/reference.js');
  const { findArea } = await import('../server/jobs.js');
  assert.equal(WARDS.length, 168);
  for (const w of WARDS) {
    const prefix = w.type === 'ward' ? 'Phường' : w.type === 'commune' ? 'Xã' : 'Đặc khu';
    const expected = (AREAS.find((a) => a.key === w.was) || {}).id || null;
    assert.equal(findArea(`${prefix} ${w.name}, Thành phố Hồ Chí Minh`).area, w.id.includes('thanh-an') ? findArea(`${prefix} ${w.name}`).area : expected, w.name);
  }
});

test('HTML job descriptions become plain text (tags removed, line breaks and headings kept)', async () => {
  const { htmlToText } = await import('../public/js/text.js');
  const { normalize } = await import('../server/jobs.js');
  const raw = '<h2>Mô tả công việc</h2>\n<p>- Hỗ trợ kiểm tra hàng hóa.\n</p><p>- Nhập liệu &amp; lưu trữ.</p><h2>Yêu cầu ứng viên</h2><p>- Sinh viên năm cuối.<br>- Thành thạo Excel.<br/>- Kỹ năng giao tiếp tốt.</p>';
  const j = normalize({ title: 'Data Intern &amp; Ops', company_name: 'CÔNG TY A', location: 'Hồ Chí Minh', description: raw,
    job_highlights: [{ title: 'Qualifications', items: ['<p>Excel</p>', 'SQL &gt; basics'] }] });
  assert.doesNotMatch(j.description, /<\/?(p|h2|br)/i);
  assert.deepEqual(j.description.split('\n').filter(Boolean), [
    '## Mô tả công việc', '- Hỗ trợ kiểm tra hàng hóa.', '- Nhập liệu & lưu trữ.', '## Yêu cầu ứng viên',
    '- Sinh viên năm cuối.', '- Thành thạo Excel.', '- Kỹ năng giao tiếp tốt.',
  ]);
  assert.equal(j.title, 'Data Intern & Ops');
  assert.deepEqual(j.highlights[0].items, ['Excel', 'SQL > basics']);
  // Plain text and things that only look a bit like tags stay as they are.
  assert.equal(htmlToText('Need <5 years? a < b > c'), 'Need <5 years? a < b > c');
  assert.equal(htmlToText('Line 1\nLine 2'), 'Line 1\nLine 2');
  assert.equal(htmlToText('&lt;p&gt;Escaped&lt;/p&gt; &#39;x&#39;'), "Escaped\n'x'");
  assert.equal(htmlToText('<ul><li>One</li><li>Two</li></ul>'), '- One\n- Two');
  assert.equal(htmlToText('<script>alert(1)</script>Hi'), 'Hi');
});

test('job type: schedule first, then the description; "become full-time later" does not count', () => {
  const j = (o) => ({ title: 'Marketing Intern', scheduleType: null, extensions: [], description: '', highlights: [], ...o });
  assert.deepEqual(jobTypesOf(j({ scheduleType: 'Part-time' })), ['parttime']);
  assert.deepEqual(jobTypesOf(j({ scheduleType: 'Full-time', description: 'Part-time also possible' })), ['fulltime']);
  assert.deepEqual(jobTypesOf(j({ extensions: ['Full–time and Part-time'] })).sort(), ['fulltime', 'parttime']);
  assert.deepEqual(jobTypesOf(j({ scheduleType: 'Toàn thời gian' })), ['fulltime']);
  assert.deepEqual(jobTypesOf(j({ scheduleType: 'Internship', description: 'Làm việc bán thời gian, 4 buổi/tuần.' })), ['parttime']);
  assert.deepEqual(jobTypesOf(j({ scheduleType: 'Internship', description: 'Cơ hội trở thành nhân viên full-time sau thực tập.' })), []);
  assert.deepEqual(jobTypesOf(j({ scheduleType: 'Internship', description: 'This is a full-time internship.' })), ['fulltime']);
  assert.deepEqual(jobTypesOf(j({ description: 'An excellent full-time role.' })), ['fulltime']);
  assert.deepEqual(jobTypesOf(j({ scheduleType: 'Internship' })), []);
  assert.deepEqual(normalize({ title: 'Barista', detected_extensions: { schedule: 'Part-time' } }).jobTypes, ['parttime']);
});

test('runSearch with a job type asks for it and keeps only listings that say it', async () => {
  const log = [];
  const mk = (title, schedule, description = '') => ({ title, company_name: title + ' Co', location: 'Quận 1, Hồ Chí Minh', extensions: [schedule], detected_extensions: { schedule }, description });
  const routes = { 'Marketing intern part time': { jobs: [
    mk('Marketing Intern', 'Part-time'),
    mk('Social Media Intern', 'Full-time'),
    mk('Content Intern', 'Internship', 'Làm bán thời gian, 20 giờ/tuần.'),
    mk('Brand Intern', 'Internship'),
  ] } };
  const out = await runSearch({ keywords: ['Marketing'], profile: { skills: [], areas: [], modes: [], jobType: 'parttime' }, serp: fakeSerp(routes, log), limit: 10, maxCalls: 1 });
  assert.equal(log[0], 'Marketing intern part time');
  assert.deepEqual(out.jobs.map((x) => x.title).sort(), ['Content Intern', 'Marketing Intern']);
  assert.equal(out.meta.stats.removed.jobType, 2);
  assert.equal(out.meta.jobType, 'parttime');
  assert.ok(out.jobs.every((x) => x.reasons.includes('Part-time')));
  const vi = [];
  await runSearch({ keywords: ['Kế toán'], profile: { jobType: 'fulltime' }, serp: fakeSerp({}, vi), maxCalls: 1 });
  assert.equal(vi[0], 'thực tập sinh Kế toán toàn thời gian');
  const any = [];
  await runSearch({ keywords: ['Marketing'], profile: { jobType: 'any' }, serp: fakeSerp({}, any), maxCalls: 1 });
  assert.equal(any[0], 'Marketing intern');
});
