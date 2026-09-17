import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { CheckOutlined, CloseOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { reviewApi } from '../../api/http';
import { TRANG_THAI_PHAN_HOI, fmtDateTime } from '../../utils/format';
import { duyetPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

/** Kiểm duyệt đánh giá của khách (Admin - CRM). */
export default function AdminReviews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await reviewApi.list());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id, data, okMsg) => {
    try {
      await reviewApi.update(id, data);
      message.success(okMsg);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'MaPhanHoi',
      width: 66,
      render: (v) => <span className="tnum font-semibold text-ink-950">#{v}</span>,
    },
    { title: 'Khách hàng', dataIndex: 'ten_khach_hang', width: 130, ellipsis: true },
    { title: 'Tour', dataIndex: 'ten_tour', width: 170, ellipsis: true },
    {
      title: 'Sao',
      dataIndex: 'SoSao',
      width: 96,
      // Sao là thang điểm, không phải trạng thái — chấm sao vàng là quy ước ai
      // cũng đọc được, nên giữ nguyên vàng biển báo thay vì đổi sang mực.
      render: (v) => (
        <span className="whitespace-nowrap text-signal-600" aria-label={`${v} trên 5 sao`}>
          {'★'.repeat(v)}
          <span className="text-ink-300">{'☆'.repeat(5 - v)}</span>
        </span>
      ),
    },
    { title: 'Nội dung', dataIndex: 'NoiDung', width: 170, ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 124,
      render: (v, r) => (
        <div className="flex flex-col items-start gap-1">
          <span className={`chip !px-2 !py-0.5 !text-[11px] ${duyetPill(v)}`}>
            {TRANG_THAI_PHAN_HOI[v]?.label || v}
          </span>
          {!r.AnHien && <span className="text-[11px] text-ink-500">Đang ẩn</span>}
        </div>
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
      width: 196,
      fixed: 'right',
      render: (_, r) => {
        const isApproved = r.TrangThai === 'DaDuyet';
        return (
          <HangThaoTac
            chinh={
              !isApproved && r.TrangThai !== 'TuChoi'
                ? {
                    nhan: 'Duyệt',
                    icon: <CheckOutlined />,
                    onClick: () =>
                      update(
                        r.MaPhanHoi,
                        { TrangThai: 'DaDuyet', AnHien: true },
                        'Đã duyệt đánh giá',
                      ),
                  }
                : null
            }
            khac={[
              r.TrangThai !== 'TuChoi'
                ? {
                    nhan: 'Từ chối',
                    icon: <CloseOutlined />,
                    danger: true,
                    onClick: () =>
                      update(r.MaPhanHoi, { TrangThai: 'TuChoi' }, 'Đã từ chối đánh giá'),
                  }
                : null,
              {
                nhan: r.AnHien ? 'Ẩn' : 'Hiện',
                icon: <EyeInvisibleOutlined />,
                xacNhan: r.AnHien ? 'Ẩn đánh giá này?' : 'Hiện lại đánh giá này?',
                onClick: () =>
                  update(r.MaPhanHoi, { AnHien: !r.AnHien }, r.AnHien ? 'Đã ẩn' : 'Đã hiện'),
              },
            ]}
          />
        );
      },
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} đánh giá`}
        title="Kiểm duyệt đánh giá"
        description="Đánh giá khách gửi ở trạng thái Chờ duyệt; duyệt xong mới hiển thị trên web."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaPhanHoi"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có đánh giá nào',
            description: 'Đánh giá của khách sau chuyến đi sẽ chờ duyệt ở đây.',
          }}
        />
      </div>
    </div>
  );
}
