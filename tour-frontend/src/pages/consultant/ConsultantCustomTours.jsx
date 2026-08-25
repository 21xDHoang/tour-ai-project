import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Spin, Table, Tag, Typography } from 'antd';
import { EditOutlined, TagsOutlined } from '@ant-design/icons';
import { customTourApi } from '../../api/http';
import {
  LOAI_DOAN,
  TRANG_THAI_TOUR_RIENG,
  fmtDate,
  fmtDateTime,
  fmtVND,
} from '../../utils/format';
import CustomTourEditDrawer from '../../components/CustomTourEditDrawer';

const { Title, Text } = Typography;

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
    { title: 'Khách', dataIndex: 'HoTen' },
    { title: 'SĐT', dataIndex: 'SoDienThoai' },
    {
      title: 'Loại đoàn',
      dataIndex: 'LoaiDoan',
      render: (v) => LOAI_DOAN[v] || v,
    },
    { title: 'Số khách', dataIndex: 'SoLuongKhach', align: 'center', width: 90 },
    { title: 'Ngày dự kiến', dataIndex: 'NgayDuKien', render: fmtDate, width: 110 },
    {
      title: 'Ngân sách',
      dataIndex: 'NganSach',
      render: (v) => (v ? fmtVND(v) : '—'),
    },
    {
      title: 'Giá chốt',
      dataIndex: 'GiaChot',
      render: (v) => (v ? fmtVND(v) : <Text type="secondary">—</Text>),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_TOUR_RIENG[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    { title: 'Ngày tạo', dataIndex: 'NgayTao', render: fmtDateTime, width: 140 },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      render: (_, r) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditItem(r)}>
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <TagsOutlined /> Tour thiết kế riêng phụ trách
        </Title>
        <Text type="secondary">
          Xem chi tiết và chỉnh sửa toàn bộ yêu cầu tour đoàn/gia đình/doanh nghiệp
          (lịch trình từng ngày, nơi ở, bữa ăn, giá chốt) trước khi chốt đơn.
        </Text>
      </div>
      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="MaYeuCau"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>

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
