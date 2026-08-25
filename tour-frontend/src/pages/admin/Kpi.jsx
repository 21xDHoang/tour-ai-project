import { useEffect, useState } from 'react';
import { Card, Spin, Table, Tag, Typography } from 'antd';
import { dashboardApi } from '../../api/http';
import { VAI_TRO_LABEL } from '../../utils/format';

const { Title, Text } = Typography;

/** Bảng KPI nhân viên (Admin). */
export default function Kpi() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .kpiConsultants()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Nhân viên', dataIndex: 'HoTen' },
    {
      title: 'Vai trò',
      dataIndex: 'VaiTro',
      render: (v) => (
        <Tag color={v === 'Admin' ? 'volcano' : 'geekblue'}>
          {VAI_TRO_LABEL[v] || v}
        </Tag>
      ),
    },
    { title: 'Lead phụ trách', dataIndex: 'so_lead', align: 'center' },
    { title: 'Lead đang chốt', dataIndex: 'lead_dang_chot', align: 'center' },
    { title: 'Đơn đã tạo', dataIndex: 'so_don', align: 'center' },
    { title: 'Đơn thanh toán đủ', dataIndex: 'so_don_da_thanh_toan', align: 'center' },
    { title: 'Tour riêng xử lý', dataIndex: 'so_tour_rieng', align: 'center' },
    { title: 'Tour riêng chốt', dataIndex: 'tour_rieng_da_chot', align: 'center' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">📈 KPI nhân viên</Title>
        <Text type="secondary">
          Tổng hợp năng suất của từng Tư vấn viên: lead, đơn và tour thiết kế riêng.
        </Text>
      </div>
      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table rowKey="MaNguoiDung" columns={columns} dataSource={rows} />
        )}
      </Card>
    </div>
  );
}
