import { useCallback, useEffect, useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { customTourApi } from '../../api/http';
import {
  LOAI_DOAN,
  TRANG_THAI_TOUR_RIENG,
  fmtDate,
  fmtDateTime,
  fmtVND,
} from '../../utils/format';
import { tourRiengPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';
import CustomTourEditDrawer from '../../components/CustomTourEditDrawer';

/** Tour riêng phụ trách (Consultant). */
export default function ConsultantCustomTours() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await customTourApi.listMy());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      title: 'Khách',
      dataIndex: 'HoTen',
      width: 138,
      ellipsis: true,
      // Loại đoàn xuống dòng dưới tên khách chứ không chiếm một cột riêng:
      // "Doanh nghiệp" là chuỗi dài nhất trong bảng mà chỉ để nói một khái niệm
      // phụ, trong khi bề ngang ấy lấy từ cột tên khách — thứ phải đọc được.
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <div className="truncate text-[11.5px] text-ink-500">{LOAI_DOAN[r.LoaiDoan] || r.LoaiDoan}</div>
        </div>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'SoDienThoai',
      width: 104,
      render: (v) => <span className="tnum whitespace-nowrap">{v}</span>,
    },
    {
      title: 'Số khách',
      dataIndex: 'SoLuongKhach',
      width: 90,
      align: 'right',
      render: (v) => <span className="tnum">{v}</span>,
    },
    // 118 chứ không phải 104: tiêu đề "Ngày dự kiến" tự nó đã rộng ~90px, cột
    // hẹp hơn là tiêu đề xuống hai dòng và cả hàng tiêu đề cao gấp đôi.
    { title: 'Ngày dự kiến', dataIndex: 'NgayDuKien', width: 118, render: fmtDate },
    {
      title: 'Ngân sách',
      dataIndex: 'NganSach',
      width: 126,
      align: 'right',
      render: (v) => (v ? <span className="tnum">{fmtVND(v)}</span> : <span className="text-ink-400">—</span>),
    },
    {
      title: 'Giá chốt',
      dataIndex: 'GiaChot',
      width: 126,
      align: 'right',
      render: (v) =>
        v ? (
          <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 120,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${tourRiengPill(v)}`}>
          {TRANG_THAI_TOUR_RIENG[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'NgayTao',
      width: 148,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDateTime(v)}</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 92,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac chinh={{ nhan: 'Sửa', icon: <EditOutlined />, onClick: () => setEditItem(r) }} />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} yêu cầu`}
        title="Tour thiết kế riêng phụ trách"
        description="Xem chi tiết và chỉnh sửa toàn bộ yêu cầu tour đoàn/gia đình/doanh nghiệp (lịch trình từng ngày, nơi ở, bữa ăn, giá chốt) trước khi chốt đơn."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaYeuCau"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có yêu cầu nào',
            description: 'Yêu cầu tour riêng được gán cho bạn sẽ hiện ở đây.',
          }}
        />
      </div>

      <CustomTourEditDrawer
        open={!!editItem}
        item={editItem}
        isAdmin={false}
        onClose={() => setEditItem(null)}
        onSaved={() => {
          setEditItem(null);
          load();
        }}
      />
    </div>
  );
}
