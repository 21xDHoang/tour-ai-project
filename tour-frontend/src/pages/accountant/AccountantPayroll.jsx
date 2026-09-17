import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Upload,
  message,
} from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { payrollApi } from '../../api/http';
import { exportToExcel } from '../../utils/exportExcel';
import { TRANG_THAI_LUONG, VAI_TRO_LABEL, fmtVND } from '../../utils/format';
import { duyetPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

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

  const nutUpload = (
    <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleUpload}>
      <button type="button" className="btn btn-ghost" disabled={saving}>
        <UploadOutlined /> {saving ? 'Đang lưu…' : 'Upload Excel số công'}
      </button>
    </Upload>
  );

  const employeeColumns = [
    {
      title: 'Nhân viên',
      dataIndex: 'ho_ten',
      ellipsis: true,
      render: (v) => <span className="font-semibold text-ink-950">{v}</span>,
    },
    {
      title: 'Loại',
      dataIndex: 'loai',
      width: 170,
      render: (v, r) =>
        v === 'HDV' ? 'Hướng dẫn viên' : VAI_TRO_LABEL[r.vai_tro] || LOAI_LABEL[v] || v,
    },
    {
      // Cấu hình lương để nguyên một cột chứ không xuống dòng dưới tên: đây là
      // con số để đối chiếu, xếp thành cột thì so được từ trên xuống.
      title: 'Cấu hình lương',
      key: 'config',
      ellipsis: true,
      render: (_, r) =>
        r.loai === 'HDV'
          ? `Thù lao ${fmtVND(r.dinh_muc_thu_lao)} · Công tác phí ${fmtVND(r.cong_tac_phi)}`
          : `HS ${r.he_so_luong} · CB ${fmtVND(r.luong_co_ban)} · Phụ cấp ${fmtVND(r.phu_cap)}`,
    },
  ];

  const sheetColumns = [
    {
      // Loại nhân viên xuống dòng dưới tên, nhường bề ngang cho bốn cột số.
      title: 'Nhân viên',
      dataIndex: 'ho_ten',
      ellipsis: true,
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <div className="truncate text-[11.5px] text-ink-500">{LOAI_LABEL[r.loai] || r.loai}</div>
        </div>
      ),
    },
    { title: 'Số công', dataIndex: 'SoCong', align: 'right', width: 100, render: (v) => <span className="tnum">{v ?? 0}</span> },
    { title: 'Số tour', dataIndex: 'SoTour', align: 'right', width: 100, render: (v) => <span className="tnum">{v ?? 0}</span> },
    { title: 'Thưởng', dataIndex: 'Thuong', align: 'right', width: 126, render: (v) => <span className="tnum">{fmtVND(v)}</span> },
    {
      title: 'Tổng lương',
      dataIndex: 'TongLuong',
      align: 'right',
      width: 140,
      render: (v) => <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 120,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${duyetPill(v)}`}>
          {TRANG_THAI_LUONG[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 92,
      fixed: 'right',
      render: (_, r) => <HangThaoTac chinh={{ nhan: 'Sửa', onClick: () => openEdit(r) }} />,
    },
  ];

  const rongBang = sheetColumns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full space-y-6">
      <SectionHeader
        marker={loading ? null : `${employees.length} người`}
        title="Quản lý nhân viên & lương"
        description="Cấu hình lương nhân viên văn phòng/tài xế + hướng dẫn viên, upload số công và chốt lương tháng."
      />

      <section>
        <h3 className="font-display text-title mb-3 text-ink-950">Danh sách nhân viên</h3>
        <BangDuLieu
          rows={employees}
          columns={employeeColumns}
          rowKey={(r) => `${r.loai}-${r.ma}`}
          x="max-content"
          loading={loading}
          pagination={false}
          empty={{
            title: 'Chưa có nhân viên nào',
            description: 'Nhân viên và hướng dẫn viên được tạo ở màn Quản lý người dùng.',
          }}
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h3 className="font-display text-title text-ink-950">
            Bảng lương tháng {thang}/{nam}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Select style={{ width: 118 }} value={thang} onChange={setThang} options={THANG_OPTIONS} />
            <Select style={{ width: 96 }} value={nam} onChange={setNam} options={NAM_OPTIONS} />
            {nutUpload}
            <button
              type="button"
              className="btn btn-ghost"
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
              <DownloadOutlined /> Xuất Excel
            </button>
          </div>
        </div>

        <p className="mb-3 text-body-s text-ink-600">
          File Excel số công gồm các cột <b className="font-semibold">HoTen</b>,{' '}
          <b className="font-semibold">SoCong</b>, <b className="font-semibold">SoTour</b> (chỉ
          HDV), <b className="font-semibold">Thuong</b>. Tên phải khớp đúng với cột Nhân viên ở
          bảng trên.
        </p>

        <BangDuLieu
          rows={sheet}
          columns={sheetColumns}
          rowKey="MaBangLuong"
          x={rongBang}
          loading={sheetLoading}
          pagination={false}
          empty={{
            title: `Chưa có bảng lương tháng ${thang}/${nam}`,
            description:
              'Tải file Excel số công lên để tính lương cả tháng, hoặc sửa từng dòng sau khi đã có bảng lương.',
            action: nutUpload,
          }}
        />
      </section>

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
