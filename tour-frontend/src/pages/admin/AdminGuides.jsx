import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
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
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  RobotOutlined,
  TeamOutlined,
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

const { Title, Text } = Typography;

const TRANG_THAI_OPTIONS = Object.keys(TRANG_THAI_HDV).map((k) => ({
  value: k,
  label: TRANG_THAI_HDV[k].label,
}));
const TRANG_THAI_LAM_VIEC_OPTIONS = Object.entries(TRANG_THAI_LAM_VIEC_HDV).map(
  ([value, label]) => ({ value, label }),
);
const CAM_XUC_COLOR = { TichCuc: 'green', TrungLap: 'gold', TieuCuc: 'red' };

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
      render: (v, r) => (
        <div>
          <div className="font-medium">{v}</div>
          <Text type="secondary" className="text-xs">
            {r.ChuyenMon || 'Chưa có chuyên môn'}
          </Text>
        </div>
      ),
    },
    { title: 'Mã NV', dataIndex: 'MaNV', render: (v) => v || '—', width: 90 },
    { title: 'SĐT', dataIndex: 'SoDienThoai', width: 120 },
    {
      title: 'Kinh nghiệm',
      dataIndex: 'SoNamKinhNghiem',
      align: 'center',
      width: 100,
      render: (v) => `${v} năm`,
    },
    {
      title: 'Công tác',
      dataIndex: 'TrangThai',
      width: 100,
      render: (v) => {
        const st = TRANG_THAI_HDV[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    {
      title: 'Hoạt động',
      dataIndex: 'trang_thai_hoat_dong',
      width: 130,
      render: (v) => {
        const st = TRANG_THAI_HOAT_DONG_HDV[v];
        return <Tag color={st?.color}>{st?.label || v}</Tag>;
      },
    },
    { title: 'Số tour', dataIndex: 'tong_so_tour', align: 'center', width: 90 },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card className="shadow-card" bordered={false}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Title level={3} className="!mb-1">
              <TeamOutlined /> Danh sách hướng dẫn viên
            </Title>
            <Text type="secondary">
              Hồ sơ định danh, năng lực, lịch trình phân công, đánh giá và tài chính.
            </Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm HDV
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="MaHDV"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>

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
            <Spin size="large" />
          </div>
        ) : (
          <div>
            <Space wrap className="mb-3">
              <Tag color="blue">{TRANG_THAI_LAM_VIEC_HDV[detail.TrangThaiLamViec] || detail.TrangThaiLamViec}</Tag>
              <Tag color={TRANG_THAI_HDV[detail.TrangThai]?.color}>
                {TRANG_THAI_HDV[detail.TrangThai]?.label}
              </Tag>
              <Tag color={TRANG_THAI_HOAT_DONG_HDV[detail.trang_thai_hoat_dong || 'Ranh']?.color}>
                {TRANG_THAI_HOAT_DONG_HDV[detail.trang_thai_hoat_dong || 'Ranh']?.label}
              </Tag>
            </Space>

            <Divider orientation="left" plain>👤 Định danh</Divider>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Mã NV">{detail.MaNV || '—'}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{detail.CCCD || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{detail.NgaySinh ? fmtDate(detail.NgaySinh) : '—'}</Descriptions.Item>
              <Descriptions.Item label="Hộ chiếu">{detail.HoChieu || '—'}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{detail.SoDienThoai}</Descriptions.Item>
              <Descriptions.Item label="Email">{detail.Email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{detail.DiaChi || '—'}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>🎓 Năng lực & chuyên môn</Divider>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Thẻ HDV">{detail.TheHDV || '—'}</Descriptions.Item>
              <Descriptions.Item label="Chuyên môn">{detail.ChuyenMon || '—'}</Descriptions.Item>
              <Descriptions.Item label="Số năm kinh nghiệm">{detail.SoNamKinhNghiem} năm</Descriptions.Item>
              <Descriptions.Item label="Tuyến điểm sở trường">{detail.TuyenDiem || '—'}</Descriptions.Item>
              <Descriptions.Item label="Kỹ năng bổ trợ">{detail.KyNang || '—'}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>🗓️ Lịch trình & phân công</Divider>
            <Text type="secondary" className="mb-2 block">
              Tổng số tour đã dẫn: <b>{detail.tong_so_tour_da_dan}</b>
            </Text>
            <Table
              rowKey="MaPhanCong"
              dataSource={detail.lich_su || []}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có phân công nào.' }}
              columns={[
                { title: 'Tour', dataIndex: 'ten_tour' },
                { title: 'Khởi hành', dataIndex: 'ngay_khoi_hanh', render: fmtDate, width: 110 },
                { title: 'Kết thúc', dataIndex: 'ngay_ket_thuc', render: fmtDate, width: 110 },
                { title: 'Vai trò', dataIndex: 'VaiTro', width: 110 },
                {
                  title: 'Trạng thái',
                  dataIndex: 'trang_thai_lich',
                  width: 110,
                  render: (v) => {
                    const st = TRANG_THAI_LICH[v];
                    return <Tag color={st?.color}>{st?.label || v}</Tag>;
                  },
                },
              ]}
            />

            <Divider orientation="left" plain>⭐ Đánh giá & hiệu suất</Divider>
            <div className="mb-3 flex items-center justify-between">
              <Text>
                Điểm trung bình:{' '}
                <b>{detail.diem_trung_binh != null ? `${detail.diem_trung_binh} / 5` : '—'}</b>{' '}
                · {detail.so_phan_hoi} phản hồi
              </Text>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                loading={analyzing}
                onClick={runAnalyze}
              >
                Phân tích bằng AI
              </Button>
            </div>
            {analysis && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Tag color={CAM_XUC_COLOR[analysis.nhan_cam_xuc]}>
                    {analysis.nhan_cam_xuc === 'TichCuc' ? 'Tích cực' : analysis.nhan_cam_xuc === 'TrungLap' ? 'Trung lập' : 'Tiêu cực'}
                  </Tag>
                  {analysis.nguon === 'Fallback' && <Tag color="orange">Fallback</Tag>}
                </div>
                {analysis.uu_diem?.length > 0 && (
                  <div className="mb-1 text-sm">
                    <b className="text-green-600">Ưu điểm:</b>{' '}
                    {analysis.uu_diem.join('; ')}
                  </div>
                )}
                {analysis.nhuoc_diem?.length > 0 && (
                  <div className="mb-1 text-sm">
                    <b className="text-red-600">Nhược điểm:</b>{' '}
                    {analysis.nhuoc_diem.join('; ')}
                  </div>
                )}
                <Text className="text-sm">{analysis.tong_ket}</Text>
              </div>
            )}

            <Divider orientation="left" plain>💰 Tài chính</Divider>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Định mức thù lao / tour">
                {detail.DinhMucThuLao ? fmtVND(detail.DinhMucThuLao) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Công tác phí">
                {detail.CongTacPhi ? fmtVND(detail.CongTacPhi) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Thông tin thanh toán">
                {detail.ThongTinThanhToan || '—'}
              </Descriptions.Item>
            </Descriptions>
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
