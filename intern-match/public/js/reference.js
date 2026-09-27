// Reference data shared by the browser and the server (plain ES module, no DOM).

export const MAJORS = [
  { id: 'marketing', name: 'Marketing', icon: 'cat-marketing' },
  { id: 'finance', name: 'Finance', icon: 'cat-finance' },
  { id: 'accounting', name: 'Accounting', icon: 'cat-accounting' },
  { id: 'business', name: 'Business', icon: 'cat-business' },
  { id: 'data', name: 'Data', icon: 'cat-data' },
  { id: 'it', name: 'IT', icon: 'cat-it' },
  { id: 'software', name: 'Software Engineering', icon: 'cat-software' },
  { id: 'hr', name: 'Human Resources', icon: 'cat-hr' },
  { id: 'logistics', name: 'Logistics', icon: 'cat-logistics' },
  { id: 'communication', name: 'Communication', icon: 'cat-communication' },
  { id: 'design', name: 'Design', icon: 'cat-design' },
];

// Search keywords suggested for each major (students may also type Vietnamese keywords).
export const MAJOR_KEYWORDS = {
  marketing: ['Marketing', 'Digital marketing', 'Content marketing', 'Social media', 'Brand'],
  finance: ['Finance', 'Investment', 'Banking', 'Financial analyst', 'Credit'],
  accounting: ['Accounting', 'Audit', 'Tax', 'Bookkeeping'],
  business: ['Business development', 'Sales', 'Operations', 'Admin', 'Customer service'],
  data: ['Data analyst', 'Data', 'Business intelligence', 'Data engineer'],
  it: ['IT support', 'IT helpdesk', 'System admin', 'Network'],
  software: ['Software engineer', 'Frontend developer', 'Backend developer', 'Mobile developer', 'QA tester'],
  hr: ['Human resources', 'Recruitment', 'Talent acquisition', 'HR admin'],
  logistics: ['Logistics', 'Import export', 'Supply chain', 'Purchasing'],
  communication: ['Communications', 'PR', 'Media', 'Events', 'Content'],
  design: ['Graphic design', 'UI/UX', 'Video editing', 'Multimedia design'],
};

export const MAJOR_SKILLS = {
  marketing: ['Social media', 'Content writing', 'Canva', 'SEO', 'Excel', 'Google Analytics', 'Copywriting', 'Market research', 'Video editing', 'Facebook Ads'],
  finance: ['Excel', 'Financial analysis', 'Financial modeling', 'PowerPoint', 'Valuation', 'SQL', 'Power BI', 'Python'],
  accounting: ['Excel', 'Accounting principles', 'Bookkeeping', 'MISA', 'Tax basics', 'Audit basics', 'Invoice processing', 'IFRS'],
  business: ['Excel', 'PowerPoint', 'Market research', 'Business analysis', 'CRM', 'Project coordination', 'Google Sheets', 'Data entry'],
  data: ['SQL', 'Python', 'Excel', 'Power BI', 'Tableau', 'Statistics', 'Data cleaning', 'Git'],
  it: ['Troubleshooting', 'Windows', 'Networking', 'Linux', 'Microsoft 365', 'Cloud basics', 'Docker', 'Git'],
  software: ['JavaScript', 'React', 'HTML/CSS', 'Git', 'Java', 'SQL', 'REST APIs', 'Flutter', 'Python', 'TypeScript'],
  hr: ['Recruitment', 'Interviewing', 'Candidate sourcing', 'Excel', 'Onboarding', 'HR administration', 'Employer branding', 'LinkedIn'],
  logistics: ['Excel', 'Import-export documents', 'Supply chain basics', 'Inventory management', 'Customs procedures', 'Data entry', 'SAP'],
  communication: ['Content writing', 'Press releases', 'Social media', 'Event planning', 'Public speaking', 'Canva', 'Video editing', 'Photography'],
  design: ['Figma', 'Adobe Photoshop', 'Adobe Illustrator', 'Canva', 'Typography', 'UI design', 'After Effects', 'Premiere Pro'],
};

// How a skill may be written in a job description (compared without diacritics, lower case).
export const SKILL_ALIASES = {
  'Excel': ['excel'], 'Google Sheets': ['google sheet', 'gg sheet'], 'PowerPoint': ['powerpoint', 'power point'],
  'SEO': ['seo'], 'Canva': ['canva'], 'Social media': ['social media', 'mang xa hoi', 'fanpage', 'tiktok'],
  'Google Analytics': ['google analytics', 'ga4'], 'Content writing': ['content', 'viet bai'], 'Copywriting': ['copywriting', 'copywriter'],
  'Video editing': ['capcut', 'edit video', 'dung video', 'video editing'], 'Market research': ['market research', 'nghien cuu thi truong'],
  'Facebook Ads': ['facebook ads', 'fb ads', 'chay quang cao'], 'Financial analysis': ['financial analysis', 'phan tich tai chinh'],
  'Financial modeling': ['financial model'], 'Valuation': ['valuation', 'dinh gia'], 'Accounting principles': ['nguyen ly ke toan', 'accounting principles', 'vas'],
  'Bookkeeping': ['bookkeeping', 'so sach'], 'MISA': ['misa'], 'Tax basics': ['ke khai thue', 'thue gtgt', 'thue tncn', 'tax'], 'Audit basics': ['audit', 'kiem toan'],
  'IFRS': ['ifrs'], 'Invoice processing': ['hoa don', 'invoice'], 'Business analysis': ['business analysis', 'business analyst'],
  'CRM': ['crm'], 'Project coordination': ['project coordinat', 'dieu phoi du an'], 'Data entry': ['data entry', 'nhap lieu'],
  'SQL': ['sql'], 'Python': ['python'], 'Power BI': ['power bi', 'powerbi'], 'Tableau': ['tableau'], 'Statistics': ['statistic', 'thong ke'],
  'Data cleaning': ['data cleaning', 'lam sach du lieu'], 'Git': ['git'], 'Troubleshooting': ['troubleshoot', 'xu ly su co'],
  'Windows': ['windows'], 'Networking': ['networking', 'mang may tinh', 'network'], 'Linux': ['linux'], 'Microsoft 365': ['microsoft 365', 'office 365'],
  'Cloud basics': ['cloud', 'aws', 'azure', 'gcp'], 'Docker': ['docker'], 'JavaScript': ['javascript'], 'TypeScript': ['typescript'],
  'React': ['react'], 'HTML/CSS': ['html', 'css'], 'Java': ['java'], 'REST APIs': ['rest api', 'restful'], 'Flutter': ['flutter'],
  'Recruitment': ['recruit', 'tuyen dung'], 'Interviewing': ['interview', 'phong van'], 'Candidate sourcing': ['sourcing'],
  'Onboarding': ['onboarding', 'hoi nhap'], 'HR administration': ['hanh chinh nhan su', 'hr admin'], 'Employer branding': ['employer branding'],
  'LinkedIn': ['linkedin'], 'Import-export documents': ['chung tu', 'xuat nhap khau', 'import export'], 'Supply chain basics': ['supply chain', 'chuoi cung ung'],
  'Inventory management': ['inventory', 'ton kho', 'quan ly kho'], 'Customs procedures': ['customs', 'hai quan'], 'SAP': ['sap'],
  'Press releases': ['press release', 'thong cao bao chi'], 'Event planning': ['event', 'su kien'], 'Public speaking': ['thuyet trinh', 'presentation'],
  'Photography': ['photograph', 'chup anh'], 'Figma': ['figma'], 'Adobe Photoshop': ['photoshop'], 'Adobe Illustrator': ['illustrator'],
  'Typography': ['typography'], 'UI design': ['ui design', 'ui/ux'], 'After Effects': ['after effects'], 'Premiere Pro': ['premiere'],
};
export const SKILL_NAMES = Object.keys(SKILL_ALIASES);

export const UNIVERSITIES = [
  ['ueh', 'UEH', 'University of Economics Ho Chi Minh City'],
  ['hcmut', 'HCMUT', 'Ho Chi Minh City University of Technology'],
  ['ftu', 'FTU', 'Foreign Trade University, HCMC campus'],
  ['rmit', 'RMIT', 'RMIT University Vietnam'],
  ['hcmus', 'HCMUS', 'University of Science, VNU-HCM'],
  ['uel', 'UEL', 'University of Economics and Law'],
  ['uit', 'UIT', 'University of Information Technology'],
  ['iu', 'IU', 'International University, VNU-HCM'],
  ['tdtu', 'TDTU', 'Ton Duc Thang University'],
  ['hutech', 'HUTECH', 'HUTECH University'],
  ['vlu', 'VLU', 'Van Lang University'],
  ['ussh', 'USSH', 'University of Social Sciences and Humanities'],
  ['hub', 'HUB', 'Banking University of Ho Chi Minh City'],
  ['fptu', 'FPTU', 'FPT University HCMC'],
  ['tdmu', 'TDMU', 'Thu Dau Mot University'],
  ['eiu', 'EIU', 'Eastern International University'],
  ['vgu', 'VGU', 'Vietnamese-German University'],
  ['bvu', 'BVU', 'Ba Ria-Vung Tau University'],
  ['other', 'Other', 'Another university'],
].map(([id, short, name]) => ({ id, short, name }));

// Internal lookup used only to read job addresses: ward/commune names grouped by the district
// (area) they belong to, so a listing that names a ward still maps to one of the areas below.
// Rows: [area key, group, type, "Name|Name|…"]. Types: p = ward, x = commune, dk = special zone.
const UNITS = [
  ['q1', 'hcm', 'p', 'Sài Gòn|Tân Định|Bến Thành|Cầu Ông Lãnh'],
  ['q3', 'hcm', 'p', 'Bàn Cờ|Xuân Hòa|Nhiêu Lộc'],
  ['q4', 'hcm', 'p', 'Xóm Chiếu|Khánh Hội|Vĩnh Hội'],
  ['q5', 'hcm', 'p', 'Chợ Quán|An Đông|Chợ Lớn'],
  ['q6', 'hcm', 'p', 'Bình Tây|Bình Tiên|Bình Phú|Phú Lâm'],
  ['q7', 'hcm', 'p', 'Tân Thuận|Phú Thuận|Tân Mỹ|Tân Hưng'],
  ['q8', 'hcm', 'p', 'Chánh Hưng|Phú Định|Bình Đông'],
  ['q10', 'hcm', 'p', 'Diên Hồng|Vườn Lài|Hòa Hưng'],
  ['q11', 'hcm', 'p', 'Minh Phụng|Bình Thới|Hòa Bình|Phú Thọ'],
  ['q12', 'hcm', 'p', 'Đông Hưng Thuận|Trung Mỹ Tây|Tân Thới Hiệp|Thới An|An Phú Đông'],
  ['binhtan', 'hcm', 'p', 'An Lạc|Bình Tân|Tân Tạo|Bình Trị Đông|Bình Hưng Hòa'],
  ['binhthanh', 'hcm', 'p', 'Gia Định|Bình Thạnh|Bình Lợi Trung|Thạnh Mỹ Tây|Bình Quới'],
  ['govap', 'hcm', 'p', 'Hạnh Thông|An Nhơn|Gò Vấp|An Hội Đông|Thông Tây Hội|An Hội Tây'],
  ['phunhuan', 'hcm', 'p', 'Đức Nhuận|Cầu Kiệu|Phú Nhuận'],
  ['tanbinh', 'hcm', 'p', 'Tân Sơn Hòa|Tân Sơn Nhất|Tân Hòa|Bảy Hiền|Tân Bình|Tân Sơn'],
  ['tanphu', 'hcm', 'p', 'Tây Thạnh|Tân Sơn Nhì|Phú Thọ Hòa|Tân Phú|Phú Thạnh'],
  ['thuduc', 'hcm', 'p', 'Hiệp Bình|Thủ Đức|Tam Bình|Linh Xuân|Tăng Nhơn Phú|Long Bình|Long Phước|Long Trường|Phước Long|Cát Lái|Bình Trưng|An Khánh'],
  ['binhchanh', 'hcm', 'x', 'Vĩnh Lộc|Tân Vĩnh Lộc|Bình Lợi|Tân Nhựt|Bình Chánh|Hưng Long|Bình Hưng'],
  ['cangio', 'hcm', 'x', 'Bình Khánh|An Thới Đông|Cần Giờ|Thạnh An'],
  ['cuchi', 'hcm', 'x', 'Củ Chi|Tân An Hội|Thái Mỹ|An Nhơn Tây|Nhuận Đức|Phú Hòa Đông|Bình Mỹ'],
  ['hocmon', 'hcm', 'x', 'Đông Thạnh|Hóc Môn|Xuân Thới Sơn|Bà Điểm'],
  ['nhabe', 'hcm', 'x', 'Nhà Bè|Hiệp Phước'],
  ['dian', 'bd', 'p', 'Dĩ An|Tân Đông Hiệp|Đông Hòa'],
  ['thuanan', 'bd', 'p', 'An Phú|Bình Hòa|Lái Thiêu|Thuận An|Thuận Giao'],
  ['thudaumot', 'bd', 'p', 'Thủ Dầu Một|Phú Lợi|Chánh Hiệp|Bình Dương'],
  ['bencat', 'bd', 'p', 'Hòa Lợi|Phú An|Tây Nam|Long Nguyên|Bến Cát|Chánh Phú Hòa|Thới Hòa'],
  ['tanuyen', 'bd', 'p', 'Vĩnh Tân|Bình Cơ|Tân Uyên|Tân Hiệp|Tân Khánh'],
  ['bactanuyen', 'bd', 'x', 'Thường Tân|Bắc Tân Uyên'],
  ['phugiao', 'bd', 'x', 'Phú Giáo|Phước Hòa|Phước Thành|An Long'],
  ['baubang', 'bd', 'x', 'Trừ Văn Thố|Bàu Bàng'],
  ['dautieng', 'bd', 'x', 'Long Hòa|Thanh An|Dầu Tiếng|Minh Thạnh'],
  ['vungtau', 'vt', 'p', 'Vũng Tàu|Tam Thắng|Rạch Dừa|Phước Thắng'],
  ['vungtau', 'vt', 'x', 'Long Sơn'],
  ['baria', 'vt', 'p', 'Long Hương|Bà Rịa|Tam Long'],
  ['phumy', 'vt', 'p', 'Tân Hải|Tân Phước|Phú Mỹ|Tân Thành'],
  ['phumy', 'vt', 'x', 'Châu Pha'],
  ['longdien', 'vt', 'x', 'Long Hải|Long Điền|Phước Hải|Đất Đỏ'],
  ['chauduc', 'vt', 'x', 'Nghĩa Thành|Ngãi Giao|Kim Long|Châu Đức|Bình Giã|Xuân Sơn'],
  ['xuyenmoc', 'vt', 'x', 'Hồ Tràm|Xuyên Mộc|Hòa Hội|Bàu Lâm|Hòa Hiệp|Bình Châu'],
  ['condao', 'vt', 'dk', 'Côn Đảo'],
];

// How each area is written in listings (folded: lower case, no diacritics).
export const FORMER = {
  q1: ['quan 1', 'district 1', 'q1', 'q.1'], q3: ['quan 3', 'district 3', 'q3', 'q.3'], q4: ['quan 4', 'district 4', 'q4', 'q.4'],
  q5: ['quan 5', 'district 5', 'q5', 'q.5'], q6: ['quan 6', 'district 6', 'q6', 'q.6'], q7: ['quan 7', 'district 7', 'q7', 'q.7'],
  q8: ['quan 8', 'district 8', 'q8', 'q.8'], q10: ['quan 10', 'district 10', 'q10', 'q.10'], q11: ['quan 11', 'district 11', 'q11', 'q.11'],
  q12: ['quan 12', 'district 12', 'q12', 'q.12'], binhtan: ['binh tan'], binhthanh: ['binh thanh'], govap: ['go vap'],
  phunhuan: ['phu nhuan'], tanbinh: ['tan binh'], tanphu: ['tan phu'],
  thuduc: ['thu duc', 'thu djuc', 'quan 2', 'district 2', 'q2', 'q.2', 'quan 9', 'district 9', 'q9', 'q.9', 'thao dien', 'thu thiem'],
  binhchanh: ['binh chanh'], cangio: ['can gio'], cuchi: ['cu chi'], hocmon: ['hoc mon'], nhabe: ['nha be'],
  dian: ['di an'], thuanan: ['thuan an'], thudaumot: ['thu dau mot'], bencat: ['ben cat'], tanuyen: ['tan uyen'],
  bactanuyen: ['bac tan uyen'], phugiao: ['phu giao'], baubang: ['bau bang'], dautieng: ['dau tieng'],
  vungtau: ['vung tau'], baria: ['ba ria'], phumy: ['phu my'], longdien: ['long dien', 'dat do'], chauduc: ['chau duc'],
  xuyenmoc: ['xuyen moc'], condao: ['con dao'],
};
export const FORMER_GROUP = Object.fromEntries(UNITS.map(([k, g]) => [k, g]));

export const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const TYPE = { p: ['ward', 'Ward', 'phuong'], x: ['commune', 'Commune', 'xa'], dk: ['special zone', 'Special zone', 'dac khu'] };

// Ids are the folded name; "Thanh An" and "Thạnh An" fold alike, so clashes get the area key.
const SLUG_CLASH = new Set(['thanh-an']);
const slug = (name, was) => { const s = fold(name).replace(/[^a-z0-9]+/g, '-'); return SLUG_CLASH.has(s) ? `${s}-${was}` : s; };
export const WARDS = UNITS.flatMap(([was, group, type, names]) => names.split('|').map((name) => ({
  id: `${type}-${slug(name, was)}`,
  name, type: TYPE[type][0], label: `${name} ${TYPE[type][1]}`, group, was,
  search: `${fold(name)} ${TYPE[type][2]} ${FORMER[was].join(' ')}`,
})));

// Areas students can pick in their profile.
export const AREAS = [
  ['d1', 'q1', 'District 1'], ['d3', 'q3', 'District 3'], ['d4', 'q4', 'District 4'], ['d5', 'q5', 'District 5'],
  ['d6', 'q6', 'District 6'], ['d7', 'q7', 'District 7'], ['d8', 'q8', 'District 8'], ['d10', 'q10', 'District 10'],
  ['d11', 'q11', 'District 11'], ['d12', 'q12', 'District 12'], ['pn', 'phunhuan', 'Phú Nhuận'], ['bt', 'binhthanh', 'Bình Thạnh'],
  ['tb', 'tanbinh', 'Tân Bình'], ['tp', 'tanphu', 'Tân Phú'], ['gv', 'govap', 'Gò Vấp'], ['btan', 'binhtan', 'Bình Tân'],
  ['td', 'thuduc', 'Thủ Đức'], ['bc', 'binhchanh', 'Bình Chánh'], ['nb', 'nhabe', 'Nhà Bè'], ['hm', 'hocmon', 'Hóc Môn'],
  ['cc', 'cuchi', 'Củ Chi'], ['cg', 'cangio', 'Cần Giờ'],
].map(([id, key, name]) => ({ id, key, name }));

export const MODES = [['onsite', 'On-site'], ['hybrid', 'Hybrid'], ['remote', 'Remote']];
export const YEARS = [['1', 'Year 1'], ['2', 'Year 2'], ['3', 'Year 3'], ['4', 'Year 4 or final'], ['grad', 'Recent graduate']];

export const majorName = (id) => (MAJORS.find((m) => m.id === id) || {}).name || '';
export const areaById = (id) => AREAS.find((a) => a.id === id);
export const areaByKey = (key) => AREAS.find((a) => a.key === key);
