import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  InputNumber,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/http';
import { TRANG_THAI_DAT_CHO, fmtDate, fmtDateTime, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

/** Gộp danh sách lịch theo tháng (theo ngày khởi hành). */
function groupByMonth(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = (r.NgayKhoiHanh || '').slice(0, 7); // "2026-09"
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, items]) => {
      const [y, m] = key.split('-').map(Number);
      return { key, label: `Tháng ${m}/${y}`, items };
    });
}

/** Lịch khởi hành: nhóm theo tháng, quản lý bán/chỗ + xem danh sách đoàn. */
export default function AdminCalendar() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seatsItem, setSeatsItem] = useState(null);
  const [seatsSubmitting, setSeatsSubmitting] = useState(false);
  const [rosterLich, setRosterLich] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminApi.schedules());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const months = useMemo(() => groupByMonth(rows), [rows]);

  const submitSeats = async () => {
    const v = await form.validateFields();
    setSeatsSubmitting(true);
    try {
      await adminApi.updateSchedule(seatsItem.MaLich, { SoChoCon: v.SoChoCon });
      message.success(`Đã cập nhật chỗ trống lịch #${seatsItem.MaLich}`);
      setSeatsItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật chỗ thất bại');
    } finally {
      setSeatsSubmitting(false);
    }
  };

  const openRoster = async (r) => {
    setRosterLich(r);
    setRosterLoading(true);
    try {
      setRoster(await adminApi.scheduleBookings(r.MaLich));
    } catch {
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  };

  const columns = [
    { title: 'Mã lịch', dataIndex: 'MaLich', width: 70 },
    {
      title: 'Tour',
      dataIndex: 'ten_tour',
      render: (v, r) => (
        <div>
          <div className="font-medium">{v}</div>
          <Tag color={r.TrangThai === 'MoBan' ? 'green' : 'red'} className="mt-0.5">
            {r.TrangThai === 'MoBan' ? 'Mở bán' : 'Ngừng bán'}
          </Tag>
        </div>
      ),
    },
    { title: 'Điểm đến', dataIndex: 'ten_diem_den' },
    { title: 'Khởi hành', dataIndex: 'NgayKhoiHanh', render: fmtDate, width: 105 },
    { title: 'Kết thúc', dataIndex: 'NgayKetThuc', render: fmtDate, width: 105 },
    {
      title: 'Chỗ',
      key: 'seats',
      width: 100,
      render: (_, r) => (
        <span className="text-slate-700">
          <b>{r.SoChoCon}</b>/{r.MaxSeats}
        </span>
      ),
    },
    {
      title: 'Đặt chỗ',
      key: 'bookings',
      width: 150,
      render: (_, r) => (
        <div className="text-xs leading-5">
          <div>
            Đã chốt: <b className="text-green-600">{r.so_khach_da_chot}</b> khách
          </div>
          <div>
            Giữ chỗ: <b className="text-amber-600">{r.so_khach_giu_cho}</b> khách
          </div>
          <div className="text-slate-400">{r.so_don} đơn</div>
        </div>
      ),
    },
    {
      title: 'HDV phụ trách',
      dataIndex: 'ten_hdv',
      width: 210,
      render: (v) =>
        v ? <Text className="text-xs">{v}</Text> : <Tag color="orange">Chưa phân công</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      render: (_, r) => (
        <Space wrap>
          <Button size="small" icon={<TeamOutlined />} onClick={() => openRoster(r)}>
            Xem đoàn
          </Button>
          <Button
            size="small"
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ SoChoCon: r.SoChoCon });
              setSeatsItem(r);
            }}
          >
            Điều chỉnh chỗ
          </Button>
        </Space>
      ),
    },
  ];

  const rosterColumns = [
    {
      title: 'Khách hàng',
      dataIndex: 'ten_khach_hang',
      render: (v, r) => (
        <div>
          <div className="font-medium">{v}</div>
          <Text type="secondary" className="text-xs">
            {r.Email || '—'}
          </Text>
        </div>
      ),
    },
    { title: 'SĐT', dataIndex: 'SoDienThoai', width: 110 },
    {
      title: 'Hành khách',
      key: 'hk',
      render: (_, r) => (
        <div className="text-xs leading-4">
          {(r.ds_hanh_khach || []).map((hk, i) => (
            <div key={i}>{hk.HoTen}</div>
          ))}
        </div>
      ),
    },
    { title: 'SL', dataIndex: 'SoKhach', align: 'center', width: 50 },
    {
      title: 'Cọc / Tổng',
      key: 'tien',
      width: 150,
      render: (_, r) => (
        <div className="text-xs">
          <div className="text-green-600">{fmtVND(r.DaDatCoc)}</div>
          <div className="text-slate-500">{fmtVND(r.TongTien)}</div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 130,
      render: (v) => {
        const st = TRANG_THAI_DAT_CHO[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    { title: 'Ngày đặt', dataIndex: 'NgayDat', render: fmtDateTime, width: 130 },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <CalendarOutlined /> Lịch khởi hành
        </Title>
        <Text type="secondary">
          Các đợt khởi hành nhóm theo tháng — theo dõi chỗ, khách đã cọc &amp; giữ chỗ, và
          xem danh sách đoàn từng chuyến.
        </Text>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : months.length === 0 ? (
        <Card className="shadow-card" bordered={false}>
          <div className="py-8 text-center text-slate-400">Chưa có lịch khởi hành nào.</div>
        </Card>
      ) : (
        months.map((month) => (
          <section key={month.key} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <Title level={4} className="!mb-0 !text-indigo-700">
                {month.label}
              </Title>
              <Tag color="blue">{month.items.length} lịch</Tag>
            </div>
            <Card className="shadow-card" bordered={false}>
              <Table
                rowKey="MaLich"
                columns={columns}
                dataSource={month.items}
                pagination={false}
                scroll={{ x: 1100 }}
              />
            </Card>
          </section>
        ))
      )}

      {/* Modal điều chỉnh chỗ */}
      <Modal
        open={!!seatsItem}
        onCancel={() => setSeatsItem(null)}
        onOk={submitSeats}
        confirmLoading={seatsSubmitting}
        okText="Cập nhật"
        title={`Điều chỉnh chỗ trống — lịch #${seatsItem?.MaLich}`}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="SoChoCon"
            label={`Chỗ trống (tối đa ${seatsItem?.MaxSeats})`}
            rules={[{ required: true, message: 'Nhập số chỗ trống' }]}
          >
            <InputNumber min={0} max={seatsItem?.MaxSeats} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer danh sách đoàn */}
      <Drawer
        open={!!rosterLich}
        onClose={() => setRosterLich(null)}
        width={860}
        title={
          rosterLich
            ? `Đoàn khởi hành — ${rosterLich.ten_tour} · ${fmtDate(rosterLich.NgayKhoiHanh)}`
            : ''
        }
      >
        {rosterLoading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2">
              <Text type="secondary">HDV phụ trách:</Text>
              {rosterLich?.ten_hdv ? (
                <Text className="font-medium">{rosterLich.ten_hdv}</Text>
              ) : (
                <Tag color="orange">Chưa phân công</Tag>
              )}
            </div>
            <Text type="secondary" className="mb-3 block">
              {roster.length} đơn ·{' '}
              {roster.reduce((s, r) => s + r.SoKhach, 0)} khách ·{' '}
              <b className="text-green-600">
                {roster
                  .filter((r) => ['DaCoc', 'DaThanhToan'].includes(r.TrangThai))
                  .reduce((s, r) => s + r.SoKhach, 0)}{' '}
                đã chốt
              </b>
            </Text>
            <Table
              rowKey="MaDatCho"
              columns={rosterColumns}
              dataSource={roster}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có đơn đặt chỗ nào cho lịch này.' }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
