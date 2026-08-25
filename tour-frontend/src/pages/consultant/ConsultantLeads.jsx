import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CustomerServiceOutlined,
  DownOutlined,
  PlusOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { leadApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { TRANG_THAI_LEAD, fmtDateTime } from '../../utils/format';

const { Title, Text } = Typography;

const TRANG_THAI_ORDER = [
  'Moi',
  'DangLienHe',
  'DaBaoGia',
  'DangChot',
  'ThatBai',
];

/** Kanban Lead (Consultant): cột theo trạng thái phễu, nhận/đổi trạng thái. */
export default function ConsultantLeads() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await leadApi.listMy());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byState = useMemo(() => {
    const map = {};
    TRANG_THAI_ORDER.forEach((s) => {
      map[s] = rows.filter((r) => r.TrangThai === s);
    });
    return map;
  }, [rows]);

  const changeState = async (lead, TrangThai) => {
    try {
      await leadApi.update(lead.MaYeuCau, { TrangThai });
      message.success(`Đã chuyển sang ${TRANG_THAI_LEAD[TrangThai]?.label}`);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    }
  };

  const takeLead = async (lead) => {
    try {
      await leadApi.update(lead.MaYeuCau, { NguoiPhuTrachID: user.MaNguoiDung });
      message.success('Đã nhận lead');
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không nhận được lead');
    }
  };

  const createLead = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      await leadApi.create({
        HoTen: v.HoTen,
        SoDienThoai: v.SoDienThoai,
        Email: v.Email || null,
        NoiDung: v.NoiDung || null,
        TourQuanTam: v.TourQuanTam || null,
        Nguon: v.Nguon || 'Hotline',
      });
      message.success('Đã tạo lead');
      setOpenCreate(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Tạo lead thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const card = (lead) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <b className="text-sm">{lead.HoTen}</b>
        <Tag color={TRANG_THAI_LEAD[lead.TrangThai]?.color} className="!m-0">
          {TRANG_THAI_LEAD[lead.TrangThai]?.label}
        </Tag>
      </div>
      <Text type="secondary" className="text-xs">
        {lead.SoDienThoai}
      </Text>
      <div className="mt-1 text-xs text-slate-500">
        {lead.Nguon} · {fmtDateTime(lead.NgayTao)}
      </div>
      {lead.TourQuanTam && (
        <div className="mt-1 truncate text-xs text-indigo-600">
          🧳 {lead.TourQuanTam}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        {!lead.NguoiPhuTrachID && lead.TrangThai === 'Moi' ? (
          <Button size="small" icon={<UserAddOutlined />} onClick={() => takeLead(lead)}>
            Nhận
          </Button>
        ) : (
          <span className="text-xs text-slate-400">{lead.ten_nguoi_phu_trach || '—'}</span>
        )}

        {lead.TrangThai !== 'ThatBai' && (
          <Dropdown
            menu={{
              items: TRANG_THAI_ORDER.filter((s) => s !== lead.TrangThai).map((s) => ({
                key: s,
                label: `Chuyển: ${TRANG_THAI_LEAD[s].label}`,
              })),
              onClick: ({ key }) => changeState(lead, key),
            }}
          >
            <Button size="small" type="text">
              Đổi trạng thái <DownOutlined />
            </Button>
          </Dropdown>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            <CustomerServiceOutlined /> Kanban Lead
          </Title>
          <Text type="secondary">
            Quản lý lead phụ trách theo phễu chuyển đổi. Kéo dòng chuyển trạng thái.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenCreate(true)}>
          Thêm lead
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Đang tải…</div>
      ) : (
        <Row gutter={[12, 12]}>
          {TRANG_THAI_ORDER.map((s) => (
            <Col xs={24} sm={12} lg={5} key={s}>
              <div className="rounded-2xl bg-slate-100 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <b className="text-sm">{TRANG_THAI_LEAD[s].label}</b>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {byState[s].length}
                  </span>
                </div>
                <div className="space-y-2">
                  {byState[s].length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Trống
                    </div>
                  ) : (
                    byState[s].map((lead) => (
                      <div key={lead.MaYeuCau}>{card(lead)}</div>
                    ))
                  )}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        open={openCreate}
        onCancel={() => setOpenCreate(false)}
        onOk={createLead}
        confirmLoading={submitting}
        okText="Tạo lead"
        title="Thêm lead mới"
      >
        <Form form={form} layout="vertical" initialValues={{ Nguon: 'Hotline' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="HoTen"
                label="Họ tên"
                rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="SoDienThoai"
                label="SĐT"
                rules={[{ required: true, min: 8, message: 'Nhập SĐT' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="Email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="TourQuanTam" label="Tour quan tâm">
            <Input />
          </Form.Item>
          <Form.Item name="NoiDung" label="Nội dung">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="Nguon" label="Nguồn">
            <Select
              options={['Web', 'Chatbot', 'Fanpage', 'Zalo', 'Hotline'].map((n) => ({
                value: n,
                label: n,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
