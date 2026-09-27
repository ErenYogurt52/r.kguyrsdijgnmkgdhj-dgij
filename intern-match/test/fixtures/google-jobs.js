// Test fixtures shaped like SearchApi.io Google Jobs responses (fictional companies).
let pos = 0;
const job = (o) => {
  const links = (o.apply || [{ title: o.via || 'TopCV', link: `https://www.topcv.vn/viec-lam/${encodeURIComponent(o.title)}` }]).map((a) => ({ link: a.link, source: a.title }));
  return {
    position: ++pos, title: o.title, company_name: o.company, location: o.location || 'Thành phố Hồ Chí Minh', via: `qua ${o.via || 'TopCV'}`,
    sharing_link: 'https://www.google.com/search?ibp=htl;jobs&q=test',
    extensions: [o.posted || '2 ngày trước', o.schedule || 'Toàn thời gian', ...(o.salary ? [o.salary] : []), ...(o.wfh ? ['Làm việc tại nhà'] : [])],
    detected_extensions: { posted_at: o.posted || '2 ngày trước', schedule: o.schedule || 'Toàn thời gian' },
    description: o.description || 'Mô tả công việc.',
    job_highlights: o.highlights || [],
    apply_link: links[0].link,
    apply_links: links,
  };
};

export const MARKETING_P1 = {
  jobs: [
    job({ title: 'Thực tập sinh Marketing', company: 'Công ty TNHH Ánh Dương', location: 'Quận 1, Thành phố Hồ Chí Minh', schedule: 'Thực tập', salary: '3–5 triệu ₫ mỗi tháng', description: 'Hỗ trợ viết content, quản lý fanpage. Biết Canva và Excel là lợi thế.' }),
    job({ title: 'Senior Marketing Manager', company: 'Orbit Retail', description: 'Tối thiểu 5 năm kinh nghiệm.' }),
    job({ title: 'Marketing Intern', company: 'Lotus Foods', location: 'Hà Nội', schedule: 'Internship' }),
    job({ title: 'Nhân viên Marketing', company: 'Hạt Mầm', description: 'Không yêu cầu kinh nghiệm, được đào tạo từ đầu. Sử dụng Canva.' }),
    job({ title: 'Chuyên viên Marketing', company: 'Blue Harbor', description: 'Yêu cầu 2 năm kinh nghiệm trở lên. Không yêu cầu kinh nghiệm quản lý.' }),
    job({ title: 'Digital Marketing Intern', company: 'Công ty Cổ phần Mây Xanh', location: 'Thủ Đức, Hồ Chí Minh', schedule: 'Thực tập', via: 'LinkedIn', apply: [{ title: 'LinkedIn', link: 'https://www.linkedin.com/jobs/view/1' }, { title: 'Glints', link: 'https://glints.com/vn/opportunities/jobs/1' }], description: 'SEO, Google Analytics.' }),
    job({ title: 'Thực tập sinh Marketing', company: 'Ánh Dương Co., Ltd', location: 'Hồ Chí Minh', via: 'CareerViet', apply: [{ title: 'CareerViet', link: 'https://careerviet.vn/vi/tim-viec-lam/1' }] }),
    job({ title: 'Thực tập sinh đi Nhật Bản ngành chế biến', company: 'XKLĐ Sao Mai', location: 'Hồ Chí Minh' }),
    job({ title: 'Content Marketing Trainee', company: 'Pixel Studio', location: 'Dĩ An, Bình Dương', schedule: 'Toàn thời gian' }),
    job({ title: 'Marketing Assistant (Remote)', company: 'Kite Labs', location: 'Việt Nam', wfh: true, description: 'No experience required. Fresh graduates welcome.' }),
  ],
  pagination: { next_page_token: 'mkt-p2' },
};

export const MARKETING_P2 = {
  jobs: [
    job({ title: 'Social Media Intern', company: 'Cỏ May Media', location: 'Bình Thạnh, Hồ Chí Minh', schedule: 'Thực tập' }),
    job({ title: 'Nhân viên kinh doanh', company: 'Đông Á', location: 'Tân Phú, Đồng Nai', description: 'Không yêu cầu kinh nghiệm.' }),
    job({ title: 'Marketing Executive', company: 'North Star', description: 'Ưu tiên ứng viên có 1 năm kinh nghiệm. Chưa có kinh nghiệm sẽ được đào tạo.' }),
    job({ title: 'Marketing Intern', company: 'Global Remote Co', location: 'Mọi nơi', wfh: true }),
  ],
};

export const DATA_P1 = {
  jobs: [
    job({ title: 'Data Analyst Intern', company: 'Numa Analytics', location: 'Quận 7, Thành phố Hồ Chí Minh', schedule: 'Thực tập', description: 'SQL, Python, Power BI.' }),
    job({ title: 'Business Intelligence Intern', company: 'Cầu Vồng Bank', location: 'Quận 3, Hồ Chí Minh', schedule: 'Internship' }),
    job({ title: 'Thực tập sinh Marketing', company: 'Công ty TNHH Ánh Dương', location: 'Quận 1, Thành phố Hồ Chí Minh', schedule: 'Thực tập' }),
  ],
};

// Route table for the mock server: query → page responses.
export function mockRoutes() {
  return {
    'Marketing intern': MARKETING_P1,
    'mkt-p2': MARKETING_P2,
    'Data analyst intern': DATA_P1,
  };
}
