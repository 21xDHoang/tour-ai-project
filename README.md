# 🏝️ Hệ thống Quản lý Tour Du lịch Tích hợp AI

Đồ án học phần **"Ứng dụng trí tuệ nhân tạo"** — Trường ĐH Công nghệ Thông tin và
Truyền thông Thái Nguyên (ICTU).

Hệ thống quản lý tour du lịch theo mô hình **4 tầng**:

> **React SPA (Frontend)** → **FastAPI (Router–Service–Repository)** → **PostgreSQL (Supabase)** → **Gemini AI**

---

## 📋 Tổng quan kiến trúc

```
tour_ai_project/
├── tour-backend/            # API Backend FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── ai/              # AI Services (UC-10..UC-13) + Fallback
│   │   ├── models/          # 18 bảng CSDL
│   │   ├── routers/         # API Routers + JWT/RBAC
│   │   ├── schemas/         # DTO (Pydantic v2)
│   │   ├── services/        # Business Logic
│   │   ├── utils/auth.py    # JWT HS256 + require_roles
│   │   ├── main.py          # FastAPI app + CORS
│   │   └── database.py      # Kết nối Supabase PostgreSQL
│   ├── migrate.py           # ALTER bảng có sẵn (PhanHoi) — chạy 1 lần
│   ├── seed.py              # Seed dữ liệu mẫu (4 tài khoản, 18 bảng)
│   ├── demo_data.py         # Dữ liệu demo BƯỚC 5 + module mới (Lead/Voucher...)
│   ├── tests/               # pytest — 24 test case
│   └── requirements.txt
├── tour-frontend/           # React SPA (Vite + Tailwind + Ant Design v5)
│   └── src/
│       ├── api/http.js      # Axios + JWT + các module API
│       ├── context/         # AuthContext (user/login/logout)
│       ├── components/      # Navbar, StaffLayout (Sider nhân viên), ChatBox...
│       └── pages/           # admin/ · consultant/ · customer/ · report/ + web khách
└── README.md
```

## ✨ Tính năng chính

| Phân hệ | Chức năng | Use case |
|---|---|---|
| Khách hàng | Xem tour, đặt tour/giữ chỗ 24h, lịch sử đơn, vé điện tử, đánh giá chuyến đi | UC-01..03 |
| AI Tư vấn | Chatbot gợi ý tour theo yêu cầu tự nhiên | UC-10 |
| AI Nội dung | Sinh mô tả & lịch trình chi tiết cho tour | UC-11 |
| Tư vấn viên | Kanban Lead, bàn đặt tour, tour riêng, đơn phụ trách, chăm sóc khách | UC-10, UC-11 |
| Kế toán | Xác nhận cọc ≥30%, thanh toán, xử lý hủy theo mốc phạt | UC-04..06 |
| Điều hành (Admin) | Lịch khởi hành, phân công HDV (chống trùng) | UC-07..09 |
| AI Đề xuất HDV | Top 3 HDV phù hợp nhất cho lịch | UC-13 |
| AI Phân tích phản hồi | Cảm xúc + ưu/nhược điểm từ feedback | UC-12 |
| Báo cáo | Doanh thu & dòng tiền theo tháng | Báo cáo |
| CRM (Admin) | Lead, tour riêng, hồ sơ khách, kiểm duyệt đánh giá | Module mới |
| Tiếp thị (Admin) | Mã giảm giá / Voucher (hiển thị trên web khách) | Module mới |
| Nhân sự (Admin) | Cấp phát tài khoản, khóa/mở, đổi vai trò | Module mới |
| Dashboard/KPI | Tổng quan doanh thu + KPI nhân viên | Module mới |

## 🧭 4 cổng hệ thống & menu

Hệ thống được tổ chức theo đặc tả gồm 4 cổng:

1. **Cổng Admin toàn quyền** (`/admin`) — menu Sider nhóm theo đặc tả:
   Bảng điều khiển & Báo cáo (Tổng quan, KPI, Báo cáo AI) · Quản trị danh mục
   (Tour, Điểm đến, Lịch khởi hành) · Điều hành & vận hành (Phân công HDV) ·
   Đặt tour & khách hàng CRM (Đơn đặt chỗ, Lead, Tour riêng, Hồ sơ khách,
   Kiểm duyệt đánh giá) · Tiếp thị & nội dung (Mã giảm giá) · Nhân sự &
   phân quyền (Tài khoản) · Cài đặt (Nhật ký hoạt động).
2. **Cổng Kế toán** (`/accountant`) — Quản lý cọc & công nợ, Xử lý hủy tour,
   Báo cáo tài chính.
3. **Cổng Tư vấn viên** (`/consultant`) — Dashboard cá nhân, Bàn đặt tour,
   Kanban Lead, Tour thiết kế riêng, Đơn phụ trách, Chăm sóc trước/sau tour,
   Trợ lý AI.
4. **Web khách hàng** (`/`) — Trang chủ, Danh mục tour, Tour riêng (form 3 bước),
   Khuyến mãi/Voucher, Cẩm nang, Liên hệ (yêu cầu gọi lại), Cổng tài khoản
   (Lịch sử đặt tour + Vé điện tử + Đánh giá, Tài khoản).

> Nhân viên vào web công khai sẽ thấy mục **"Vào trang quản trị"** trên menu trên
> để quay lại cổng của vai trò mình.

## 🔐 Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@tour.vn` | `Admin@123` |
| Tư vấn viên | `tuvan@tour.vn` | `Tuvan@123` |
| Kế toán | `ketoan@tour.vn` | `Ketoan@123` |
| Khách hàng | `an.nguyen@gmail.com` | `An@123` |

Trang đăng nhập có nút **Quick Login** để vào nhanh bằng từng tài khoản.
Phân quyền (JWT/RBAC): Admin / Consultant / Accountant / Customer.

## ⚙️ Cài đặt & chạy

### 1. Backend

```bash
cd tour-backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Cấu hình chuỗi kết nối Supabase trong .env (DATABASE_URL)
python seed.py                  # Nạp dữ liệu mẫu (18 bảng + 4 tài khoản)
python migrate.py               # (1 lần) Thêm cột TrangThai/AnHien vào PhanHoi
python demo_data.py             # Dữ liệu demo: đơn, thanh toán, phản hồi,
                                # + Lead/Tour riêng/Voucher (module mới)
uvicorn app.main:app --reload --port 8000
```

API docs (Swagger): `http://localhost:8000/docs`

### 2. Frontend

```bash
cd tour-frontend
npm install
npm run dev
```

Mở trình duyệt: `http://localhost:5173`

> Frontend gọi API qua proxy `http://localhost:8000/api/v1` (đã cấu hình trong
> `vite.config.js` và `src/api/http.js`). Khi build production, tạo file `.env`
> với `VITE_API_BASE_URL` nếu cần đổi địa chỉ backend.

### 3. Kiểm thử Backend

```bash
cd tour-backend
.venv\Scripts\activate
python -m pytest -q              # 24 test case (24 PASSED)
```

## 🧠 Tích hợp AI (Gemini)

- Mỗi AI Service có **Fallback** tự động khi Gemini không khả dụng — kết quả
  trả về kèm trường `nguon: "Gemini" | "Fallback"`, giao diện hiển thị cảnh báo.
- Endpoint: `/ai/advise`, `/ai/generate-content`, `/ai/analyze-feedback`,
  `/ai/suggest-guides`.

## 🗄️ CSDL (18 bảng)

`NguoiDung`, `KhachHang`, `Tour`, `DiemDen`, `LichKhoiHanh`, `HuongDanVien`,
`PhanCong`, `DatCho`, `KhachHangDatCho`, `ThanhToan`, `PhanHoi`,
`AI_TuVanLog`, `AI_NoiDungLog`, `AI_PhanTichPhanHoi`, `AI_DeXuatHDVLog`,
`YeuCauTuVan` (Lead), `YeuCauTourRieng` (Tour riêng), `MaGiamGia` (Voucher).

> `PhanHoi` được nâng thêm `TrangThai` (ChoDuyet/DaDuyet/TuChoi) và `AnHien`
> phục vụ kiểm duyệt đánh giá — cột này do `migrate.py` thêm vào (create_all
> không thêm cột vào bảng đã tồn tại).

## ✅ Các quy tắc nghiệp vụ (DR)

- **DR-01**: Không đặt quá số chỗ còn lại của lịch.
- **DR-02**: Giữ chỗ tự động hết hạn sau 24h (`scan-expired`).
- **DR-03**: Tiền cọc tối thiểu 30% tổng giá trị đơn.
- **DR-04**: Phạt hủy theo mốc: ≥7 ngày hoàn 100% cọc · 3–6 ngày hoàn 50% ·
  <3 ngày không hoàn.
- **DR-05**: HDV không được phân công trùng khoảng thời gian.

## 🆕 Module mới (phạm vi mở rộng theo đặc tả)

| Module | Bảng | Endpoint chính | Ghi chú |
|---|---|---|---|
| Lead / Yêu cầu tư vấn | `YeuCauTuVan` | `POST /leads` (public), `GET /leads` (Admin), `GET /leads/my`, `PATCH /leads/{id}` | Phễu Moi→Đang liên hệ→Đã báo giá→Đang chốt→Thất bại |
| Tour thiết kế riêng | `YeuCauTourRieng` | `POST /custom-tour-requests` (public), `GET`, `PATCH` | Form web 3 bước; trạng thái Moi/DangBaoGia/DaChot/TuChoi |
| Mã giảm giá / Voucher | `MaGiamGia` | `GET /vouchers/active` (public), `GET/POST/PATCH /vouchers` (Admin) | Chỉ quản lý + hiển thị; chưa áp vào tính tiền đơn |
| Kiểm duyệt đánh giá | `PhanHoi` (+2 cột) | `POST /reviews` (Customer), `GET/PATCH /reviews` (Admin) | Khách tạo → Chờ duyệt → Admin duyệt/ẩn mới hiển thị |
| Dashboard & KPI | — | `GET /dashboard/summary`, `/kpi/consultants`, `/kpi/my` | Tính từ dữ liệu có sẵn (không cần bảng mới) |
| Hồ sơ khách & tài khoản | — | `GET /admin/customers`, `/admin/users`, `PATCH /admin/users/{id}` | Tổng chi tiêu/số đơn; khóa/mở, đổi vai trò |

> **Ghi chú trung thực:** Voucher hiện chỉ **quản lý + hiển thị** trên web khách
> (chưa áp vào tính tiền đơn — cần đổi schema `DatCho`, nằm ngoài phạm vi).
> Hủy đơn trực tuyến chỉ hiển thị **ước tính hoàn tiền** theo DR-04; thao tác hủy
> chính thức vẫn do Kế toán xử lý đúng quy trình.
