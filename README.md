# 🏝️ TourAI — Hệ thống Quản lý Tour Du lịch Tích hợp AI

Đồ án học phần **"Ứng dụng trí tuệ nhân tạo"** — Trường ĐH Công nghệ Thông tin và
Truyền thông Thái Nguyên (ICTU).

Thương hiệu trên giao diện khách hàng: **Đi Thôi Travel** — *"Chọn cung đường,
chốt ngày, lên đường"*.

Hệ thống quản lý tour du lịch theo mô hình **4 tầng**:

> **React SPA (Frontend)** → **FastAPI (Router–Service–Repository)** → **PostgreSQL (Supabase)** → **AI (Gemini / DeepSeek)**

---

## 📋 Tổng quan kiến trúc

```
tour_ai_project/
├── tour-backend/                 # API Backend — FastAPI + SQLAlchemy 2.0
│   ├── app/
│   │   ├── ai/                   # Tầng AI: adapter 2 nhà cung cấp + Fallback
│   │   │   ├── adapter.py        #   AIServiceAdapter → Gemini / DeepSeek
│   │   │   ├── fallback.py       #   with_fallback() + 4 hàm fallback thuần Python
│   │   │   ├── ai_repo.py        #   Ghi log AI vào 3 bảng AI_*
│   │   │   ├── tu_van_service.py        # UC-10
│   │   │   ├── noi_dung_service.py      # UC-11
│   │   │   ├── phan_hoi_service.py      # UC-12
│   │   │   └── de_xuat_hdv_service.py   # UC-13
│   │   ├── models/               # 23 bảng ORM (SQLAlchemy 2.0 Mapped)
│   │   ├── routers/              # 19 router · 85 endpoint · JWT/RBAC
│   │   ├── schemas/              # DTO (Pydantic v2)
│   │   ├── services/             # Nghiệp vụ + thực thi DR-01..DR-05
│   │   ├── repositories/         # Truy xuất dữ liệu
│   │   ├── utils/auth.py         # JWT HS256 + require_roles()
│   │   ├── config.py             # Nạp biến môi trường từ .env
│   │   ├── database.py           # Engine SQLAlchemy (pool_pre_ping)
│   │   └── main.py               # FastAPI app + CORS + đăng ký router
│   ├── scripts/                  # Tiện ích nạp ảnh điểm đến
│   ├── tests/                    # pytest — bộ kiểm thử tích hợp
│   ├── seed.py                   # Nạp dữ liệu mẫu (chạy 1 lần)
│   ├── migrate.py                # ALTER TABLE bổ sung cột (chạy sau seed)
│   ├── demo_data.py              # Dữ liệu demo (đơn, thanh toán, lead, voucher)
│   └── requirements.txt
├── tour-frontend/                # React SPA (Vite + Tailwind + Ant Design v5)
│   └── src/
│       ├── api/http.js           # Axios + interceptor JWT + toàn bộ module API
│       ├── context/AuthContext.jsx   # user / login / register / logout
│       ├── components/           # Navbar, ChatBox, ProtectedRoute, StaffLayout…
│       │   └── ui/               # Design system nội bộ (11 primitive)
│       ├── pages/                # admin/ · consultant/ · accountant/ · report/ · customer/
│       └── utils/                # format, signs, tourImages, exportExcel
└── README.md
```

## 🛠️ Ngăn xếp công nghệ

| Lớp | Công nghệ |
|---|---|
| **Frontend** | React 18.3 · Vite 5.4 · React Router 6.28 · TailwindCSS 3.4 · Ant Design 5.22 · `@ant-design/plots` (biểu đồ) · axios · dayjs · xlsx (xuất Excel) |
| **Backend** | FastAPI 0.104 · Uvicorn · SQLAlchemy 2.0 · Pydantic 2.10 · PyJWT (HS256) · passlib + bcrypt |
| **Cơ sở dữ liệu** | PostgreSQL (Supabase) qua `psycopg2` |
| **Trí tuệ nhân tạo** | Google Gemini (`gemini-3.6-flash`) · DeepSeek (`deepseek-chat`) |
| **Lưu trữ ảnh** | Cloudflare R2 (tương thích S3, qua `boto3`) + fallback lưu cục bộ |
| **Kiểm thử** | pytest 7.4 |

> **Thiết kế giao diện:** Tailwind được cấu hình theo *"ngôn ngữ biển báo & cung
> đường"* — bảng màu lấy từ biển báo giao thông Việt Nam (`signal` vàng,
> `guide` xanh chỉ đường, `tide` xanh biển, `heritage` nâu di sản, `stop` đỏ).
> Font `Archivo` cho tiêu đề, `Be Vietnam Pro` cho nội dung.

## ✨ Tính năng theo phân hệ

| Phân hệ | Chức năng | Use case |
|---|---|---|
| **Khách hàng** | Xem tour, tìm kiếm/lọc, đặt chỗ & giữ chỗ 24h, thanh toán cọc, lịch sử đơn, vé điện tử, đánh giá chuyến đi, yêu cầu tour riêng, yêu cầu gọi lại | UC-01, UC-05, UC-08 |
| **Tư vấn viên** | Dashboard cá nhân, bàn đặt tour tại quầy, Kanban Lead, tour thiết kế riêng, đơn phụ trách, chăm sóc trước/sau tour, trợ lý AI | UC-04, UC-05, UC-10, UC-11 |
| **Kế toán** | Xác nhận cọc (≥30%), thu/chi, xử lý hủy theo mốc phạt, công nợ nhà cung cấp, bảng lương, quyết toán tour, báo cáo tài chính | UC-06, UC-09 |
| **Admin** | Quản trị tour/điểm đến/lịch khởi hành, phân công HDV (chống trùng lịch), CRM & kiểm duyệt đánh giá, voucher, cẩm nang, tài khoản & phân quyền, dashboard/KPI | UC-02, UC-03, UC-07, UC-12, UC-13 |

### Bốn năng lực AI

| Mã | Năng lực | Endpoint |
|---|---|---|
| UC-10 | Tư vấn tour theo nhu cầu tự nhiên | `POST /ai/advise` |
| UC-11 | Sinh mô tả & lịch trình từng ngày | `POST /ai/generate-content` · `/ai/generate-tour-draft` |
| UC-12 | Phân tích cảm xúc phản hồi (ưu/nhược điểm) | `POST /ai/analyze-feedback` |
| UC-13 | Đề xuất Top 3 HDV phù hợp kèm điểm tương đồng | `POST /ai/suggest-guides` |

## 🧭 Bốn cổng hệ thống

1. **Web khách hàng** (`/`) — Trang chủ (có Chatbot AI), Danh mục tour, Chi tiết
   tour, Tour riêng, Khuyến mãi/Voucher, Cẩm nang, Đăng nhập, Lịch sử đặt tour,
   Tài khoản.
2. **Cổng Admin** (`/admin`) — 16 trang: Tổng quan, KPI, Tour, Điểm đến, Lịch
   khởi hành, Lịch điều hành, Phân công HDV, Đơn đặt chỗ, Lead, Tour riêng,
   Hồ sơ khách, Kiểm duyệt đánh giá, Voucher, Cẩm nang, Tài khoản, Nhật ký.
3. **Cổng Tư vấn viên** (`/consultant`) — 7 trang: Dashboard, Bàn đặt tour,
   Kanban Lead, Tour riêng, Đơn phụ trách, Chăm sóc khách, Trợ lý AI.
4. **Cổng Kế toán** (`/accountant`) — 5 trang: Đơn & công nợ, Thu chi, Báo cáo
   tài chính, Bảng lương, Quyết toán tour.

Ngoài ra có **trang Báo cáo AI & dòng tiền** (`/report`, chỉ Admin).

> Nhân viên vào web công khai sẽ thấy mục **"Vào trang quản trị"** trên menu để
> quay lại cổng theo vai trò của mình.

## 🔐 Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@tour.vn` | `Admin@123` |
| Tư vấn viên | `tuvan@tour.vn` | `Tuvan@123` |
| Kế toán | `ketoan@tour.vn` | `Ketoan@123` |
| Khách hàng | `an.nguyen@gmail.com` | `An@123` |

Trang đăng nhập có nút **Quick Login** để vào nhanh từng vai trò.
Phân quyền (JWT/RBAC) gồm 4 vai trò: `Admin` / `Consultant` / `Accountant` / `Customer`.

## ⚙️ Cài đặt & chạy

### 1. Backend

```bash
cd tour-backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Tạo file `tour-backend/.env` (xem mục **Biến môi trường** bên dưới), rồi:

```bash
python seed.py                  # Nạp dữ liệu mẫu (bảng + 4 tài khoản)
python migrate.py               # Bổ sung cột cho bảng đã tồn tại (chạy 1 lần)
python demo_data.py             # Dữ liệu demo: đơn, thanh toán, phản hồi, lead, voucher
uvicorn app.main:app --reload --port 8000
```

- API docs (Swagger): `http://localhost:8000/docs`
- Health check: `GET http://localhost:8000/`

### 2. Frontend

```bash
cd tour-frontend
npm install
npm run dev
```

Mở trình duyệt: `http://localhost:5173`

> Frontend gọi API tại `http://localhost:8000/api/v1` (khai báo trong
> `src/api/http.js`). Timeout Axios đặt 120 giây vì các endpoint AI có thể mất
> tới ~60 giây. `vite.config.js` cũng cấu hình proxy `/api` → `localhost:8000`
> làm phương án dự phòng.

### 3. Kiểm thử Backend

```bash
cd tour-backend
.venv\Scripts\activate
python -m pytest -q
```

> **Lưu ý:** bộ test là **kiểm thử tích hợp** — cần kết nối CSDL thật và dữ liệu
> đã seed (test đăng nhập bằng tài khoản seed thật). Các test AI dùng
> `monkeypatch` để chặn gọi mạng nên vẫn chạy tất định, không tốn quota API.
>
> Ngoài ra có 2 script kiểm chứng thủ công (không thuộc pytest):
> `python verify_step2.py` (quy tắc DR-01..DR-05) và `python verify_step3.py`
> (tầng AI, gồm cả kịch bản Fallback).

## 🌐 Biến môi trường

File `tour-backend/.env` (đã nằm trong `.gitignore`, **không được commit**):

| Nhóm | Biến |
|---|---|
| CSDL | `DATABASE_URL` |
| JWT | `JWT_SECRET_KEY`, `JWT_EXPIRE_MINUTES` |
| AI | `AI_PROVIDER` (`gemini` \| `deepseek`), `AI_FALLBACK_ENABLED`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL` |
| Lưu trữ ảnh | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `LOCAL_UPLOAD_DIR` |
| Ngân hàng | `BANK_ID`, `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME`, `BANK_REF_PREFIX` |
| Webhook | `WEBHOOK_SECRET` |

> Nếu chưa điền khóa `R2_*`, hệ thống **tự động fallback** sang lưu ảnh cục bộ
> trong `tour-backend/uploads/` — vẫn chạy được khi phát triển.
>
> `WEBHOOK_SECRET` để trống thì endpoint webhook nhận công khai; nếu điền, mọi
> request phải kèm header `X-Webhook-Secret`.

## 🧠 Tích hợp AI

Tầng AI nằm sau **một adapter duy nhất** (`app/ai/adapter.py`), cô lập hoàn toàn
phụ thuộc vào nhà cung cấp. Chọn nhà cung cấp bằng biến `AI_PROVIDER`:

- **Gemini** — dùng structured output (`response_schema` + `response_mime_type`).
- **DeepSeek** — API tương thích OpenAI (`response_format: json_object`).

**Cơ chế Fallback (`app/ai/fallback.py`):**

- Thử lại tối đa **3 lần** nếu AI trả JSON sai schema (`ValidationError`), nhưng
  **dừng ngay** nếu lỗi kết nối (`AIUnavailableError`) — không thử lại lỗi mạng.
- Nếu `AI_FALLBACK_ENABLED=true`, hệ thống chuyển sang hàm fallback thuần Python:
  - UC-10 → gợi ý 3 tour theo giá
  - UC-11 → tái sử dụng mô tả cũ + sinh lịch trình mẫu
  - UC-12 → phân loại cảm xúc theo điểm sao trung bình
  - UC-13 → chấm điểm heuristic (chuyên môn + số năm kinh nghiệm)
- Kết quả trả về luôn kèm trường `nguon` (`"Gemini"` / `"DeepSeek"` / `"Fallback"`)
  để giao diện hiển thị cảnh báo. Mọi lần fallback đều được ghi log với
  `TrangThai='Fallback'`.

> **Bảo mật:** khóa API chỉ tồn tại ở backend. Frontend không bao giờ nhận khóa
> mà chỉ gọi các endpoint `/api/v1/ai/...` có xác thực JWT — kể cả khi mở
> DevTools cũng không lấy được khóa.

## 🗄️ Cơ sở dữ liệu (23 bảng)

| Nhóm | Bảng |
|---|---|
| **Người dùng & khách hàng** | `NguoiDung`, `KhachHang` |
| **Danh mục tour** | `DiemDen`, `Tour`, `LichKhoiHanh` |
| **Hướng dẫn viên** | `HuongDanVien`, `PhanCongHDV` |
| **Đặt chỗ & thanh toán** | `DatCho`, `ChiTietDatCho`, `ThanhToan`, `HuyTour` |
| **Tương tác khách hàng** | `PhanHoi`, `MaGiamGia`, `CamNang` |
| **CRM** | `YeuCauTuVan` (Lead), `YeuCauTourRieng` (Tour riêng) |
| **Tài chính – kế toán** | `BangLuong`, `CongNoNhaCungCap`, `PhiChi`, `QuyetToanTour` |
| **Log AI** | `AI_TuVanTour`, `AI_PhanTichPhanHoi`, `AI_DeXuatHuongDanVien` |

**Ràng buộc quan trọng khai báo ngay ở tầng CSDL:**

- `PhanCongHDV` — `UNIQUE(MaLich, MaHDV)` (thực thi DR-05)
- `PhanHoi` — `CHECK SoSao BETWEEN 1 AND 5`
- `HuyTour` — `CHECK MucPhat IN (0.0, 0.5, 1.0)`
- `AI_DeXuatHuongDanVien` — `CHECK XepHang BETWEEN 1 AND 3`
- `MaGiamGia.MaCode`, `QuyetToanTour.MaLich`, `NguoiDung.Email`, `DiemDen.TenDiemDen` — duy nhất

> `migrate.py` cần thiết vì `create_all` chỉ tạo bảng mới mà **không thêm cột**
> vào bảng đã tồn tại. Script chạy 28 câu `ALTER TABLE ... ADD COLUMN IF NOT
> EXISTS` (idempotent, chạy lại nhiều lần vẫn an toàn).

## ✅ Quy tắc nghiệp vụ (DR)

| Mã | Quy tắc | Thực thi tại |
|---|---|---|
| **DR-01** | Không đặt quá số chỗ còn lại; cảnh báo khi đoàn chưa đạt `MinSeats` | `services/booking_service.py` |
| **DR-02** | Giữ chỗ tự động hết hạn sau **24 giờ**, chỗ được trả lại | `booking_service` + `POST /bookings/scan-expired` |
| **DR-03** | Tiền cọc tối thiểu **30%** tổng giá trị đơn | `services/payment_service.py` |
| **DR-04** | Phạt hủy theo mốc: **≥7 ngày** hoàn 100% · **3–6 ngày** hoàn 50% · **<3 ngày** không hoàn | `payment_service.process_cancellation` |
| **DR-05** | HDV không được phân công trùng khoảng thời gian | `services/guide_service.py` + `UNIQUE(MaLich, MaHDV)` |

## 🔌 API

Toàn bộ endpoint nằm dưới tiền tố `/api/v1` — tổng cộng **85 endpoint** thuộc
**19 router**:

| Router | Tiền tố | Router | Tiền tố |
|---|---|---|---|
| Xác thực | `/auth` | Báo cáo | `/reports` |
| Tour & điểm đến | `/tours` | Lead | `/leads` |
| Đặt chỗ | `/bookings` | Tour riêng | `/custom-tour-requests` |
| Thanh toán | `/payments` | Voucher | `/vouchers` |
| Hướng dẫn viên | `/guides` | Đánh giá | `/reviews` |
| AI | `/ai` | Dashboard/KPI | `/dashboard` |
| Khách hàng | `/customers` | Quản trị | `/admin` |
| Cẩm nang | `/cam-nang` | Bảng lương | `/payroll` |
| Quyết toán | `/settlements` | Công nợ NCC | `/payables` |
| Tải ảnh | `/upload` | | |

Mọi endpoint đều được bảo vệ bằng `require_roles([...])` (trả 403 nếu sai vai trò;
401 nếu chưa đăng nhập).

## 📌 Ghi chú trung thực về phạm vi

- **Voucher** hiện chỉ **quản lý và hiển thị** trên web khách — *chưa* được áp
  vào tính tiền đơn hàng (cần đổi schema `DatCho`, nằm ngoài phạm vi đồ án).
- **Hủy đơn trực tuyến** phía khách hàng chỉ hiển thị **ước tính hoàn tiền**
  theo DR-04; thao tác hủy chính thức do Kế toán xử lý.
- **Nhật ký hoạt động** (`/admin/audit`) là bản rút gọn, tổng hợp từ dữ liệu đặt
  chỗ gần đây — chưa phải bảng audit log đầy đủ.
- **Trang `/report`** chỉ Admin truy cập được (không dành cho Kế toán).
- Bộ test yêu cầu CSDL thật, **không chạy độc lập** trong môi trường CI sạch.

## 📄 Giấy phép

Dự án phục vụ mục đích học tập — đồ án học phần *Ứng dụng trí tuệ nhân tạo*, ICTU.
