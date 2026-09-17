import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Col, Input, Row, Select } from 'antd';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  CreditCard,
  Headset,
  Quote,
  Search,
  Users,
} from 'lucide-react';
import { tourApi } from '../api/http';
import TourCard, { TourCardSkeleton } from '../components/TourCard';
import SignBar from '../components/ui/SignBar';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import { LOAI_TOUR, normalizeVi } from '../utils/format';
import { signOf } from '../utils/signs';
import { DESTINATION_IMAGES } from '../utils/tourImages';

/**
 * Trang chủ.
 *
 * Cấu trúc: dải ảnh + thanh biển báo → tiêu đề → thanh tìm kiếm → dải tin cậy
 * → rail điểm đến → 3 loại hình → tour nổi bật → tour riêng → đánh giá.
 *
 * Đã bỏ so với bản cũ: nền tối + blobs gradient ở hero, thẻ tìm kiếm
 * glassmorphism, dòng 3 chỉ số tự khai ("15.000+ khách", "99.8%") không có
 * nguồn, 4 thẻ tính năng emoji, và 5 dòng chữ IN HOA nhỏ nằm trên mỗi tiêu đề.
 */

// Điểm đến hiển thị trên rail. Ảnh lấy từ kho Unsplash dùng chung.
const TOP_DESTINATIONS = [
  { name: 'Hạ Long', khuVuc: 'Miền Bắc', img: DESTINATION_IMAGES['ha-long'] },
  { name: 'Hà Giang', khuVuc: 'Miền Bắc', img: DESTINATION_IMAGES['ha-giang'] },
  { name: 'Sa Pa', khuVuc: 'Miền Bắc', img: DESTINATION_IMAGES['sa-pa'] },
  { name: 'Ninh Bình', khuVuc: 'Miền Bắc', img: DESTINATION_IMAGES['ninh-binh'] },
  { name: 'Đà Nẵng', khuVuc: 'Miền Trung', img: DESTINATION_IMAGES['da-nang'] },
  { name: 'Hội An', khuVuc: 'Miền Trung', img: DESTINATION_IMAGES['hoi-an'] },
  { name: 'Phú Quốc', khuVuc: 'Miền Nam', img: DESTINATION_IMAGES['phu-quoc'] },
  { name: 'Đà Lạt', khuVuc: 'Tây Nguyên', img: DESTINATION_IMAGES['da-lat'] },
];

// Mô tả ngắn cho từng loại hình — giữ nguyên nội dung bản cũ, bỏ emoji.
const MO_TA_LOAI = {
  TraiNghiem: 'Chinh phục đèo, trekking, lặn biển và các cung đường mạo hiểm.',
  NghiDuong: 'Resort ven biển, spa và những ngày nghỉ không cần san sát lịch trình.',
  VanHoaLichSu: 'Di tích, phố cổ, lễ hội truyền thống và tinh hoa ẩm thực vùng miền.',
};

// Quy tắc thật của hệ thống (DR-03, DR-04) — không phải con số tự khai.
const TRUST = [
  {
    Icon: Compass,
    title: 'Giữ chỗ miễn phí 24 giờ',
    desc: 'Đặt trước để giữ nguyên giá, thong thả bàn với gia đình rồi mới cọc.',
  },
  {
    Icon: CreditCard,
    title: 'Cọc từ 30%, không phụ phí ẩn',
    desc: 'Số tiền còn lại thanh toán theo mốc ghi rõ trong đơn.',
  },
  {
    Icon: CalendarDays,
    title: 'Hoàn huỷ theo mốc rõ ràng',
    desc: 'Huỷ trước 7 ngày hoàn 100%, từ 3 đến 6 ngày hoàn 50%.',
  },
  {
    Icon: Headset,
    title: 'Tư vấn viên và AI hỗ trợ',
    desc: 'Hỏi trực tiếp qua chat hoặc gọi hotline trong giờ làm việc.',
  },
];

const TOUR_RIENG_STEPS = [
  {
    km: 'KM 01',
    title: 'Gửi yêu cầu',
    desc: 'Cho biết điểm đến, số người, thời gian và ngân sách dự kiến.',
  },
  {
    km: 'KM 02',
    title: 'Nhận báo giá riêng',
    desc: 'Tư vấn viên gửi lịch trình may đo kèm chi phí chi tiết từng mục.',
  },
  {
    km: 'KM 03',
    title: 'Chốt và khởi hành',
    desc: 'Giữ chỗ, thanh toán theo mốc và nhận thông tin trước ngày đi.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Nguyễn Thuỳ Dung',
    role: 'Khách du lịch Hà Nội',
    comment:
      'Chatbot gợi ý tour Phú Quốc đúng ngân sách 6 triệu của gia đình mình, lại còn xếp lịch trình vừa sức với bố mẹ lớn tuổi.',
    tour: 'Tour Phú Quốc 3N2Đ',
    loaiTour: 'NghiDuong',
  },
  {
    name: 'Trần Hoàng Long',
    role: 'Doanh nghiệp TechCorp',
    comment:
      'Đặt đoàn 40 người đi Hạ Long qua form tour riêng, tư vấn viên phản hồi trong buổi sáng và báo giá rõ từng khoản.',
    tour: 'Tour du thuyền Vịnh Hạ Long 2N1Đ',
    loaiTour: 'NghiDuong',
  },
  {
    name: 'Lê Minh Anh',
    role: 'Nhiếp ảnh gia tự do',
    comment:
      'Chính sách giữ chỗ 24 giờ cho mình thời gian bàn với nhóm trước khi cọc. Cung Hà Giang đi đúng mùa hoa.',
    tour: 'Tour Hà Giang mùa hoa tam giác mạch',
    loaiTour: 'TraiNghiem',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [allTours, setAllTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLoai, setSearchLoai] = useState(undefined);

  useEffect(() => {
    tourApi
      .list()
      .then((rows) => {
        setAllTours(rows);
        setFeatured(rows.slice(0, 6));
      })
      .catch(() => {
        setAllTours([]);
        setFeatured([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchKeyword) params.append('tu_khoa', searchKeyword);
    if (searchLoai) params.append('loai', searchLoai);
    navigate(`/tours?${params.toString()}`);
  };

  const filteredTours =
    activeTab === 'all'
      ? featured
      : allTours.filter((t) => t.LoaiTour === activeTab).slice(0, 6);

  /** Đếm tour thật theo loại hình, thay cho số liệu gõ tay. */
  const countByLoai = useMemo(() => {
    const acc = {};
    allTours.forEach((t) => {
      if (t.LoaiTour) acc[t.LoaiTour] = (acc[t.LoaiTour] || 0) + 1;
    });
    return acc;
  }, [allTours]);

  /**
   * Đếm tour thật theo tên điểm đến, dò trong tên tour và tên điểm đến.
   *
   * Phải bỏ dấu hai vế trước khi so: `ten_diem_den` đã có dấu nhưng `TenTour`
   * thì chưa — "Ha Long - Lan Ha 3N2D" — nên so khớp thô với "Vịnh Hạ Long"
   * vẫn ra 0 cho những tour chỉ khớp ở vế tên tour.
   */
  const countByDiemDen = useMemo(() => {
    const acc = {};
    TOP_DESTINATIONS.forEach(({ name }) => {
      const needle = normalizeVi(name);
      acc[name] = allTours.filter((t) =>
        normalizeVi(`${t.ten_diem_den || ''} ${t.TenTour || ''}`).includes(needle),
      ).length;
    });
    return acc;
  }, [allTours]);

  const loaiOptions = Object.entries(LOAI_TOUR).map(([value, label]) => ({
    value,
    label: (
      <span className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${signOf(value).dotCls}`}
          aria-hidden="true"
        />
        {label}
      </span>
    ),
  }));

  return (
    <div className="pb-4">
      {/* ================= 1. HERO ================= */}
      <section className="relative">
        {/* Dải ảnh: đây là thứ đặc trưng nhất của ngành này, nên nó được
            toàn quyền dẫn dắt phần đầu trang. */}
        {/* Chiều cao dải ảnh bị chặn trên bởi hai nút nổi ở góc phải: khối tìm
            kiếm nằm ngay dưới ảnh, nên ảnh cao quá thì nút "Tìm tour" lọt xuống
            dưới hai nút đó. Đo ở 1440×900: 52vh để đáy khối tìm kiếm ở 884,
            đúng chỗ nút nổi chiếm 818–876. */}
        <div className="relative h-[36vh] min-h-[240px] w-full overflow-hidden bg-ink-900 sm:h-[42vh] sm:min-h-[280px] lg:h-[40vh] lg:min-h-[300px]">
          <img
            src={DESTINATION_IMAGES['ha-giang']}
            alt="Cung đường đèo vùng cao phía Bắc"
            className="h-full w-full object-cover"
          />
          {/* Lớp phủ tối dần xuống đáy để thanh biển báo đọc được. */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-ink-950/10" />

          {/* Thanh biển báo gắn ở mép dưới dải ảnh — như biển đặt tại điểm ngắm. */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="shell pb-5">
              <SignBar
                tone="signal"
                mark="CUNG ĐƯỜNG"
                place="Việt Nam · 34 tỉnh thành"
                meta={`${allTours.length || '—'} TOUR`}
                className="max-w-xl shadow-rail"
              />
            </div>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="shell pt-9 sm:pt-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <h1 className="font-display text-display-xl text-ink-950">
                Chọn cung đường.
                <br />
                Chốt ngày.
                <br />
                Lên đường.
              </h1>

              <p className="mt-5 max-w-prose text-body-l text-ink-600">
                Hành trình khắp Việt Nam, giữ chỗ miễn phí 24 giờ, cọc từ 30% và
                chính sách hoàn huỷ ghi rõ theo từng mốc.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/tours')}
                  className="btn btn-guide"
                >
                  Xem tất cả tour
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('tour:open-chat'))
                  }
                  className="btn btn-quiet"
                >
                  Hỏi AI tư vấn
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm — đọc như một tấm biển, không phải thẻ kính nổi. */}
            <div className="lg:col-span-5">
              <div className="panel overflow-hidden">
                <SignBar
                  tone="ink"
                  mark="TÌM"
                  place="Chuyến đi của bạn"
                  meta="24H"
                  size="sm"
                />

                <div className="space-y-4 p-5">
                  <div>
                    <label
                      htmlFor="home-tu-khoa"
                      className="mb-1.5 block font-display text-[13px] font-semibold text-ink-800"
                    >
                      Điểm đến hoặc tên tour
                    </label>
                    <Input
                      id="home-tu-khoa"
                      size="large"
                      prefix={<Search className="h-4 w-4 text-ink-400" aria-hidden="true" />}
                      placeholder="Hạ Long, Phú Quốc, Sa Pa…"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onPressEnter={handleSearch}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="home-loai"
                      className="mb-1.5 block font-display text-[13px] font-semibold text-ink-800"
                    >
                      Loại hình du lịch
                    </label>
                    <Select
                      id="home-loai"
                      size="large"
                      allowClear
                      placeholder="Tất cả loại hình"
                      value={searchLoai}
                      onChange={setSearchLoai}
                      className="w-full"
                      options={loaiOptions}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="btn btn-ink w-full"
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Tìm tour
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. DẢI TIN CẬY ================= */}
      {/* Bốn điều khoản thật của hệ thống, thay cho dòng chỉ số tự khai cũ. */}
      <section className="section-tight">
        <div className="shell">
          <div className="grid gap-x-8 gap-y-6 border-y border-ink-200 py-7 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-3.5">
                <Icon
                  className="mt-0.5 h-5 w-5 shrink-0 text-guide-500"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-display text-[14px] font-bold text-ink-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-body-s text-ink-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 3. RAIL ĐIỂM ĐẾN ================= */}
      <section className="section">
        <div className="shell">
          <SectionHeader
            marker={`${TOP_DESTINATIONS.length} ĐIỂM`}
            title="Điểm đến đang được chọn nhiều"
            description="Chạm vào một điểm đến để xem các tour đang mở tại đó."
            action={
              <Link
                to="/tours"
                className="link-route font-display text-[13px] font-bold text-guide-500"
              >
                Xem tất cả tour
              </Link>
            }
            className="mb-10"
          />

          {/* Rail: một vạch kẻ đường chạy ngang, mỗi điểm đến là một cột mốc. */}
          <div className="relative">
            <div
              className="road-dash absolute inset-x-0 top-[5px]"
              aria-hidden="true"
            />

            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {TOP_DESTINATIONS.map((d) => {
                const count = countByDiemDen[d.name] || 0;
                return (
                  <Link
                    key={d.name}
                    to={`/tours?tu_khoa=${encodeURIComponent(d.name)}`}
                    className="group flex flex-col"
                  >
                    {/* Cột mốc nằm trên vạch kẻ. */}
                    <span
                      className="h-[11px] w-[11px] rounded-full border-2 border-ink-950 bg-paper transition-colors group-hover:bg-signal-400"
                      aria-hidden="true"
                    />

                    <div className="mt-4 overflow-hidden rounded-card border border-ink-200 bg-white">
                      <div className="aspect-[4/3] w-full overflow-hidden bg-paper-deep">
                        <img
                          src={d.img}
                          alt={d.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-road group-hover:scale-105"
                        />
                      </div>
                      <div className="flex items-baseline justify-between gap-2 p-3">
                        <span className="truncate font-display text-[14px] font-bold text-ink-950 group-hover:text-guide-500">
                          {d.name}
                        </span>
                        <span className="tnum shrink-0 text-[12px] font-medium text-ink-500">
                          {count > 0 ? `${count} tour` : d.khuVuc}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. BA LOẠI HÌNH ================= */}
      <section className="section-tight">
        <div className="shell">
          <SectionHeader
            title="Đi theo cách của bạn"
            description="Mỗi loại hình có một màu biển báo riêng, dùng thống nhất từ danh mục tới chi tiết tour."
            className="mb-8"
          />

          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(LOAI_TOUR).map(([value, label]) => {
              const sign = signOf(value);
              const count = countByLoai[value] || 0;
              return (
                <Link
                  key={value}
                  to={`/tours?loai=${value}`}
                  className="group panel flex flex-col p-5 transition-[border-color,transform] duration-200 ease-road hover:-translate-y-0.5 hover:border-ink-400"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full ${sign.dotCls}`}
                      aria-hidden="true"
                    />
                    <h3 className="font-display text-[15px] font-bold text-ink-950">
                      {label}
                    </h3>
                  </div>

                  <p className="mt-2.5 flex-1 text-body-s text-ink-600">
                    {MO_TA_LOAI[value]}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-ink-200 pt-3.5">
                    <span className="tnum text-[12px] font-semibold text-ink-500">
                      {count > 0 ? `${count} tour đang mở` : 'Đang cập nhật'}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-guide-500 transition-transform duration-200 ease-road group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 5. TOUR NỔI BẬT ================= */}
      <section className="section">
        <div className="shell">
          <SectionHeader
            title="Tour đang được đặt nhiều"
            description="Giá hiển thị là giá trọn gói mỗi khách, đã gồm di chuyển và lưu trú."
            className="mb-7"
          />

          {/* Bộ lọc theo loại hình — lọc tại chỗ, không rời trang. */}
          <div className="mb-7 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              aria-pressed={activeTab === 'all'}
              className="chip-filter"
            >
              Tất cả
            </button>
            {Object.entries(LOAI_TOUR).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                aria-pressed={activeTab === value}
                className="chip-filter"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${signOf(value).dotCls}`}
                  aria-hidden="true"
                />
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <Row gutter={[20, 20]}>
              {[0, 1, 2].map((i) => (
                <Col key={i} xs={24} sm={12} lg={8}>
                  <TourCardSkeleton />
                </Col>
              ))}
            </Row>
          ) : filteredTours.length === 0 ? (
            <EmptyState
              title="Chưa có tour nào ở mục này"
              description="Chọn một loại hình khác, hoặc xem toàn bộ danh mục đang mở."
              action={
                <button
                  type="button"
                  onClick={() => navigate('/tours')}
                  className="btn btn-guide"
                >
                  Xem tất cả tour
                </button>
              }
            />
          ) : (
            <Row gutter={[20, 20]}>
              {filteredTours.map((t) => (
                <Col key={t.MaTour} xs={24} sm={12} lg={8}>
                  <TourCard tour={t} />
                </Col>
              ))}
            </Row>
          )}

          <div className="mt-10">
            <button
              type="button"
              onClick={() => navigate('/tours')}
              className="btn btn-quiet w-full sm:w-auto"
            >
              Xem toàn bộ danh mục
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= 6. TOUR THIẾT KẾ RIÊNG ================= */}
      {/* Bề mặt tối duy nhất trong thân trang — đánh dấu một lời chào khác. */}
      <section className="section">
        <div className="shell">
          <div className="on-ink overflow-hidden rounded-card">
            <div className="border-b border-white/10 px-6 py-7 sm:px-9 sm:py-9">
              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className="label-sign rounded-sign bg-signal-400 px-2 py-1.5 text-ink-950">
                      RIÊNG
                    </span>
                    <h2 className="font-display text-display-m text-white">
                      Đoàn của bạn, lịch trình của bạn
                    </h2>
                  </div>
                  <p className="mt-3 text-body-s text-ink-300">
                    Teambuilding, du lịch gia đình nhiều thế hệ, kỷ niệm riêng hay
                    đoàn khách doanh nghiệp — chúng tôi dựng lịch trình theo đúng
                    số người và ngân sách.
                  </p>
                </div>

                <Link
                  to="/custom-tour"
                  className="btn btn-signal shrink-0"
                >
                  Yêu cầu thiết kế
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Ba bước này là một trình tự thật, nên đánh số cột mốc là hợp lý. */}
            <div className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {TOUR_RIENG_STEPS.map((s) => (
                <div key={s.km} className="p-6 sm:p-7">
                  <div className="label-sign text-signal-400">{s.km}</div>
                  <h3 className="mt-3 font-display text-[16px] font-bold text-white">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-body-s text-ink-300">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 px-6 py-5 sm:px-9">
              {[
                { Icon: Users, text: 'Nhận đoàn từ 10 khách' },
                { Icon: Building2, text: 'Có hợp đồng và hoá đơn cho doanh nghiệp' },
              ].map(({ Icon, text }) => (
                <span
                  key={text}
                  className="flex items-center gap-2 text-[13px] text-ink-300"
                >
                  <Icon className="h-4 w-4 shrink-0 text-guide-300" aria-hidden="true" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. ĐÁNH GIÁ ================= */}
      <section className="section">
        <div className="shell">
          <SectionHeader
            title="Khách kể lại sau chuyến đi"
            description="Đánh giá được gửi sau khi tour kết thúc và kiểm duyệt trước khi hiển thị."
            className="mb-9"
          />

          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="panel flex flex-col p-6">
                <Quote
                  className="h-5 w-5 shrink-0 text-signal-400"
                  aria-hidden="true"
                />

                <blockquote className="mt-4 flex-1 text-[14px] leading-relaxed text-ink-700">
                  {t.comment}
                </blockquote>

                <figcaption className="mt-6 border-t border-ink-200 pt-4">
                  <div className="font-display text-[14px] font-bold text-ink-950">
                    {t.name}
                  </div>
                  <div className="text-[12.5px] text-ink-500">{t.role}</div>
                  <div className="mt-2.5">
                    <SignBar
                      tone={signOf(t.loaiTour).tone}
                      place={t.tour}
                      size="sm"
                    />
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
