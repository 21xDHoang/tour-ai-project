import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { bookingApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { TRANG_THAI_DAT_CHO, fmtDate, fmtVND } from '../../utils/format';
import { donPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

/** Đơn đặt chỗ do tư vấn viên tạo (Consultant). */
export default function ConsultantOrders() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await bookingApi.listAll();
      setRows((all || []).filter((o) => o.NguoiTaoID === user?.MaNguoiDung));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.MaNguoiDung]);

  useEffect(() => {
    load();
  }, [load]);

  const ghiNhanChuyenKhoan = async (r) => {
    try {
      await bookingApi.xacNhanChuyenKhoan(r.MaDatCho, { HinhAnh: null });
      message.success(`Đơn #${r.MaDatCho}: đã ghi nhận khách chuyển khoản`);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Thao tác thất bại');
    }
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'MaDatCho',
      width: 84,
      render: (v) => <span className="tnum font-semibold text-ink-950">#{v}</span>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'ten_khach_hang',
      width: 140,
      ellipsis: true,
    },
    { title: 'Tour', dataIndex: 'ten_tour', ellipsis: true },
    {
      title: 'Khởi hành',
      dataIndex: 'ngay_khoi_hanh',
      width: 108,
      render: (v) => (v ? fmtDate(v) : <span className="text-ink-400">—</span>),
    },
    {
      // 100 chứ không phải 76: ô chỉ chứa một chữ số, nhưng bề ngang cột do
      // TIÊU ĐỀ quyết định — "Số khách" hẹp hơn là tiêu đề xuống hai dòng và
      // cả hàng tiêu đề cao gấp đôi.
      title: 'Số khách',
      dataIndex: 'SoKhach',
      width: 100,
      align: 'right',
      render: (v) => <span className="tnum">{v}</span>,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'TongTien',
      width: 126,
      align: 'right',
      render: (v) => <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>,
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
      title: 'Ngày đặt',
      dataIndex: 'NgayDat',
      width: 110,
      render: (v) => fmtDate(v),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 156,
      fixed: 'right',
      // Chỉ đơn đang giữ chỗ mới có việc để làm; những đơn khác để trống hẳn
      // thay vì một dấu gạch — cột này không có gì để đọc thì đừng bày ra.
      render: (_, r) =>
        r.TrangThai === 'GiuCho' ? (
          <HangThaoTac
            chinh={{
              nhan: 'Đã chuyển khoản',
              icon: <BankOutlined />,
              onClick: () => ghiNhanChuyenKhoan(r),
            }}
          />
        ) : null,
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} đơn`}
        title="Đơn phụ trách"
        description="Các đơn bạn đã đặt giúp khách — theo dõi từ Chờ cọc đến Đã thanh toán."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaDatCho"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có đơn nào',
            description: 'Đơn bạn đặt giúp khách ở quầy tư vấn sẽ hiện ở đây.',
          }}
        />
      </div>
    </div>
  );
}
