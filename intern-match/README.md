# Intern Match (bản chạy trên máy)

Web cho sinh viên: đăng ký tài khoản, điền hồ sơ (ngành, **từ khóa**, kỹ năng, khu vực), rồi xem **10 tin phù hợp nhất** tại TP.HCM lấy từ **Google Jobs qua SearchApi.io** (có thể thêm **SerpApi** làm nguồn dự phòng). Web chỉ hiện tin **thực tập** hoặc tin **không yêu cầu kinh nghiệm**. Không hiển thị phần trăm match. Sinh viên luôn ứng tuyển trên website gốc.

- **Không cần `npm install`:** server là Node.js thuần, không có thư viện ngoài.
- **Tài khoản và dữ liệu:** dùng Firebase Authentication (email/mật khẩu và Google) và Cloud Firestore.
- **Giao diện:** giữ nguyên thiết kế từ mẫu Canva (màu Night / Brick / Ember / Flame / Amber, font Be Vietnam Pro).

---

## 1. Cần chuẩn bị

| Thứ | Ghi chú |
|---|---|
| **Node.js 20 trở lên** | https://nodejs.org. Kiểm tra bằng `node -v`. |
| **Tài khoản SearchApi.io** | https://www.searchapi.io. Đăng ký rồi chép **API key** trong Dashboard. Gói miễn phí có giới hạn số request. |
| **Tài khoản SerpApi** (không bắt buộc) | https://serpapi.com. Nguồn dự phòng, cũng lấy tin từ Google Jobs. Khi SearchApi hết lượt hoặc đang bận, server tự chuyển sang SerpApi. Gói miễn phí có giới hạn số lượt mỗi tháng. |
| **Ollama** (cho Career coach) | https://ollama.com/download. Sau khi cài, chạy `ollama pull gemma4:e4b`. Xem mục 5. |
| **Dự án Firebase** | https://console.firebase.google.com (gói Spark miễn phí là đủ). |

## 2. Tạo Firebase (khoảng 5 phút)

1. **Tạo dự án.** Vào Firebase Console, chọn **Add project** và đặt tên, ví dụ `intern-match`.
2. **Bật đăng nhập.** Vào **Build → Authentication → Get started → Sign-in method**, rồi bật:
   - **Email/Password**
   - **Google**: chọn email hỗ trợ rồi Save.
3. **Tạo Firestore.** Vào **Build → Firestore Database → Create database**, chọn vị trí `asia-southeast1` (Singapore), rồi chọn **Production mode**.
4. **Dán rules bảo mật.** Mở tab **Rules** của Firestore, xoá hết nội dung cũ, dán toàn bộ file `firebase/firestore.rules` vào và bấm **Publish**. Nếu không làm bước này, web sẽ báo *"Firebase blocked this request"*.
5. **Lấy cấu hình web.** Vào **Project settings** (bánh răng) → **General → Your apps**, bấm biểu tượng **Web `</>`**, đặt tên app rồi Register. Firebase hiện đoạn `firebaseConfig`. Chép các giá trị `apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId`, `storageBucket` vào file `.env` (xem bước 3).
6. **Kiểm tra tên miền được phép.** Vào **Authentication → Settings → Authorized domains**, chắc chắn đã có `localhost`. Nếu mở web bằng `127.0.0.1`, thêm cả `127.0.0.1`.

> Nếu đã cài Firebase CLI, có thể đẩy rules bằng `firebase deploy --only firestore:rules` thay cho bước 4, vì file `firebase.json` đã trỏ sẵn tới rules.

## 3. Cấu hình và chạy

**Dán key SearchApi vào `.env`.** Link `https://www.searchapi.io/api/v1/search?engine=google_jobs` là địa chỉ API, server đã có sẵn nên không cần dán. Bạn chỉ dán **API key** (chuỗi lấy trong Dashboard của searchapi.io):

```
SEARCHAPI_KEY=abc123xyz...
```

Không thêm dấu nháy, không thêm chữ `Bearer`, không để dấu cách thừa.

**Thêm nguồn dự phòng (không bắt buộc).** Lấy key ở https://serpapi.com/manage-api-key rồi thêm vào `.env`:

```
SERPAPI_KEY=abc123xyz...
```

Có key nào thì server dùng key đó, theo thứ tự SearchApi → SerpApi. Khi một bên báo hết lượt, vượt giới hạn theo giờ hoặc key sai, lượt tìm đó được chuyển sang bên còn lại, và bên vừa từ chối được nghỉ 10 phút rồi mới hỏi lại. Hai bên đọc cùng dữ liệu Google Jobs nên kết quả như nhau. Chỉ cần một trong hai key là web tìm được. Đổi thứ tự bằng `SEARCH_PROVIDERS=serpapi,searchapi`.

**Career coach** mặc định dùng Ollama trên máy (dòng `OLLAMA_MODEL=gemma4:e4b`, xem mục 5). Nếu muốn dùng OpenRouter thay cho Ollama, xoá dòng đó và dán key OpenRouter vào dòng:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

Mô hình mặc định là `google/gemma-4-26b-a4b-it:free`. Muốn đổi mô hình thì thêm dòng `OPENROUTER_MODEL=<tên mô hình trên OpenRouter>`.


```bash
cd intern-match
cp .env.example .env        # Windows: copy .env.example .env
# mở .env, điền SEARCHAPI_KEY và các dòng FIREBASE_*
npm start
```

Mở **http://localhost:3000** để dùng.

- Nếu thiếu cấu hình Firebase, trang sẽ hiện *"Almost there"*.
- Nếu thiếu cả `SEARCHAPI_KEY` lẫn `SERPAPI_KEY`, trang Top 10 sẽ báo *"Search isn't set up yet"*.

Muốn mở web từ điện thoại cùng mạng Wi-Fi:
1. Đặt `HOST=0.0.0.0` trong `.env`.
2. Vào `http://<IP-máy-tính>:3000`.
3. Thêm IP đó vào *Authorized domains* của Firebase.

Các lệnh khác:
- `npm run dev`: tự khởi động lại server khi sửa code.
- `npm test`: chạy các bài kiểm thử bộ lọc, đăng nhập, API tìm kiếm và Career coach. Không cần mạng và không tốn lượt tìm kiếm.

## 4. Cách tìm và lọc tin

**Tạo truy vấn**

1. Sinh viên nhập **từ khóa** trong hồ sơ, ví dụ `Marketing`, `Data analyst`, `Kế toán`. Server dùng tối đa 3 từ khóa đầu (`MAX_KEYWORDS`).
2. Với mỗi từ khóa, server gọi `https://www.searchapi.io/api/v1/search?engine=google_jobs`. Key được gửi trong header `Authorization: Bearer ...`, không nằm trên URL. Khi dùng SerpApi, địa chỉ là `https://serpapi.com/search.json?engine=google_jobs` và key là tham số `api_key` (SerpApi chỉ nhận key theo cách này; server không ghi URL này vào log). Các tham số giống nhau ở cả hai bên:
   - `location = Ho Chi Minh City,Ho Chi Minh City,Vietnam`
   - `gl=vn`, `hl=en`: nhãn của Google như "2 days ago" hay "Internship" hiện bằng tiếng Anh; nội dung tin giữ nguyên ngôn ngữ gốc.
   - Truy vấn đầu tiên là `"<từ khóa> intern"`, hoặc `"thực tập sinh <từ khóa>"` nếu từ khóa có dấu tiếng Việt.
3. Nếu chưa đủ 10 tin hợp lệ, server lấy thêm theo thứ tự: trang 2 (`next_page_token`), rồi dạng truy vấn còn lại, rồi `"<từ khóa> không yêu cầu kinh nghiệm"`. Mỗi lần tìm tốn **tối đa 4 request** (`MAX_API_CALLS_PER_SEARCH`).
4. Nếu dịch vụ tìm kiếm không nhận tên địa điểm, server tự chuyển sang tìm `"... Hồ Chí Minh"` và in cảnh báo trong terminal. Có thể sửa bằng `SEARCH_LOCATION`.

**Giữ lại**

- Tin có tiêu đề hoặc loại công việc là thực tập, intern, trainee, thực tập sinh.
- Tin khác chỉ được giữ khi ghi rõ *không yêu cầu kinh nghiệm* hoặc *no experience required*, và không đòi số tháng hay số năm kinh nghiệm nào. Kinh nghiệm chỉ ghi "ưu tiên" hoặc "là lợi thế" thì không bị tính là yêu cầu.

**Loại bỏ**

- Vị trí senior, trưởng nhóm, quản lý.
- Tin ở tỉnh khác, hoặc tin xuất khẩu lao động / thực tập sinh đi Nhật.
- Tin trùng giữa các trang: gộp thành một tin và giữ đủ link ứng tuyển.
- Tin **đòi tiền để được nhận việc** (đặt cọc, phí hồ sơ, phí đào tạo, nạp tiền làm nhiệm vụ…), kể cả bản sao của tin đó trên trang khác. Câu nói về khách hàng (ví dụ "tư vấn khách hàng đặt cọc căn hộ"), quyền lợi ("miễn phí đào tạo", "hỗ trợ phí gửi xe") hay lời cảnh báo lừa đảo thì không bị tính. Xem `public/js/trust.js`.

**Địa bàn**

- Chỉ TP.HCM. Tin ở tỉnh/thành khác bị loại. Tin làm từ xa có ghi Việt Nam vẫn được giữ.
- Sinh viên chọn khu vực mong muốn (District 1, Bình Thạnh, Thủ Đức…). Tin ghi địa chỉ theo tên phường cũng được nhận ra đúng khu vực.
- Tin làm từ xa có ghi Việt Nam.

**Sắp xếp**

Tin được xếp lên cao khi tiêu đề khớp từ khóa, khi tin nhắc tới kỹ năng của sinh viên, hoặc khi nằm ở khu vực sinh viên chọn. Trên thẻ tin chỉ hiện **lý do**, không hiện điểm hay phần trăm. Tin có dấu hiệu lừa đảo nhẹ hơn (việc nhẹ lương cao, "chỉ cần có điện thoại", tuyển CTV online, trả tiền cho like/đánh giá, gia công tại nhà, liên hệ qua Telegram, không cần phỏng vấn) vẫn được giữ nhưng bị xếp xuống và có cảnh báo.

**Tiết kiệm lượt tìm kiếm**

- Kết quả từ SearchApi và SerpApi được cache **12 giờ** trong thư mục `.cache/`, nên khởi động lại server cũng không tốn lượt.
- Top 10 gần nhất của mỗi người được lưu trong Firestore. Mở lại trang sẽ không tốn lượt tìm kiếm, trừ khi đổi hồ sơ hoặc bấm *Search again*.
- Mỗi tài khoản được **20 lần tìm mới mỗi ngày** (`SEARCHES_PER_USER_PER_DAY`). Tìm lại từ cache không bị tính.
- API `/api/search` **bắt buộc đăng nhập**: server kiểm tra Firebase ID token bằng khoá công khai của Google, không cần service account. Vì vậy người lạ không dùng được key tìm kiếm của bạn.

## 5. Career coach (AI tư vấn)

Trang **Coach** là khung chat với AI (**Gemini**, dự phòng bằng **Gemma 4** qua Ollama/OpenRouter). AI đọc hồ sơ sinh viên và Top 10 để tư vấn: nên nộp tin nào trước, nên học kỹ năng gì, viết vài dòng cho CV hoặc thư xin việc, và luyện phỏng vấn thử. Ở trang chi tiết tin có nút *Ask the coach about this job* để hỏi riêng về tin đó.

**Dùng nhiều AI cùng lúc, tự chuyển khi bận.** Mọi AI có key trong `.env` đều được dùng, theo thứ tự **Gemini → Ollama → OpenRouter**. Nếu AI đầu tiên đang quá tải (ví dụ Gemini báo *503 high demand*) hoặc hết lượt, server thử lại một lần rồi tự chuyển sang AI tiếp theo, và sinh viên không thấy lỗi. Muốn đổi thứ tự thì thêm dòng `COACH_PROVIDERS=gemini,openrouter`. Khi chạy, terminal in ra thứ tự đang dùng, ví dụ `Career coach: gemini-flash-latest (Google Gemini API) → google/gemma-4-26b-a4b-it:free (OpenRouter)`.

**Linh vật của Coach:** lưu ảnh của bạn thành `public/img/coach.png` (PNG nền trong suốt, khoảng 240×240 px trở lên), rồi tải lại trang. Ảnh sẽ hiện cạnh mỗi câu trả lời, nhún nhảy khi Coach đang trả lời, và lơ lửng ở khung bên phải. Chưa có ảnh thì web hiện một bong bóng nhỏ. File này đã được thêm vào `.gitignore` để không bị đưa lên GitHub.

**Google Gemini API (miễn phí, không phải tải gì)**
1. Vào https://aistudio.google.com/apikey, bấm **Create API key**. Chọn dự án Google Cloud của bạn (ví dụ `internmatch-75421`), rồi copy key (bắt đầu bằng `AIza...`).
2. Trong `.env`, điền:
   ```
   GEMINI_API_KEY=AIza...
   ```
3. Chạy lại `npm start`. Terminal sẽ hiện `Career coach: gemini-flash-latest (Google Gemini API) ...`.

Mô hình mặc định là `gemini-flash-latest`, luôn trỏ tới bản Flash mới nhất. Muốn đổi mô hình thì thêm dòng `GEMINI_MODEL=<tên mô hình>`; tên các mô hình có trong ô chọn model ở AI Studio. Gói miễn phí giới hạn số lượt gọi mỗi phút và mỗi ngày; xem ở https://aistudio.google.com/rate-limit.

Không cần "train" AI: mỗi lần sinh viên hỏi, server tự gửi kèm hướng dẫn (system prompt), hồ sơ sinh viên và Top 10 cho Gemini. Nội dung hướng dẫn nằm trong `server/coach.js`. Bản để dán thử vào AI Studio có trong `docs/coach-prompt.md`.

**Ollama trên máy (miễn phí, không giới hạn lượt, nhưng phải tải mô hình 7–19 GB)**
1. Tải và cài Ollama ở https://ollama.com/download (bản Windows). Cài xong, Ollama tự chạy nền, có biểu tượng con lạc đà ở khay hệ thống.
2. Mở Terminal và tải mô hình (khoảng 9,6 GB, chỉ tải một lần):
   ```
   ollama pull gemma4:e4b
   ```
3. Trong `.env`, điền `OLLAMA_MODEL=gemma4:e4b`. Chạy lại `npm start`.

Chọn cỡ mô hình theo máy:

| Mô hình | Tải về | Hợp với |
|---|---|---|
| `gemma4:e2b` | ~7 GB | Máy yếu, 8 GB RAM, trả lời nhanh hơn nhưng kém hơn |
| `gemma4:e4b` | ~9,6 GB | Laptop 16 GB RAM (mặc định) |
| `gemma4:26b` | ~19 GB | Máy mạnh, 32 GB RAM hoặc GPU nhiều VRAM |

Muốn đổi mô hình: chạy `ollama pull <tên>`, sửa `OLLAMA_MODEL=<tên>` trong `.env`, rồi chạy lại server. Không có card đồ hoạ rời thì mỗi câu trả lời có thể mất vài chục giây.

**OpenRouter**
Điền `OPENROUTER_API_KEY`. Mô hình mặc định là `google/gemma-4-26b-a4b-it:free`, nhưng bản miễn phí bị giới hạn số lượt gọi.

**Chung cho cả hai cách:**
- Hướng dẫn cho AI (system prompt) được tạo trên server, trình duyệt không sửa được.
- AI chỉ nói về các tin có trong danh sách, không bịa ra việc làm, không xin CV.
- AI trả lời bằng ngôn ngữ sinh viên dùng để hỏi.
- Câu trả lời hiện dần từng chữ. Đoạn chat không được lưu.
- Giới hạn lượt mỗi tài khoản: `COACH_MESSAGES_PER_USER_PER_DAY` (mặc định 50 tin/ngày).

## 6. Tính năng tài khoản

- **Đăng ký và đăng nhập:** bằng email/mật khẩu hoặc tài khoản Google. Có quên mật khẩu (gửi email đặt lại) và email xác minh.
- **Onboarding:** lần đầu đăng nhập sẽ vào trang *Set up your profile*. Phải có ít nhất 1 từ khóa mới xem được Top 10.
- **Top 10:** dựa trên hồ sơ. Có thể tìm thêm bằng từ khóa khác. Mỗi tin có nút **Apply on <trang gốc>**, mở tab mới tới website đăng tin.
- **Giờ rảnh (When you’re free to work):** chọn Buổi sáng / chiều / tối / Cuối tuần trong Profile. Tin nào có ghi rõ giờ làm khớp (hoặc ghi giờ linh hoạt) được cộng thêm tối đa 1 điểm và hiện lý do như *Mentions weekends*, *Flexible hours*. Không tin nào bị ẩn, không tốn thêm lượt tìm kiếm.
- **Lọc Full-time / Part-time:** chọn ở trang Top 10 (hàng *Job type* dưới ô tìm kiếm) hoặc trong Profile. Lựa chọn được lưu vào hồ sơ. Khi chọn Full-time hoặc Part-time, web thêm "full time" / "part time" (hoặc "toàn thời gian" / "bán thời gian") vào câu tìm kiếm và chỉ giữ tin ghi rõ loại đó (trong lịch làm việc Google hiển thị hoặc trong mô tả).
- **Dấu hiệu tin cậy (Trust signals):** trang chi tiết mỗi tin cho biết tin được đăng trên bao nhiêu trang, có trên trang tuyển dụng quen thuộc (LinkedIn, TopCV, VietnamWorks…) hay website của chính công ty không, cảnh báo nếu nội dung có dấu hiệu lừa đảo, và nút **Tra cứu công ty** mở Cổng thông tin quốc gia về đăng ký doanh nghiệp để sinh viên tự kiểm tra. Đây chỉ là dấu hiệu: web **không** xác minh công ty và không tự lấy dữ liệu từ trang tra cứu (tin tuyển dụng không có mã số thuế, và tự động lấy dữ liệu là scraping). Career coach cũng thấy các cảnh báo này.
- **Tiếng Anh / Tiếng Việt:** nút **EN | VI** ở góc trên (trên điện thoại cũng có trong menu). Lựa chọn được nhớ trên trình duyệt. Chỉ giao diện được dịch; tên việc, tên công ty và mô tả tin giữ nguyên như trang gốc. Khi đang ở bản VI, Career coach mặc định trả lời tiếng Việt (vẫn đổi sang tiếng Anh nếu được yêu cầu); ở bản EN thì mặc định tiếng Anh.
- **Lưu tin:** lưu vào Firestore, nên xem được trên mọi thiết bị.
- **Trang Profile:** sửa hồ sơ, đổi tên, đổi mật khẩu, đăng xuất, **xoá tài khoản**. Xoá tài khoản sẽ xoá hồ sơ, tin đã lưu và kết quả, rồi xoá tài khoản đăng nhập.

Dữ liệu trong Firestore:
```
users/{uid}                  { name, email, profile, createdAt, updatedAt }
users/{uid}/saved/{jobId}    { job, savedAt }
users/{uid}/results/latest   { jobs, meta, keywordsKey, createdAt }
```
Rules chỉ cho mỗi người đọc và ghi dữ liệu của chính mình.

## 7. Cấu trúc thư mục

```
server/
  index.js      server chạy trên máy: phục vụ web, chuyển /api/* sang api.js; header bảo mật (CSP), gzip
  api.js        toàn bộ API (/api/config, /api/search, /api/coach), dùng chung cho máy và Netlify
  jobs.js       tạo truy vấn, lọc thực tập / 0 kinh nghiệm / TP.HCM, gộp trùng, xếp hạng
  coach.js      Career coach: tạo prompt, gọi Gemini / Ollama / OpenRouter (tự chuyển khi bận), stream câu trả lời
  searchapi.js  gọi Google Jobs qua SearchApi.io và SerpApi (tự chuyển khi một bên hết lượt), timeout, báo lỗi rõ ràng
  auth.js       kiểm tra Firebase ID token (RS256) không cần firebase-admin
  cache.js      cache theo thời hạn (bộ nhớ + file) và giới hạn lượt/ngày
  env.js        đọc .env
public/
  index.html, favicon.svg
  css/styles.css   hệ thiết kế gốc; css/app.css phần bổ sung (đăng nhập, tài khoản)
  js/app.js        trạng thái, điều hướng, sự kiện
  js/views.js      giao diện các trang
  js/firebase.js   toàn bộ lệnh Firebase (SDK 12 tải từ gstatic, không cần build)
  js/api.js        gọi API của server
  js/reference.js  ngành, từ khóa gợi ý, kỹ năng, trường, khu vực TP.HCM
  js/i18n.js       đổi ngôn ngữ EN/VI; js/i18n-vi.js bảng chữ tiếng Việt của giao diện
  js/trust.js      dấu hiệu tin cậy: tin đòi tiền (bị loại), cảnh báo lừa đảo, trang đăng tin (dùng chung cho server và trình duyệt)
firebase/firestore.rules   rules bảo mật để dán vào Firebase
netlify.toml, netlify/functions/api.mjs   cấu hình và API khi chạy trên Netlify
test/                      kiểm thử (node --test) với dữ liệu giả lập SearchApi và SerpApi
```

## 8. Lỗi thường gặp

| Thông báo | Cách xử lý |
|---|---|
| *Search is not set up yet* | Thiếu `SEARCHAPI_KEY` (và `SERPAPI_KEY`) trong `.env`. Điền ít nhất một key rồi khởi động lại server. |
| *The job search is busy right now* (Hệ thống tìm việc đang bận) | Dịch vụ tìm kiếm trả lời HTTP 429: gói đã hết lượt, hoặc vượt giới hạn số lượt trong một giờ. Lý do chính xác nằm trong log của server (dòng `[search] failed: ...`), số lượt còn lại xem trong Dashboard của searchapi.io hoặc serpapi.com. Thêm `SERPAPI_KEY` để có nguồn dự phòng. |
| *The job search had a problem* | Thường là key sai (thừa dấu cách, dấu nháy, chữ `Bearer`). Xem dòng `[search] failed: ...` trong log của server. |
| *Firebase blocked this request* | Chưa Publish `firebase/firestore.rules` (bước 2.4). |
| *This sign-in method is turned off* | Bật Email/Password hoặc Google ở Authentication → Sign-in method. |
| *This address can't sign in yet* | Thêm tên miền hoặc IP đang dùng vào Authorized domains. |
| Popup Google bị chặn | Cho phép popup với localhost. |
| *The coach isn't set up yet* | Chưa có key AI nào trong `.env` (`GEMINI_API_KEY`, `OLLAMA_MODEL` hoặc `OPENROUTER_API_KEY`). |
| *… is very busy right now* | Tất cả AI đang quá tải. Đợi 1 phút, hoặc thêm key của một AI khác để có chỗ dự phòng. |
| *Gemini rejected the API key* | Key Gemini sai. Tạo lại ở aistudio.google.com/apikey. |
| *Can't reach Ollama* | Ollama chưa chạy. Mở ứng dụng Ollama (hoặc chạy `ollama serve`) rồi thử lại. |
| *Ollama doesn't have the model…* | Chưa tải mô hình. Chạy lệnh `ollama pull ...` hiện trong thông báo. |
| *OpenRouter rejected the API key* | Key OpenRouter sai hoặc đã bị xoá. Tạo key mới ở openrouter.ai/keys. |
| *The free AI model is busy…* | Bản miễn phí đang quá tải hoặc hết lượt trong ngày. Đợi rồi thử lại. |
| *Sign-in checks need FIREBASE_PROJECT_ID* | Thiếu `FIREBASE_PROJECT_ID` trong `.env`. |

## 9. Đưa lên mạng bằng Netlify

Code đã có sẵn `netlify.toml` và `netlify/functions/api.mjs`. Netlify phục vụ phần giao diện từ thư mục `public/`, còn API chạy dưới dạng Netlify Function, dùng chung code với server trên máy.

**Khác với khi chạy trên máy:**
- **Career coach dùng Gemini (dự phòng OpenRouter),** vì Netlify không kết nối được tới Ollama trên máy bạn. Dòng `OLLAMA_MODEL` bị bỏ qua khi chạy trên Netlify.
- **Tìm kiếm và coach trả kết quả dạng stream,** nên được chạy tối đa 60 giây. Hàm thường của Netlify chỉ được khoảng 10 giây.
- **Cache và bộ đếm lượt/ngày chỉ là tạm thời:** Netlify có thể khởi động lại function bất cứ lúc nào, và khi đó các số này về 0. Với bản demo thì không sao.

**Chi phí:** gói **Free** có 300 credit mỗi tháng. Mỗi lần deploy production tốn 15 credit, cộng thêm phần băng thông và thời gian chạy function. Bản demo dùng gói Free là đủ, nhưng đừng deploy quá nhiều lần trong tháng. Khi hết credit, site tạm dừng tới tháng sau. Gói Pro giá $20 mỗi tháng.

**Các bước (dùng Terminal trong VS Code, không cần GitHub):**
1. Tạo tài khoản miễn phí ở https://app.netlify.com/signup.
2. Đăng nhập Netlify từ Terminal. Trình duyệt sẽ mở ra, bấm **Authorize**:
   ```
   npx netlify-cli login
   ```
3. Deploy lần đầu. Chọn **Create & configure a new project**, chọn team, rồi đặt tên site (ví dụ `intern-match-hcm`):
   ```
   npx netlify-cli deploy --prod
   ```
4. Đưa các biến trong `.env` lên Netlify:
   ```
   npx netlify-cli env:import .env
   ```
   Hoặc nhập tay ở **Site configuration → Environment variables**. Cần có `SEARCHAPI_KEY` (thêm `SERPAPI_KEY` nếu dùng nguồn dự phòng), `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, và các biến `FIREBASE_*`.
5. Deploy lại để Netlify dùng các biến vừa thêm:
   ```
   npx netlify-cli deploy --prod
   ```
6. **Firebase:** vào **Authentication → Settings → Authorized domains**, bấm **Add domain**, nhập `intern-match-hcm.netlify.app` (tên site của bạn). Thiếu bước này thì trang web sẽ báo *"This address can't sign in yet"*.
7. Mở `https://intern-match-hcm.netlify.app` để dùng.

Muốn cập nhật code sau này: sửa code rồi chạy lại `npx netlify-cli deploy --prod`. Nếu site bị lỗi, xem log ở **Netlify → Logs → Functions → api**.

Không dùng được "Netlify Drop" (kéo thả thư mục), vì cách đó chỉ đưa lên file tĩnh, không chạy được phần API.

## 10. Đưa lên mạng bằng Vercel

Code đã có sẵn cấu hình cho Vercel: `vercel.json`, thư mục `api/` (mỗi file là một Vercel Function, dùng chung `server/vercel.js`) và web tĩnh trong `public/`. Không cần bước build.

1. Đẩy code lên GitHub (`git push`).
2. Vào [vercel.com](https://vercel.com), đăng nhập bằng GitHub (gói **Hobby** miễn phí) → **Add New… → Project** → chọn repo → **Import**.
3. **Root Directory:** bấm **Edit** và chọn `intern-match` (thư mục có `vercel.json`). **Framework Preset:** Other. Các ô Build/Output để nguyên.
4. **Environment Variables:** dán toàn bộ nội dung file `.env` vào ô *Key* đầu tiên, Vercel tự tách thành từng biến (FIREBASE_*, SEARCHAPI_KEY, SERPAPI_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY…). Bấm **Deploy**. Muốn thêm hoặc đổi biến sau này: **Project → Settings → Environment Variables**, lưu lại rồi **Redeploy** (biến mới chỉ có hiệu lực ở lần deploy sau).
5. Firebase Console → **Authentication → Settings → Authorized domains → Add domain**: thêm tên miền Vercel (ví dụ `ten-project.vercel.app`), nếu không thì đăng nhập bằng Google sẽ báo lỗi.
6. Từ đó, mỗi lần `git push`, Vercel tự deploy lại. Đổi tên miền: **Project → Settings → Domains**.

Ghi chú: trên Vercel, coach dùng Gemini (dự phòng OpenRouter), Ollama bị bỏ qua. Cache và bộ đếm lượt/ngày chỉ là tạm thời như trên Netlify.
