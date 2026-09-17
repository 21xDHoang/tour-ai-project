import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  message,
} from 'antd';
import {
  CalendarOutlined,
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { bookingApi, tourApi } from '../../api/http';
import {
  TRANG_THAI_LICH,
  TRANG_THAI_THANH_TOAN_MANUAL,
  TRANG_THAI_TOUR,
  fmtDate,
  fmtVND,
} from '../../utils/format';
import { batTatPill, lichPill } from '../../utils/signs';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

const PHUONG_THUC = [
  { value: 'TienMat', label: 'Tiền mặt' },
  { value: 'ChuyenKhoan', label: 'Chuyển khoản' },
  { value: 'The', label: 'Thẻ' },
];

const TT_OPTIONS = Object.keys(TRANG_THAI_THANH_TOAN_MANUAL).map((k) => ({
  value: k,
  label: TRANG_THAI_THANH_TOAN_MANUAL[k],
}));

/**
 * Vì sao một đợt lịch không đặt được — nội dung tooltip của hai nút bị vô hiệu.
 *
 * Điều kiện ở đây phải TRÙNG KHÍT điều kiện `disabled` của hai nút đó; lệch một
 * nhánh là có nút xám không kèm lời giải thích, đúng thứ tooltip sinh ra để dẹp.
 * Trả `undefined` khi đặt được (HangThaoTac hiểu `undefined` là "không có gì để nói").
 */
function lyDoKhongDat(lich) {
  if (lich.SoChoCon <= 0) return 'Đợt này đã hết chỗ.';
  if (lich.TrangThai !== 'MoBan') {
    const nhan = TRANG_THAI_LICH[lich.TrangThai]?.label || lich.TrangThai;
    return `Đợt đang ở trạng thái "${nhan}" — chỉ đặt được đợt đang mở bán.`;
  }
  return undefined;
}

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
  // manualMode: 'lich' = đặt theo lịch có sẵn · 'ondemand' = mở đợt mới theo ngày
  const [manualMode, setManualMode] = useState('lich');
  const [odDate, setOdDate] = useState(null); // dayjs
  const [odTripType, setOdTripType] = useState('Ghep'); // 'Ghep' | 'Rieng'

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
    setManualMode('lich');
    setManualLich(lich);
    manualForm.resetFields();
    manualForm.setFieldsValue({
      ds_hanh_khach: [{}],
      TrangThaiThanhToan: 'ChuaCoc',
      PhuongThuc: 'TienMat',
    });
  };

  /** Mở drawer "Đặt nhanh" theo chế độ On-Demand: tự mở đợt LichKhoiHanh mới. */
  const openManualOnDemand = () => {
    if (!odDate) {
      message.warning('Vui lòng chọn ngày khởi hành mong muốn!');
      return;
    }
    setManualMode('ondemand');
    setManualLich({
      ...detail,
      odNgay: odDate.format('YYYY-MM-DD'),
      odLoai: odTripType,
    });
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
      const lichPart =
        manualMode === 'ondemand'
          ? {
              // On-Demand: không có MaLich -> backend tự mở đợt LichKhoiHanh mới
              MaTour: manualLich.MaTour,
              NgayKhoiHanh: manualLich.odNgay,
              LoaiChuyenDi: manualLich.odLoai,
            }
          : { MaLich: manualLich.MaLich };
      await bookingApi.manual({
        ...lichPart,
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
      // Bảng này rộng hết vùng nội dung (~1110px) mà chỉ có bốn cột, nên để
      // điểm đến trong dòng phụ như màn "Bàn làm việc tư vấn" sẽ tạo một
      // khoảng trống vài trăm pixel giữa tên tour và cột giá — mắt phải nhảy
      // hết khoảng đó mới so được hai tour. Ở đây giữ điểm đến thành cột
      // riêng, dòng phụ chỉ còn số ngày (thứ duy nhất chưa có cột).
      title: 'Tour',
      dataIndex: 'TenTour',
      ellipsis: true,
      render: (v, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-950">{v}</div>
          <div className="truncate text-[12px] text-ink-600">{r.SoNgay} ngày</div>
        </div>
      ),
    },
    {
      title: 'Điểm đến',
      dataIndex: 'ten_diem_den',
      width: 150,
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: 'Giá',
      dataIndex: 'GiaKhuyenMai',
      width: 140,
      align: 'right',
      render: (v, r) => (
        <span className="tnum font-semibold text-ink-950">{fmtVND(v ?? r.GiaCoBan)}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 128,
      render: (v) => (
        <span className={`chip !px-2 !py-0.5 !text-[11px] ${batTatPill(v)}`}>
          {TRANG_THAI_TOUR[v]?.label || v}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 176,
      render: (_, r) => (
        <HangThaoTac
          chinh={{
            nhan: 'Tra lịch & đặt',
            icon: <CalendarOutlined />,
            disabled: r.TrangThai !== 'DangBan',
            // Nút vô hiệu mà không nói vì sao là kiểu bế tắc tốn thời gian
            // nhất — xem chú thích `disabledReason` ở HangThaoTac.
            disabledReason: 'Tour đang ngừng bán — mở bán lại trước khi tra lịch.',
            onClick: () => openLich(r.MaTour),
          }}
        />
      ),
    },
  ];

  const rongBang = columns.reduce((s, c) => s + (c.width || 0), 0);

  return (
    <div className="w-full">
      <SectionHeader
        marker={loading ? null : `${tours.length} tour`}
        title="Bàn đặt tour"
        description="Chọn tour, xem các đợt lịch khởi hành còn chỗ; đặt giúp khách qua web hoặc nhập tay cho khách liên hệ ngoài (gọi điện / Zalo / gặp trực tiếp)."
      />

      <div className="mt-6">
        <BangDuLieu
          rows={tours}
          columns={columns}
          rowKey="MaTour"
          x={rongBang}
          loading={loading}
          empty={{
            title: 'Chưa có tour nào',
            description: 'Tour đang mở bán sẽ hiện ở đây để bạn tra lịch và đặt giúp khách.',
          }}
        />
      </div>

      <Modal
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={900}
        title={detail ? `Lịch khởi hành — ${detail.TenTour}` : ''}
      >
        {detailLoading ? (
          <div className="space-y-2 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-8" />
            ))}
          </div>
        ) : (
          <div>
            <p className="mb-3 text-body-s text-ink-600">
              Giá: <b className="tnum text-ink-950">{fmtVND(donGia)}</b> / khách
            </p>
            <BangDuLieu
              rows={detail?.ds_lich || []}
              rowKey="MaLich"
              pagination={false}
              x={820}
              empty={{ title: 'Tour này chưa có lịch khởi hành.' }}
              columns={[
                {
                  // Ngày đi và ngày về của CÙNG một đợt là một đơn vị thông tin —
                  // tách hai cột thì mắt phải nhảy qua lại mới biết đợt nào dài
                  // bao nhiêu ngày.
                  title: 'Lịch khởi hành',
                  dataIndex: 'NgayKhoiHanh',
                  render: (v, r) => (
                    <div>
                      <div className="tnum whitespace-nowrap font-semibold text-ink-950">
                        {fmtDate(v)}
                      </div>
                      <div className="tnum whitespace-nowrap text-[12px] text-ink-600">
                        về {fmtDate(r.NgayKetThuc)}
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Chỗ còn',
                  dataIndex: 'SoChoCon',
                  width: 110,
                  // "Hết chỗ" mới là thông tin; còn 40 hay còn 12 chỗ đều là
                  // "đặt được", nên con số đứng trần chứ không tô màu.
                  render: (v) =>
                    v > 0 ? (
                      <span className="tnum">{v} chỗ</span>
                    ) : (
                      <span className="chip !px-2 !py-0.5 !text-[11px] bg-stop-50 text-stop-700 border-stop-200">
                        Hết chỗ
                      </span>
                    ),
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'TrangThai',
                  width: 132,
                  render: (v) => (
                    <span className={`chip !px-2 !py-0.5 !text-[11px] ${lichPill(v)}`}>
                      {TRANG_THAI_LICH[v]?.label || v}
                    </span>
                  ),
                },
                {
                  // Hình thức chuyến đi là một HẠNG MỤC, không phải mức độ cần
                  // hành động — nên nó không được tô màu. "Tour riêng" đậm hơn
                  // vì đoàn riêng không ghép thêm khách được.
                  title: 'Hình thức',
                  dataIndex: 'GhiChu',
                  width: 118,
                  render: (v) =>
                    v?.includes('[TOUR RIÊNG]') ? (
                      <span className="font-semibold text-ink-950">Tour riêng</span>
                    ) : (
                      // Lịch cũ không ghi gì trong GhiChu -> mặc định ghép đoàn.
                      <span className="text-ink-700">Ghép đoàn</span>
                    ),
                },
                {
                  title: 'Thao tác',
                  key: 'action',
                  width: 216,
                  render: (_, lich) => (
                    // "Đặt tour" và "Đặt nhanh" là hai cách làm cùng một việc,
                    // không cách nào là mặc định -> hiện thẳng cả hai, xem
                    // chú thích `hienHet` ở HangThaoTac.
                    <HangThaoTac
                      hienHet
                      chinh={{
                        nhan: 'Đặt tour',
                        manh: true,
                        disabled: lich.SoChoCon <= 0 || lich.TrangThai !== 'MoBan',
                        disabledReason: lyDoKhongDat(lich),
                        onClick: () => book(lich),
                      }}
                      khac={[
                        {
                          nhan: 'Đặt nhanh',
                          icon: <ThunderboltOutlined />,
                          disabled: lich.SoChoCon <= 0 || lich.TrangThai !== 'MoBan',
                          disabledReason: lyDoKhongDat(lich),
                          onClick: () => openManual(lich),
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
            <p className="mt-3 text-body-s text-ink-600">
              "Đặt tour" chuyển sang màn hình khai báo của khách; "Đặt nhanh" nhập tay
              đơn cho khách ngoài, có thể chọn luôn trạng thái thanh toán.
            </p>

            {/* ---- On-Demand: tự mở đợt LichKhoiHanh mới theo ngày khách muốn ---- */}
            <h3 className="mb-3 mt-5 border-t border-ink-200 pt-4 font-display text-title text-ink-950">
              Hoặc mở đợt mới theo ngày khách muốn
            </h3>
            <div className="flex flex-wrap items-end gap-3 rounded-card bg-guide-50/60 border border-guide-100 p-3">
              <div>
                <div className="mb-1 text-xs font-bold text-ink-700">
                  Ngày khởi hành mong muốn
                </div>
                <DatePicker
                  value={odDate}
                  onChange={setOdDate}
                  placeholder="Chọn ngày"
                  format="DD/MM/YYYY"
                  disabledDate={(c) =>
                    c && c < dayjs().add(2, 'day').startOf('day')
                  }
                />
              </div>
              <div>
                <div className="mb-1 text-xs font-bold text-ink-700">
                  Hình thức
                </div>
                <Radio.Group
                  value={odTripType}
                  onChange={(e) => setOdTripType(e.target.value)}
                >
                  <Radio.Button value="Ghep">Ghép đoàn</Radio.Button>
                  <Radio.Button value="Rieng">Tour riêng</Radio.Button>
                </Radio.Group>
              </div>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={openManualOnDemand}
              >
                Đặt nhanh đợt mới
              </Button>
            </div>
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
        {manualMode === 'ondemand' && (
          <div className="mb-3 rounded-card border border-guide-100 bg-guide-50/70 p-3 text-body-s text-ink-900">
            <b className="text-guide-700">Mở đợt mới theo ngày:</b>{' '}
            {fmtDate(manualLich?.odNgay)} ·{' '}
            {manualLich?.odLoai === 'Rieng'
              ? 'Tour riêng (không ghép đoàn)'
              : 'Ghép đoàn'}
            . Hệ thống sẽ tự tạo LichKhoiHanh mới khi lưu đơn.
          </div>
        )}
        {/* Mọi `Form.Item` dưới đây phải giữ nguyên là con TRỰC TIẾP của `Form`
            (hoặc của hàm render trong `Form.List`). Bọc chúng vào một component
            mới là đổi gốc đường dẫn `name` và form im lặng mất giá trị. */}
        <Form form={manualForm} layout="vertical">
          <h3 className="mb-3 font-display text-title text-ink-950">Thông tin người đặt</h3>
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

          <h3 className="mb-3 mt-6 font-display text-title text-ink-950">
            Danh sách hành khách
          </h3>
          <Form.List name="ds_hanh_khach">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="mb-2 rounded-card border border-ink-200 bg-white p-3">
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
                      <button
                        type="button"
                        aria-label={`Xóa hành khách ${name + 1}`}
                        onClick={() => remove(name)}
                        className="btn btn-ghost mt-7 !shrink-0 !px-2 !py-1.5 !text-stop-600"
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-quiet w-full" onClick={() => add()}>
                  <PlusOutlined /> Thêm hành khách
                </button>
              </>
            )}
          </Form.List>

          <h3 className="mb-3 mt-6 font-display text-title text-ink-950">Thanh toán</h3>
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
