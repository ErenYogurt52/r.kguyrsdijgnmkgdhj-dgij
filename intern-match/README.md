# Intern Match (bản chạy trên máy)

Web cho sinh viên: đăng ký tài khoản, điền hồ sơ (ngành, **từ khóa**, kỹ năng, khu vực), rồi xem **10 tin phù hợp nhất** tại TP.HCM lấy từ **Google Jobs qua SearchApi.io**. Web chỉ hiện tin **thực tập** hoặc tin **không yêu cầu kinh nghiệm**. Không hiển thị phần trăm match. Sinh viên luôn ứng tuyển trên website gốc.

- **Không cần `npm install`:** server là Node.js thuần, không có thư viện ngoài.
- **Tài khoản và dữ liệu:** dùng Firebase Authentication (email/mật khẩu và Google) và Cloud Firestore.
- **Giao diện:** giữ nguyên thiết kế từ mẫu Canva (màu Night / Brick / Ember / Flame / Amber, font Be Vietnam Pro).

---

## 1. Cần chuẩn bị

| Thứ | Ghi chú |
|---|---|
| **Node.js 20 trở lên** | https://nodejs.org. Kiểm tra bằng `node -v`. |
| **Tài khoản SearchApi.io** | https://www.searchapi.io. Đăng ký rồi chép **API key** trong Dashboard. Gói miễn phí có giới hạn số request. |
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
- Nếu thiếu `SEARCHAPI_KEY`, trang Top 10 sẽ báo *"Search isn't set up yet"*.

Muốn mở web từ điện thoại cùng mạng Wi-Fi:
1. Đặt `HOST=0.0.0.0` trong `.env`.
2. Vào `http://<IP-máy-tính>:3000`.
3. Thêm IP đó vào *Authorized domains* của Firebase.

Các lệnh khác:
- `npm run dev`: tự khởi động lại server khi sửa code.
- `npm test`: chạy 27 bài kiểm thử bộ lọc, đăng nhập, API tìm kiếm và Career coach. Không cần mạng và không tốn lượt SearchApi.

## 4. Cách tìm và lọc tin

**Tạo truy vấn**

1. Sinh viên nhập **từ khóa** trong hồ sơ, ví dụ `Marketing`, `Data analyst`, `Kế toán`. Server dùng tối đa 3 từ khóa đầu (`MAX_KEYWORDS`).
2. Với mỗi từ khóa, server gọi `https://www.searchapi.io/api/v1/search?engine=google_jobs`. Key được gửi trong header `Authorization: Bearer ...`, không nằm trên URL. Các tham số:
   - `location = Ho Chi Minh City,Ho Chi Minh City,Vietnam`
   - `gl=vn`, `hl=en`: nhãn của Google như "2 days ago" hay "Internship" hiện bằng tiếng Anh; nội dung tin giữ nguyên ngôn ngữ gốc.
   - Truy vấn đầu tiên là `"<từ khóa> intern"`, hoặc `"thực tập sinh <từ khóa>"` nếu từ khóa có dấu tiếng Việt.
3. Nếu chưa đủ 10 tin hợp lệ, server lấy thêm theo thứ tự: trang 2 (`next_page_token`), rồi dạng truy vấn còn lại, rồi `"<từ khóa> không yêu cầu kinh nghiệm"`. Mỗi lần tìm tốn **tối đa 4 request SearchApi** (`MAX_API_CALLS_PER_SEARCH`).
4. Nếu SearchApi không nhận tên địa điểm, server tự chuyển sang tìm `"... Hồ Chí Minh"` và in cảnh báo trong terminal. Có thể sửa bằng `SEARCH_LOCATION`.

**Giữ lại**

- Tin có tiêu đề hoặc loại công việc là thực tập, intern, trainee, thực tập sinh.
- Tin khác chỉ được giữ khi ghi rõ *không yêu cầu kinh nghiệm* hoặc *no experience required*, và không đòi số tháng hay số năm kinh nghiệm nào. Kinh nghiệm chỉ ghi "ưu tiên" hoặc "là lợi thế" thì không bị tính là yêu cầu.

**Loại bỏ**

- Vị trí senior, trưởng nhóm, quản lý.
- Tin ở tỉnh khác, hoặc tin xuất khẩu lao động / thực tập sinh đi Nhật.
- Tin trùng giữa các trang: gộp thành một tin và giữ đủ link ứng tuyển.

**Địa bàn**

- Chỉ TP.HCM. Tin ở tỉnh/thành khác bị loại. Tin làm từ xa có ghi Việt Nam vẫn được giữ.
- Sinh viên chọn khu vực mong muốn (District 1, Bình Thạnh, Thủ Đức…). Tin ghi địa chỉ theo tên phường cũng được nhận ra đúng khu vực.
- Tin làm từ xa có ghi Việt Nam.

**Sắp xếp**

Tin được xếp lên cao khi tiêu đề khớp từ khóa, khi tin nhắc tới kỹ năng của sinh viên, hoặc khi nằm ở khu vực sinh viên chọn. Trên thẻ tin chỉ hiện **lý do**, không hiện điểm hay phần trăm.

**Tiết kiệm lượt SearchApi**

- Kết quả SearchApi được cache **12 giờ** trong thư mục `.cache/`, nên khởi động lại server cũng không tốn lượt.
- Top 10 gần nhất của mỗi người được lưu trong Firestore. Mở lại trang sẽ không gọi SearchApi, trừ khi đổi hồ sơ hoặc bấm *Search again*.
- Mỗi tài khoản được **20 lần tìm mới mỗi ngày** (`SEARCHES_PER_USER_PER_DAY`). Tìm lại từ cache không bị tính.
- API `/api/search` **bắt buộc đăng nhập**: server kiểm tra Firebase ID token bằng khoá công khai của Google, không cần service account. Vì vậy người lạ không dùng được key SearchApi của bạn.

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
  searchapi.js  gọi SearchApi.io Google Jobs (key qua header, timeout, báo lỗi rõ ràng)
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
firebase/firestore.rules   rules bảo mật để dán vào Firebase
netlify.toml, netlify/functions/api.mjs   cấu hình và API khi chạy trên Netlify
test/                      kiểm thử (node --test) với dữ liệu giả lập SearchApi
```

## 8. Lỗi thường gặp

| Thông báo | Cách xử lý |
|---|---|
| *Search is not set up yet* | Thiếu `SEARCHAPI_KEY` trong `.env`. Điền vào rồi khởi động lại server. |
| *SearchApi: Invalid API key* / hết lượt | Key sai (thừa dấu cách, dấu nháy, chữ `Bearer`) hoặc hết request. Kiểm tra trong Dashboard của searchapi.io. |
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
   Hoặc nhập tay ở **Site configuration → Environment variables**. Cần có `SEARCHAPI_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, và các biến `FIREBASE_*`.
5. Deploy lại để Netlify dùng các biến vừa thêm:
   ```
   npx netlify-cli deploy --prod
   ```
6. **Firebase:** vào **Authentication → Settings → Authorized domains**, bấm **Add domain**, nhập `intern-match-hcm.netlify.app` (tên site của bạn). Thiếu bước này thì trang web sẽ báo *"This address can't sign in yet"*.
7. Mở `https://intern-match-hcm.netlify.app` để dùng.

Muốn cập nhật code sau này: sửa code rồi chạy lại `npx netlify-cli deploy --prod`. Nếu site bị lỗi, xem log ở **Netlify → Logs → Functions → api**.

Không dùng được "Netlify Drop" (kéo thả thư mục), vì cách đó chỉ đưa lên file tĩnh, không chạy được phần API.
