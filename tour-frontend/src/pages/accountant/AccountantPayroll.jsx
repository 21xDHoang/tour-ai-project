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
  Upload,
  message,
} from 'antd';
import { DollarOutlined, DownloadOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { payrollApi } from '../../api/http';
import { exportToExcel } from '../../utils/exportExcel';
import { TRANG_THAI_LUONG, VAI_TRO_LABEL, fmtVND } from '../../utils/format';

const { Title, Text } = Typography;

const LOAI_LABEL = { NguoiDung: 'Văn phòng / Tài xế', HDV: 'Hướng dẫn viên' };

const THANG_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));
const NAM_OPTIONS = [2024, 2025, 2026, 2027].map((n) => ({ value: n, label: `${n}` }));

/** Quản lý nhân viên & lương (Kế toán). */
export default function AccountantPayroll() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thang, setThang] = useState(dayjs().month() + 1);
  const [nam, setNam] = useState(dayjs().year());
  const [sheet, setSheet] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form] = Form.useForm();

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      setEmployees(await payrollApi.employees());
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSheet = useCallback(async () => {
    setSheetLoading(true);
    try {
      setSheet(await payrollApi.sheet({ thang, nam }));
    } catch {
      setSheet([]);
    } finally {
      setSheetLoading(false);
    }
  }, [thang, nam]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const saveSheet = async (danhSach) => {
    setSaving(true);
    try {
      await payrollApi.upsertSheet({ thang, nam, danh_sach: danhSach });
      message.success('Đã lưu bảng lương');
      await loadSheet();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Lưu bảng lương thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Upload Excel "số công": cột HoTen | SoCong | SoTour | Thuong
  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        const mapByName = new Map(
          employees.map((emp) => [String(emp.ho_ten).toLowerCase().trim(), emp]),
        );
        const danhSach = [];
        for (const row of json) {
          const hoTen = String(row.HoTen ?? row['Họ tên'] ?? '').trim();
          if (!hoTen) continue;
          const emp = mapByName.get(hoTen.toLowerCase());
          if (!emp) continue;
          const soCong = Number(row.SoCong ?? row['Số công'] ?? 0);
          const soTour = Number(row.SoTour ?? row['Số tour'] ?? 0);
          const thuong = Number(row.Thuong ?? 0);
          if (emp.loai === 'NguoiDung') {
            danhSach.push({ ma_nguoi_dung: emp.ma, so_cong: soCong, so_tour: 0, thuong });
          } else {
            danhSach.push({ ma_hdv: emp.ma, so_cong: 0, so_tour: soTour, thuong });
          }
        }
        if (danhSach.length === 0) {
          message.warning('Không khớp nhân viên nào (kiểm tra cột HoTen)');
          return;
        }
        saveSheet(danhSach);
      } catch {
        message.error('Không đọc được file Excel');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const openEdit = (r) => {
    setEditItem(r);
    form.resetFields();
    form.setFieldsValue({ Thuong: r.Thuong, TrangThai: r.TrangThai, GhiChu: r.GhiChu });
  };

  const submitEdit = async () => {
    const v = await form.validateFields();
    try {
      await payrollApi.updateSheet(editItem.MaBangLuong, {
        Thuong: v.Thuong,
        TrangThai: v.TrangThai,
        GhiChu: v.GhiChu || null,
      });
      message.success('Đã cập nhật dòng lương');
      setEditItem(null);
      await loadSheet();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    }
  };

  const employeeColumns = [
    { title: 'Họ tên', dataIndex: 'ho_ten' },
    {
      title: 'Loại',
      dataIndex: 'loai',
      width: 150,
      render: (v, r) =>
        v === 'HDV' ? (
          <Tag color="blue">HDV</Tag>
        ) : (
          <Tag color="purple">{VAI_TRO_LABEL[r.vai_tro] || LOAI_LABEL[v] || v}</Tag>
        ),
    },
    {
      title: 'Cấu hình lương',
      key: 'config',
      render: (_, r) =>
        r.loai === 'HDV'
          ? `Thù lao ${fmtVND(r.dinh_muc_thu_lao)} · Công tác phí ${fmtVND(r.cong_tac_phi)}`
          : `HS ${r.he_so_luong} · CB ${fmtVND(r.luong_co_ban)} · Phụ cấp ${fmtVND(r.phu_cap)}`,
    },
  ];

  const sheetColumns = [
    { title: 'Nhân viên', dataIndex: 'ho_ten' },
    {
      title: 'Loại',
      dataIndex: 'loai',
      width: 130,
      render: (v) => <Tag color={v === 'HDV' ? 'blue' : 'purple'}>{LOAI_LABEL[v] || v}</Tag>,
    },
    { title: 'Số công', dataIndex: 'SoCong', align: 'center', width: 80 },
    { title: 'Số tour', dataIndex: 'SoTour', align: 'center', width: 80 },
    { title: 'Thưởng', dataIndex: 'Thuong', render: fmtVND, width: 120 },
    { title: 'Tổng lương', dataIndex: 'TongLuong', render: (v) => <b className="text-indigo-600">{fmtVND(v)}</b>, width: 140 },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 110,
      render: (v) => {
        const st = TRANG_THAI_LUONG[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      render: (_, r) => (
        <Button size="small" onClick={() => openEdit(r)}>Sửa</Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <DollarOutlined /> Quản lý nhân viên &amp; lương
        </Title>
        <Text type="secondary">
          Cấu hình lương nhân viên văn phòng/tài xế + hướng dẫn viên, upload số công và chốt lương tháng.
        </Text>
      </div>

      {/* Danh sách nhân viên + cấu hình lương */}
      <Card className="mb-4 shadow-card" bordered={false} title={<span><TeamOutlined /> Danh sách nhân viên</span>}>
        {loading ? (
          <div className="flex justify-center py-12"><Spin /></div>
        ) : (
          <Table rowKey={(r) => `${r.loai}-${r.ma}`} columns={employeeColumns} dataSource={employees} pagination={false} size="small" />
        )}
      </Card>

      {/* Bảng lương tháng */}
      <Card className="shadow-card" bordered={false}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <Text type="secondary">Chọn kỳ lương</Text>
            <Space className="mt-1">
              <Select style={{ width: 120 }} value={thang} onChange={setThang} options={THANG_OPTIONS} />
              <Select style={{ width: 100 }} value={nam} onChange={setNam} options={NAM_OPTIONS} />
            </Space>
          </div>
          <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleUpload}>
            <Button icon={<UploadOutlined />} loading={saving}>
              Upload Excel số công
            </Button>
          </Upload>
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportToExcel(
                `bang-luong-${thang}-${nam}`,
                [
                  { header: 'Nhân viên', key: 'ho_ten' },
                  { header: 'Loại', key: 'loai' },
                  { header: 'Số công', key: 'SoCong' },
                  { header: 'Số tour', key: 'SoTour' },
                  { header: 'Thưởng', getter: (r) => Number(r.Thuong) },
                  { header: 'Tổng lương', getter: (r) => Number(r.TongLuong) },
                  { header: 'Trạng thái', key: 'TrangThai' },
                ],
                sheet,
              )
            }
          >
            Xuất Excel
          </Button>
          <Text type="secondary" className="text-xs">
            File Excel gồm các cột: HoTen, SoCong, SoTour (HDV), Thuong
          </Text>
        </div>

        {sheetLoading ? (
          <div className="flex justify-center py-12"><Spin /></div>
        ) : (
          <Table
            rowKey="MaBangLuong"
            columns={sheetColumns}
            dataSource={sheet}
            pagination={false}
            size="small"
            locale={{ emptyText: 'Chưa có bảng lương — hãy upload Excel số công.' }}
          />
        )}
      </Card>

      {/* Modal sửa dòng lương */}
      <Modal
        open={!!editItem}
        onCancel={() => setEditItem(null)}
        onOk={submitEdit}
        okText="Lưu"
        title={`Sửa lương — ${editItem?.ho_ten}`}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="Thuong" label="Thưởng (₫)">
            <InputNumber className="w-full" min={0} step={100000} />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái duyệt">
            <Select options={Object.keys(TRANG_THAI_LUONG).map((k) => ({ value: k, label: TRANG_THAI_LUONG[k].label }))} />
          </Form.Item>
          <Form.Item name="GhiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
