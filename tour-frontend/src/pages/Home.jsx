import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Row, Spin, Typography } from 'antd';
import {
  ArrowRightOutlined,
  CoffeeOutlined,
  DollarOutlined,
  FormOutlined,
  HistoryOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { tourApi } from '../api/http';
import TourCard from '../components/TourCard';
import ChatBox from '../components/ChatBox';
import { LOAI_TOUR } from '../utils/format';

const { Title, Text } = Typography;

const DANH_MUC = [
  {
    value: 'TraiNghiem',
    icon: <ThunderboltOutlined />,
    desc: 'Khám phá, chinh phục và phiêu lưu',
  },
  {
    value: 'NghiDuong',
    icon: <CoffeeOutlined />,
    desc: 'Thư giãn, resort, biển đảo',
  },
  {
    value: 'VanHoaLichSu',
    icon: <HistoryOutlined />,
    desc: 'Di sản, di tích, lễ hội truyền thống',
  },
];

const TOUR_RIENG_STEPS = [
  {
    icon: <FormOutlined />,
    title: 'Chia sẻ nhu cầu',
    desc: 'Mô tả hành trình, ngày đi và ngân sách',
  },
  {
    icon: <DollarOutlined />,
    title: 'Nhận báo giá riêng',
    desc: 'Tư vấn viên gửi giá & lịch trình chi tiết',
  },
  {
    icon: <RocketOutlined />,
    title: 'Chốt & lên đường',
    desc: 'Chốt lịch trình, thanh toán và khởi hành',
  },
];

/** Trang chủ web khách hàng: giới thiệu + danh mục + tour nổi bật + chatbot AI. */
export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tourApi
      .list()
      .then((rows) => setFeatured(rows.slice(0, 3)))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Banner giới thiệu */}
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-700 px-6 py-14 text-white shadow-lg sm:px-10">
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-14 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 max-w-2xl">
          <Title className="!mb-3 !text-white">
            Khám phá hành trình của bạn 🌏
          </Title>
          <Text className="!text-sky-100">
            Hàng trăm tour trải nghiệm, nghỉ dưỡng và văn hóa lịch sử — hoặc để AI
            tư vấn hành trình phù hợp với ngân sách và sở thích của bạn.
          </Text>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/tours')}
            >
              Khám phá tour ngay
            </Button>
            <Button
              size="large"
              ghost
              onClick={() => window.dispatchEvent(new CustomEvent('tour:open-chat'))}
            >
              Chat với AI tư vấn
            </Button>
          </div>
        </div>
      </section>

      {/* Danh mục tour */}
      <section className="mt-10">
        <Title level={3} className="!mb-4">
          Danh mục tour
        </Title>
        <Row gutter={[16, 16]}>
          {DANH_MUC.map((c) => (
            <Col xs={24} sm={8} key={c.value}>
              <button
                type="button"
                onClick={() => navigate(`/tours?loai=${c.value}`)}
                className="group h-full w-full rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-2xl text-white">
                  {c.icon}
                </div>
                <div className="font-semibold text-slate-800">
                  {LOAI_TOUR[c.value]}
                </div>
                <div className="mt-1 text-sm text-slate-500">{c.desc}</div>
                <div className="mt-2 text-xs font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100">
                  Xem tour →
                </div>
              </button>
            </Col>
          ))}
        </Row>
      </section>

      {/* Tour thiết kế riêng */}
      <section className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 p-8 text-white shadow-lg sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              ✨ Dịch vụ theo yêu cầu
            </span>
            <Title level={2} className="!mb-3 !mt-3 !text-white">
              Tour thiết kế riêng
            </Title>
            <Text className="!text-emerald-50">
              Đoàn công tác, gia đình, doanh nghiệp hay tuần trăng mật — hành trình
              được thiết kế riêng theo ngân sách, sở thích và lịch trình của bạn.
            </Text>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {TOUR_RIENG_STEPS.map((s, i) => (
                <div key={s.title} className="rounded-2xl bg-white/10 p-4">
                  <div className="text-2xl">{s.icon}</div>
                  <div className="mt-2 text-sm font-semibold">
                    {i + 1}. {s.title}
                  </div>
                  <div className="mt-1 text-xs text-emerald-50">{s.desc}</div>
                </div>
              ))}
            </div>

            <Button
              size="large"
              onClick={() => navigate('/custom-tour')}
              style={{ background: '#fff', color: '#0f766e', borderColor: '#fff' }}
              className="mt-6"
            >
              Thiết kế tour riêng ngay <ArrowRightOutlined />
            </Button>
          </div>

          <div className="hidden text-center lg:block">
            <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-full bg-white/10 text-8xl">
              🧳
            </div>
            <div className="mt-4 text-sm text-emerald-50">
              Đi đúng nơi bạn muốn · Ở đúng nơi bạn thích
            </div>
          </div>
        </div>
      </section>

      {/* Tour nổi bật */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <Title level={3} className="!mb-0">
            Tour nổi bật
          </Title>
          <Button type="link" onClick={() => navigate('/tours')}>
            Xem tất cả <ArrowRightOutlined />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {featured.map((t) => (
              <Col key={t.MaTour} xs={24} sm={12} lg={8}>
                <TourCard tour={t} />
              </Col>
            ))}
          </Row>
        )}
      </section>

      {/* Chatbot AI nổi — bấm nút mới mở */}
      <ChatBox />
    </div>
  );
}
