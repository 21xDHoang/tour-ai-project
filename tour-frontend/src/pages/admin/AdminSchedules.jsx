import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  RobotOutlined,
  ScheduleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { aiApi, guideApi, tourApi } from '../../api/http';
import { TRANG_THAI_LICH, fmtDate } from '../../utils/format';

const { Title, Text } = Typography;

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLich, setSuggestLich] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestData, setSuggestData] = useState(null);
  const [guideMap, setGuideMap] = useState({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLich, setAssignLich] = useState(null);
  const [available, setAvailable] = useState([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignForm] = Form.useForm();

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const tours = await tourApi.list();
      const items = [];
      for (const t of tours) {
        const detail = await tourApi.detail(t.MaTour);
        for (const l of detail.ds_lich || []) {
          items.push({ tour: detail, lich: l });
        }
      }
      setSchedules(items);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // ------------------------------ Gợi ý AI (UC-13) ------------------------------
  const openSuggest = async (item) => {
    setSuggestLich(item);
    setSuggestOpen(true);
    setSuggestLoading(true);
    setSuggestData(null);
    try {
      const [dx, hdvs] = await Promise.all([
        aiApi.suggestGuides(item.lich.MaLich),
        guideApi.available(item.lich.MaLich),
      ]);
      const map = {};
      hdvs.forEach((h) => {
        map[h.MaHDV] = h;
      });
      setGuideMap(map);
      setSuggestData(dx);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể gợi ý HDV');
    } finally {
      setSuggestLoading(false);
    }
  };

  // ------------------------------ Phân công HDV (DR-05) ------------------------------
  const openAssign = async (item) => {
    setAssignLich(item);
    setAssignOpen(true);
    assignForm.resetFields();
    try {
      const hdvs = await guideApi.available(item.lich.MaLich);
      setAvailable(hdvs);
    } catch {
      setAvailable([]);
    }
  };

  const submitAssign = async () => {
    const values = await assignForm.validateFields();
    setAssignSubmitting(true);
    try {
      const res = await guideApi.assign({
        MaLich: assignLich.lich.MaLich,
        MaHDV: values.MaHDV,
        VaiTro: values.VaiTro || 'TruongDoan',
        GhiChu: values.GhiChu || null,
      });
      message.success(`Đã phân công HDV #${res.MaHDV} vào lịch #${res.MaLich}`);
      setAssignOpen(false);
      loadSchedules();
    } catch (err) {
      // DR-05: backend từ chối khi trùng khoảng thời gian
      message.error(err.response?.data?.detail || 'Phân công thất bại');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Tour',
      key: 'tour',
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.tour.TenTour}</div>
          <Text type="secondary" className="text-xs">
            {r.tour.ten_diem_den}
          </Text>
        </div>
      ),
    },
    {
      title: 'Khởi hành',
      dataIndex: ['lich', 'NgayKhoiHanh'],
      render: (v) => fmtDate(v),
    },
    {
      title: 'Kết thúc',
      dataIndex: ['lich', 'NgayKetThuc'],
      render: (v) => fmtDate(v),
    },
    {
      title: 'Số chỗ còn',
      dataIndex: ['lich', 'SoChoCon'],
      render: (v) => <Tag color={v > 0 ? 'green' : 'red'}>{v}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: ['lich', 'TrangThai'],
      render: (v) => {
        const st = TRANG_THAI_LICH[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, r) => (
        <Space wrap>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={() => openSuggest(r)}
          >
            Gợi ý AI
          </Button>
          <Button icon={<TeamOutlined />} onClick={() => openAssign(r)}>
            Phân công HDV
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card className="shadow-card" bordered={false}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Title level={3} className="!mb-1">
              <ScheduleOutlined /> Điều hành &amp; Phân công HDV
            </Title>
            <Text type="secondary">
              Dùng AI đề xuất Top 3 HDV phù hợp (UC-13) hoặc phân công thủ công —
              chỉ hiển thị HDV rảnh trong khoảng thời gian lịch (DR-05).
            </Text>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : schedules.length === 0 ? (
          <Alert type="info" showIcon message="Chưa có lịch khởi hành nào." />
        ) : (
          <Table
            rowKey={(r) => r.lich.MaLich}
            columns={columns}
            dataSource={schedules}
            pagination={false}
          />
        )}
      </Card>

      {/* ------------------------------ Modal Gợi ý AI ------------------------------ */}
      <Modal
        open={suggestOpen}
        onCancel={() => setSuggestOpen(false)}
        footer={null}
        title={
          <Space>
            <RobotOutlined /> Gợi ý HDV cho lịch #{suggestLich?.lich.MaLich}
            {suggestData?.nguon === 'Fallback' && (
              <Tag color="orange">Fallback</Tag>
            )}
          </Space>
        }
      >
        {suggestLoading ? (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        ) : !suggestData ? (
          <Alert type="warning" showIcon message="Không có dữ liệu đề xuất." />
        ) : (
          <div className="pt-2">
            {suggestData.nguon === 'Fallback' && (
              <Alert
                className="mb-3"
                type="warning"
                showIcon
                message="Gemini tạm không khả dụng — đề xuất dựa trên điểm heuristic."
              />
            )}
            <List
              itemLayout="horizontal"
              dataSource={suggestData.danh_sach}
              renderItem={(item, i) => {
                const g = guideMap[item.ma_hdv];
                return (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color="blue">#{i + 1}</Tag>
                          <span className="font-medium">
                            {g?.HoTen || `HDV #${item.ma_hdv}`}
                          </span>
                          {g?.ChuyenMon && (
                            <Tag>{g.ChuyenMon}</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <Progress
                            percent={Number(item.diem_tuong_dong)}
                            strokeColor={{
                              '0%': '#108ee9',
                              '100%': '#87d068',
                            }}
                            size="small"
                            format={(p) => `${p}% khớp`}
                          />
                          <Text className="text-sm text-slate-600">
                            {item.ly_do}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </Modal>

      {/* ------------------------------ Modal Phân công ------------------------------ */}
      <Modal
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={submitAssign}
        confirmLoading={assignSubmitting}
        okText="Phân công"
        cancelText="Hủy"
        title={`Phân công HDV — lịch #${assignLich?.lich.MaLich}`}
      >
        <Alert
          type="info"
          showIcon
          className="mb-3"
          message="Danh sách chỉ gồm HDV RẢNH (DR-05) — HDV đang bận lịch trùng khoảng thời gian đã bị loại."
        />
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="MaHDV"
            label="Hướng dẫn viên"
            rules={[{ required: true, message: 'Chọn HDV' }]}
          >
            <Select
              placeholder="Chọn HDV rảnh"
              options={available.map((h) => ({
                value: h.MaHDV,
                label: `${h.HoTen} (${h.ChuyenMon || 'chưa có chuyên môn'}, ${h.SoNamKinhNghiem} năm)`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="VaiTro"
            label="Vai trò"
            initialValue="TruongDoan"
          >
            <Select
              options={[
                { value: 'TruongDoan', label: 'Trưởng đoàn' },
                { value: 'PhuDoan', label: 'Phó đoàn' },
              ]}
            />
          </Form.Item>
          <Form.Item name="GhiChu" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm (không bắt buộc)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
