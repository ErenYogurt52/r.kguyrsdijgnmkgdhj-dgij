import test from 'node:test';
import assert from 'node:assert/strict';
import { asksForMoney, warningsOf, sourcesOf, isCompanySite, trustOf } from '../public/js/trust.js';

const job = (description, extra = {}) => ({ title: 'Thực tập sinh Marketing', company: 'Công ty TNHH Ánh Dương', description, highlights: [], applyOptions: [], ...extra });

test('listings that ask the student to pay are caught', () => {
  for (const d of [
    'Ứng viên cần đặt cọc 500k tiền đồng phục trước khi đi làm.',
    'Phí hồ sơ 150.000đ.',
    'Nộp phí đào tạo trước khi nhận việc.',
    'Có phí đào tạo 2 triệu, sẽ hoàn lại sau 3 tháng.',
    'Nạp tiền để làm nhiệm vụ, nhận hoa hồng 15% mỗi đơn.',
    'Bạn cần chuyển khoản 200k để nhận việc ngay.',
    'Ứng trước 2 triệu tiền hàng, bán xong hoàn lại.',
    'Không yêu cầu kinh nghiệm, ứng viên cần đặt cọc thiết bị 1 triệu.',
    'A registration fee of 300,000 VND is required.',
    'You must pay a refundable deposit before you start.',
    'Top up your account to unlock tasks.',
  ]) assert.equal(asksForMoney(job(d)), true, d);
});

test('ordinary listings are not caught (benefits, customers, anti-scam notes)', () => {
  for (const d of [
    'Được đào tạo miễn phí. Miễn phí đào tạo nghiệp vụ.',
    'Hỗ trợ phí gửi xe và phí đào tạo chứng chỉ.',
    'Công ty chi trả phí đào tạo ACCA.',
    'Chi phí đào tạo do công ty chi trả.',
    'Phí đào tạo: 0đ.',
    'Không yêu cầu đặt cọc. Không thu bất kỳ khoản phí nào.',
    'Tư vấn khách hàng đặt cọc căn hộ, hoàn tất thủ tục ký hợp đồng.',
    'Hướng dẫn khách hàng nạp tiền vào ví điện tử.',
    'Theo dõi tạm ứng tiền hàng cho nhà cung cấp.',
    'Được tạm ứng lương giữa tháng.',
    'Lương chuyển khoản vào ngày 10, hoa hồng hấp dẫn.',
    'Thực hiện các nhiệm vụ khác theo phân công.',
    'Lưu ý: nếu ai yêu cầu bạn đóng phí đào tạo, đó là lừa đảo.',
    'Process customer deposits and withdrawals.',
    'No registration fee. Training fees are covered by the company.',
    'We never ask candidates to pay a deposit.',
    'Nhân viên thu phí bãi xe.',
  ]) assert.equal(asksForMoney(job(d)), false, d);
});

test('softer scam signs become warnings', () => {
  assert.deepEqual(warningsOf(job('Việc nhẹ lương cao, chỉ cần có điện thoại và thẻ ATM.')), ['easy', 'phone']);
  assert.deepEqual(warningsOf(job('', { title: 'Tuyển CTV online làm tại nhà' })), ['ctv']);
  assert.deepEqual(warningsOf(job('Thả tim, like share để nhận tiền mỗi ngày.')), ['tasks']);
  assert.deepEqual(warningsOf(job('Nhận gia công tại nhà.')), ['homework']);
  assert.deepEqual(warningsOf(job('Liên hệ qua Telegram @tuyendung.')), ['telegram']);
  assert.deepEqual(warningsOf(job('Nhận việc ngay, không cần phỏng vấn.')), ['nointerview']);
  assert.deepEqual(warningsOf(job('Easy work, high pay. You only need a phone.')), ['easy', 'phone']);
  assert.deepEqual(warningsOf(job('Không cần kinh nghiệm việc nhẹ lương cao')), ['easy'], '"no experience needed" is not a negation');
});

test('ordinary listings get no warnings', () => {
  for (const d of [
    'Thực hiện các nhiệm vụ khác theo phân công của trưởng phòng.',
    'Liên hệ Zalo 0909 123 456 để được tư vấn.',
    'Công ty không liên hệ ứng viên qua Telegram.',
    'Phỏng vấn 2 vòng tại văn phòng Quận 1.',
    'Hỗ trợ khách hàng qua điện thoại và email.',
    'Quản lý fanpage, tăng lượt thả tim và bình luận.',
  ]) assert.deepEqual(warningsOf(job(d)), [], d);
});

test('where a listing is posted: well-known job sites, the company site, how many sites', () => {
  const s = sourcesOf(job('', { company: 'Công ty Cổ phần Mây Xanh', applyOptions: [
    { title: 'LinkedIn', link: 'https://www.linkedin.com/jobs/view/1' },
    { title: 'TopCV', link: 'https://www.topcv.vn/viec-lam/1' },
    { title: 'Mây Xanh', link: 'https://careers.mayxanh.vn/jobs/1' },
    { title: 'Joboko', link: 'https://vn.joboko.com/viec-lam/1' },
  ] }));
  assert.deepEqual(s, { sites: 4, boards: ['LinkedIn', 'TopCV'], companySite: true, others: ['Joboko'] });
  assert.equal(isCompanySite('career.vng.com.vn', 'VNG Corporation'), true);
  assert.equal(isCompanySite('acb.com.vn', 'Ngân hàng TMCP Á Châu (ACB)'), true);
  assert.equal(isCompanySite('fptsoftware.com', 'FPT Software'), true);
  assert.equal(isCompanySite('abcxyz.vn', 'Công ty TNHH ABC'), false);
  assert.equal(isCompanySite('linkedin.com', 'LinkedIn'), false, 'a job site is never the company site');
  assert.equal(isCompanySite('tuyendung.vn', 'Công ty TNHH Tuyển Dụng'), false);
});

test('trustOf puts the money warning first (for results saved before this check existed)', () => {
  const t = trustOf(job('Phí hồ sơ 100k. Việc nhẹ lương cao.'));
  assert.equal(t.money, true);
  assert.deepEqual(t.warnings, ['money', 'easy']);
});
