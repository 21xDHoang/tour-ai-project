import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  CustomerServiceOutlined,
  RobotOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { aiApi, leadApi, tourApi } from '../api/http';
import { useAuth } from '../context/AuthContext';
import {
  TRANG_THAI_LICH,
  fmtDate,
  fmtVND,
} from '../utils/format';

const { Title, Paragraph, Text } = Typography;

/** Tách LichTrinhTomTat "Ngay 1: ...; Ngay 2: ..." thành các mốc. */
function parseItinerary(text) {
  if (!text) return [];
  return text
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Nối danh sách lịch trình từng ngày thành chuỗi "Ngay 1: ...; Ngay 2: ...". */
function formatLichTrinh(list) {
  return (list || [])
    .map((d, i) => {
      const cleaned = String(d).replace(/^(ngày|ngay)\s*\d+(?:\/\d+)?\s*[:.]\s*/i, '');
      return `Ngay ${i + 1}: ${cleaned}`;
    })
    .join('; ');
}

export default function TourDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadForm] = Form.useForm();

  useEffect(() => {
    setLoading(true);
    tourApi
      .detail(id)
      .then((data) => {
        setTour(data);
      })
      .catch(() => setTour(null))
      .finally(() => setLoading(false));
  }, [id]);

  const staff = user && ['Admin', 'Consultant'].includes(user.VaiTro);

  const itinerary = useMemo(
    () => parseItinerary(tour?.LichTrinhTomTat),
    [tour],
  );

  const generateContent = async () => {
    setGenLoading(true);
    try {
      const res = await aiApi.generateContent(Number(id));
      setAiResult(res);
      setModalOpen(true);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.detail || 'Không thể sinh nội dung');
    } finally {
      setGenLoading(false);
    }
  };

  const saveAiContent = async () => {
    setSaveLoading(true);
    try {
      await tourApi.update(Number(id), {
        MoTa: aiResult.mo_ta_tour,
        LichTrinhTomTat: formatLichTrinh(aiResult.lich_trinh_ngay),
      });
      message.success('Đã lưu nội dung AI vào tour');
      setModalOpen(false);
      const data = await tourApi.detail(id);
      setTour(data);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Lưu thất bại');
    } finally {
      setSaveLoading(false);
    }
  };

  const submitLead = async () => {
    const v = await leadForm.validateFields();
    setLeadSubmitting(true);
    try {
      await leadApi.create({
        HoTen: v.HoTen,
        SoDienThoai: v.SoDienThoai,
        Email: v.Email || null,
        NoiDung: v.NoiDung || null,
        TourQuanTam: tour.TenTour,
        Nguon: 'Web',
      });
      message.success('Đã ghi nhận — tư vấn viên sẽ liên hệ với bạn!');
      setLeadOpen(false);
      leadForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Gửi yêu cầu thất bại');
    } finally {
      setLeadSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Title level={3}>Không tìm thấy tour</Title>
        <Button onClick={() => navigate('/')}>Về trang chủ</Button>
      </div>
    );
  }

  const giaHienTai = tour.GiaKhuyenMai ?? tour.GiaCoBan;
  const soChoTotal = tour.ds_lich?.reduce((s, l) => s + (l.SoChoCon || 0), 0) || 0;

  const lichColumns = [
    {
      title: 'Ngày khởi hành',
      dataIndex: 'NgayKhoiHanh',
      render: (v) => fmtDate(v),
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'NgayKetThuc',
      render: (v) => fmtDate(v),
    },
    {
      title: 'Số chỗ còn',
      dataIndex: 'SoChoCon',
      render: (v) => (
        <Tag color={v > 0 ? 'green' : 'red'}>{v > 0 ? `${v} chỗ` : 'Hết chỗ'}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) => {
        const st = TRANG_THAI_LICH[v];
        return <Tag color={st?.color || 'default'}>{st?.label || v}</Tag>;
      },
    },
    {
      title: '',
      key: 'action',
      render: (_, lich) => (
        <Button
          type="primary"
          disabled={lich.SoChoCon <= 0 || lich.TrangThai !== 'MoBan'}
          onClick={() =>
            navigate(`/book/${lich.MaLich}`, {
              state: { tour, lich },
            })
          }
        >
          {lich.SoChoCon > 0 ? 'Đặt tour / Giữ chỗ 24h' : 'Hết chỗ'}
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb
        className="mb-4"
        items={[
          { title: <a onClick={() => navigate('/')}>Trang chủ</a> },
          { title: tour.ten_diem_den || 'Tour' },
          { title: tour.TenTour },
        ]}
      />

      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        className="mb-3"
      >
        Quay lại
      </Button>

      <Row gutter={[20, 20]}>
        {/* Ảnh & tổng quan */}
        <Col xs={24} lg={15}>
          <Card className="overflow-hidden shadow-card" bordered={false}>
            <div className="flex h-64 w-full items-center justify-center bg-gradient-to-br from-sky-400 to-indigo-600 text-7xl sm:h-80">
              🏝️
            </div>
            <div className="p-5">
              <Space className="mb-2">
                <Tag color="blue" icon={<CompassOutlined />}>
                  {tour.ten_diem_den || `Điểm đến #${tour.MaDiemDen}`}
                </Tag>
                <Tag icon={<CalendarOutlined />}>{tour.SoNgay} ngày</Tag>
                <Tag color="cyan">{soChoTotal} chỗ còn tổng cộng</Tag>
              </Space>

              <Title level={2} className="!mb-2">
                {tour.TenTour}
              </Title>

              <div className="mb-3 flex items-end gap-3">
                {tour.GiaKhuyenMai != null &&
                  tour.GiaKhuyenMai < tour.GiaCoBan && (
                    <Text delete type="secondary" className="text-base">
                      {fmtVND(tour.GiaCoBan)}
                    </Text>
                  )}
                <span className="text-3xl font-bold text-indigo-600">
                  {fmtVND(giaHienTai)}
                </span>
                <Text type="secondary">/ khách</Text>
              </div>

              <Paragraph className="text-slate-600">{tour.MoTa}</Paragraph>

              <Space wrap>
                <Button
                  type="primary"
                  icon={<CustomerServiceOutlined />}
                  onClick={() => setLeadOpen(true)}
                >
                  Tư vấn tour này
                </Button>
                {staff && (
                  <Button
                    type="primary"
                    ghost
                    icon={<RobotOutlined />}
                    loading={genLoading}
                    onClick={generateContent}
                  >
                    AI Sinh mô tả &amp; lịch trình (UC-11)
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </Col>

        {/* Lịch trình */}
        <Col xs={24} lg={9}>
          <Card title="Lịch trình từng ngày" className="h-full shadow-card" bordered={false}>
            {itinerary.length === 0 ? (
              <Text type="secondary">
                Chưa có lịch trình. Nhân viên có thể dùng AI để sinh lịch trình
                chi tiết.
              </Text>
            ) : (
              <Timeline
                items={itinerary.map((step, i) => ({
                  dot: i === 0 ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
                  color: i === 0 ? 'green' : 'blue',
                  children: (
                    <div>
                      <Text strong>Ngày {i + 1}</Text>
                      <div className="text-slate-600">{step.replace(/^Ngay\s*\d+\s*:\s*/i, '')}</div>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Lịch khởi hành */}
      <Card
        title="Các đợt lịch khởi hành"
        className="mt-5 shadow-card"
        bordered={false}
      >
        <Table
          rowKey="MaLich"
          columns={lichColumns}
          dataSource={tour.ds_lich || []}
          pagination={false}
          locale={{ emptyText: 'Hiện chưa có lịch khởi hành nào còn chỗ.' }}
        />
        <Alert
          className="mt-3"
          type="info"
          showIcon
          message="Đặt tour sẽ giữ chỗ trong 24 giờ (DR-02). Kế toán cần xác nhận cọc tối thiểu 30% tổng giá trị (DR-03)."
        />
      </Card>

      {/* Modal yêu cầu tư vấn */}
      <Modal
        open={leadOpen}
        onCancel={() => setLeadOpen(false)}
        onOk={submitLead}
        confirmLoading={leadSubmitting}
        okText="Gửi yêu cầu"
        title="Yêu cầu tư vấn tour"
      >
        <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          🧳 Tour quan tâm: <b>{tour.TenTour}</b>
        </div>
        <Form form={leadForm} layout="vertical">
          <Form.Item
            name="HoTen"
            label="Họ và tên"
            rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="SoDienThoai"
            label="Số điện thoại"
            rules={[{ required: true, min: 8, message: 'Nhập SĐT' }]}
          >
            <Input placeholder="0912345678" />
          </Form.Item>
          <Form.Item name="Email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="NoiDung" label="Bạn cần tư vấn thêm điều gì?">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal kết quả AI */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={640}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>Đóng</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveLoading}
              onClick={saveAiContent}
            >
              Lưu nội dung
            </Button>
          </div>
        }
        title={
          <Space>
            <RobotOutlined /> Nội dung AI sinh cho tour
            {aiResult?.nguon === 'Fallback' && <Tag color="orange">Fallback</Tag>}
          </Space>
        }
      >
        {aiResult && (
          <div className="pt-2">
            {aiResult.nguon === 'Fallback' && (
              <Alert
                className="mb-3"
                type="warning"
                showIcon
                message="Gemini tạm không khả dụng — hiển thị nội dung dự phòng."
              />
            )}
            <Paragraph>{aiResult.mo_ta_tour}</Paragraph>
            <Timeline
              items={aiResult.lich_trinh_ngay.map((ngay, i) => ({
                color: 'blue',
                children: (
                  <div>
                    <Text strong>Ngày {i + 1}</Text>
                    <div className="text-slate-600">{ngay}</div>
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
