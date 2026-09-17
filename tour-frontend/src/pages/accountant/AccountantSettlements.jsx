import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  message,
} from 'antd';
import { DownloadOutlined, LockOutlined } from '@ant-design/icons';
import { settlementApi } from '../../api/http';
import { exportToExcel } from '../../utils/exportExcel';
import { fmtDate, fmtVND } from '../../utils/format';
import { quyetToanPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

const TRANG_THAI_QUYET_TOAN = {
  ChuaQuyetToan: { label: 'Chưa quyết toán' },
  ChoQuyetToan: { label: 'Đang quyết toán' },
  DaKhoaSo: { label: 'Đã khóa sổ' },
};

/** Quyết toán đoàn tour (Tour P&L - lãi/lỗ theo chuyến). */
export default function AccountantSettlements() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const tamUng = Form.useWatch('TamUngHDV', form) || 0;
  const hdvChi = Form.useWatch('HDVChiThucTe', form) || 0;
  const chenh = Number(tamUng) - Number(hdvChi);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await settlementApi.list());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (r) => {
    setEditItem(r);
    form.resetFields();
    form.setFieldsValue({
      DoanhThuThucTe: r.DoanhThuThucTe || 0,
      ChiPhiXe: r.ChiPhiXe || 0,
      ChiPhiKhachSan: r.ChiPhiKhachSan || 0,
      ChiPhiAnUong: r.ChiPhiAnUong || 0,
      ChiPhiVe: r.ChiPhiVe || 0,
      ThuLaoHDV: r.ThuLaoHDV || 0,
      TamUngHDV: r.TamUngHDV || 0,
      HDVChiThucTe: r.HDVChiThucTe || 0,
      GhiChu: r.GhiChu,
    });
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editItem.MaQuyetToan > 0) {
        await settlementApi.update(editItem.MaQuyetToan, v);
      } else {
        await settlementApi.upsert({ MaLich: editItem.MaLich, ...v });
      }
      message.success('Đã lưu quyết toán');
      setEditItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const lock = async () => {
    try {
      await settlementApi.lock(editItem.MaQuyetToan);
      message.success('Đã khóa sổ tour');
      setEditItem(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Khóa sổ thất bại');
    }
  };

  const exportData = () =>
    exportToExcel(
      'quyet-toan-doan-tour',
      [
        { header: 'Mã lịch', key: 'MaLich' },
        { header: 'Tour', key: 'ten_tour' },
        { header: 'Ngày đi', getter: (r) => fmtDate(r.ngay_khoi_hanh) },
        { header: 'Ngày về', getter: (r) => fmtDate(r.ngay_ket_thuc) },
        { header: 'HDV', key: 'ten_hdv' },
        { header: 'Doanh thu', getter: (r) => Number(r.DoanhThuThucTe) },
        { header: 'Tổng chi phí', getter: (r) => Number(r.tong_chi_phi) },
        { header: 'Lợi nhuận gộp', getter: (r) => Number(r.loi_nhuan_gop) },
        { header: 'Tỷ suất LN (%)', key: 'ty_suat_ln' },
        { header: 'Trạng thái', getter: (r) => TRANG_THAI_QUYET_TOAN[r.TrangThai]?.label },
      ],
      rows.filter((r) => r.MaQuyetToan > 0),
    );

  const locked = editItem?.TrangThai === 'DaKhoaSo';

  const columns = [
    {
      title: 'Mã lịch',
      dataIndex: 'MaLich',
      width: 80,
      render: (v) => <span className="tnum text-ink-600">#{v}</span>,
    },
    {
      // HDV xuống dòng dưới tên tour chứ không chiếm một cột riêng: bảng này có
      // 10 cột, mà tên tour là thứ phải đọc được trước tiên.
      title: 'Tour',
      dataIndex: 'ten_tour',
      ellipsis: true,
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <div className="truncate text-[11.5px] text-ink-500">
            {r.ten_diem_den}
            {' · '}
            {r.ten_hdv || 'Chưa gán HDV'}
          </div>
        </div>
      ),
    },
    {
      // 172 chứ không phải 150: "20/08/2026 → 25/08/2026" là 23 ký tự, cắt cụt
      // là mất luôn ngày về — nửa thông tin quan trọng nhất của cột.
      title: 'Ngày đi - về',
      key: 'ngay',
      width: 172,
      render: (_, r) => (
        <span className="tnum whitespace-nowrap">
          {fmtDate(r.ngay_khoi_hanh)} → {fmtDate(r.ngay_ket_thuc)}
        </span>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'DoanhThuThucTe',
      width: 126,
      align: 'right',
      render: (v) => <span className="tnum">{fmtVND(v)}</span>,
    },
    {
      title: 'Tổng chi phí',
      dataIndex: 'tong_chi_phi',
      width: 126,
      align: 'right',
      render: (v) => <span className="tnum">{fmtVND(v)}</span>,
    },
    {
      // Cột "Tỷ suất LN" cũ đã bỏ khỏi bảng và chuyển xuống dòng tóm tắt của
      // Drawer. Nó là chỉ số ĐỌC LẠI — chỉ có nghĩa sau khi chuyến đã quyết
      // toán xong, nên trên dữ liệu thật nó là "—" đúng ở những dòng còn phải
      // làm, tức là rỗng đúng lúc người ta cần nhìn nhất; đổi lại nó chiếm
      // 96px của cột tên tour. Số liệu không mất: vẫn nằm trong Drawer của mọi
      // dòng và trong file Excel xuất ra.
      title: 'Lợi nhuận gộp',
      dataIndex: 'loi_nhuan_gop',
      width: 130,
      align: 'right',
      // Ngoại lệ "chiều dòng tiền" — dấu trừ luôn có mặt bằng chữ.
      render: (v) => (
        <span
          className={`tnum font-semibold ${Number(v) >= 0 ? 'text-guide-600' : 'text-stop-600'}`}
        >
          {Number(v) < 0 ? '−' : ''}
          {fmtVND(Math.abs(Number(v)))}
        </span>
      ),
    },
    {
      // 140 chứ không phải 120: bề ngang cột viên trạng thái do CHUỖI DÀI NHẤT
      // quyết định, và ở màn này chuỗi đó là "Chưa quyết toán" (16 ký tự, có
      // dấu) — 120px làm nó xuống hai dòng.
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 140,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${quyetToanPill(v)}`}>
          {TRANG_THAI_QUYET_TOAN[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 118,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac
          chinh={{
            nhan: r.MaQuyetToan > 0 ? 'Chi tiết' : 'Quyết toán',
            // Dòng chưa có phiếu quyết toán mới là việc phải làm, nên chỉ nút
            // của dòng đó mới mang màu hành động.
            manh: !(r.MaQuyetToan > 0),
            onClick: () => openEdit(r),
          }}
        />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} chuyến`}
        title="Quyết toán đoàn tour"
        description="Lãi/lỗ theo từng chuyến đã hoàn thành (Tour P&L)."
        action={
          <button type="button" className="btn btn-ghost" onClick={exportData}>
            <DownloadOutlined /> Xuất Excel
          </button>
        }
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaLich"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có chuyến nào để quyết toán',
            description:
              'Chuyến đã hoàn thành sẽ xuất hiện ở đây kèm doanh thu, chi phí và lãi gộp.',
          }}
        />
      </div>

      {/* Drawer chi tiết / quyết toán */}
      <Drawer
        open={!!editItem}
        onClose={() => setEditItem(null)}
        width={640}
        title={editItem ? `Quyết toán — ${editItem.ten_tour} (${fmtDate(editItem.ngay_khoi_hanh)})` : ''}
        footer={
          locked ? null : (
            <div className="flex justify-between">
              {editItem?.MaQuyetToan > 0 && (
                <Popconfirm title="Khóa sổ tour này? Sau khi khóa sẽ không sửa được." onConfirm={lock}>
                  <Button danger icon={<LockOutlined />}>Khóa sổ tour</Button>
                </Popconfirm>
              )}
              {/* `ml-auto` để "Lưu" luôn nằm bên phải. Để `justify-between`
                  trần thì khi dòng chưa có phiếu quyết toán (không có nút Khóa
                  sổ) nút Lưu nhảy sang tận bên trái — cùng một nút đổi chỗ
                  giữa hai lần mở Drawer. */}
              <Button type="primary" loading={saving} onClick={submit} className="!ml-auto">Lưu</Button>
            </div>
          )
        }
      >
        {locked && (
          <span className={`chip mb-3 ${quyetToanPill('DaKhoaSo')}`}>Đã khóa sổ — chỉ xem</span>
        )}

        {/* Bảng tóm tắt bằng <dl> chứ không dùng Descriptions của AntD: khung
            kẻ xám của nó là một hệ trình bày riêng, đứng cạnh phần còn lại của
            trang là lộ ngay ra hai bộ quy tắc. */}
        <dl className="mb-5 divide-y divide-ink-100 rounded-card border border-ink-200">
          {[
            ['Tour', editItem?.ten_tour],
            ['HDV phụ trách', editItem?.ten_hdv || '—'],
            [
              'Ngày đi - về',
              editItem ? `${fmtDate(editItem.ngay_khoi_hanh)} → ${fmtDate(editItem.ngay_ket_thuc)}` : '',
            ],
            // Chỗ duy nhất trong màn còn hiện tỷ suất lợi nhuận — xem chú thích
            // ở cột "Lợi nhuận gộp".
            [
              'Tỷ suất LN',
              editItem?.ty_suat_ln == null
                ? 'Chưa có — quyết toán xong mới tính được'
                : `${(editItem.ty_suat_ln * 100).toFixed(1)}% doanh thu`,
            ],
          ].map(([nhan, giaTri]) => (
            <div key={nhan} className="flex gap-4 px-3 py-2">
              <dt className="label-sign w-32 shrink-0 pt-1 text-ink-600">{nhan}</dt>
              <dd className="min-w-0 flex-1 text-body-s text-ink-950">{giaTri}</dd>
            </div>
          ))}
        </dl>

        <Form form={form} layout="vertical" disabled={locked}>
          <h3 className="font-display text-title text-ink-950">Doanh thu &amp; chi phí giá vốn</h3>
          <Form.Item name="DoanhThuThucTe" label="Doanh thu thực thu (₫)" className="mt-3">
            <InputNumber className="w-full" min={0} step={100000} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="ChiPhiXe" label="Xe (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="ChiPhiKhachSan" label="Khách sạn (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="ChiPhiAnUong" label="Ăn uống (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="ChiPhiVe" label="Vé (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="ThuLaoHDV" label="Thù lao HDV (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
          </div>

          <h3 className="font-display text-title text-ink-950">Tạm ứng / hoàn ứng HDV</h3>
          <div className="mt-3 grid grid-cols-2 gap-x-4">
            <Form.Item name="TamUngHDV" label="Tạm ứng trước tour (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
            <Form.Item name="HDVChiThucTe" label="HDV chi thực tế (₫)"><InputNumber className="w-full" min={0} step={100000} /></Form.Item>
          </div>
          <div className="mb-4 rounded-card bg-paper p-3 text-body-s">
            {chenh > 0 ? (
              <span>
                HDV phải hoàn trả công ty:{' '}
                <b className="tnum text-guide-600">{fmtVND(chenh)}</b>
              </span>
            ) : chenh < 0 ? (
              <span>
                Công ty chi bù cho HDV:{' '}
                <b className="tnum text-stop-600">{fmtVND(-chenh)}</b>
              </span>
            ) : (
              <span className="text-ink-600">Tạm ứng khớp với chi thực tế.</span>
            )}
          </div>
          <Form.Item name="GhiChu" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
