import { useCallback, useEffect, useState } from 'react';
import { Card, Spin, Table, Tag, Typography } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { bookingApi } from '../../api/http';
import { TRANG_THAI_DAT_CHO, fmtDateTime, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

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
    { title: 'Mã đơn', dataIndex: 'MaDatCho', width: 90 },
    { title: 'Khách hàng', dataIndex: 'ten_khach_hang' },
    { title: 'Tour', dataIndex: 'ten_tour', ellipsis: true },
    { title: 'Điểm đến', dataIndex: 'ten_diem_den', render: (v) => v || '—' },
    {
      title: 'Người tạo',
      dataIndex: 'ten_nguoi_tao',
      render: (v) => v || <Text type="secondary">Web</Text>,
    },
    { title: 'Thời điểm', dataIndex: 'NgayDat', render: fmtDateTime, width: 140 },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_DAT_CHO[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    { title: 'Tổng tiền', dataIndex: 'TongTien', render: fmtVND },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <HistoryOutlined /> Nhật ký hoạt động
        </Title>
        <Text type="secondary">
          Ghi nhận các giao dịch đặt chỗ gần nhất theo thời gian thực.
        </Text>
      </div>
      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="MaDatCho"
            columns={columns}
            dataSource={sorted}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>
    </div>
  );
}
