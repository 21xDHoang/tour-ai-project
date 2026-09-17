import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Luggage, ShieldCheck, Wallet } from 'lucide-react';
import { camNangApi } from '../api/http';
import SectionHeader from '../components/ui/SectionHeader';

/** Sáu bước của quy trình đặt tour — đây là một chuỗi thật nên đánh số được. */
const QUY_TRINH = [
  { buoc: 'Chọn tour & lịch khởi hành còn chỗ', noi: 'Lọc theo điểm đến, loại tour và ngân sách.' },
  { buoc: 'Khai báo thông tin hành khách', noi: 'Họ tên từng người, số điện thoại liên hệ.' },
  { buoc: 'Đặt chỗ — giữ 24 giờ miễn phí', noi: 'Chưa cần trả tiền ở bước này.' },
  { buoc: 'Kế toán xác nhận cọc 30%', noi: 'Chuyển khoản rồi khai báo để đối soát.' },
  { buoc: 'Hoàn tất thanh toán phần còn lại', noi: 'Trước ngày khởi hành 5 ngày.' },
  { buoc: 'Lên đường và chia sẻ đánh giá', noi: 'Đánh giá hiển thị sau khi Admin duyệt.' },
];

/** Nội dung tĩnh dùng làm fallback khi backend không trả dữ liệu. */
const MUCLUC = [
  {
    Icon: Luggage,
    title: 'Chuẩn bị trước chuyến đi',
    items: [
      'Đặt tour sớm ít nhất 7 ngày để có nhiều lựa chọn lịch khởi hành.',
      'Chuẩn bị giấy tờ tùy thân (CMND/CCCD) cho mọi thành viên.',
      'Kiểm tra thời tiết điểm đến để chọn trang phục phù hợp.',
    ],
  },
  {
    Icon: Wallet,
    title: 'Chi phí & thanh toán',
    items: [
      'Đặt tour giữ chỗ 24h miễn phí; thanh toán cọc 30% để xác nhận.',
      'Hoàn tất thanh toán đủ trước ngày khởi hành 5 ngày.',
      'Chính sách hủy: hoàn tiền theo tiến độ gần ngày đi (xem chính sách).',
    ],
  },
  {
    Icon: ShieldCheck,
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
        <ul
          key={key}
          className="mb-2.5 list-disc space-y-1 pl-5 text-ink-700 marker:text-ink-400"
        >
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
        <ol
          key={key}
          className="mb-2.5 list-decimal space-y-1 pl-5 text-ink-700 marker:font-semibold marker:text-ink-500"
        >
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
        <p key={`p${idx}`} className="mb-2.5 text-ink-700">
          {line}
        </p>,
      );
    }
  });
  flushBullets('be');
  flushSteps('se');
  return nodes;
}

/** Cẩm nang du lịch — hiển thị bài viết từ CMS, fallback về nội dung tĩnh. */
export default function CamNang() {
  const navigate = useNavigate();
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
    <div className="shell space-y-8 pb-28 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-m text-ink-950">
            Cẩm nang du lịch
          </h1>
          <p className="mt-1.5 max-w-prose text-body-s text-ink-600">
            Những việc nên làm trước, trong và sau chuyến đi — gom lại thành một
            chỗ để bạn không phải nhớ.
          </p>
        </div>
        <button type="button" onClick={() => navigate('/tours')} className="btn btn-ink">
          Xem danh sách tour
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel space-y-3 p-5">
              <div className="skeleton h-5 w-1/2" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
            </div>
          ))}
        </div>
      ) : articles ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {articles.map((a) => (
            <article key={a.MaBaiViet} className="panel overflow-hidden">
              {a.HinhAnhURL ? (
                <img
                  src={a.HinhAnhURL}
                  alt={a.TieuDe}
                  className="h-44 w-full object-cover"
                />
              ) : null}
              <div className="p-5">
                <h2 className="font-display text-title text-ink-950">{a.TieuDe}</h2>
                {a.MoTaNgan ? (
                  <p className="mt-1.5 text-body-s text-ink-600">{a.MoTaNgan}</p>
                ) : null}
                {/* Bài viết để cỡ chữ nền (15px) chứ không phải cỡ nhãn: đây là
                    chỗ duy nhất trên site khách phải đọc liền mạch nhiều dòng. */}
                <div className="mt-3">{renderNoiDung(a.NoiDung)}</div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <FallbackContent />
      )}
    </div>
  );
}

/** Fallback tĩnh khi CMS chưa có bài nào. */
function FallbackContent() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {MUCLUC.map(({ Icon, title, items }) => (
          <section key={title} className="panel p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sign bg-ink-950 text-white">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="font-display text-title text-ink-950">{title}</h2>
            </div>

            <ul className="mt-4 space-y-2.5">
              {items.map((it) => (
                <li key={it} className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-guide-500"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                  <span className="text-ink-700">{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <SectionHeader
          className="border-b border-ink-200 p-5 sm:p-6"
          title="Quy trình đặt tour"
          description="Sáu bước từ lúc chọn tour tới lúc chia sẻ đánh giá. Bước 3 là bước duy nhất chưa cần trả tiền."
        />

        <ol className="divide-y divide-ink-200">
          {QUY_TRINH.map((b, i) => (
            <li key={b.buoc} className="flex items-start gap-3.5 px-5 py-4 sm:px-6">
              <span className="label-sign tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-sign bg-ink-950 text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="font-display text-[15px] font-bold text-ink-950">
                  {b.buoc}
                </div>
                <div className="mt-0.5 text-body-s text-ink-600">{b.noi}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
