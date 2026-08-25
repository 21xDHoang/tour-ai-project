import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { EditOutlined, TagsOutlined } from '@ant-design/icons';
import { adminApi, customTourApi } from '../../api/http';
import {
  LOAI_DOAN,
  TRANG_THAI_TOUR_RIENG,
  fmtDate,
  fmtDateTime,
  fmtVND,
} from '../../utils/format';
import CustomTourEditDrawer from '../../components/CustomTourEditDrawer';

const { Title, Text } = Typography;

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
    { title: 'Khách', dataIndex: 'HoTen' },
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
    {
      title: 'Xử lý',
      dataIndex: 'ten_nguoi_xu_ly',
      render: (v) => v || <Text type="secondary">Chưa gán</Text>,
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            <TagsOutlined /> Tour thiết kế riêng
          </Title>
          <Text type="secondary">
            Yêu cầu tour đoàn/gia đình/doanh nghiệp cần báo giá và chốt.
          </Text>
        </div>
        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          style={{ width: 180 }}
          options={TRANG_THAI_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
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
            dataSource={data}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

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
