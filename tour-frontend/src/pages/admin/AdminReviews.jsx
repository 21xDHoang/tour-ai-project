import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
  Popconfirm,
} from 'antd';
import { CheckOutlined, CloseOutlined, EyeInvisibleOutlined, HeartOutlined } from '@ant-design/icons';
import { reviewApi } from '../../api/http';
import { TRANG_THAI_PHAN_HOI, fmtDateTime } from '../../utils/format';

const { Title, Text } = Typography;

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
    { title: 'ID', dataIndex: 'MaPhanHoi', width: 70 },
    { title: 'Khách hàng', dataIndex: 'ten_khach_hang' },
    { title: 'Tour', dataIndex: 'ten_tour' },
    {
      title: 'Sao',
      dataIndex: 'SoSao',
      width: 90,
      render: (v) => <span className="text-amber-500">{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span>,
    },
    { title: 'Nội dung', dataIndex: 'NoiDung', ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v, r) => {
        const st = TRANG_THAI_PHAN_HOI[v];
        return (
          <Space direction="vertical" size={0}>
            <Tag color={st?.color}>{st?.label || v}</Tag>
            {!r.AnHien && <Text type="secondary" className="text-xs">Đang ẩn</Text>}
          </Space>
        );
      },
    },
    { title: 'Ngày tạo', dataIndex: 'NgayTao', render: fmtDateTime, width: 140 },
    {
      title: 'Thao tác',
      key: 'action',
      width: 260,
      render: (_, r) => {
        const isApproved = r.TrangThai === 'DaDuyet';
        return (
          <Space wrap>
            {!isApproved && r.TrangThai !== 'TuChoi' && (
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => update(r.MaPhanHoi, { TrangThai: 'DaDuyet', AnHien: true }, 'Đã duyệt đánh giá')}
              >
                Duyệt
              </Button>
            )}
            {r.TrangThai !== 'TuChoi' && (
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => update(r.MaPhanHoi, { TrangThai: 'TuChoi' }, 'Đã từ chối đánh giá')}
              >
                Từ chối
              </Button>
            )}
            <Popconfirm
              title={r.AnHien ? 'Ẩn đánh giá này?' : 'Hiện lại đánh giá này?'}
              onConfirm={() =>
                update(r.MaPhanHoi, { AnHien: !r.AnHien }, r.AnHien ? 'Đã ẩn' : 'Đã hiện')
              }
            >
              <Button size="small" icon={<EyeInvisibleOutlined />}>
                {r.AnHien ? 'Ẩn' : 'Hiện'}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <HeartOutlined /> Kiểm duyệt đánh giá
        </Title>
        <Text type="secondary">
          Đánh giá khách gửi ở trạng thái Chờ duyệt; duyệt xong mới hiển thị trên web.
        </Text>
      </div>
      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="MaPhanHoi"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>
    </div>
  );
}
