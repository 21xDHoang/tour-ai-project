import { useEffect, useState } from 'react';
import { Card, Col, Row, Skeleton, Timeline, Typography } from 'antd';
import {
  CarryOutOutlined,
  CheckCircleOutlined,
  CompassOutlined,
  SafetyOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { camNangApi } from '../api/http';

const { Title, Paragraph, Text } = Typography;

/** Nội dung tĩnh dùng làm fallback khi backend không trả dữ liệu. */
const MUCLUC = [
  {
    icon: <CarryOutOutlined />,
    title: 'Chuẩn bị trước chuyến đi',
    items: [
      'Đặt tour sớm ít nhất 7 ngày để có nhiều lựa chọn lịch khởi hành.',
      'Chuẩn bị giấy tờ tùy thân (CMND/CCCD) cho mọi thành viên.',
      'Kiểm tra thời tiết điểm đến để chọn trang phục phù hợp.',
    ],
  },
  {
    icon: <WalletOutlined />,
    title: 'Chi phí & thanh toán',
    items: [
      'Đặt tour giữ chỗ 24h miễn phí; thanh toán cọc 30% để xác nhận.',
      'Hoàn tất thanh toán đủ trước ngày khởi hành 5 ngày.',
      'Chính sách hủy: hoàn tiền theo tiến độ gần ngày đi (xem chính sách).',
    ],
  },
  {
    icon: <SafetyOutlined />,
    title: 'An toàn trong chuyến đi',
    items: [
      'Luôn nghe hướng dẫn của HDV và tuân thủ lịch trình.',
      'Lưu số hotline khẩn cấp của công ty để liên hệ khi cần.',
      'Mua bảo hiểm du lịch khi đi các điểm xa, vùng núi hoặc biển.',
    ],
  },
];

/** Render nội dung text theo quy ước: "- " là gạch đầu dòng, "1. " là bước. */
function renderNoiDung(text) {
  if (!text) return null;
  const lines = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const nodes = [];
  let bullets = [];
  let steps = [];

  const flushBullets = (key) => {
    if (bullets.length) {
      nodes.push(
        <ul key={key} className="mb-2 list-disc space-y-1 pl-5 text-slate-600">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  const flushSteps = (key) => {
    if (steps.length) {
      nodes.push(
        <ol key={key} className="mb-2 list-decimal space-y-1 pl-5 text-slate-600">
          {steps.map((s, i) => (
            <li key={i}>{s.replace(/^\d+\.\s*/, '')}</li>
          ))}
        </ol>,
      );
      steps = [];
    }
  };

  lines.forEach((line, idx) => {
    if (line.startsWith('- ')) {
      flushSteps(`s${idx}`);
      bullets.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      flushBullets(`b${idx}`);
      steps.push(line);
    } else {
      flushBullets(`b${idx}`);
      flushSteps(`s${idx}`);
      nodes.push(
        <Paragraph key={`p${idx}`} className="!mb-2 text-slate-600">
          {line}
        </Paragraph>,
      );
    }
  });
  flushBullets('be');
  flushSteps('se');
  return nodes;
}

/** Cẩm nang du lịch — hiển thị bài viết từ CMS, fallback về nội dung tĩnh. */
export default function CamNang() {
  const [articles, setArticles] = useState(null); // null = dùng fallback
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    camNangApi
      .active()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setArticles(data);
        }
      })
      .catch(() => {
        /* giữ nguyên fallback tĩnh */
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 text-center">
        <Title level={2} className="!mb-1">
          <CompassOutlined className="mr-1 text-indigo-600" /> Cẩm nang du lịch
        </Title>
        <Text type="secondary">
          Kinh nghiệm hữu ích cho chuyến đi trọn vẹn cùng TourAI.
        </Text>
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((i) => (
            <Col xs={24} md={8} key={i}>
              <Card bordered={false} className="shadow-card">
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : articles ? (
        <Row gutter={[16, 16]}>
          {articles.map((a) => (
            <Col xs={24} md={12} key={a.MaBaiViet}>
              <Card className="h-full shadow-card" bordered={false}>
                {a.HinhAnhURL && (
                  <img
                    src={a.HinhAnhURL}
                    alt={a.TieuDe}
                    className="mb-3 h-44 w-full rounded-lg object-cover"
                  />
                )}
                <Title level={4} className="!mb-1">
                  {a.TieuDe}
                </Title>
                {a.MoTaNgan && (
                  <Paragraph type="secondary" className="!mb-3">
                    {a.MoTaNgan}
                  </Paragraph>
                )}
                <div className="text-sm">{renderNoiDung(a.NoiDung)}</div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <FallbackContent />
      )}
    </div>
  );
}

/** Fallback tĩnh giữ nguyên giao diện cũ khi chưa có dữ liệu CMS. */
function FallbackContent() {
  return (
    <>
      <Row gutter={[16, 16]}>
        {MUCLUC.map((m) => (
          <Col xs={24} md={8} key={m.title}>
            <Card className="h-full shadow-card" bordered={false}>
              <Title level={4} className="!mb-3">
                <span className="mr-2 text-indigo-600">{m.icon}</span>
                {m.title}
              </Title>
              <Timeline
                items={m.items.map((it) => ({
                  dot: <CheckCircleOutlined className="text-green-500" />,
                  children: <Paragraph className="!mb-0 text-slate-600">{it}</Paragraph>,
                }))}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="mt-6 shadow-card" bordered={false}>
        <Title level={4}>Quy trình đặt tour chuẩn</Title>
        <Paragraph className="text-slate-600">
          <b>1.</b> Chọn tour & lịch khởi hành còn chỗ → <b>2.</b> Khai báo thông tin
          hành khách → <b>3.</b> Đặt chỗ (giữ 24h miễn phí) → <b>4.</b> Kế toán xác
          nhận cọc 30% → <b>5.</b> Nhận thông báo & hoàn tất thanh toán → <b>6.</b>{' '}
          Lên đường và chia sẻ đánh giá.
        </Paragraph>
      </Card>
    </>
  );
}
