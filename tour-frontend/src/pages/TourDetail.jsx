import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Space,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CrownOutlined,
  CustomerServiceOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ThunderboltFilled,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Check, X } from 'lucide-react';
import dayjs from 'dayjs';
import { aiApi, leadApi, tourApi } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { fmtDate, fmtVND } from '../utils/format';
import { signOf } from '../utils/signs';
import { getTourImage } from '../utils/tourImages';
import SignBar from '../components/ui/SignBar';
import EmptyState from '../components/ui/EmptyState';

function parseItinerary(text) {
  if (!text) return [];
  return text
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatLichTrinh(list) {
  return (list || [])
    .map((d, i) => {
      const cleaned = String(d).replace(/^(ngày|ngay)\s*\d+(?:\/\d+)?\s*[:.]\s*/i, '');
      return `Ngày ${i + 1}: ${cleaned}`;
    })
    .join('; ');
}

/**
 * Bản nháp để sửa của một kết quả AI.
 *
 * Tách khỏi `aiResult` chứ không sửa thẳng vào nó: `aiResult` là thứ AI trả về,
 * còn đây là thứ người dùng đang gõ. Giữ riêng thì mới có cái để so ra "đã sửa
 * gì" mà hiện nút hoàn tác, và bấm hoàn tác cũng không cần gọi lại AI.
 */
function nhanBanAI(res) {
  return {
    moTa: res?.mo_ta_tour || '',
    ngay: [...(res?.lich_trinh_ngay || [])],
  };
}

/**
 * Số chỗ còn lại -> mức độ khan hiếm, ba mức theo đúng thang giọng của hệ thống:
 * hết chỗ là `stop`, sắp hết là `signal` (cần để mắt), còn thoải mái là `guide`.
 */
function choCon(soCho) {
  if (soCho <= 0) return { text: 'Hết chỗ', cls: 'text-stop-600' };
  if (soCho <= 5) return { text: `Sắp hết · còn ${soCho} chỗ`, cls: 'text-signal-700' };
  return { text: `Còn ${soCho} chỗ`, cls: 'text-guide-500' };
}

/** Một ô số liệu trên dải mực dưới ảnh. */
function Fact({ label, value, accent = false }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="label-sign text-ink-400">{label}</div>
      <div
        className={`tnum mt-1.5 truncate font-display text-[15px] font-extrabold ${
          accent ? 'text-signal-400' : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/** Danh sách dịch vụ kèm dấu tích / dấu gạch. */
function ServiceList({ tone, items }) {
  const included = tone === 'guide';
  const Mark = included ? Check : X;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-body-s">
          <Mark
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
              included ? 'text-guide-500' : 'text-stop-500'
            }`}
            strokeWidth={3}
            aria-hidden="true"
          />
          <span className={included ? 'text-ink-700' : 'text-ink-600'}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TourDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [banNhap, setBanNhap] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadForm] = Form.useForm();

  const [customDate, setCustomDate] = useState(null);
  const [tripType, setTripType] = useState('Ghep'); // 'Ghep' | 'Rieng'

  const handleBookCustomDate = () => {
    if (!customDate) {
      message.warning('Vui lòng chọn ngày khởi hành bạn mong muốn!');
      return;
    }
    navigate('/book', {
      state: {
        tour,
        customDate: customDate.format('YYYY-MM-DD'),
        loaiChuyenDi: tripType,
      },
    });
  };

  useEffect(() => {
    setLoading(true);
    tourApi
      .detail(id)
      .then((data) => {
        setTour(data);
      })
      .catch(() => setTour(null))
      .finally(() => setLoading(false));
  }, [id]);

  const staff = user && ['Admin', 'Consultant'].includes(user.VaiTro);

  const itinerary = useMemo(
    () => parseItinerary(tour?.LichTrinhTomTat),
    [tour],
  );

  const generateContent = async () => {
    setGenLoading(true);
    try {
      const res = await aiApi.generateContent(Number(id));
      setAiResult(res);
      setBanNhap(nhanBanAI(res));
      setModalOpen(true);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể sinh nội dung');
    } finally {
      setGenLoading(false);
    }
  };

  /** Bản nháp có khác bản AI trả về không — quyết định có hiện nút hoàn tác. */
  const daSua = Boolean(
    aiResult &&
      banNhap &&
      (banNhap.moTa !== (aiResult.mo_ta_tour || '') ||
        banNhap.ngay.length !== (aiResult.lich_trinh_ngay || []).length ||
        banNhap.ngay.some((n, i) => n !== (aiResult.lich_trinh_ngay || [])[i])),
  );

  const saveAiContent = async () => {
    if (!banNhap) return;
    setSaveLoading(true);
    try {
      // Lưu bản người dùng đã sửa, không phải bản AI trả về. Chỉ tới đây nội
      // dung mới chạm vào tour — gõ trong modal chưa làm gì CSDL cả.
      await tourApi.update(Number(id), {
        MoTa: banNhap.moTa,
        LichTrinhTomTat: formatLichTrinh(banNhap.ngay),
      });
      message.success('Đã lưu nội dung vào tour');
      setModalOpen(false);
      const data = await tourApi.detail(id);
      setTour(data);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Lưu thất bại');
    } finally {
      setSaveLoading(false);
    }
  };

  const submitLead = async () => {
    const v = await leadForm.validateFields();
    setLeadSubmitting(true);
    try {
      await leadApi.create({
        HoTen: v.HoTen,
        SoDienThoai: v.SoDienThoai,
        Email: v.Email || null,
        NoiDung: v.NoiDung || null,
        TourQuanTam: tour.TenTour,
        Nguon: 'Web',
      });
      message.success('Đã ghi nhận — tư vấn viên sẽ liên hệ với bạn trong ít phút!');
      setLeadOpen(false);
      leadForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Gửi yêu cầu thất bại');
    } finally {
      setLeadSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="shell space-y-6 py-8">
        <div className="skeleton h-4 w-64" />
        <div className="panel overflow-hidden">
          <div className="skeleton h-10 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="skeleton aspect-[16/10] lg:col-span-7" />
            <div className="space-y-4 p-6 lg:col-span-5">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-8 w-4/5" />
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-11 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="shell py-16">
        <EmptyState
          title="Không tìm thấy thông tin tour"
          description="Tour này có thể đã kết thúc hoặc không còn trên hệ thống. Xem các hành trình khác đang mở bán."
          action={
            <button
              type="button"
              onClick={() => navigate('/tours')}
              className="btn btn-guide"
            >
              Xem danh sách tour khác
            </button>
          }
        />
      </div>
    );
  }

  const giaHienTai = tour.GiaKhuyenMai ?? tour.GiaCoBan;
  const hasDiscount = tour.GiaKhuyenMai != null && tour.GiaKhuyenMai < tour.GiaCoBan;
  const discountPercent = hasDiscount
    ? Math.round(((tour.GiaCoBan - tour.GiaKhuyenMai) / tour.GiaCoBan) * 100)
    : 0;

  const soChoTotal = tour.ds_lich?.reduce((s, l) => s + (l.SoChoCon || 0), 0) || 0;
  const imageUrl = getTourImage(tour);
  const sign = signOf(tour.LoaiTour);
  const diemDen = tour.ten_diem_den || `Điểm đến #${tour.MaDiemDen}`;
  const soDem = tour.SoNgay > 1 ? ` ${tour.SoNgay - 1} đêm` : '';

  return (
    <div className="space-y-8 pb-16 pt-6">
      {/* Lối vào: đường dẫn + quay lại. */}
      <div className="shell flex items-center justify-between gap-4">
        <Breadcrumb
          items={[
            {
              title: (
                <span
                  className="cursor-pointer text-ink-500 transition-colors hover:text-guide-500"
                  onClick={() => navigate('/')}
                >
                  Trang chủ
                </span>
              ),
            },
            {
              title: (
                <span
                  className="cursor-pointer text-ink-500 transition-colors hover:text-guide-500"
                  onClick={() => navigate('/tours')}
                >
                  Danh mục tour
                </span>
              ),
            },
            { title: <span className="text-ink-950">{diemDen}</span> },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn btn-ghost !text-[13px]"
        >
          <ArrowLeftOutlined /> Quay lại
        </button>
      </div>

      {/* Bảng cung đường — tấm biển lớn của trang.
          Thanh biển báo gắn liền mép trên, dải mực số liệu gắn liền mép dưới,
          nên cả khối đọc như một tấm biển gắn trên cột chứ không phải một card. */}
      <div className="shell">
        <div className="panel overflow-hidden">
          <SignBar
            loaiTour={tour.LoaiTour}
            mark={diemDen}
            place={sign.label}
            meta={`${tour.SoNgay}N${tour.SoNgay > 1 ? ` ${tour.SoNgay - 1}Đ` : ''}`}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Ảnh — chiếm phần lớn bề ngang vì với tour thì ảnh là sản phẩm. */}
            <div className="relative aspect-[16/10] overflow-hidden bg-paper-sunk lg:col-span-7 lg:aspect-auto lg:min-h-[420px]">
              <img src={imageUrl} alt={tour.TenTour} className="h-full w-full object-cover" />
              {hasDiscount ? (
                <span className="label-sign tnum absolute right-3 top-3 rounded-sign bg-signal-400 px-2.5 py-2 text-ink-950 shadow-press-sm">
                  −{discountPercent}%
                </span>
              ) : null}
            </div>

            {/* Cột chốt đơn: giá, lý do nên đi, và hai lối hành động. */}
            <div className="flex flex-col gap-5 p-6 lg:col-span-5 sm:p-7">
              {/* Mã tour đã nằm ở dải số liệu ngay dưới ảnh — không lặp lại ở đây. */}
              <h1 className="font-display text-display-m text-ink-950">{tour.TenTour}</h1>

              {/* Bảng giá trên nền giấy lún — tách khỏi nền trắng để mắt dừng lại. */}
              <div className="rounded-card border border-ink-200 bg-paper-deep p-4">
                <div className="text-[12px] font-medium text-ink-500">
                  Giá trọn gói mỗi khách
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
                  <span className="tnum font-display text-[28px] font-extrabold leading-none text-ink-950">
                    {fmtVND(giaHienTai)}
                  </span>
                  {hasDiscount ? (
                    <span className="tnum text-[13px] text-ink-500 line-through">
                      {fmtVND(tour.GiaCoBan)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex items-start gap-1.5 border-t border-ink-200 pt-3 text-[12px] text-ink-600">
                  <CheckCircleFilled className="mt-0.5 text-guide-500" />
                  <span>
                    Đặt cọc tối thiểu 30% ({fmtVND(giaHienTai * 0.3)}) để giữ chỗ, phần
                    còn lại thanh toán trước ngày đi.
                  </span>
                </div>
              </div>

              <p className="text-body-s text-ink-600">
                {tour.MoTa ||
                  'Hành trình trọn gói gồm di chuyển, lưu trú, các bữa ăn chính, vé tham quan và hướng dẫn viên suốt tuyến.'}
              </p>

              {/* Hai lối hành động. Nút vàng là lối chốt đơn — đây mới là việc
                  chính của trang, nên nó đứng trên và nặng hơn lối xin tư vấn. */}
              <div className="mt-auto space-y-2.5 pt-1">
                <a href="#lich-khoi-hanh" className="btn btn-signal w-full !py-3.5">
                  Đặt giữ chỗ 24 giờ
                </a>
                <button
                  type="button"
                  onClick={() => setLeadOpen(true)}
                  className="btn btn-quiet w-full"
                >
                  <CustomerServiceOutlined /> Nhận tư vấn miễn phí
                </button>

                {staff && (
                  <button
                    type="button"
                    onClick={generateContent}
                    disabled={genLoading}
                    className="btn btn-ghost w-full !text-[12.5px]"
                  >
                    <RobotOutlined /> {genLoading ? 'Đang sinh…' : 'AI sinh mô tả & lịch trình'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dải số liệu — mực đặc, chạy hết bề ngang tấm biển. */}
          <div className="on-ink grid grid-cols-2 divide-x divide-white/15 border-t border-white/10 sm:grid-cols-4">
            <Fact label="Mã tour" value={`#${tour.MaTour}`} />
            <Fact label="Thời lượng" value={`${tour.SoNgay} ngày${soDem}`} />
            {/* 0 chỗ vừa có thể là "cháy sạch" vừa có thể là "chưa mở đợt nào".
                Cả hai trường hợp khách vẫn đặt được theo ngày tự chọn, nên
                đừng doạ họ bằng chữ "Hết chỗ". */}
            <Fact
              label="Chỗ đang mở bán"
              value={soChoTotal > 0 ? `${soChoTotal} chỗ` : 'Mở theo yêu cầu'}
            />
            <Fact
              label="Tiết kiệm"
              value={hasDiscount ? `−${discountPercent}%` : 'Đang áp dụng giá gốc'}
              accent={hasDiscount}
            />
          </div>
        </div>
      </div>

      <Row gutter={[24, 24]} className="shell">
        {/* Cung đường — lịch trình từng ngày đọc như cột mốc trên đường đi. */}
        <Col xs={24} lg={15}>
          <div className="panel space-y-6 p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-200 pb-4">
              <h2 className="font-display text-title text-ink-950">Cung đường từng ngày</h2>
              <span className="label-sign tnum text-ink-500">
                {itinerary.length} ngày
              </span>
            </div>

            {itinerary.length === 0 ? (
              <p className="py-6 text-body-s text-ink-500">
                Tour này chưa có lịch trình chi tiết. Gọi tư vấn viên để nhận
                chương trình đầy đủ trước khi đặt.
              </p>
            ) : (
              /* Đánh số ở đây là thật: các ngày là một trình tự có thứ tự. */
              <ol>
                {itinerary.map((step, i) => {
                  const last = i === itinerary.length - 1;
                  return (
                    <li key={i} className="flex gap-4">
                      {/* Cột mốc + đoạn đường nối xuống mốc kế tiếp. */}
                      <div className="flex flex-col items-center">
                        <span className="label-sign tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-sign bg-ink-950 text-white">
                          {i + 1}
                        </span>
                        {!last ? (
                          <span className="my-1 w-[2px] flex-1 bg-ink-200" aria-hidden="true" />
                        ) : null}
                      </div>

                      <div className={`min-w-0 flex-1 ${last ? '' : 'pb-6'}`}>
                        <div className="label-sign pt-2 text-ink-500">Ngày {i + 1}</div>
                        <p className="mt-2 max-w-prose text-body-s text-ink-700">
                          {/* Dữ liệu cũ lưu tiền tố không dấu ("Ngay 1:"), dữ liệu
                              mới có dấu — bắt cả hai, nếu không tiêu đề ngày bị lặp. */}
                          {step.replace(/^Ng[àa]y\s*\d+(?:\/\d+)?\s*[:.]\s*/i, '')}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Điều kiện chuyến đi — hai cột đối nhau, đọc là biết ngay. */}
            <div className="grid grid-cols-1 gap-4 border-t border-ink-200 pt-5 sm:grid-cols-2">
              <div className="rounded-card border border-guide-100 bg-guide-50 p-4">
                <div className="mb-3 flex items-center gap-1.5 font-display text-[13px] font-bold text-guide-700">
                  <CheckCircleFilled className="text-guide-500" /> Dịch vụ bao gồm
                </div>
                <ServiceList
                  tone="guide"
                  items={[
                    'Xe du lịch đời mới đưa đón suốt tuyến',
                    'Khách sạn tiêu chuẩn 3 – 5 sao',
                    'Các bữa ăn chính theo lịch trình',
                    'Vé tham quan các điểm trong chương trình',
                    'Hướng dẫn viên suốt tuyến',
                    'Bảo hiểm du lịch tối đa 100.000.000đ/vụ',
                  ]}
                />
              </div>

              <div className="rounded-card border border-stop-100 bg-stop-50 p-4">
                <div className="mb-3 flex items-center gap-1.5 font-display text-[13px] font-bold text-stop-700">
                  <CloseCircleFilled className="text-stop-500" /> Không bao gồm
                </div>
                <ServiceList
                  tone="stop"
                  items={[
                    'Chi phí cá nhân: giặt ủi, đồ uống minibar',
                    'Tiền tip cho hướng dẫn viên & tài xế',
                    'Thuế VAT 10% nếu cần hóa đơn đỏ',
                    'Chi phí phát sinh ngoài lịch trình',
                  ]}
                />
              </div>
            </div>
          </div>
        </Col>

        {/* Chọn ngày đi — mọi lối đặt chỗ đều nằm trong khối này. */}
        <Col xs={24} lg={9}>
          <div id="lich-khoi-hanh" className="panel scroll-mt-24">
            <SignBar tone="ink" mark="KHỞI HÀNH" meta="24H" />

            <div className="space-y-5 p-6">
              {/* Lối 1: chọn một đợt đã mở bán. */}
              {tour.ds_lich && tour.ds_lich.length > 0 ? (
                <div className="space-y-3">
                  <div className="label-sign text-ink-500">Đợt đã mở bán</div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {tour.ds_lich.map((lich) => {
                      const cho = choCon(lich.SoChoCon);
                      const hetCho = lich.SoChoCon <= 0 || lich.TrangThai !== 'MoBan';
                      return (
                        <div
                          key={lich.MaLich}
                          className="flex items-center justify-between gap-3 rounded-card border border-ink-200 bg-paper p-3 transition-colors hover:border-ink-400"
                        >
                          <div className="min-w-0">
                            <div className="tnum flex items-center gap-1.5 font-display text-[13px] font-bold text-ink-950">
                              <CalendarOutlined className="text-guide-500" />
                              {fmtDate(lich.NgayKhoiHanh)}
                            </div>
                            <div className="mt-1 text-[11px] text-ink-500">
                              về {fmtDate(lich.NgayKetThuc)} ·{' '}
                              <span className={`font-semibold ${cho.cls}`}>{cho.text}</span>
                              {lich.GhiChu?.includes('[TOUR RIÊNG]') ? (
                                <span className="ml-1.5 rounded-sign bg-heritage-50 px-1.5 py-0.5 font-bold text-heritage-600">
                                  Tour riêng
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={hetCho}
                            onClick={() =>
                              navigate(`/book/${lich.MaLich}`, {
                                state: { tour, lich },
                              })
                            }
                            className="btn btn-ink shrink-0 !px-3.5 !py-2 !text-[12.5px]"
                          >
                            {lich.SoChoCon > 0 ? 'Đặt' : 'Hết chỗ'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="h-px flex-1 bg-ink-200" />
                    <span className="label-sign text-ink-400">Hoặc tự chọn ngày</span>
                    <span className="h-px flex-1 bg-ink-200" />
                  </div>
                </div>
              ) : null}

              {/* Lối 2: tự chọn ngày + hình thức chuyến đi. */}
              <div className="space-y-4 rounded-card border border-ink-200 bg-paper-deep p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="label-sign text-ink-700">Ngày bạn muốn đi</span>
                  <span className="rounded-sign bg-ink-950 px-2 py-1 text-[10px] font-bold text-white">
                    Mở đợt ngay
                  </span>
                </div>

                <div>
                  <DatePicker
                    className="w-full !h-10 !rounded-field text-sm font-medium"
                    placeholder="Chọn ngày khởi hành"
                    format="DD/MM/YYYY"
                    disabledDate={(current) => current && current < dayjs().add(2, 'day').startOf('day')}
                    value={customDate}
                    onChange={(date) => setCustomDate(date)}
                  />
                  <p className="mt-1.5 text-[11px] text-ink-500">
                    Chọn ngày cách hôm nay ít nhất 2 ngày để công ty kịp chuẩn bị.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-[12px] font-semibold text-ink-700">
                    Hình thức chuyến đi
                  </div>
                  <Radio.Group
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                    className="w-full space-y-2"
                  >
                    <div
                      onClick={() => setTripType('Ghep')}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-card border bg-white p-3 transition-colors ${
                        tripType === 'Ghep'
                          ? 'border-guide-500 ring-1 ring-guide-500'
                          : 'border-ink-200 hover:border-ink-400'
                      }`}
                    >
                      <Radio value="Ghep" className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5 font-display text-[12.5px] font-bold text-ink-950">
                          <UsergroupAddOutlined className="text-guide-500" /> Ghép đoàn
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-ink-500">
                          Giá tiêu chuẩn {fmtVND(giaHienTai)}/khách. Hệ thống mở đợt
                          để ghép thêm bạn đồng hành.
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setTripType('Rieng')}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-card border bg-white p-3 transition-colors ${
                        tripType === 'Rieng'
                          ? 'border-heritage-500 ring-1 ring-heritage-500'
                          : 'border-ink-200 hover:border-ink-400'
                      }`}
                    >
                      <Radio value="Rieng" className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5 font-display text-[12.5px] font-bold text-ink-950">
                          <CrownOutlined className="text-heritage-500" /> Tour riêng
                          cho nhóm
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-ink-500">
                          Xe và hướng dẫn viên phục vụ riêng nhóm bạn, không ghép
                          người lạ.
                        </div>
                      </div>
                    </div>
                  </Radio.Group>
                </div>

                <button
                  type="button"
                  onClick={handleBookCustomDate}
                  className="btn btn-guide w-full"
                >
                  <ThunderboltFilled /> Đặt giữ chỗ ngày này
                </button>
              </div>

              {/* Chính sách — trả lời sẵn câu hỏi trước khi khách kịp do dự. */}
              <div className="space-y-2 rounded-card border border-ink-200 p-4">
                <div className="flex items-center gap-1.5 font-display text-[12.5px] font-bold text-ink-950">
                  <SafetyCertificateOutlined className="text-guide-500" /> Chính sách
                  giữ chỗ &amp; hoàn cọc
                </div>
                <dl className="space-y-1.5 text-[12px] text-ink-600">
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-semibold text-ink-800">Giữ chỗ 24h</dt>
                    <dd className="min-w-0">giữ nguyên giá và số chỗ, chưa cần thanh toán.</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-semibold text-ink-800">Hoàn 100%</dt>
                    <dd className="min-w-0">khi hủy trước ngày khởi hành từ 7 ngày.</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-semibold text-ink-800">Hoàn 50%</dt>
                    <dd className="min-w-0">khi hủy trước 3 – 6 ngày.</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Modal yêu cầu tư vấn */}
      <Modal
        open={leadOpen}
        onCancel={() => setLeadOpen(false)}
        onOk={submitLead}
        confirmLoading={leadSubmitting}
        okText="Gửi yêu cầu tư vấn"
        cancelText="Hủy"
        title="Nhận tư vấn tour miễn phí"
      >
        <div className="mb-4 rounded-card border border-ink-200 bg-paper-deep p-3.5">
          <div className="label-sign text-ink-500">Tour bạn đang xem</div>
          <div className="mt-1.5 font-display text-[13px] font-bold text-ink-950">
            {tour.TenTour}
          </div>
        </div>
        <Form form={leadForm} layout="vertical">
          <Form.Item
            name="HoTen"
            label="Họ và tên của bạn"
            rules={[{ required: true, min: 2, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nguyễn Văn A" className="!rounded-field" />
          </Form.Item>
          <Form.Item
            name="SoDienThoai"
            label="Số điện thoại / Zalo liên hệ"
            rules={[{ required: true, min: 8, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input placeholder="0912 345 678" className="!rounded-field" />
          </Form.Item>
          <Form.Item name="Email" label="Email nhận báo giá" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
            <Input placeholder="email@gmail.com" className="!rounded-field" />
          </Form.Item>
          <Form.Item name="NoiDung" label="Ghi chú thêm (số người, ngày dự kiến, yêu cầu đặc biệt)">
            <Input.TextArea rows={3} placeholder="Ví dụ: Đoàn gia đình 4 người lớn 2 trẻ em muốn khởi hành cuối tuần..." className="!rounded-field" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal kết quả AI */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={720}
        footer={
          <div className="flex items-center justify-end gap-2">
            {/* Chỉ hiện khi đã sửa: chưa sửa gì thì nút này chẳng để làm gì, mà
                lỡ tay sửa hỏng thì đường về bản AI phải gọi lại AI — tốn một
                lượt gọi chỉ vì muốn hoàn tác. */}
            {daSua ? (
              <button
                type="button"
                onClick={() => setBanNhap(nhanBanAI(aiResult))}
                className="btn btn-ghost mr-auto !text-[13px]"
              >
                Hoàn tác về bản AI
              </button>
            ) : null}
            <Button onClick={() => setModalOpen(false)} className="!rounded-field">Đóng</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveLoading}
              onClick={saveAiContent}
              className="!rounded-field !bg-guide-500 hover:!bg-guide-600"
            >
              Lưu vào tour
            </Button>
          </div>
        }
        title={
          <Space>
            <RobotOutlined className="text-guide-500" /> Nội dung AI sinh tự động
            {aiResult?.nguon === 'Fallback' && (
              <span className="chip !px-2 !py-0.5 !text-[11px] bg-signal-50 text-signal-800 border-signal-200">
                Fallback
              </span>
            )}
          </Space>
        }
      >
        {/* Nội dung AI sinh ra là BẢN NHÁP, không phải kết quả cuối: máy viết
            xong vẫn phải qua tay người duyệt. Nên mọi ô ở đây đều sửa được, và
            chỉ khi bấm "Lưu vào tour" thì chữ mới chạm vào tour. */}
        {aiResult && banNhap && (
          <div className="space-y-4 pt-2">
            {aiResult.nguon === 'Fallback' && (
              <Alert
                type="warning"
                showIcon
                message="Gemini AI tạm không khả dụng — hệ thống dùng bộ nội dung chuẩn dự phòng."
              />
            )}

            <div>
              <label
                htmlFor="ai-mo-ta"
                className="mb-1.5 block font-display font-bold text-ink-950"
              >
                Mô tả tổng quan tour
              </label>
              <Input.TextArea
                id="ai-mo-ta"
                value={banNhap.moTa}
                onChange={(e) =>
                  setBanNhap((s) => ({ ...s, moTa: e.target.value }))
                }
                autoSize={{ minRows: 4, maxRows: 12 }}
                placeholder="Mô tả nổi bật của chuyến đi..."
                className="!rounded-card"
              />
            </div>

            <div>
              <div className="mb-1.5 font-display font-bold text-ink-950">
                Lịch trình từng ngày
              </div>
              <div className="space-y-2">
                {banNhap.ngay.map((ngay, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {/* Ô số thứ tự, cùng ngữ pháp với thẻ ngày ở drawer tour
                        thiết kế riêng: con số nằm trong ô mực, không phải một
                        nhãn "Ngày N" viết ra thành chữ. */}
                    <span
                      aria-hidden="true"
                      className="tnum mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-field bg-ink-950 font-display text-[12px] font-bold text-white"
                    >
                      {i + 1}
                    </span>
                    <Input.TextArea
                      value={ngay}
                      aria-label={`Nội dung ngày ${i + 1}`}
                      onChange={(e) =>
                        setBanNhap((s) => ({
                          ...s,
                          ngay: s.ngay.map((n, j) => (j === i ? e.target.value : n)),
                        }))
                      }
                      autoSize={{ minRows: 2, maxRows: 8 }}
                      className="!rounded-card"
                    />
                  </div>
                ))}
              </div>
            </div>

            <p className="text-body-s text-ink-600">
              Sửa trực tiếp được. Nội dung chỉ vào tour khi bạn bấm "Lưu vào tour".
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
