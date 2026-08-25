import { useCallback, useEffect, useState } from 'react';
import { Card, Spin, Table, Tag, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { bookingApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { TRANG_THAI_DAT_CHO, fmtDate, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

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

  const columns = [
    { title: 'Mã đơn', dataIndex: 'MaDatCho', width: 90 },
    { title: 'Khách hàng', dataIndex: 'ten_khach_hang' },
    { title: 'Tour', dataIndex: 'ten_tour', ellipsis: true },
    {
      title: 'Khởi hành',
      dataIndex: 'ngay_khoi_hanh',
      render: (v) => (v ? fmtDate(v) : '—'),
    },
    { title: 'Số khách', dataIndex: 'SoKhach', align: 'center', width: 90 },
    { title: 'Tổng tiền', dataIndex: 'TongTien', render: fmtVND },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_DAT_CHO[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    { title: 'Ngày đặt', dataIndex: 'NgayDat', render: (v) => fmtDate(v), width: 110 },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <CalendarOutlined /> Đơn phụ trách
        </Title>
        <Text type="secondary">
          Các đơn bạn đã đặt giúp khách — theo dõi từ Chờ cọc đến Đã thanh toán.
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
            dataSource={rows}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>
    </div>
  );
}
