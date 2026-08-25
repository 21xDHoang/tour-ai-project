import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, Row, Spin, Table, Tag, Typography } from 'antd';
import { CompassOutlined, RobotOutlined } from '@ant-design/icons';
import { tourApi } from '../../api/http';
import ChatBox from '../../components/ChatBox';
import { fmtVND } from '../../utils/format';

const { Title, Text, Paragraph } = Typography;

/** Bàn làm việc tư vấn (Consultant): danh mục tour + AI hỗ trợ. */
export default function ConsultantTours() {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tourApi
      .list()
      .then(setTours)
      .catch(() => setTours([]))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: 'Tour',
      dataIndex: 'TenTour',
      render: (v, r) => (
        <div>
          <div className="font-medium">{v}</div>
          <Text type="secondary" className="text-xs">
            {r.ten_diem_den} · {r.SoNgay} ngày
          </Text>
        </div>
      ),
    },
    {
      title: 'Điểm đến',
      dataIndex: 'ten_diem_den',
      render: (v) => v || '—',
    },
    {
      title: 'Giá',
      dataIndex: 'GiaKhuyenMai',
      render: (v, r) => (
        <div>
          <b className="text-indigo-600">{fmtVND(v ?? r.GiaCoBan)}</b>
          {v != null && v < r.GiaCoBan && (
            <div className="text-xs text-slate-400 line-through">
              {fmtVND(r.GiaCoBan)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => (
        <Tag color={v === 'DangBan' ? 'green' : 'red'}>
          {v === 'DangBan' ? 'Đang bán' : 'Ngừng bán'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'action',
      render: (_, r) => (
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={() => navigate(`/tours/${r.MaTour}`)}
        >
          Tư vấn &amp; Sinh nội dung AI
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card className="shadow-card" bordered={false}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Title level={3} className="!mb-1">
                  💼 Bàn làm việc tư vấn
                </Title>
                <Text type="secondary">
                  Chọn tour để mở chi tiết — dùng AI sinh mô tả &amp; lịch trình
                  (UC-11) hoặc trò chuyện với AI tư vấn.
                </Text>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Spin size="large" />
              </div>
            ) : (
              <Table
                rowKey="MaTour"
                columns={columns}
                dataSource={tours}
                pagination={false}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="shadow-card" bordered={false}>
            <Title level={4} className="!mb-2">
              <CompassOutlined /> Mẹo tư vấn
            </Title>
            <Paragraph className="text-slate-600">
              Hỏi AI bằng ngôn ngữ tự nhiên theo ngân sách, số ngày và sở thích
              để nhận tối đa 3 tour gợi ý kèm lý do.
            </Paragraph>
            <Paragraph className="text-slate-600">
              Ví dụ:{' '}
              <i>
                "Gia đình 4 người muốn đi biển 3 ngày 2 đêm, ngân sách khoảng 12
                triệu."
              </i>
            </Paragraph>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              💡 Chatbot AI nằm ở góc dưới bên phải màn hình.
            </div>
          </Card>
        </Col>
      </Row>

      <ChatBox />
    </div>
  );
}
