import { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer, Form, InputNumber, Modal, message } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/http';
import { TRANG_THAI_DAT_CHO, fmtDate, fmtDateTime, fmtVND } from '../../utils/format';
import { batTatPill, donPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';
import ThanhLoc from '../../components/ui/ThanhLoc';

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

/** Lịch khởi hành: quản lý bán/chỗ + xem danh sách đoàn. */
export default function AdminCalendar() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thangChon, setThangChon] = useState('all');
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

  // `groupByMonth` giữ nguyên: nó vẫn là nguồn duy nhất dựng danh sách tháng
  // và số lịch mỗi tháng cho dải chọn ở trên.
  const months = useMemo(() => groupByMonth(rows), [rows]);

  // Lọc thẳng trên `rows` bằng cùng khoá "YYYY-MM" thay vì tra lại trong
  // `months` — nhờ vậy không có trạng thái ma: tháng được chọn luôn khớp đúng
  // tập dòng đang hiện.
  const hienThi = useMemo(() => {
    const ds =
      thangChon === 'all'
        ? rows
        : rows.filter((r) => (r.NgayKhoiHanh || '').slice(0, 7) === thangChon);
    return [...ds].sort((a, b) =>
      (a.NgayKhoiHanh || '').localeCompare(b.NgayKhoiHanh || ''),
    );
  }, [rows, thangChon]);

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
    { title: 'Mã lịch', dataIndex: 'MaLich', width: 76 },
    {
      title: 'Tour',
      dataIndex: 'ten_tour',
      width: 195,
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <span className={`chip mt-1 !px-2 !py-0.5 !text-[11px] ${batTatPill(r.TrangThai)}`}>
            {r.TrangThai === 'MoBan' ? 'Mở bán' : 'Ngừng bán'}
          </span>
        </div>
      ),
    },
    { title: 'Điểm đến', dataIndex: 'ten_diem_den', width: 118, ellipsis: true },
    {
      title: 'Khởi hành',
      dataIndex: 'NgayKhoiHanh',
      width: 110,
      // Ngày là một đơn vị không gãy: hẹp quá thì cột phải tự cuộn chứ không
      // được xuống dòng giữa "03/09/2026".
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDate(v)}</span>,
    },
    {
      title: 'Kết thúc',
      dataIndex: 'NgayKetThuc',
      width: 110,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDate(v)}</span>,
    },
    {
      title: 'Chỗ',
      key: 'seats',
      width: 84,
      align: 'right',
      render: (_, r) => (
        <span className="tnum text-ink-700">
          <b className="text-ink-950">{r.SoChoCon}</b>/{r.MaxSeats}
        </span>
      ),
    },
    {
      title: 'Đặt chỗ',
      key: 'bookings',
      width: 140,
      render: (_, r) => (
        <div className="tnum text-[12.5px] leading-5">
          <div>
            Đã chốt <b className="text-guide-700">{r.so_khach_da_chot}</b> khách
          </div>
          <div>
            Giữ chỗ <b className="text-signal-700">{r.so_khach_giu_cho}</b> khách
          </div>
          <div className="text-ink-600">{r.so_don} đơn</div>
        </div>
      ),
    },
    {
      title: 'HDV phụ trách',
      dataIndex: 'ten_hdv',
      width: 150,
      render: (v) =>
        v ? (
          <span className="text-[12.5px] text-ink-700">{v}</span>
        ) : (
          <span className="chip !px-2 !py-0.5 !text-[11px] border-signal-200 bg-signal-50 text-signal-700">
            Chưa phân công
          </span>
        ),
    },
    {
      // Ghim phải: "Xem đoàn" là việc chính của màn này, không được để nó bị
      // đẩy khỏi mép phải khi cửa sổ hẹp.
      title: 'Thao tác',
      key: 'action',
      width: 130,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac
          chinh={{ nhan: 'Xem đoàn', icon: <TeamOutlined />, onClick: () => openRoster(r) }}
          khac={[
            {
              nhan: 'Điều chỉnh chỗ',
              onClick: () => {
                form.resetFields();
                form.setFieldsValue({ SoChoCon: r.SoChoCon });
                setSeatsItem(r);
              },
            },
          ]}
        />
      ),
    },
  ];

  // Bề rộng tối thiểu = tổng bề rộng các cột đã khai báo, để AntD dùng
  // `table-layout: fixed`. Để mặc định `max-content` thì cột "Tour" tự nới theo
  // tên tour dài và đẩy cột "Thao tác" ra ngoài mép phải.
  const beRongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  const rosterColumns = [
    {
      title: 'Khách hàng',
      dataIndex: 'ten_khach_hang',
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <div className="truncate text-[12px] text-ink-600">{r.Email || '—'}</div>
        </div>
      ),
    },
    { title: 'SĐT', dataIndex: 'SoDienThoai', width: 115 },
    {
      title: 'Hành khách',
      key: 'hk',
      render: (_, r) => (
        <div className="text-[12.5px] leading-4 text-ink-700">
          {(r.ds_hanh_khach || []).map((hk, i) => (
            <div key={i}>{hk.HoTen}</div>
          ))}
        </div>
      ),
    },
    { title: 'SL', dataIndex: 'SoKhach', align: 'center', width: 60 },
    {
      title: 'Cọc / Tổng',
      key: 'tien',
      width: 150,
      align: 'right',
      render: (_, r) => (
        <div className="tnum text-[12.5px]">
          <div className="text-guide-700">{fmtVND(r.DaDatCoc)}</div>
          <div className="text-ink-600">{fmtVND(r.TongTien)}</div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 140,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${donPill(v)}`}>
          {TRANG_THAI_DAT_CHO[v]?.label || v}
        </span>
      ),
    },
    { title: 'Ngày đặt', dataIndex: 'NgayDat', render: fmtDateTime, width: 140 },
  ];

  const soKhachDaChot = roster
    .filter((r) => ['DaCoc', 'DaThanhToan', 'DangDiTour', 'HoanThanh'].includes(r.TrangThai))
    .reduce((s, r) => s + r.SoKhach, 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} lịch`}
        title="Lịch khởi hành"
        description="Theo dõi chỗ, khách đã cọc & giữ chỗ, và xem danh sách đoàn từng chuyến."
      />

      <div className="mt-6 space-y-4">
        <ThanhLoc
          right={
            <span className="tnum text-body-s text-ink-600">
              {hienThi.length} lịch
            </span>
          }
        >
          <button
            type="button"
            className="chip-filter self-end"
            aria-pressed={thangChon === 'all'}
            onClick={() => setThangChon('all')}
          >
            Tất cả
          </button>
          {months.map((m) => (
            <button
              key={m.key}
              type="button"
              className="chip-filter tnum self-end"
              aria-pressed={thangChon === m.key}
              onClick={() => setThangChon(m.key)}
            >
              {m.label}
              <span className="opacity-60">{m.items.length}</span>
            </button>
          ))}
        </ThanhLoc>

        <BangDuLieu
          rows={hienThi}
          columns={columns}
          x={beRongBang}
          rowKey="MaLich"
          loading={loading}
          empty={{
            title: 'Chưa có lịch khởi hành nào',
            description:
              thangChon === 'all'
                ? 'Lịch khởi hành được tạo từ mục Quản lý Tour.'
                : 'Tháng này chưa có lịch nào. Chọn tháng khác hoặc xem tất cả.',
          }}
        />
      </div>

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
        width={900}
        title={
          rosterLich
            ? `Đoàn khởi hành — ${rosterLich.ten_tour} · ${fmtDate(rosterLich.NgayKhoiHanh)}`
            : ''
        }
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="label-sign text-ink-600">HDV phụ trách</span>
          {rosterLich?.ten_hdv ? (
            <span className="text-body-s font-semibold text-ink-950">{rosterLich.ten_hdv}</span>
          ) : (
            <span className="chip !px-2 !py-0.5 !text-[11px] border-signal-200 bg-signal-50 text-signal-700">
              Chưa phân công
            </span>
          )}
        </div>

        <p className="mb-4 text-body-s text-ink-600 tnum">
          {roster.length} đơn · {roster.reduce((s, r) => s + r.SoKhach, 0)} khách ·{' '}
          <b className="text-guide-700">{soKhachDaChot} đã chốt</b>
        </p>

        <BangDuLieu
          rows={roster}
          columns={rosterColumns}
          rowKey="MaDatCho"
          loading={rosterLoading}
          pageSize={10}
          empty={{ title: 'Lịch này chưa có đơn đặt chỗ nào' }}
        />
      </Drawer>
    </div>
  );
}
