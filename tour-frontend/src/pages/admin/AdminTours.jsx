import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Upload,
  message,
} from 'antd';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  PictureOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { aiApi, tourApi, uploadApi } from '../../api/http';
import {
  fmtVND,
  KHU_VUC_OPTIONS,
  khuVucLabel,
  LOAI_TOUR,
  TRANG_THAI_TOUR,
} from '../../utils/format';
import { batTatPill, signOf } from '../../utils/signs';
import { getTourImage } from '../../utils/tourImages';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

const LOAI_OPTIONS = Object.entries(LOAI_TOUR).map(([value, label]) => ({
  value,
  label,
}));

const TRANG_THAI_OPTIONS = Object.entries(TRANG_THAI_TOUR).map(([value, v]) => ({
  value,
  label: v.label,
}));

export default function AdminTours() {
  const [tours, setTours] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();
  const [destOpen, setDestOpen] = useState(false);
  const [destSubmitting, setDestSubmitting] = useState(false);
  const [destForm] = Form.useForm();
  const [genMoTaLoading, setGenMoTaLoading] = useState(false);
  const [genLichLoading, setGenLichLoading] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [editingTour, setEditingTour] = useState(null);

  const handleDeleteTour = async (record) => {
    setDeletingId(record.MaTour);
    try {
      const res = await tourApi.delete(record.MaTour);
      message.success(res.message || `Đã xóa tour "${record.TenTour}" thành công!`);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Xóa tour thất bại');
    } finally {
      setDeletingId(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ts, ds] = await Promise.all([
        tourApi.list({ trang_thai: 'all' }),
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

  const openCreateModal = () => {
    setEditingTour(null);
    setImageUrl('');
    form.resetFields();
    form.setFieldsValue({ TrangThai: 'DangBan', LoaiTour: 'TraiNghiem' });
    setOpen(true);
  };

  const openEditModal = (record) => {
    setEditingTour(record);
    setImageUrl(record.HinhAnh || '');
    form.setFieldsValue({
      MaDiemDen: record.MaDiemDen,
      TenTour: record.TenTour,
      LoaiTour: record.LoaiTour || 'TraiNghiem',
      SoNgay: record.SoNgay,
      GiaCoBan: record.GiaCoBan,
      GiaKhuyenMai: record.GiaKhuyenMai,
      MoTa: record.MoTa,
      LichTrinhTomTat: record.LichTrinhTomTat,
      TrangThai: record.TrangThai,
      HinhAnh: record.HinhAnh,
    });
    setOpen(true);
  };

  const handleCustomUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file, 'tours');
      const uploadedUrl = res.data?.url || res.url;
      setImageUrl(uploadedUrl);
      form.setFieldValue('HinhAnh', uploadedUrl);
      message.success(`Tải ảnh lên ${res.data?.storage || 'Cloudflare R2'} thành công!`);
      onSuccess(res, file);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Tải ảnh thất bại');
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = {
        MaDiemDen: values.MaDiemDen,
        TenTour: values.TenTour,
        MoTa: values.MoTa || null,
        LichTrinhTomTat: values.LichTrinhTomTat || null,
        SoNgay: values.SoNgay,
        GiaCoBan: values.GiaCoBan,
        GiaKhuyenMai: values.GiaKhuyenMai ?? null,
        TrangThai: values.TrangThai || 'DangBan',
        LoaiTour: values.LoaiTour || 'TraiNghiem',
        HinhAnh: imageUrl || values.HinhAnh || null,
      };

      if (editingTour) {
        await tourApi.update(editingTour.MaTour, payload);
        message.success('Đã cập nhật tour');
      } else {
        await tourApi.create(payload);
        message.success('Đã tạo tour mới thành công');
      }
      setOpen(false);
      form.resetFields();
      setImageUrl('');
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể lưu tour');
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
      return;
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
    {
      title: 'Ảnh',
      dataIndex: 'HinhAnh',
      width: 70,
      render: (v, r) => {
        const src = v || getTourImage(r);
        return (
          <img
            src={src}
            alt={r.TenTour}
            className="h-10 w-14 rounded-field object-cover border border-ink-200"
          />
        );
      },
    },
    {
      // Không khai báo bề rộng: đây là cột tên, và là cột duy nhất nên nó nhận
      // hết phần chỗ trống còn lại của bảng — tên tour dài mới là thứ cần chỗ.
      title: 'Tour',
      dataIndex: 'TenTour',
      ellipsis: true,
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <div className="truncate text-[11.5px] text-ink-500">
            {r.ten_diem_den} · {r.SoNgay} ngày · #{r.MaTour}
          </div>
        </div>
      ),
    },
    {
      // Loại hình là màu duy nhất được phép ngoài màu trạng thái: cùng một màu
      // biển báo mà khách đã nhìn thấy trên web (TourCard, bộ lọc danh mục), nên
      // nhân viên và khách đọc cùng một hệ.
      title: 'Loại hình',
      dataIndex: 'LoaiTour',
      width: 132,
      render: (v) => {
        const sign = signOf(v);
        return (
          <span className={`chip !px-2 !py-0.5 !text-[11px] ${sign.chipCls}`}>
            {sign.label}
          </span>
        );
      },
    },
    {
      title: 'Giá cơ bản',
      dataIndex: 'GiaCoBan',
      width: 132,
      align: 'right',
      // Giá gốc chỉ bị gạch khi giá khuyến mãi THẤP HƠN thật — dữ liệu nhập sai
      // mà vẫn gạch thì giao diện tự nói dối về một chương trình giảm giá.
      render: (v, r) =>
        r.GiaKhuyenMai && r.GiaKhuyenMai < v ? (
          <span className="tnum text-ink-500 line-through">{fmtVND(v)}</span>
        ) : (
          <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>
        ),
    },
    {
      title: 'Giá khuyến mãi',
      dataIndex: 'GiaKhuyenMai',
      width: 132,
      align: 'right',
      render: (v) =>
        v ? (
          <span className="tnum font-semibold text-ink-950">{fmtVND(v)}</span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 118,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${batTatPill(v)}`}>
          {TRANG_THAI_TOUR[v]?.label || v}
        </span>
      ),
    },
    {
      // Ghim phải: cột thao tác là cột duy nhất phải luôn nhìn thấy khi bảng cuộn ngang.
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac
          chinh={{ nhan: 'Sửa', icon: <EditOutlined />, onClick: () => openEditModal(r) }}
          khac={[
            {
              nhan: 'Xóa',
              icon: <DeleteOutlined />,
              danger: true,
              loading: deletingId === r.MaTour,
              // Hộp xác nhận là chỗ cuối cùng để đọc ra mình đang xoá tour nào,
              // nên tên tour phải nằm trong câu hỏi chứ không chỉ ở dòng bảng.
              xacNhan: (
                <div className="max-w-xs">
                  Xóa tour “{r.TenTour}”?
                  <div className="mt-1 text-[12px] font-normal text-signal-700">
                    Chỉ xóa được khi chưa có đơn đặt chỗ liên quan.
                  </div>
                </div>
              ),
              onClick: () => handleDeleteTour(r),
            },
          ]}
        />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        marker={loading ? null : `${tours.length} tour`}
        title="Quản trị danh mục tour"
        description="Quản lý chương trình tour, điểm đến và tải ảnh lưu trữ trên Cloudflare R2."
        action={
          <button type="button" className="btn btn-ink" onClick={openCreateModal}>
            <PlusOutlined /> Thêm tour mới
          </button>
        }
      />

      <BangDuLieu
        rows={tours}
        columns={columns}
        rowKey="MaTour"
        x={rongBang}
        loading={loading}
        pageSize={10}
        empty={{
          title: 'Chưa có tour nào',
          description:
            'Tour đầu tiên sẽ hiện trên web khách ngay khi được đặt ở trạng thái Đang bán.',
        }}
      />

      {/* Modal Thêm/Sửa tour */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={submitting}
        okText={editingTour ? 'Lưu thay đổi' : 'Tạo tour mới'}
        cancelText="Hủy"
        title={editingTour ? `Chỉnh sửa tour #${editingTour.MaTour}` : 'Thêm tour mới'}
        width={650}
        className="!rounded-card"
      >
        <Form form={form} layout="vertical" initialValues={{ TrangThai: 'DangBan', LoaiTour: 'TraiNghiem' }}>
          {/* Khu vực Upload ảnh Cloudflare R2 */}
          <Form.Item label={<span className="font-semibold text-ink-700">Ảnh đại diện tour (Cloudflare R2)</span>}>
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-card border border-dashed border-guide-200 bg-guide-50/40 p-4">
              {imageUrl ? (
                <div className="relative group shrink-0">
                  <img
                    src={imageUrl}
                    alt="Tour Preview"
                    className="h-28 w-36 rounded-card object-cover border border-ink-200 shadow-panel"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      form.setFieldValue('HinhAnh', null);
                    }}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stop-500 text-white shadow hover:bg-stop-600 transition"
                  >
                    <DeleteOutlined className="text-xs" />
                  </button>
                </div>
              ) : (
                <div className="flex h-28 w-36 items-center justify-center rounded-card bg-white border border-ink-200 text-ink-400 text-3xl shrink-0">
                  <PictureOutlined />
                </div>
              )}

              <div className="flex-1 text-center sm:text-left space-y-2">
                <Upload
                  customRequest={handleCustomUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button
                    icon={uploading ? <LoadingOutlined /> : <CloudUploadOutlined />}
                    loading={uploading}
                    className="!rounded-card !border-guide-200 !text-guide-600 hover:!bg-guide-50 font-semibold"
                  >
                    {uploading ? 'Đang tải lên R2...' : 'Chọn hoặc thả ảnh lên Cloudflare R2'}
                  </Button>
                </Upload>
                <div className="text-[11px] text-ink-600">
                  Hỗ trợ định dạng JPG, PNG, WEBP tối đa 10MB. File lưu trên Cloudflare R2 Object Storage.
                </div>
                {imageUrl && (
                  <div className="truncate text-[10px] text-guide-600 font-mono">
                    URL: {imageUrl}
                  </div>
                )}
              </div>
            </div>
          </Form.Item>

          <Form.Item label="Điểm đến" required>
            <Space.Compact block>
              <Form.Item
                name="MaDiemDen"
                noStyle
                rules={[{ required: true, message: 'Chọn điểm đến' }]}
              >
                <Select
                  className="flex-1 !rounded-card"
                  showSearch
                  placeholder="Chọn điểm đến"
                  optionFilterProp="label"
                  options={destinations.map((d) => ({
                    value: d.MaDiemDen,
                    label: d.KhuVuc
                      ? `${d.TenDiemDen} (${khuVucLabel(d.KhuVuc)})`
                      : d.TenDiemDen,
                  }))}
                />
              </Form.Item>
              <Button
                icon={<PlusOutlined />}
                title="Thêm điểm đến mới"
                onClick={() => setDestOpen(true)}
                className="!rounded-r-card"
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
            <Input placeholder="vd: Hà Giang - Đèo Mã Pí Lèng 3N2Đ" className="!rounded-card" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="LoaiTour" label="Danh mục tour" className="mr-2 flex-1">
              <Select options={LOAI_OPTIONS} placeholder="Chọn loại hình du lịch" className="!rounded-card" />
            </Form.Item>
            {/* Trạng thái đã được ghi vào form từ trước (initialValues + payload)
                nhưng chưa từng có ô nào hiện nó ra — nghĩa là tour tạo xong là
                kẹt ở "Đang bán" vĩnh viễn, không có đường ngừng bán. */}
            <Form.Item name="TrangThai" label="Trạng thái" className="flex-1">
              <Select options={TRANG_THAI_OPTIONS} className="!rounded-card" />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item
              name="SoNgay"
              label="Số ngày"
              className="mr-2 flex-1"
              rules={[{ required: true, message: 'Nhập số ngày' }]}
            >
              <InputNumber min={1} max={30} className="w-full !rounded-card" />
            </Form.Item>
            <Form.Item
              name="GiaCoBan"
              label="Giá cơ bản (₫)"
              className="mr-2 flex-1"
              rules={[{ required: true, message: 'Nhập giá' }]}
            >
              <InputNumber min={1} step={100000} className="w-full !rounded-card" />
            </Form.Item>
            <Form.Item name="GiaKhuyenMai" label="Giá KM (₫)" className="flex-1">
              <InputNumber min={1} step={100000} className="w-full !rounded-card" />
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="MoTa"
            label={
              <span className="flex items-center gap-1">
                Mô tả tour
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
            <Input.TextArea rows={3} placeholder="Mô tả nổi bật của chuyến đi..." className="!rounded-card" />
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
            <Input.TextArea rows={3} placeholder="Ngay 1: ...; Ngay 2: ..." className="!rounded-card" />
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
            <Input placeholder="vd: Hà Giang, Đồng Văn, Mèo Vạc..." className="!rounded-card" />
          </Form.Item>
          <Form.Item name="KhuVuc" label="Khu vực">
            <Select
              placeholder="Chọn khu vực"
              allowClear
              className="!rounded-card"
              options={KHU_VUC_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="MoTa" label="Mô tả">
            <Input.TextArea rows={3} className="!rounded-card" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
