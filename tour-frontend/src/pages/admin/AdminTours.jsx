import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, RobotOutlined, SettingOutlined } from '@ant-design/icons';
import { aiApi, tourApi } from '../../api/http';
import { fmtVND, LOAI_TOUR } from '../../utils/format';

const { Title, Text } = Typography;

const LOAI_OPTIONS = Object.entries(LOAI_TOUR).map(([value, label]) => ({
  value,
  label,
}));

/** Quản trị hệ thống: danh sách tour + thêm tour mới (Admin). */
export default function AdminTours() {
  const [tours, setTours] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [destOpen, setDestOpen] = useState(false);
  const [destSubmitting, setDestSubmitting] = useState(false);
  const [destForm] = Form.useForm();
  const [genMoTaLoading, setGenMoTaLoading] = useState(false);
  const [genLichLoading, setGenLichLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ts, ds] = await Promise.all([
        tourApi.list(),
        tourApi.destinations(),
      ]);
      setTours(ts);
      setDestinations(ds);
    } catch {
      setTours([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await tourApi.create({
        MaDiemDen: values.MaDiemDen,
        TenTour: values.TenTour,
        MoTa: values.MoTa || null,
        LichTrinhTomTat: values.LichTrinhTomTat || null,
        SoNgay: values.SoNgay,
        GiaCoBan: values.GiaCoBan,
        GiaKhuyenMai: values.GiaKhuyenMai ?? null,
        TrangThai: values.TrangThai || 'DangBan',
        LoaiTour: values.LoaiTour || 'TraiNghiem',
      });
      message.success('Đã tạo tour mới');
      setOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể tạo tour');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDest = async () => {
    const v = await destForm.validateFields();
    setDestSubmitting(true);
    try {
      const created = await tourApi.createDestination({
        TenDiemDen: v.TenDiemDen,
        KhuVuc: v.KhuVuc || null,
        MoTa: v.MoTa || null,
      });
      message.success('Đã thêm điểm đến mới');
      setDestOpen(false);
      destForm.resetFields();
      setDestinations(await tourApi.destinations());
      form.setFieldsValue({ MaDiemDen: created.MaDiemDen });
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể thêm điểm đến');
    } finally {
      setDestSubmitting(false);
    }
  };

  const generateField = async (field) => {
    let v;
    try {
      v = await form.validateFields(['TenTour', 'MaDiemDen', 'SoNgay']);
    } catch {
      return; // lỗi validate hiển thị ngay dưới từng ô
    }
    const dd = destinations.find((d) => d.MaDiemDen === v.MaDiemDen);
    const setLoading = field === 'mo_ta' ? setGenMoTaLoading : setGenLichLoading;
    setLoading(true);
    try {
      const res = await aiApi.generateTourDraft({
        TenTour: v.TenTour,
        TenDiemDen: dd?.TenDiemDen || '',
        SoNgay: v.SoNgay,
      });
      if (field === 'mo_ta') {
        form.setFieldsValue({ MoTa: res.mo_ta_tour });
      } else {
        const lich = (res.lich_trinh_ngay || [])
          .map((d, i) => `Ngay ${i + 1}: ${d}`)
          .join('; ');
        form.setFieldsValue({ LichTrinhTomTat: lich });
      }
      message.success('Đã sinh nội dung bằng AI');
    } catch (err) {
      message.error(err.response?.data?.detail || 'AI sinh nội dung thất bại');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'MaTour', width: 60 },
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
      title: 'Loại hình',
      dataIndex: 'LoaiTour',
      width: 170,
      render: (v) => LOAI_TOUR[v] || v || '—',
    },
    {
      title: 'Giá cơ bản',
      dataIndex: 'GiaCoBan',
      render: (v) => fmtVND(v),
    },
    {
      title: 'Giá khuyến mãi',
      dataIndex: 'GiaKhuyenMai',
      render: (v) => (v ? fmtVND(v) : '—'),
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
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card className="shadow-card" bordered={false}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Title level={3} className="!mb-1">
              <SettingOutlined /> Quản trị hệ thống — Tour
            </Title>
            <Text type="secondary">
              Quản lý chương trình tour và điểm đến.
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Thêm tour
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table rowKey="MaTour" columns={columns} dataSource={tours} />
        )}
      </Card>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={submitting}
        okText="Tạo tour"
        cancelText="Hủy"
        title="Thêm tour mới"
        width={560}
      >
        <Form form={form} layout="vertical" initialValues={{ TrangThai: 'DangBan', LoaiTour: 'TraiNghiem' }}>
          <Form.Item label="Điểm đến" required>
            <Space.Compact block>
              <Form.Item
                name="MaDiemDen"
                noStyle
                rules={[{ required: true, message: 'Chọn điểm đến' }]}
              >
                <Select
                  className="flex-1"
                  showSearch
                  placeholder="Chọn điểm đến"
                  optionFilterProp="label"
                  options={destinations.map((d) => ({
                    value: d.MaDiemDen,
                    label: `${d.TenDiemDen} (${d.KhuVuc})`,
                  }))}
                />
              </Form.Item>
              <Button
                icon={<PlusOutlined />}
                title="Thêm điểm đến mới"
                onClick={() => setDestOpen(true)}
              >
                Thêm điểm đến
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="TenTour"
            label="Tên tour"
            rules={[{ required: true, message: 'Nhập tên tour' }]}
          >
            <Input placeholder="vd: Phú Quốc 3N2D khám phá biển" />
          </Form.Item>
          <Form.Item name="LoaiTour" label="Danh mục tour">
            <Select options={LOAI_OPTIONS} placeholder="Chọn loại hình du lịch" />
          </Form.Item>
          <Space.Compact block>
            <Form.Item
              name="SoNgay"
              label="Số ngày"
              className="mr-2 flex-1"
              rules={[{ required: true, message: 'Nhập số ngày' }]}
            >
              <InputNumber min={1} max={30} className="w-full" />
            </Form.Item>
            <Form.Item
              name="GiaCoBan"
              label="Giá cơ bản (₫)"
              className="mr-2 flex-1"
              rules={[{ required: true, message: 'Nhập giá' }]}
            >
              <InputNumber min={1} step={100000} className="w-full" />
            </Form.Item>
            <Form.Item name="GiaKhuyenMai" label="Giá KM (₫)" className="flex-1">
              <InputNumber min={1} step={100000} className="w-full" />
            </Form.Item>
          </Space.Compact>
          <Form.Item
            name="MoTa"
            label={
              <span className="flex items-center gap-1">
                Mô tả
                <Button
                  size="small"
                  type="link"
                  icon={<RobotOutlined />}
                  loading={genMoTaLoading}
                  onClick={() => generateField('mo_ta')}
                >
                  AI sinh mô tả
                </Button>
              </span>
            }
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="LichTrinhTomTat"
            label={
              <span className="flex items-center gap-1">
                Lịch trình tóm tắt
                <Button
                  size="small"
                  type="link"
                  icon={<RobotOutlined />}
                  loading={genLichLoading}
                  onClick={() => generateField('lich_trinh')}
                >
                  AI sinh lịch trình
                </Button>
              </span>
            }
          >
            <Input.TextArea rows={2} placeholder="Ngay 1: ...; Ngay 2: ..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Thêm điểm đến nhanh ngay trong form tạo tour */}
      <Modal
        open={destOpen}
        onCancel={() => setDestOpen(false)}
        onOk={submitDest}
        confirmLoading={destSubmitting}
        okText="Thêm điểm đến"
        cancelText="Hủy"
        title="Thêm điểm đến mới"
      >
        <Form form={destForm} layout="vertical">
          <Form.Item
            name="TenDiemDen"
            label="Tên điểm đến"
            rules={[{ required: true, min: 2, message: 'Nhập tên điểm đến' }]}
          >
            <Input placeholder="vd: Da Nang, Sapa, Nha Trang..." />
          </Form.Item>
          <Form.Item name="KhuVuc" label="Khu vực">
            <Select
              placeholder="Chọn khu vực"
              allowClear
              options={['Mien Bac', 'Mien Trung', 'Mien Nam', 'Tay Nguyen', 'Mien Tay'].map(
                (k) => ({ value: k, label: k }),
              )}
            />
          </Form.Item>
          <Form.Item name="MoTa" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
