import { useEffect, useState } from 'react';
import { adminApi } from '../../api/http';
import { fmtVND } from '../../utils/format';
import BangDuLieu from '../../components/ui/BangDuLieu';
import SectionHeader from '../../components/ui/SectionHeader';

/** Hồ sơ khách hàng & chi tiêu (Admin - CRM). */
export default function AdminCustomers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .customers()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: 'Khách hàng',
      dataIndex: 'HoTen',
      width: 170,
      ellipsis: true,
      render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
    },
    {
      title: 'SĐT',
      dataIndex: 'SoDienThoai',
      width: 116,
      render: (v) => <span className="tnum whitespace-nowrap">{v}</span>,
    },
    { title: 'Email', dataIndex: 'Email', width: 200, ellipsis: true, render: (v) => v || '—' },
    {
      // Hạng khách không phải trạng thái cần xử lý, nên không tô màu — phân cấp
      // bằng độ đậm của chữ. Tô vàng cho khách thân thiết là dùng màu để khen,
      // và chỗ nào cũng có thể khen thì màu hết nói được gì.
      title: 'Loại khách',
      dataIndex: 'LoaiKhach',
      width: 118,
      render: (v) =>
        v === 'ThanThiet' ? (
          <span className="font-semibold text-ink-950">Thân thiết</span>
        ) : (
          <span className="text-ink-600">Thường</span>
        ),
    },
    {
      title: 'Tổng chi tiêu',
      dataIndex: 'tong_tien_da_chi',
      width: 140,
      align: 'right',
      render: (v) => <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>,
    },
    {
      title: 'Số đơn',
      dataIndex: 'so_don',
      width: 84,
      align: 'right',
      render: (v) => <span className="tnum">{v ?? 0}</span>,
    },
    {
      title: 'Thanh toán đủ',
      dataIndex: 'so_don_da_thanh_toan',
      width: 134,
      align: 'right',
      render: (v) => <span className="tnum">{v ?? 0}</span>,
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} khách`}
        title="Hồ sơ khách hàng"
        description="Danh sách khách hàng kèm tổng chi tiêu và lịch sử đặt tour."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaKhachHang"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có khách hàng nào',
            description: 'Hồ sơ khách được tạo ngay khi có người đặt tour lần đầu.',
          }}
        />
      </div>
    </div>
  );
}
