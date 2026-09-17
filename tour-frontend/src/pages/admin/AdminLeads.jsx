import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Modal, Select, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { adminApi, leadApi } from '../../api/http';
import { TRANG_THAI_LEAD, fmtDateTime } from '../../utils/format';
import { leadPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';
import ThanhLoc, { OLoc } from '../../components/ui/ThanhLoc';

const TRANG_THAI_OPTIONS = Object.keys(TRANG_THAI_LEAD).map((k) => ({
  value: k,
  label: TRANG_THAI_LEAD[k].label,
}));

/** Quản lý Lead & yêu cầu tư vấn (Admin - CRM). */
export default function AdminLeads() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ls, us] = await Promise.all([leadApi.list(), adminApi.users()]);
      setRows(ls);
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

  const consultantOptions = users
    .filter((u) => ['Consultant', 'Admin'].includes(u.VaiTro))
    .map((u) => ({ value: u.MaNguoiDung, label: `${u.HoTen} (${u.VaiTro})` }));

  const data = useMemo(
    () => (filter ? rows.filter((r) => r.TrangThai === filter) : rows),
    [rows, filter],
  );

  const openEdit = (r) => {
    form.resetFields();
    form.setFieldsValue({
      TrangThai: r.TrangThai,
      NguoiPhuTrachID: r.NguoiPhuTrachID ?? undefined,
    });
    setEditItem(r);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      await leadApi.update(editItem.MaYeuCau, {
        TrangThai: v.TrangThai,
        NguoiPhuTrachID: v.NguoiPhuTrachID ?? null,
      });
      message.success(`Đã cập nhật lead của ${editItem.HoTen}`);
      setEditItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Khách',
      dataIndex: 'HoTen',
      width: 140,
      ellipsis: true,
      render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
    },
    {
      title: 'SĐT',
      dataIndex: 'SoDienThoai',
      width: 108,
      render: (v) => <span className="tnum whitespace-nowrap">{v}</span>,
    },
    { title: 'Email', dataIndex: 'Email', width: 140, ellipsis: true, render: (v) => v || '—' },
    {
      title: 'Quan tâm',
      dataIndex: 'TourQuanTam',
      width: 150,
      ellipsis: true,
      render: (v) => v || '—',
    },
    { title: 'Nguồn', dataIndex: 'Nguon', width: 84, ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 118,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${leadPill(v)}`}>
          {TRANG_THAI_LEAD[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Phụ trách',
      dataIndex: 'ten_nguoi_phu_trach',
      width: 130,
      ellipsis: true,
      // Lead chưa gán cho ai là việc còn treo, không phải một giá trị rỗng —
      // chữ xám nói đúng điều đó mà không cần tới hệ màu riêng của AntD.
      render: (v) => v || <span className="text-ink-500">Chưa gán</span>,
    },
    {
      // 148 chứ không phải 128: "DD/MM/YYYY HH:mm" là 17 ký tự, và bảng dùng
      // `table-layout: fixed` nên cột hẹp hơn là cắt cụt giờ — chỗ đúng là chỗ
      // người dùng cần biết lead tới lúc mấy giờ.
      title: 'Ngày tạo',
      dataIndex: 'NgayTao',
      width: 148,
      render: (v) => <span className="tnum whitespace-nowrap">{fmtDateTime(v)}</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 92,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac chinh={{ nhan: 'Sửa', icon: <EditOutlined />, onClick: () => openEdit(r) }} />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${data.length} lead`}
        title="Lead & yêu cầu tư vấn"
        description="Theo dõi phễu chuyển đổi từ Web, Chatbot, Fanpage, Zalo, Hotline."
      />

      {/* Bộ lọc nằm trên bảng chứ không nằm cạnh tiêu đề: nó thuộc về bảng, và
          đứng riêng một dải thì không tranh chỗ với tiêu đề khi cửa sổ hẹp. */}
      <ThanhLoc className="mt-4">
        <OLoc nhan="Trạng thái" width={200}>
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            style={{ width: '100%' }}
            options={TRANG_THAI_OPTIONS}
            value={filter}
            onChange={setFilter}
          />
        </OLoc>
      </ThanhLoc>

      <div className="mt-4">
        <BangDuLieu
          rows={data}
          columns={columns}
          rowKey="MaYeuCau"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có lead nào',
            description: 'Yêu cầu tư vấn từ web, chatbot và hotline sẽ đổ về đây.',
          }}
        />
      </div>

      <Modal
        open={!!editItem}
        onCancel={() => setEditItem(null)}
        onOk={submit}
        confirmLoading={submitting}
        okText="Lưu"
        title={`Cập nhật lead — ${editItem?.HoTen}`}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="TrangThai" label="Trạng thái">
            <Select options={TRANG_THAI_OPTIONS} />
          </Form.Item>
          <Form.Item name="NguoiPhuTrachID" label="Người phụ trách">
            <Select
              allowClear
              placeholder="Chọn tư vấn viên"
              options={consultantOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
