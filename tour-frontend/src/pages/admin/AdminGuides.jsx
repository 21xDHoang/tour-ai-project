import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  message,
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { guideApi } from '../../api/http';
import {
  TRANG_THAI_HDV,
  TRANG_THAI_HOAT_DONG_HDV,
  TRANG_THAI_LAM_VIEC_HDV,
  TRANG_THAI_LICH,
  fmtDate,
  fmtVND,
} from '../../utils/format';
import { camXucChip, hdvPill, lichPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

const TRANG_THAI_OPTIONS = Object.keys(TRANG_THAI_HDV).map((k) => ({
  value: k,
  label: TRANG_THAI_HDV[k].label,
}));
const TRANG_THAI_LAM_VIEC_OPTIONS = Object.entries(TRANG_THAI_LAM_VIEC_HDV).map(
  ([value, label]) => ({ value, label }),
);

/** Vai trò của HDV trong một đoàn — nhãn y như ô chọn ở modal Phân công HDV. */
const VAI_TRO_TRONG_DOAN = { TruongDoan: 'Trưởng đoàn', PhuDoan: 'Phó đoàn' };

/** Một dòng "nhãn — giá trị" trong hồ sơ. Không dùng Descriptions của AntD:
 *  khung kẻ xám của nó là một hệ trình bày riêng, không đứng cạnh phần còn lại
 *  của trang được. */
function Dong({ nhan, children, rong }) {
  return (
    <div className={rong ? 'col-span-2' : ''}>
      <dt className="label-sign text-ink-600">{nhan}</dt>
      <dd className="text-body-s text-ink-950">{children}</dd>
    </div>
  );
}

/** Quản lý hướng dẫn viên (Admin - Điều hành & vận hành). */
export default function AdminGuides() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await guideApi.list());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (r) => {
    setDetailLoading(true);
    setDetail(null);
    setAnalysis(null);
    try {
      setDetail(await guideApi.detail(r.MaHDV));
    } catch {
      message.error('Không tải được hồ sơ hướng dẫn viên');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setAnalysis(null);
  };

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    form.setFieldsValue({
      TrangThai: 'Ranh',
      TrangThaiLamViec: 'ChinhThuc',
      SoNamKinhNghiem: 0,
    });
    setModalOpen(true);
  };

  const openEdit = () => {
    setEditItem(detail);
    form.resetFields();
    form.setFieldsValue({
      HoTen: detail.HoTen,
      SoDienThoai: detail.SoDienThoai,
      Email: detail.Email,
      MaNV: detail.MaNV,
      CCCD: detail.CCCD,
      NgaySinh: detail.NgaySinh ? dayjs(detail.NgaySinh) : null,
      HoChieu: detail.HoChieu,
      DiaChi: detail.DiaChi,
      TrangThai: detail.TrangThai,
      TrangThaiLamViec: detail.TrangThaiLamViec,
      SoNamKinhNghiem: detail.SoNamKinhNghiem,
      ChuyenMon: detail.ChuyenMon,
      TheHDV: detail.TheHDV,
      TuyenDiem: detail.TuyenDiem,
      KyNang: detail.KyNang,
      DinhMucThuLao: detail.DinhMucThuLao,
      CongTacPhi: detail.CongTacPhi,
      ThongTinThanhToan: detail.ThongTinThanhToan,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      Email: v.Email || null,
      NgaySinh: v.NgaySinh ? dayjs(v.NgaySinh).format('YYYY-MM-DD') : null,
      DinhMucThuLao: v.DinhMucThuLao ?? null,
      CongTacPhi: v.CongTacPhi ?? null,
      ChuyenMon: v.ChuyenMon || null,
      MaNV: v.MaNV || null,
      CCCD: v.CCCD || null,
      HoChieu: v.HoChieu || null,
      DiaChi: v.DiaChi || null,
      TheHDV: v.TheHDV || null,
      TuyenDiem: v.TuyenDiem || null,
      KyNang: v.KyNang || null,
      ThongTinThanhToan: v.ThongTinThanhToan || null,
    };
    setSaving(true);
    try {
      if (editItem) {
        await guideApi.update(editItem.MaHDV, payload);
        message.success('Đã cập nhật hồ sơ hướng dẫn viên');
      } else {
        await guideApi.create(payload);
        message.success('Đã thêm hướng dẫn viên');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const runAnalyze = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      setAnalysis(await guideApi.analyzeFeedback(detail.MaHDV));
    } catch (err) {
      message.error(err.response?.data?.detail || 'Phân tích thất bại');
    } finally {
      setAnalyzing(false);
    }
  };

  const columns = [
    {
      title: 'Họ tên',
      dataIndex: 'HoTen',
      ellipsis: true,
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <div className="truncate text-[11.5px] text-ink-500">
            {r.ChuyenMon || 'Chưa có chuyên môn'}
          </div>
        </div>
      ),
    },
    {
      title: 'Mã NV',
      dataIndex: 'MaNV',
      width: 96,
      render: (v) => (v ? <span className="tnum">{v}</span> : <span className="text-ink-400">—</span>),
    },
    {
      title: 'SĐT',
      dataIndex: 'SoDienThoai',
      width: 120,
      render: (v) => <span className="tnum">{v}</span>,
    },
    {
      title: 'Kinh nghiệm',
      dataIndex: 'SoNamKinhNghiem',
      align: 'right',
      // 120 chứ không phải 100: tiêu đề quyết định bề ngang, và "Kinh nghiệm"
      // dài hơn "Số khách" — ở 100px nó xuống hai dòng.
      width: 120,
      render: (v) => <span className="tnum">{v} năm</span>,
    },
    {
      title: 'Công tác',
      dataIndex: 'TrangThai',
      width: 110,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${hdvPill(v)}`}>
          {TRANG_THAI_HDV[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Hoạt động',
      dataIndex: 'trang_thai_hoat_dong',
      width: 130,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${hdvPill(v)}`}>
          {TRANG_THAI_HOAT_DONG_HDV[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Số tour',
      dataIndex: 'tong_so_tour',
      align: 'right',
      width: 92,
      render: (v) => <span className="tnum">{v ?? 0}</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 92,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac
          chinh={{ nhan: 'Xem', icon: <EyeOutlined />, onClick: () => openDetail(r) }}
        />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${rows.length} HDV`}
        title="Danh sách hướng dẫn viên"
        description="Hồ sơ định danh, năng lực, lịch trình phân công, đánh giá và tài chính."
        action={
          <button type="button" className="btn btn-ink" onClick={openCreate}>
            <PlusOutlined /> Thêm HDV
          </button>
        }
      />

      <div className="mt-6">
        <BangDuLieu
          rows={rows}
          columns={columns}
          rowKey="MaHDV"
          x={rongBang}
          loading={loading}
          pageSize={10}
          empty={{
            title: 'Chưa có hướng dẫn viên nào',
            description: 'Thêm hồ sơ HDV để phân công được vào các lịch khởi hành.',
            action: (
              <button type="button" className="btn btn-ink" onClick={openCreate}>
                <PlusOutlined /> Thêm HDV
              </button>
            ),
          }}
        />
      </div>

      {/* Drawer chi tiết */}
      <Drawer
        open={!!detail}
        onClose={closeDetail}
        width={760}
        title={detail ? `Hồ sơ — ${detail.HoTen}` : ''}
        extra={
          detail && (
            <Button icon={<EditOutlined />} onClick={openEdit}>
              Sửa
            </Button>
          )
        }
      >
        {detailLoading || !detail ? (
          <div className="flex justify-center py-16">
            <div className="space-y-3">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-32 rounded-card" />
              <div className="skeleton h-32 rounded-card" />
            </div>
          </div>
        ) : (
          <div>
            {/* Loại hợp đồng là phân loại nên để chữ trơn; hai trạng thái kia
                dùng viên màu vì chúng trả lời câu hỏi "HDV này nhận được việc
                không". */}
            {/* Ba viên này phải có nhãn: "Công tác" và "Hoạt động" là hai trường
                khác nhau nhưng cùng nhận giá trị "Rảnh", để trần thì thành hai
                viên giống hệt nhau đứng cạnh nhau. */}
            <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="label-sign text-ink-600">Hợp đồng</span>
                <span className="chip">
                  {TRANG_THAI_LAM_VIEC_HDV[detail.TrangThaiLamViec] || detail.TrangThaiLamViec}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="label-sign text-ink-600">Công tác</span>
                <span className={`chip ${hdvPill(detail.TrangThai)}`}>
                  {TRANG_THAI_HDV[detail.TrangThai]?.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="label-sign text-ink-600">Hoạt động</span>
                <span className={`chip ${hdvPill(detail.trang_thai_hoat_dong || 'Ranh')}`}>
                  {TRANG_THAI_HOAT_DONG_HDV[detail.trang_thai_hoat_dong || 'Ranh']?.label}
                </span>
              </div>
            </div>

            <h3 className="font-display text-title mb-2.5 text-ink-950">Định danh</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Dong nhan="Mã NV">{detail.MaNV || '—'}</Dong>
              <Dong nhan="CCCD">{detail.CCCD || '—'}</Dong>
              <Dong nhan="Ngày sinh">{detail.NgaySinh ? fmtDate(detail.NgaySinh) : '—'}</Dong>
              <Dong nhan="Hộ chiếu">{detail.HoChieu || '—'}</Dong>
              <Dong nhan="SĐT">
                <span className="tnum">{detail.SoDienThoai}</span>
              </Dong>
              <Dong nhan="Email">{detail.Email || '—'}</Dong>
              <Dong nhan="Địa chỉ" rong>{detail.DiaChi || '—'}</Dong>
            </dl>

            <h3 className="font-display text-title mb-2.5 mt-6 text-ink-950">Năng lực &amp; chuyên môn</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Dong nhan="Thẻ HDV">{detail.TheHDV || '—'}</Dong>
              <Dong nhan="Chuyên môn">{detail.ChuyenMon || '—'}</Dong>
              <Dong nhan="Số năm kinh nghiệm">
                <span className="tnum">{detail.SoNamKinhNghiem} năm</span>
              </Dong>
              <Dong nhan="Tuyến điểm sở trường">{detail.TuyenDiem || '—'}</Dong>
              <Dong nhan="Kỹ năng bổ trợ" rong>{detail.KyNang || '—'}</Dong>
            </dl>

            <h3 className="font-display text-title mb-2.5 mt-6 text-ink-950">
              Lịch trình &amp; phân công
            </h3>
            <p className="mb-3 text-body-s text-ink-600">
              Tổng số tour đã dẫn:{' '}
              <b className="tnum font-semibold text-ink-950">{detail.tong_so_tour_da_dan}</b>
            </p>
            <BangDuLieu
              rows={detail.lich_su || []}
              rowKey="MaPhanCong"
              x={620}
              pagination={false}
              empty={{ title: 'Chưa có phân công nào' }}
              columns={[
                { title: 'Tour', dataIndex: 'ten_tour', ellipsis: true },
                {
                  title: 'Khởi hành',
                  dataIndex: 'ngay_khoi_hanh',
                  render: (v) => <span className="tnum whitespace-nowrap">{fmtDate(v)}</span>,
                  width: 118,
                },
                {
                  title: 'Kết thúc',
                  dataIndex: 'ngay_ket_thuc',
                  render: (v) => <span className="tnum whitespace-nowrap">{fmtDate(v)}</span>,
                  width: 118,
                },
                {
                  // Trước đây in thẳng mã "TruongDoan" ra bảng — cùng tên gọi
                  // với ô chọn Vai trò trong modal Phân công, chỗ đó đã ghi
                  // "Trưởng đoàn". Mã lạ vẫn rơi về chính nó.
                  title: 'Vai trò',
                  dataIndex: 'VaiTro',
                  width: 110,
                  render: (v) => VAI_TRO_TRONG_DOAN[v] || v,
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'trang_thai_lich',
                  width: 120,
                  render: (v) => (
                    <span className={`chip !px-2 !py-0.5 !text-[11px] ${lichPill(v)}`}>
                      {TRANG_THAI_LICH[v]?.label || v}
                    </span>
                  ),
                },
              ]}
            />

            <h3 className="font-display text-title mb-2.5 mt-6 text-ink-950">
              Đánh giá &amp; hiệu suất
            </h3>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-body-s text-ink-600">
                Điểm trung bình:{' '}
                <b className="tnum font-semibold text-ink-950">
                  {detail.diem_trung_binh != null ? `${detail.diem_trung_binh} / 5` : '—'}
                </b>{' '}
                · {detail.so_phan_hoi} phản hồi
              </span>
              <button type="button" className="btn btn-ink" onClick={runAnalyze} disabled={analyzing}>
                <RobotOutlined /> {analyzing ? 'Đang phân tích…' : 'Phân tích bằng AI'}
              </button>
            </div>
            {analyzing && <div className="skeleton h-24 rounded-card" />}
            {analysis && (
              <div className="rounded-card border border-ink-200 bg-paper p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`chip ${camXucChip(analysis.nhan_cam_xuc)}`}>
                    {analysis.nhan_cam_xuc === 'TichCuc'
                      ? 'Tích cực'
                      : analysis.nhan_cam_xuc === 'TrungLap'
                        ? 'Trung lập'
                        : 'Tiêu cực'}
                  </span>
                  {/* Nhãn nguồn để trơn, không tô màu: đây là xuất xứ kết quả,
                      không phải mức độ cần hành động — và câu giải thích ngay
                      dưới mới là thứ nói cho người đọc biết phải hiểu thế nào. */}
                  {analysis.nguon === 'Fallback' && (
                    <span className="chip">
                      Fallback — Gemini tạm không khả dụng, kết quả do hệ thống tự chấm
                    </span>
                  )}
                </div>
                {analysis.uu_diem?.length > 0 && (
                  <div className="mb-1 text-sm">
                    <b className="text-guide-600">Ưu điểm:</b>{' '}
                    {analysis.uu_diem.join('; ')}
                  </div>
                )}
                {analysis.nhuoc_diem?.length > 0 && (
                  <div className="mb-1 text-sm">
                    <b className="text-stop-600">Nhược điểm:</b>{' '}
                    {analysis.nhuoc_diem.join('; ')}
                  </div>
                )}
                <p className="text-sm text-ink-800">{analysis.tong_ket}</p>
              </div>
            )}

            <h3 className="font-display text-title mb-2.5 mt-6 text-ink-950">Tài chính</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Dong nhan="Định mức thù lao / tour">
                <span className="tnum">
                  {detail.DinhMucThuLao ? fmtVND(detail.DinhMucThuLao) : '—'}
                </span>
              </Dong>
              <Dong nhan="Công tác phí">
                <span className="tnum">{detail.CongTacPhi ? fmtVND(detail.CongTacPhi) : '—'}</span>
              </Dong>
              <Dong nhan="Thông tin thanh toán" rong>
                {detail.ThongTinThanhToan || '—'}
              </Dong>
            </dl>
          </div>
        )}
      </Drawer>

      {/* Modal Thêm / Sửa */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={save}
        confirmLoading={saving}
        okText="Lưu"
        title={editItem ? 'Sửa hồ sơ hướng dẫn viên' : 'Thêm hướng dẫn viên'}
        width={720}
      >
        <Form form={form} layout="vertical">
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="HoTen" label="Họ tên" rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}>
              <Input placeholder="Họ và tên" />
            </Form.Item>
            <Form.Item name="SoDienThoai" label="SĐT" rules={[{ required: true, min: 8, message: 'Nhập SĐT' }]}>
              <Input placeholder="Số điện thoại" />
            </Form.Item>
            <Form.Item name="Email" label="Email">
              <Input placeholder="Email" />
            </Form.Item>
            <Form.Item name="MaNV" label="Mã NV">
              <Input placeholder="vd: NV004" />
            </Form.Item>
            <Form.Item name="CCCD" label="CCCD">
              <Input placeholder="Căn cước công dân" />
            </Form.Item>
            <Form.Item name="NgaySinh" label="Ngày sinh">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="HoChieu" label="Hộ chiếu">
              <Input placeholder="Số hộ chiếu" />
            </Form.Item>
            <Form.Item name="DiaChi" label="Địa chỉ">
              <Input placeholder="Địa chỉ" />
            </Form.Item>
            <Form.Item name="TrangThai" label="Trạng thái công tác">
              <Select options={TRANG_THAI_OPTIONS} />
            </Form.Item>
            <Form.Item name="TrangThaiLamViec" label="Loại hợp đồng">
              <Select options={TRANG_THAI_LAM_VIEC_OPTIONS} />
            </Form.Item>
            <Form.Item name="SoNamKinhNghiem" label="Số năm kinh nghiệm">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="TheHDV" label="Thẻ HDV">
              <Input placeholder="Số thẻ hướng dẫn viên" />
            </Form.Item>
            <Form.Item name="ChuyenMon" label="Chuyên môn" className="sm:col-span-2">
              <Input placeholder="vd: Tour biển đảo" />
            </Form.Item>
            <Form.Item name="TuyenDiem" label="Tuyến điểm sở trường" className="sm:col-span-2">
              <Input.TextArea rows={2} placeholder="vd: Hạ Long, Phú Quốc, Nha Trang" />
            </Form.Item>
            <Form.Item name="KyNang" label="Kỹ năng bổ trợ" className="sm:col-span-2">
              <Input.TextArea rows={2} placeholder="vd: Tiếng Anh, sơ cứu" />
            </Form.Item>
            <Form.Item name="DinhMucThuLao" label="Định mức thù lao (₫)">
              <InputNumber className="w-full" min={0} step={100000} />
            </Form.Item>
            <Form.Item name="CongTacPhi" label="Công tác phí (₫)">
              <InputNumber className="w-full" min={0} step={100000} />
            </Form.Item>
            <Form.Item name="ThongTinThanhToan" label="Thông tin thanh toán lương" className="sm:col-span-2">
              <Input placeholder="Số tài khoản / ngân hàng" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
