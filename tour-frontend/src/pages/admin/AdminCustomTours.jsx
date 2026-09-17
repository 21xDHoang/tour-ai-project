import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { adminApi, customTourApi } from '../../api/http';
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
import ThanhLoc, { OLoc } from '../../components/ui/ThanhLoc';
import CustomTourEditDrawer from '../../components/CustomTourEditDrawer';

const TRANG_THAI_OPTIONS = Object.keys(TRANG_THAI_TOUR_RIENG).map((k) => ({
  value: k,
  label: TRANG_THAI_TOUR_RIENG[k].label,
}));

/** Quản lý yêu cầu tour thiết kế riêng (Admin - CRM). */
export default function AdminCustomTours() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cs, us] = await Promise.all([customTourApi.list(), adminApi.users()]);
      setRows(cs);
      setUsers(us);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = useMemo(
    () => (filter ? rows.filter((r) => r.TrangThai === filter) : rows),
    [rows, filter],
  );

  const columns = [
    {
      title: 'Khách',
      dataIndex: 'HoTen',
      width: 150,
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
      title: 'Xử lý',
      dataIndex: 'ten_nguoi_xu_ly',
      width: 116,
      ellipsis: true,
      render: (v) => v || <span className="text-ink-500">Chưa gán</span>,
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
        marker={loading ? null : `${data.length} yêu cầu`}
        title="Tour thiết kế riêng"
        description="Yêu cầu tour đoàn/gia đình/doanh nghiệp cần báo giá và chốt."
      />

      {/* Bộ lọc nằm trên bảng chứ không nằm cạnh tiêu đề: nó thuộc về bảng. */}
      <ThanhLoc className="mt-4">
        <OLoc nhan="Trạng thái" width={200}>
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            style={{ width: '100%' }}
            options={TRANG_THAI_OPTIONS}
            value={filter}
            onChange={setFilter}
          />
        </OLoc>
      </ThanhLoc>

      <div className="mt-4">
        <BangDuLieu
          rows={data}
          columns={columns}
          rowKey="MaYeuCau"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có yêu cầu nào',
            description:
              'Yêu cầu tour riêng của khách sẽ chờ báo giá và chốt ở đây.',
          }}
        />
      </div>

      <CustomTourEditDrawer
        open={!!editItem}
        item={editItem}
        users={users}
        isAdmin
        onClose={() => setEditItem(null)}
        onSaved={() => {
          setEditItem(null);
          load();
        }}
      />
    </div>
  );
}
