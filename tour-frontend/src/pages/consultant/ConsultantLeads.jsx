import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Col,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Select,
  message,
} from 'antd';
import { DownOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import { leadApi } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { TRANG_THAI_LEAD, fmtDateTime } from '../../utils/format';
import { leadDot } from '../../utils/signs';
import SectionHeader from '../../components/ui/SectionHeader';

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

  // Thẻ không còn viên trạng thái: cột đã nói trạng thái rồi, nhắc lại ở từng
  // thẻ là lặp. Màu chuyển lên đầu cột — đúng chỗ người ta nhìn để biết cột nào
  // đang cần xử lý.
  const card = (lead) => (
    <div className="rounded-card border border-ink-200 bg-white p-3 shadow-panel">
      <b className="block truncate text-sm text-ink-950">{lead.HoTen}</b>
      <div className="tnum mt-0.5 text-xs text-ink-600">{lead.SoDienThoai}</div>
      <div className="mt-1 text-[11.5px] text-ink-500">
        {lead.Nguon} · {fmtDateTime(lead.NgayTao)}
      </div>
      {lead.TourQuanTam && (
        <div className="mt-1 truncate text-xs text-guide-600">{lead.TourQuanTam}</div>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        {!lead.NguoiPhuTrachID && lead.TrangThai === 'Moi' ? (
          <Button
            size="small"
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => takeLead(lead)}
            className="!rounded-field !text-[12.5px] !font-semibold"
          >
            Nhận
          </Button>
        ) : /* Bảng này chỉ có lead của chính người đang xem (`listMy`), nên in
             tên người phụ trách ra là lặp lại tên mình ở mọi thẻ — chỗ hẹp nhất
             của thẻ lại dành cho thông tin không phân biệt được gì. Chỉ hiện khi
             lead thuộc về người khác, lúc đó nó mới là thông tin. */
        lead.NguoiPhuTrachID && lead.NguoiPhuTrachID !== user.MaNguoiDung ? (
          <span className="min-w-0 truncate text-xs text-ink-600">
            {lead.ten_nguoi_phu_trach || 'Người khác phụ trách'}
          </span>
        ) : null}

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
            <button
              type="button"
              className="btn btn-ghost !ml-auto !shrink-0 !px-2 !py-1 !text-[12.5px]"
            >
              Đổi trạng thái <DownOutlined className="!text-[10px]" />
            </button>
          </Dropdown>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} lead`}
        title="Kanban Lead"
        description="Lead đang phụ trách, xếp theo phễu chuyển đổi. Đổi trạng thái bằng nút trên từng thẻ."
        action={
          <button type="button" className="btn btn-ink" onClick={() => setOpenCreate(true)}>
            <PlusOutlined /> Thêm lead
          </button>
        }
      />

      {/* 5 cột chia đều theo bề ngang còn lại thay vì `lg={5}` của AntD: 5×5=25
          ô, vượt lưới 24 nên cột "Thất bại" luôn bị đẩy xuống hàng dưới.
          `min-w-[176px]` là chỗ hay bị bỏ sót: mục flex mặc định có
          `min-width: auto`, mà thẻ lead lại chứa chữ `truncate` (tức
          `white-space: nowrap`) nên min-content của thẻ bằng cả câu chưa cắt —
          rộng hơn `flex-basis` 200px, và cả cột thứ năm bị đẩy xuống hàng dưới
          dù tổng bề ngang thừa sức chứa. */}
      <Row gutter={[12, 12]} className="mt-6">
        {TRANG_THAI_ORDER.map((s) => (
          <Col flex="1 1 200px" className="min-w-[176px]" key={s}>
            <div className="rounded-card bg-paper-deep p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={`h-2 w-2 shrink-0 rounded-full ${leadDot(s)}`} />
                <b className="min-w-0 flex-1 truncate text-sm text-ink-950">
                  {TRANG_THAI_LEAD[s].label}
                </b>
                <span className="tnum shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-600">
                  {loading ? '·' : byState[s].length}
                </span>
              </div>
              <div className="space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    <div className="skeleton h-24 rounded-card" />
                    <div className="skeleton h-24 rounded-card" />
                  </div>
                ) : byState[s].length === 0 ? (
                  <div className="py-4 text-center text-xs text-ink-500">Trống</div>
                ) : (
                  byState[s].map((lead) => <div key={lead.MaYeuCau}>{card(lead)}</div>)
                )}
              </div>
            </div>
          </Col>
        ))}
      </Row>

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
