import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  QRCode,
  Rate,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CarOutlined,
  HeartOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { customerApi, reviewApi } from '../api/http';
import { TRANG_THAI_DAT_CHO, fmtDate, fmtDateTime, fmtVND } from '../utils/format';

const { Title, Text } = Typography;

/** Ước tính hoàn tiền nếu hủy theo chính sách DR-04 (client-side, để tham khảo). */
function uocTinhHoanTien(daCoc, ngayKhoiHanh) {
  const coc = Number(daCoc || 0);
  if (coc <= 0 || !ngayKhoiHanh) return null;
  const delta = dayjs(ngayKhoiHanh).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (delta >= 7) return { hoan: coc, mucPhat: '0% (hoàn 100% cọc)' };
  if (delta >= 3) return { hoan: coc * 0.5, mucPhat: '50% (hoàn 50% cọc)' };
  return { hoan: 0, mucPhat: '100% (không hoàn cọc)' };
}

/** Lịch sử đặt tour của khách: vé điện tử + đánh giá + ước tính hoàn tiền. */
export default function BookingHistory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await customerApi.myBookings());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = async () => {
    const v = await form.validateFields();
    if (!v.SoSao) {
      message.warning('Vui lòng chọn số sao');
      return;
    }
    setSubmitting(true);
    try {
      await reviewApi.create({
        MaDatCho: reviewTarget.MaDatCho,
        SoSao: v.SoSao,
        NoiDung: v.NoiDung || null,
      });
      message.success('Đã gửi đánh giá — chờ Admin duyệt hiển thị!');
      setReviewTarget(null);
      form.resetFields();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Mã đơn', dataIndex: 'MaDatCho', width: 90 },
    { title: 'Tour', dataIndex: 'ten_tour', ellipsis: true },
    {
      title: 'Điểm đến',
      dataIndex: 'ten_diem_den',
      render: (v) => v || '—',
    },
    {
      title: 'Khởi hành',
      dataIndex: 'ngay_khoi_hanh',
      render: (v) => fmtDate(v),
    },
    { title: 'Số khách', dataIndex: 'SoKhach', width: 90, align: 'center' },
    {
      title: 'Tổng tiền',
      dataIndex: 'TongTien',
      render: (v) => <b>{fmtVND(v)}</b>,
    },
    { title: 'Đã cọc', dataIndex: 'DaDatCoc', render: (v) => fmtVND(v) },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_DAT_CHO[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, r) => {
        const est = r.TrangThai !== 'DaHuy' ? uocTinhHoanTien(r.DaDatCoc, r.ngay_khoi_hanh) : null;
        return (
          <Space wrap>
            <Button
              size="small"
              icon={<CarOutlined />}
              onClick={() => setTicket(r)}
            >
              Vé điện tử
            </Button>
            {r.TrangThai === 'DaThanhToan' && (
              <Button
                size="small"
                type="primary"
                icon={<HeartOutlined />}
                onClick={() => setReviewTarget(r)}
              >
                Đánh giá
              </Button>
            )}
            {est && est.hoan > 0 && (
              <Button
                size="small"
                icon={<RollbackOutlined />}
                onClick={() => setRefundTarget({ ...r, est })}
              >
                Ước tính hoàn tiền
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card className="shadow-card" bordered={false}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Title level={3} className="!mb-1">
              🧾 Lịch sử đặt tour
            </Title>
            <Text type="secondary">
              Xem vé điện tử, gửi đánh giá sau chuyến đi và tra cứu ước tính hoàn
              tiền theo chính sách hủy (DR-04).
            </Text>
          </div>
          <Button type="primary" onClick={() => navigate('/tours')}>
            Tiếp tục đặt tour
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : rows.length === 0 ? (
          <Empty description="Bạn chưa có đơn đặt chỗ nào." className="py-16" />
        ) : (
          <Table
            rowKey="MaDatCho"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      {/* Vé điện tử */}
      <Modal
        open={!!ticket}
        onCancel={() => setTicket(null)}
        footer={null}
        title={<span><CarOutlined className="mr-1 text-indigo-600" /> Vé điện tử</span>}
      >
        {ticket && (
          <div>
            <div className="mb-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <b className="text-lg">🏖️ TourAI</b>
                <span className="text-xs">Vé điện tử</span>
              </div>
              <div className="mt-2 text-2xl font-bold">
                {ticket.ten_tour}
              </div>
              <div className="mt-1 text-sm opacity-90">
                {ticket.ten_diem_den} · {fmtDate(ticket.ngay_khoi_hanh)}
              </div>
            </div>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: 'ma', label: 'Mã đơn', children: `#${ticket.MaDatCho}` },
                { key: 'kh', label: 'Số khách', children: ticket.SoKhach },
                { key: 'tien', label: 'Tổng tiền', children: fmtVND(ticket.TongTien) },
                { key: 'coc', label: 'Đã cọc', children: fmtVND(ticket.DaDatCoc) },
                { key: 'tt', label: 'Trạng thái', children: TRANG_THAI_DAT_CHO[ticket.TrangThai]?.label || ticket.TrangThai },
                { key: 'ngay', label: 'Ngày đặt', children: fmtDateTime(ticket.NgayDat) },
              ]}
            />
            <div className="mt-4 flex items-center gap-4">
              <QRCode value={`TOURAI-${ticket.MaDatCho}`} size={100} />
              <Text type="secondary" className="text-xs">
                Trình mã QR này khi lên xe / nhận phòng để xác nhận thông tin đặt
                chỗ.
              </Text>
            </div>
          </div>
        )}
      </Modal>

      {/* Đánh giá chuyến đi */}
      <Modal
        open={!!reviewTarget}
        onCancel={() => setReviewTarget(null)}
        onOk={submitReview}
        confirmLoading={submitting}
        okText="Gửi đánh giá"
        title="Đánh giá chuyến đi"
      >
        {reviewTarget && (
          <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <b>{reviewTarget.ten_tour}</b> · Đơn #{reviewTarget.MaDatCho} ·{' '}
            {fmtDate(reviewTarget.ngay_khoi_hanh)}
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="SoSao" label="Số sao">
            <Rate allowClear={false} />
          </Form.Item>
          <Form.Item name="NoiDung" label="Cảm nhận của bạn">
            <Input.TextArea rows={4} maxLength={1000} showCount placeholder="Chia sẻ trải nghiệm chuyến đi…" />
          </Form.Item>
        </Form>
        <Text type="secondary" className="text-xs">
          Đánh giá sẽ ở trạng thái Chờ duyệt và hiển thị sau khi Admin duyệt.
        </Text>
      </Modal>

      {/* Ước tính hoàn tiền */}
      <Modal
        open={!!refundTarget}
        onCancel={() => setRefundTarget(null)}
        footer={null}
        title="Ước tính hoàn tiền khi hủy"
      >
        {refundTarget && (
          <div>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: 'tour', label: 'Tour', children: refundTarget.ten_tour },
                { key: 'kh', label: 'Ngày khởi hành', children: fmtDate(refundTarget.ngay_khoi_hanh) },
                { key: 'coc', label: 'Đã đặt cọc', children: fmtVND(refundTarget.DaDatCoc) },
                { key: 'phat', label: 'Chính sách (DR-04)', children: refundTarget.est.mucPhat },
                {
                  key: 'hoan',
                  label: 'Hoàn lại dự kiến',
                  children: <b className="text-green-600">{fmtVND(refundTarget.est.hoan)}</b>,
                },
              ]}
            />
            <AlertNote />
          </div>
        )}
      </Modal>
    </div>
  );
}

function AlertNote() {
  return (
    <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
      💡 Ước tính này chỉ mang tính tham khảo. Việc hủy tour được Kế toán xử lý và
      xác nhận hoàn tiền chính thức theo hồ sơ hủy.
    </div>
  );
}
