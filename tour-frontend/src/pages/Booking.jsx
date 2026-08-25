import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Input,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { bookingApi, customerApi, tourApi } from '../api/http';
import CountdownTimer from '../components/CountdownTimer';
import {
  TRANG_THAI_DAT_CHO,
  fmtDate,
  fmtVND,
} from '../utils/format';

const { Title, Text } = Typography;

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

  useEffect(() => {
    (async () => {
      try {
        // Lấy hồ sơ khách hàng của user đang đăng nhập (MaKhachHang).
        const kh = await customerApi.my();
        setCustomer(kh);

        // Ưu tiên dữ liệu từ state, nếu không có thì tự truy vấn.
        let resolved = null;
        if (location.state?.tour && location.state?.lich) {
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
      const res = await bookingApi.create({
        MaLich: Number(maLich),
        MaKhachHang: customer.MaKhachHang,
        ds_hanh_khach: passengers.map((p) => ({
          HoTen: p.HoTen.trim(),
          SoDienThoai: p.SoDienThoai?.trim() || null,
        })),
      });
      setResult(res);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Đặt chỗ thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Title level={3}>Không tìm thấy lịch khởi hành</Title>
        <Button onClick={() => navigate('/')}>Về trang chủ</Button>
      </div>
    );
  }

  const { tour, lich } = ctx;
  const st = TRANG_THAI_DAT_CHO[result?.TrangThai];

  // ============================ MÀN HÌNH KẾT QUẢ ============================
  if (result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert
          type="success"
          showIcon
          message="Đặt chỗ thành công!"
          description={`Đơn #${result.MaDatCho} đang ở trạng thái ${st?.label}. Chỗ được giữ trong 24 giờ.`}
          className="mb-4"
        />
        <Card className="shadow-card" bordered={false}>
          <Descriptions
            title="Thông tin đơn đặt chỗ"
            bordered
            column={1}
            size="middle"
          >
            <Descriptions.Item label="Mã đơn">
              #{result.MaDatCho}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={st?.color}>{st?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tour">
              {tour.TenTour}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày khởi hành">
              {fmtDate(lich.NgayKhoiHanh)}
            </Descriptions.Item>
            <Descriptions.Item label="Số khách">
              {result.SoKhach} khách
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">
              <b className="text-indigo-600">{fmtVND(result.TongTien)}</b>
            </Descriptions.Item>
            <Descriptions.Item label="Cọc tối thiểu (30%)">
              {fmtVND(result.coc_toi_thieu)}
            </Descriptions.Item>
            <Descriptions.Item label="Thời hạn giữ chỗ 24h (DR-02)">
              {result.TrangThai === 'GiuCho' ? (
                <CountdownTimer
                  hanGiuCho={result.HanGiuCho}
                  onExpire={() => message.warning('Hết hạn giữ chỗ!')}
                />
              ) : (
                <Tag>{fmtDate(result.HanGiuCho)}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Hành khách">
              <ul className="m-0 pl-4">
                {(result.ds_hanh_khach || []).map((hk, i) => (
                  <li key={i}>
                    {hk.HoTen}
                    {hk.SoDienThoai ? ` · ${hk.SoDienThoai}` : ''}
                  </li>
                ))}
              </ul>
            </Descriptions.Item>
          </Descriptions>
          <Divider />
          <Alert
            type="warning"
            showIcon
            message="Bước tiếp theo: Kế toán cần xác nhận tiền cọc tối thiểu 30% tổng giá trị (DR-03) để đơn chuyển sang trạng thái 'Đã cọc'."
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => navigate('/history')}>Lịch sử đặt tour</Button>
            <Button type="primary" onClick={() => navigate(`/tours/${tour.MaTour}`)}>
              Xem tour khác
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ============================ MÀN HÌNH FORM ============================
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Button type="text" onClick={() => navigate(-1)}>
        ← Quay lại
      </Button>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title={`Nhập đoàn khách — ${tour.TenTour}`}
            className="shadow-card"
            bordered={false}
          >
            <div className="mb-4">
              <Text type="secondary">
                Lịch khởi hành:{' '}
                <b>
                  {fmtDate(lich.NgayKhoiHanh)} → {fmtDate(lich.NgayKetThuc)}
                </b>{' '}
                · còn <b>{lich.SoChoCon}</b> chỗ
              </Text>
            </div>

            {passengers.map((p, idx) => (
              <div
                key={idx}
                className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <Text strong>Hành khách {idx + 1}</Text>
                  {passengers.length > 1 && (
                    <Button
                      size="small"
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => removePassenger(idx)}
                    >
                      Xóa
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Họ tên hành khách"
                    value={p.HoTen}
                    onChange={(e) => updatePassenger(idx, 'HoTen', e.target.value)}
                  />
                  <Input
                    placeholder="Số điện thoại (không bắt buộc)"
                    value={p.SoDienThoai}
                    onChange={(e) =>
                      updatePassenger(idx, 'SoDienThoai', e.target.value)
                    }
                  />
                </div>
              </div>
            ))}

            <Button
              block
              icon={<PlusOutlined />}
              onClick={addPassenger}
              className="mb-2"
            >
              Thêm hành khách
            </Button>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card className="shadow-card" bordered={false}>
            <Statistic title="Số khách" value={soKhach} />
            <Divider />
            <div className="flex justify-between">
              <span>Đơn giá / khách</span>
              <span>{fmtVND(donGia)}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-bold text-indigo-600">
              <span>Tổng tiền</span>
              <span>{fmtVND(tongTien)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm text-slate-500">
              <span>Cọc tối thiểu 30% (DR-03)</span>
              <span>{fmtVND(cocToiThieu)}</span>
            </div>
            <Divider />
            <Alert
              type="info"
              showIcon
              message="Đơn sẽ được giữ chỗ 24 giờ (DR-02)."
              className="mb-3"
            />
            <Button
              type="primary"
              block
              size="large"
              icon={<ShoppingCartOutlined />}
              loading={submitting}
              onClick={submit}
              disabled={soKhach === 0}
            >
              Đặt tour / Giữ chỗ 24h
            </Button>
            {customer && (
              <div className="mt-3 text-center text-xs text-slate-400">
                Khách hàng: {customer.HoTen} ({customer.MaKhachHang})
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
