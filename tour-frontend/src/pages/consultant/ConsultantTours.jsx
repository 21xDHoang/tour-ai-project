import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Col, Row } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { tourApi } from '../../api/http';
import { TRANG_THAI_TOUR, fmtVND } from '../../utils/format';
import { batTatPill, signOf } from '../../utils/signs';
import ChatBox from '../../components/ChatBox';
import BangDuLieu from '../../components/ui/BangDuLieu';
import HangThaoTac from '../../components/ui/HangThaoTac';
import SectionHeader from '../../components/ui/SectionHeader';

/** Bàn làm việc tư vấn (Consultant): danh mục tour + AI hỗ trợ. */
export default function ConsultantTours() {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tourApi
      .list()
      .then(setTours)
      .catch(() => setTours([]))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      // Không khai báo bề rộng: cột tên nhận hết phần chỗ trống còn lại.
      //
      // Loại hình nằm ngay trong ô này dưới dạng chấm màu + chữ, chứ không
      // chiếm một cột riêng. Bảng chỉ rộng ~740px vì nằm trong cột 16/24 của
      // lưới, mà nút "Tư vấn & Sinh nội dung AI" đã ăn 232px — thêm một cột
      // 132px nữa thì tên tour còn đúng 119px và cái nào cũng thành "Da Lat -
      // Tha...". Chấm màu giữ nguyên cách đọc của web khách (bộ lọc danh mục
      // cũng dùng chấm) mà không tốn bề ngang.
      title: 'Tour',
      dataIndex: 'TenTour',
      ellipsis: true,
      render: (v, r) => {
        const sign = signOf(r.LoaiTour);
        return (
          <div className="flex min-w-0 items-start gap-2">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sign.dotCls}`} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-ink-950">{v}</div>
              <div className="truncate text-[11.5px] text-ink-500">
                {sign.label} · {r.ten_diem_den} · {r.SoNgay} ngày
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Giá',
      dataIndex: 'GiaKhuyenMai',
      width: 140,
      align: 'right',
      render: (v, r) => (
        <div>
          <div className="tnum font-semibold text-ink-950">{fmtVND(v ?? r.GiaCoBan)}</div>
          {/* Giá gốc chỉ gạch khi giá khuyến mãi thấp hơn thật. */}
          {v != null && v < r.GiaCoBan ? (
            <div className="tnum text-[11.5px] text-ink-500 line-through">
              {fmtVND(r.GiaCoBan)}
            </div>
          ) : null}
        </div>
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
      title: 'Thao tác',
      key: 'action',
      width: 232,
      fixed: 'right',
      render: (_, r) => (
        <HangThaoTac
          chinh={{
            nhan: 'Tư vấn & Sinh nội dung AI',
            icon: <RobotOutlined />,
            onClick: () => navigate(`/tours/${r.MaTour}`),
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
        title="Bàn làm việc tư vấn"
        description="Chọn tour để mở chi tiết — dùng AI sinh mô tả & lịch trình (UC-11) hoặc trò chuyện với AI tư vấn."
      />

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={16}>
          <BangDuLieu
            rows={tours}
            columns={columns}
            rowKey="MaTour"
            x={rongBang}
            loading={loading}
            pagination={false}
            empty={{
              title: 'Chưa có tour nào',
              description: 'Tour đang mở bán sẽ hiện ở đây để bạn tư vấn cho khách.',
            }}
          />
        </Col>

        <Col xs={24} lg={8}>
          <div className="panel h-full p-4">
            <h2 className="font-display text-title text-ink-950">Mẹo tư vấn</h2>
            <p className="mt-2.5 text-body-s text-ink-600">
              Hỏi AI bằng ngôn ngữ tự nhiên theo ngân sách, số ngày và sở thích để
              nhận tối đa 3 tour gợi ý kèm lý do.
            </p>
            <p className="mt-3 text-body-s text-ink-600">
              Ví dụ:{' '}
              <i>
                &ldquo;Gia đình 4 người muốn đi biển 3 ngày 2 đêm, ngân sách khoảng
                12 triệu.&rdquo;
              </i>
            </p>
            <p className="mt-3 rounded-field bg-paper p-3 text-body-s text-ink-600">
              Chatbot AI nằm ở góc dưới bên phải màn hình.
            </p>
          </div>
        </Col>
      </Row>

      <ChatBox />
    </div>
  );
}
