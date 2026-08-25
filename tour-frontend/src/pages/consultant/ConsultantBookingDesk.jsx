import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
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
  CalendarOutlined,
  DeleteOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { bookingApi, tourApi } from '../../api/http';
import {
  TRANG_THAI_LICH,
  TRANG_THAI_THANH_TOAN_MANUAL,
  fmtDate,
  fmtVND,
} from '../../utils/format';

const { Title, Text } = Typography;

const PHUONG_THUC = [
  { value: 'TienMat', label: 'Tiền mặt' },
  { value: 'ChuyenKhoan', label: 'Chuyển khoản' },
  { value: 'The', label: 'Thẻ' },
];

const TT_OPTIONS = Object.keys(TRANG_THAI_THANH_TOAN_MANUAL).map((k) => ({
  value: k,
  label: TRANG_THAI_THANH_TOAN_MANUAL[k],
}));

/** Bàn đặt tour (Consultant): tra lịch + chỗ còn + đặt giúp khách + đặt nhanh thủ công. */
export default function ConsultantBookingDesk() {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // {tour, ds_lich}
  const [detailLoading, setDetailLoading] = useState(false);
  const [manualLich, setManualLich] = useState(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualForm] = Form.useForm();

  const donGia = Number(detail?.GiaKhuyenMai ?? detail?.GiaCoBan ?? 0);
  const dsWatch = Form.useWatch('ds_hanh_khach', manualForm);
  const ttWatch = Form.useWatch('TrangThaiThanhToan', manualForm);
  const soKhach = dsWatch?.length || 0;

  useEffect(() => {
    tourApi
      .list()
      .then(setTours)
      .catch(() => setTours([]))
      .finally(() => setLoading(false));
  }, []);

  const openLich = async (maTour) => {
    setDetailLoading(true);
    try {
      const data = await tourApi.detail(maTour);
      setDetail(data);
    } catch {
      message.error('Không tải được lịch khởi hành');
    } finally {
      setDetailLoading(false);
    }
  };

  const book = (lich) => {
    navigate(`/book/${lich.MaLich}`, {
      state: { tour: detail, lich },
    });
  };

  const openManual = (lich) => {
    setManualLich(lich);
    manualForm.resetFields();
    manualForm.setFieldsValue({
      ds_hanh_khach: [{}],
      TrangThaiThanhToan: 'ChuaCoc',
      PhuongThuc: 'TienMat',
    });
  };

  const submitManual = async () => {
    const v = await manualForm.validateFields();
    const ds = (v.ds_hanh_khach || []).map((p) => ({
      HoTen: p.HoTen.trim(),
      SoDienThoai: p.SoDienThoai?.trim() || null,
      GhiChu: p.GhiChu?.trim() || null,
    }));
    const soKhach = ds.length;
    const tongTien = v.TongTien ?? soKhach * donGia;
    let SoTienCoc = null;
    if (v.TrangThaiThanhToan === 'DaCoc') {
      SoTienCoc = v.SoTienCoc ?? Math.round(tongTien * 0.3);
    }
    setManualSubmitting(true);
    try {
      await bookingApi.manual({
        MaLich: manualLich.MaLich,
        nguoi_dat: {
          HoTen: v.HoTen,
          SoDienThoai: v.SoDienThoai,
          Email: v.Email || null,
        },
        ds_hanh_khach: ds,
        TongTien: v.TongTien ?? null,
        TrangThaiThanhToan: v.TrangThaiThanhToan,
        SoTienCoc,
        PhuongThuc: v.PhuongThuc || 'TienMat',
      });
      message.success('Đặt tour thủ công thành công');
      setManualLich(null);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Đặt tour thủ công thất bại');
    } finally {
      setManualSubmitting(false);
    }
  };

  const columns = [
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
    { title: 'Điểm đến', dataIndex: 'ten_diem_den', render: (v) => v || '—' },
    {
      title: 'Giá',
      dataIndex: 'GiaKhuyenMai',
      render: (v, r) => (
        <b className="text-indigo-600">{fmtVND(v ?? r.GiaCoBan)}</b>
      ),
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
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, r) => (
        <Button
          type="primary"
          icon={<CalendarOutlined />}
          disabled={r.TrangThai !== 'DangBan'}
          onClick={() => openLich(r.MaTour)}
        >
          Tra lịch & đặt
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Title level={3} className="!mb-1">
          <ShoppingCartOutlined /> Bàn đặt tour
        </Title>
        <Text type="secondary">
          Chọn tour, xem các đợt lịch khởi hành còn chỗ; đặt giúp khách qua web hoặc
          nhập tay cho khách liên hệ ngoài (gọi điện / Zalo / gặp trực tiếp).
        </Text>
      </div>

      <Card className="shadow-card" bordered={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Table rowKey="MaTour" columns={columns} dataSource={tours} />
        )}
      </Card>

      <Modal
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={760}
        title={detail ? `Lịch khởi hành — ${detail.TenTour}` : ''}
      >
        {detailLoading ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : (
          <div>
            <Text type="secondary" className="mb-3 block">
              Giá: <b className="text-indigo-600">{fmtVND(donGia)}</b> / khách
            </Text>
            <Table
              rowKey="MaLich"
              dataSource={detail?.ds_lich || []}
              pagination={false}
              locale={{ emptyText: 'Tour này chưa có lịch khởi hành.' }}
              columns={[
                {
                  title: 'Ngày khởi hành',
                  dataIndex: 'NgayKhoiHanh',
                  render: (v) => fmtDate(v),
                },
                {
                  title: 'Ngày kết thúc',
                  dataIndex: 'NgayKetThuc',
                  render: (v) => fmtDate(v),
                },
                {
                  title: 'Chỗ còn',
                  dataIndex: 'SoChoCon',
                  render: (v) => (
                    <Tag color={v > 0 ? 'green' : 'red'}>
                      {v > 0 ? `${v} chỗ` : 'Hết chỗ'}
                    </Tag>
                  ),
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'TrangThai',
                  render: (v) => {
                    const st = TRANG_THAI_LICH[v];
                    return <Tag color={st?.color}>{st?.label || v}</Tag>;
                  },
                },
                {
                  title: '',
                  key: 'action',
                  render: (_, lich) => (
                    <Space>
                      <Button
                        type="primary"
                        size="small"
                        disabled={lich.SoChoCon <= 0 || lich.TrangThai !== 'MoBan'}
                        onClick={() => book(lich)}
                      >
                        Đặt tour
                      </Button>
                      <Button
                        size="small"
                        icon={<ThunderboltOutlined />}
                        disabled={lich.SoChoCon <= 0 || lich.TrangThai !== 'MoBan'}
                        onClick={() => openManual(lich)}
                      >
                        Đặt nhanh
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
            <Space className="mt-3 text-xs text-slate-500">
              "Đặt tour" chuyển sang màn hình khai báo của khách; "Đặt nhanh" nhập tay
              đơn cho khách ngoài, có thể chọn luôn trạng thái thanh toán.
            </Space>
          </div>
        )}
      </Modal>

      <Drawer
        open={!!manualLich}
        onClose={() => setManualLich(null)}
        width={720}
        title="Đặt tour nhanh (thủ công)"
        extra={
          <Button type="primary" loading={manualSubmitting} onClick={submitManual}>
            Lưu đơn
          </Button>
        }
      >
        <Form form={manualForm} layout="vertical">
          <Divider orientation="left" plain>
            Thông tin người đặt
          </Divider>
          <div className="flex flex-wrap gap-3">
            <Form.Item
              name="HoTen"
              label="Họ tên"
              className="w-56"
              rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}
            >
              <Input placeholder="Họ tên người đặt" />
            </Form.Item>
            <Form.Item
              name="SoDienThoai"
              label="Số điện thoại"
              className="w-48"
              rules={[{ required: true, min: 8, message: 'Nhập SĐT' }]}
            >
              <Input placeholder="Số điện thoại" />
            </Form.Item>
            <Form.Item name="Email" label="Email" className="flex-1">
              <Input placeholder="Email (không bắt buộc)" />
            </Form.Item>
          </div>

          <Divider orientation="left" plain>
            Danh sách hành khách
          </Divider>
          <Form.List name="ds_hanh_khach">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="mb-2 rounded border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <Form.Item
                        {...rest}
                        name={[name, 'HoTen']}
                        label="Họ tên"
                        className="w-56"
                        rules={[{ required: true, min: 2, message: 'Nhập tên' }]}
                      >
                        <Input placeholder="Họ tên hành khách" />
                      </Form.Item>
                      <Form.Item
                        {...rest}
                        name={[name, 'SoDienThoai']}
                        label="SĐT"
                        className="w-44"
                      >
                        <Input placeholder="Không bắt buộc" />
                      </Form.Item>
                      <Form.Item
                        {...rest}
                        name={[name, 'GhiChu']}
                        label="Sở thích riêng"
                        className="flex-1"
                      >
                        <Input placeholder="vd: ăn chay, cần xe lăn..." />
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        className="mt-7"
                        onClick={() => remove(name)}
                      />
                    </div>
                  </div>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                  Thêm hành khách
                </Button>
              </>
            )}
          </Form.List>

          <Divider orientation="left" plain>
            Thanh toán
          </Divider>
          <div className="flex flex-wrap items-end gap-3">
            <Form.Item label="Số lượng vé" className="w-36">
              <InputNumber value={soKhach} disabled className="w-full" />
            </Form.Item>
            <Form.Item name="TongTien" label="Tổng tiền (tự tính, sửa được)" className="w-48">
              <InputNumber
                className="w-full"
                min={0}
                placeholder={fmtVND(soKhach * donGia)}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => val.replace(/\s?|(,*)/g, '')}
              />
            </Form.Item>
            <Form.Item name="TrangThaiThanhToan" label="Trạng thái thanh toán" className="w-52">
              <Select options={TT_OPTIONS} />
            </Form.Item>
          </div>

          {ttWatch === 'DaCoc' && (
            <div className="flex flex-wrap items-end gap-3">
              <Form.Item name="SoTienCoc" label="Tiền cọc (mặc định 30%)" className="w-48">
                <InputNumber
                  className="w-full"
                  min={0}
                  placeholder={fmtVND(Math.round(soKhach * donGia * 0.3))}
                />
              </Form.Item>
              <Form.Item name="PhuongThuc" label="Phương thức" className="w-44">
                <Select options={PHUONG_THUC} />
              </Form.Item>
            </div>
          )}
          {ttWatch === 'DaThanhToan' && (
            <Form.Item name="PhuongThuc" label="Phương thức" className="w-44">
              <Select options={PHUONG_THUC} />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </div>
  );
}
