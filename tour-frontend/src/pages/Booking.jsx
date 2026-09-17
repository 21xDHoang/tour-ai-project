import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Input, Col, Row, message } from 'antd';
import { DeleteOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Landmark } from 'lucide-react';
import { bookingApi, customerApi, tourApi } from '../api/http';
import CountdownTimer from '../components/CountdownTimer';
import SignBar from '../components/ui/SignBar';
import EmptyState from '../components/ui/EmptyState';
import Dong from '../components/ui/Dong';
import {
  KhoiChuyenKhoanCoc,
  ModalKhaiBaoChuyenKhoan,
} from '../components/ThanhToanCoc';
import { TRANG_THAI_DAT_CHO, fmtDate, fmtVND } from '../utils/format';

/** Tìm lịch + tour khi không có state truyền từ TourDetail. */
async function resolveLich(maLich) {
  const tours = await tourApi.list();
  for (const t of tours) {
    const detail = await tourApi.detail(t.MaTour);
    const lich = (detail.ds_lich || []).find(
      (l) => l.MaLich === Number(maLich),
    );
    if (lich) return { tour: detail, lich };
  }
  return null;
}

export default function Booking() {
  const { maLich } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [ctx, setCtx] = useState(null); // { tour, lich }
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState([
    { HoTen: '', SoDienThoai: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [moKhaiBao, setMoKhaiBao] = useState(false);

  // ---- Chế độ On-Demand: khách tự chọn ngày + loại chuyến đi từ TourDetail ----
  const customDate = location.state?.customDate || null; // 'YYYY-MM-DD'
  const loaiChuyenDi = location.state?.loaiChuyenDi || 'Ghep'; // 'Ghep' | 'Rieng'
  const isOnDemand = !maLich && !!customDate && !!location.state?.tour;

  useEffect(() => {
    (async () => {
      try {
        // Lấy hồ sơ khách hàng của user đang đăng nhập (MaKhachHang).
        const kh = await customerApi.my();
        setCustomer(kh);

        let resolved = null;
        if (isOnDemand) {
          // Tự mở đợt LichKhoiHanh mới theo ngày khách chọn.
          resolved = { tour: location.state.tour, lich: null };
        } else if (location.state?.tour && location.state?.lich) {
          // Lịch có sẵn (từ TourDetail "Đặt ngay" / Bàn đặt tour Consultant).
          resolved = {
            tour: location.state.tour,
            lich: location.state.lich,
          };
        } else {
          resolved = await resolveLich(maLich);
        }
        setCtx(resolved);
      } catch {
        setCtx(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maLich, location.state]);

  const donGia = useMemo(() => {
    if (!ctx?.tour) return 0;
    return Number(ctx.tour.GiaKhuyenMai ?? ctx.tour.GiaCoBan);
  }, [ctx]);

  const soKhach = passengers.length;
  const tongTien = donGia * soKhach;
  const cocToiThieu = Math.round(tongTien * 0.3 * 100) / 100; // DR-03: >= 30%

  const updatePassenger = (idx, field, value) => {
    setPassengers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    );
  };

  const addPassenger = () =>
    setPassengers((prev) => [...prev, { HoTen: '', SoDienThoai: '' }]);

  const removePassenger = (idx) =>
    setPassengers((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    // Kiểm tra tên hành khách hợp lệ
    const invalid = passengers.find((p) => !p.HoTen || p.HoTen.trim().length < 2);
    if (invalid) {
      message.warning('Vui lòng nhập đầy đủ họ tên cho từng hành khách');
      return;
    }
    if (!customer || !ctx) {
      message.error('Thiếu thông tin đặt chỗ. Vui lòng thử lại.');
      return;
    }

    setSubmitting(true);
    try {
      const ds_hanh_khach = passengers.map((p) => ({
        HoTen: p.HoTen.trim(),
        SoDienThoai: p.SoDienThoai?.trim() || null,
      }));
      const payload = isOnDemand
        ? {
            // On-Demand: không có MaLich -> backend tự mở đợt LichKhoiHanh mới
            MaTour: ctx.tour.MaTour,
            NgayKhoiHanh: customDate,
            LoaiChuyenDi: loaiChuyenDi,
            MaKhachHang: customer.MaKhachHang,
            ds_hanh_khach,
          }
        : {
            MaLich: Number(maLich),
            MaKhachHang: customer.MaKhachHang,
            ds_hanh_khach,
          };
      const res = await bookingApi.create(payload);
      setResult(res);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Đặt chỗ thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Sau khi khách khai báo chuyển khoản, tải lại đơn để màn hình khớp sự thật:
   * đơn chuyển sang ChoXacNhanCoc và đồng hồ 24h tạm dừng.
   */
  const taiLaiDon = async () => {
    try {
      setResult(await bookingApi.detail(result.MaDatCho));
    } catch {
      // Khai báo đã thành công rồi, chỉ là màn hình chưa kịp cập nhật — giữ
      // nguyên thay vì dựng lại màn hình lỗi.
    }
  };

  if (loading) {
    return (
      <div className="shell space-y-6 py-8">
        <div className="skeleton h-4 w-52" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="skeleton h-80 lg:col-span-7" />
          <div className="skeleton h-72 lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="shell py-16">
        <EmptyState
          title="Không tìm thấy lịch khởi hành"
          description="Lịch này có thể đã đóng bán hoặc đường dẫn không còn đúng. Về trang chủ để chọn hành trình khác."
          action={
            <button type="button" onClick={() => navigate('/')} className="btn btn-guide">
              Về trang chủ
            </button>
          }
        />
      </div>
    );
  }

  const { tour, lich } = ctx;
  const st = TRANG_THAI_DAT_CHO[result?.TrangThai];
  // Đơn còn phải trả tiền hay không: chỉ đơn đang giữ chỗ mới cần khách chuyển
  // cọc, nên chỉ những đơn đó mới hiện khối chuyển khoản và nút khai báo.
  const canChuyenCoc = result?.TrangThai === 'GiuCho';

  // ============================ MÀN HÌNH KẾT QUẢ ============================
  // Biên nhận: đơn đã chốt nên trang lùi về vai trò giấy tờ — mực đặc ở đầu,
  // số liệu thẳng cột, không còn chỗ cho nút nào tranh nhau.
  if (result) {
    return (
      <div className="shell space-y-6 pb-16 pt-6">
        <div className="panel overflow-hidden">
          <SignBar
            tone="guide"
            mark="Đã giữ chỗ"
            place={tour.TenTour}
            meta={`ĐƠN #${result.MaDatCho}`}
          />

          {/* Đồng hồ giữ chỗ là thông tin gấp nhất của trang này. */}
          <div className="on-ink flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <div>
              <div className="label-sign text-ink-400">Thời hạn giữ chỗ còn lại</div>
              <div className="mt-2">
                {result.TrangThai === 'GiuCho' ? (
                  <span className="[&_span]:!text-[32px]">
                    <CountdownTimer
                      hanGiuCho={result.HanGiuCho}
                      onExpire={() => message.warning('Hết hạn giữ chỗ!')}
                    />
                  </span>
                ) : (
                  <span className="tnum font-display text-[32px] font-extrabold text-white">
                    {fmtDate(result.HanGiuCho)}
                  </span>
                )}
              </div>
            </div>
            <p className="max-w-[34ch] text-body-s text-ink-300">
              Chỗ của bạn đã được giữ. Kế toán xác nhận tiền cọc xong thì đơn
              chuyển sang trạng thái đã cọc.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-10 gap-y-6 p-6 sm:p-7 lg:grid-cols-2">
            <dl>
              <Dong nhan="Mã đơn">#{result.MaDatCho}</Dong>
              <Dong nhan="Trạng thái">
                <span className="rounded-sign bg-guide-50 px-2 py-1 font-display text-[12px] font-bold text-guide-700">
                  {st?.label}
                </span>
              </Dong>
              <Dong nhan="Tour">{tour.TenTour}</Dong>
              <Dong nhan="Ngày khởi hành">{fmtDate(lich?.NgayKhoiHanh ?? customDate)}</Dong>
              <Dong nhan="Số khách">{result.SoKhach} khách</Dong>
            </dl>

            <div>
              <dl className="rounded-card border border-ink-200 bg-paper-deep px-4 py-1">
                <Dong nhan="Đơn giá / khách">{fmtVND(donGia)}</Dong>
                <Dong nhan="Tổng tiền" manh>
                  {fmtVND(result.TongTien)}
                </Dong>
                <Dong nhan="Cọc tối thiểu 30%">
                  {fmtVND(result.coc_toi_thieu)}
                </Dong>
              </dl>

              <div className="mt-4 rounded-card border border-signal-200 bg-signal-50 p-4">
                <div className="label-sign text-signal-800">Bước tiếp theo</div>
                <p className="mt-2 text-body-s text-ink-700">
                  {canChuyenCoc
                    ? 'Chuyển khoản tiền cọc tối thiểu 30% theo thông tin bên dưới, rồi bấm “Tôi đã chuyển khoản”. Kế toán xác nhận xong đơn mới chuyển sang “Đã cọc”.'
                    : 'Kế toán cần xác nhận tiền cọc tối thiểu 30% tổng giá trị để đơn chuyển sang trạng thái “Đã cọc”.'}
                </p>
              </div>
            </div>
          </div>

          {/* Khối chuyển khoản nằm ngay trên màn hình kết quả vì vừa giữ chỗ
              xong là lúc khách cần thông tin chuyển tiền nhất. Bắt họ sang
              trang lịch sử đi tìm thì đơn dễ trôi qua hạn 24h. */}
          {canChuyenCoc ? (
            <div className="border-t border-ink-200 px-6 py-5 sm:px-7">
              <KhoiChuyenKhoanCoc
                maDatCho={result.MaDatCho}
                soTien={result.coc_toi_thieu}
              />
            </div>
          ) : null}

          {/* Danh sách hành khách — đánh số vì đây là danh sách có thứ tự. */}
          <div className="border-t border-ink-200 px-6 py-5 sm:px-7">
            <div className="label-sign mb-3 text-ink-500">
              Hành khách · {result.SoKhach}
            </div>
            <ol className="flex flex-wrap gap-2">
              {(result.ds_hanh_khach || []).map((hk, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-sign border border-ink-200 bg-paper px-2.5 py-1.5 text-[12.5px]"
                >
                  <span className="label-sign tnum flex h-5 w-5 items-center justify-center rounded-sign bg-ink-950 text-[10px] text-white">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-ink-900">{hk.HoTen}</span>
                  {hk.SoDienThoai ? (
                    <span className="tnum text-ink-500">{hk.SoDienThoai}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canChuyenCoc ? (
            <button
              type="button"
              onClick={() => setMoKhaiBao(true)}
              className="btn btn-signal"
            >
              <Landmark className="h-4 w-4" aria-hidden="true" />
              Tôi đã chuyển khoản
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="btn btn-ink"
          >
            Xem lịch sử đặt tour
          </button>
          <button
            type="button"
            onClick={() => navigate(`/tours/${tour.MaTour}`)}
            className="btn btn-quiet"
          >
            Xem lại tour
          </button>
        </div>

        <ModalKhaiBaoChuyenKhoan
          open={moKhaiBao}
          don={result}
          onClose={() => setMoKhaiBao(false)}
          onDone={taiLaiDon}
        />
      </div>
    );
  }

  // ============================ MÀN HÌNH FORM ============================
  return (
    <div className="space-y-6 pb-16 pt-6">
      <div className="shell flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-m text-ink-950">
            Xác nhận đặt chỗ
          </h1>
          <p className="mt-1.5 text-body-s text-ink-600">
            Điền tên từng hành khách. Chỗ được giữ 24 giờ, chưa cần trả tiền ngay.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn btn-ghost shrink-0 !text-[13px]"
        >
          ← Quay lại
        </button>
      </div>

      <Row gutter={[24, 24]} className="shell">
        <Col xs={24} lg={15}>
          <div className="panel overflow-hidden">
            <SignBar
              mark="Đoàn khách"
              place={tour.TenTour}
              meta={`${soKhach} KHÁCH`}
            />

            <div className="space-y-5 p-6">
              {/* Nhắc lại bối cảnh đơn: đợt có sẵn, hay khách tự mở đợt mới. */}
              {isOnDemand ? (
                <div className="rounded-card border border-signal-200 bg-signal-50 p-4">
                  <div className="label-sign text-signal-800">
                    Mở đợt mới theo ngày bạn chọn
                  </div>
                  <p className="mt-2 text-body-s text-ink-700">
                    Khởi hành {fmtDate(customDate)} ·{' '}
                    {loaiChuyenDi === 'Rieng'
                      ? 'tour riêng, không ghép đoàn'
                      : 'ghép đoàn'}
                  </p>
                </div>
              ) : (
                <div className="rounded-card border border-ink-200 bg-paper-deep p-4">
                  <div className="label-sign text-ink-500">Lịch khởi hành</div>
                  <p className="tnum mt-2 text-body-s text-ink-800">
                    <b className="font-display text-[15px] text-ink-950">
                      {fmtDate(lich.NgayKhoiHanh)} → {fmtDate(lich.NgayKetThuc)}
                    </b>
                    {'  ·  '}
                    <span className="font-semibold text-guide-500">
                      còn {lich.SoChoCon} chỗ
                    </span>
                  </p>
                </div>
              )}

              {/* Mỗi hành khách một mốc — cùng thiết bị đánh số với lịch trình
                  ở trang chi tiết tour, vì đây cũng là một danh sách có thứ tự. */}
              <div>
                <div className="label-sign mb-3 text-ink-500">Hành khách</div>
                <div className="space-y-3">
                  {passengers.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 rounded-card border border-ink-200 bg-paper p-3.5"
                    >
                      <span className="label-sign tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-sign bg-ink-950 text-white">
                        {idx + 1}
                      </span>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Input
                            size="large"
                            className="!rounded-field"
                            placeholder="Họ tên hành khách"
                            value={p.HoTen}
                            onChange={(e) => updatePassenger(idx, 'HoTen', e.target.value)}
                          />
                          <Input
                            size="large"
                            className="!rounded-field"
                            placeholder="Số điện thoại (không bắt buộc)"
                            value={p.SoDienThoai}
                            onChange={(e) =>
                              updatePassenger(idx, 'SoDienThoai', e.target.value)
                            }
                          />
                        </div>
                        {passengers.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removePassenger(idx)}
                            className="btn btn-ghost !px-2 !py-1 !text-[12px] !text-stop-600"
                          >
                            <DeleteOutlined /> Xóa hành khách này
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addPassenger}
                  className="btn btn-quiet mt-3 w-full !border-dashed"
                >
                  <PlusOutlined /> Thêm hành khách
                </button>
              </div>
            </div>
          </div>
        </Col>

        {/* Bảng tính tiền — dính theo màn hình để con số không rời mắt khách
            trong lúc họ còn đang thêm bớt hành khách. */}
        <Col xs={24} lg={9}>
          <div className="panel overflow-hidden lg:sticky lg:top-24">
            <SignBar tone="ink" mark="Chi phí" meta="VND" />

            <div className="space-y-4 p-6">
              <dl className="rounded-card border border-ink-200 bg-paper-deep px-4 py-1">
                <Dong nhan="Số khách">{soKhach}</Dong>
                <Dong nhan="Đơn giá / khách">{fmtVND(donGia)}</Dong>
                <Dong nhan="Tổng tiền" manh>
                  {fmtVND(tongTien)}
                </Dong>
              </dl>

              <div className="flex items-baseline justify-between gap-4 rounded-card border border-ink-200 px-4 py-3">
                <span className="text-body-s text-ink-600">Cọc tối thiểu 30%</span>
                <span className="tnum font-display text-[15px] font-bold text-ink-950">
                  {fmtVND(cocToiThieu)}
                </span>
              </div>

              <p className="text-[12px] leading-relaxed text-ink-500">
                {isOnDemand
                  ? 'Hệ thống tự mở đợt khởi hành mới theo ngày bạn chọn. Đơn được giữ chỗ 24 giờ.'
                  : 'Đơn được giữ chỗ 24 giờ. Chưa cần thanh toán ngay.'}
              </p>

              <button
                type="button"
                onClick={submit}
                disabled={submitting || soKhach === 0}
                className="btn btn-signal w-full !py-3.5"
              >
                <ShoppingCartOutlined />
                {submitting ? 'Đang gửi…' : 'Đặt tour · Giữ chỗ 24h'}
              </button>

              {customer ? (
                <p className="text-center text-[12px] text-ink-500">
                  Đặt dưới tên{' '}
                  <b className="font-semibold text-ink-800">{customer.HoTen}</b>{' '}
                  <span className="tnum">({customer.MaKhachHang})</span>
                </p>
              ) : null}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
