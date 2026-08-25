import { useEffect, useState } from 'react';
import { Card, Spin, Table, Tag, Typography } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/http';
import { fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

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
    { title: 'Khách hàng', dataIndex: 'HoTen' },
    { title: 'SĐT', dataIndex: 'SoDienThoai' },
    { title: 'Email', dataIndex: 'Email', render: (v) => v || '—' },
    {
      title: 'Loại khách',
      dataIndex: 'LoaiKhach',
      render: (v) => (
        <Tag color={v === 'ThanThiet' ? 'gold' : 'default'}>
          {v === 'ThanThiet' ? 'Thân thiết' : 'Thường'}
        </Tag>
      ),
    },
    {
      title: 'Tổng chi tiêu',
      dataIndex: 'tong_tien_da_chi',
      render: (v) => <b>{fmtVND(v)}</b>,
    },
    { title: 'Số đơn', dataIndex: 'so_don', align: 'center' },
    {
      title: 'Thanh toán đủ',
      dataIndex: 'so_don_da_thanh_toan',
      align: 'center',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <TeamOutlined /> Hồ sơ khách hàng
        </Title>
        <Text type="secondary">
          Danh sách khách hàng kèm tổng chi tiêu và lịch sử đặt tour.
        </Text>
      </div>
      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table rowKey="MaKhachHang" columns={columns} dataSource={rows} />
        )}
      </Card>
    </div>
  );
}
