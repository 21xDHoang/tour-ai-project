import { useCallback, useEffect, useState } from 'react';
import { bookingApi } from '../../api/http';
import { TRANG_THAI_DAT_CHO, fmtDateTime, fmtVND } from '../../utils/format';
import { donPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import SectionHeader from '../../components/ui/SectionHeader';

/**
 * Nhật ký hoạt động (Admin - Cài đặt).
 * Bản gọn: tổng hợp các đơn đặt chỗ gần nhất — ai tạo, thời điểm, trạng thái.
 */
export default function AdminAudit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await bookingApi.listAll());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = [...rows].sort(
    (a, b) => new Date(b.NgayDat) - new Date(a.NgayDat),
  );

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'MaDatCho',
      width: 80,
      render: (v) => <span className="tnum font-semibold text-ink-950">#{v}</span>,
    },
    { title: 'Khách hàng', dataIndex: 'ten_khach_hang', width: 150, ellipsis: true },
    { title: 'Tour', dataIndex: 'ten_tour', width: 200, ellipsis: true },
    {
      title: 'Điểm đến',
      dataIndex: 'ten_diem_den',
      width: 130,
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: 'Người tạo',
      dataIndex: 'ten_nguoi_tao',
      width: 118,
      ellipsis: true,
      // Khách tự đặt trên web thì không có nhân viên nào đứng tên — chữ xám nói
      // đúng điều đó, còn `Text type="secondary"` của AntD kéo theo cả một hệ
      // màu riêng không thuộc bảng màu dự án.
      render: (v) => v || <span className="text-ink-500">Web</span>,
    },
    {
      title: 'Thời điểm',
      dataIndex: 'NgayDat',
      width: 148,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDateTime(v)}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 124,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${donPill(v)}`}>
          {TRANG_THAI_DAT_CHO[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'TongTien',
      width: 126,
      align: 'right',
      render: (v) => <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>,
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${sorted.length} đơn`}
        title="Nhật ký hoạt động"
        description="Ghi nhận các giao dịch đặt chỗ gần nhất theo thời gian thực."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={sorted}
          columns={columns}
          rowKey="MaDatCho"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có giao dịch nào',
            description: 'Nhật ký ghi lại mọi đơn đặt chỗ ngay khi chúng được tạo.',
          }}
        />
      </div>
    </div>
  );
}
