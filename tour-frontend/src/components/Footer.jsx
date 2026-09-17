import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Modal, message } from 'antd';
import {
  Clock,
  Compass,
  Facebook,
  Gift,
  Heart,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Youtube,
} from 'lucide-react';
import Logo from './Logo';

/** Một cột liên kết trong chân trang. */
function FooterColumn({ title, children }) {
  return (
    <div>
      <h3 className="font-display text-[14px] font-bold text-white">{title}</h3>
      <ul className="mt-4 space-y-3 text-[13.5px]">{children}</ul>
    </div>
  );
}

const LINK_CLS = 'text-ink-300 transition-colors hover:text-white';

/**
 * Chân trang.
 *
 * Đây là bề mặt tối duy nhất của web khách hàng — đóng vai trò như một giàn
 * biển báo khép lại hành trình. Bỏ gradient, bỏ emoji, bỏ chữ IN HOA giãn cách
 * ở tiêu đề cột: tiêu đề cột dùng chữ thường đậm, dễ đọc hơn cho khách lớn tuổi.
 */
export default function Footer({ onOpenContactModal }) {
  const [email, setEmail] = useState('');
  const [policyOpen, setPolicyOpen] = useState(false);

  const onSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      message.warning('Vui lòng nhập địa chỉ email hợp lệ!');
      return;
    }
    message.success('Cảm ơn bạn đã đăng ký nhận thông tin khuyến mãi & tour mới!');
    setEmail('');
  };

  return (
    <footer className="on-ink mt-20">
      {/* Dải đăng ký nhận ưu đãi */}
      <div className="border-b border-white/10">
        <div className="shell flex flex-col items-start justify-between gap-6 py-9 md:flex-row md:items-center">
          <div className="max-w-lg">
            <h3 className="flex items-center gap-2.5 font-display text-lg font-extrabold text-white">
              <Gift className="h-5 w-5 shrink-0 text-signal-400" aria-hidden="true" />
              Nhận voucher 500k và tour mới mỗi tuần
            </h3>
            <p className="mt-1.5 text-[13.5px] text-ink-300">
              Đăng ký để nhận thông báo sớm về chuyến đi ưu đãi và cẩm nang du lịch.
            </p>
          </div>

          <form onSubmit={onSubscribe} className="flex w-full max-w-md gap-2">
            <Input
              size="large"
              type="email"
              prefix={<Mail className="h-4 w-4 text-ink-400" aria-hidden="true" />}
              placeholder="Email của bạn"
              aria-label="Email nhận bản tin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="!border-white/20 !bg-white/10 !text-white placeholder:!text-ink-400"
            />
            <button
              type="submit"
              className="btn btn-signal shrink-0 !px-5"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Đăng ký
            </button>
          </form>
        </div>
      </div>

      {/* Liên kết chính */}
      <div className="shell py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Thương hiệu & pháp lý */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block" aria-label="Đi Thôi Travel — về trang chủ">
              <Logo theme="dark" size="lg" />
            </Link>

            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-ink-300">
              Nền tảng đặt tour và thiết kế hành trình riêng. Giữ chỗ 24 giờ, cọc từ
              30%, tư vấn cung đường cùng trợ lý AI.
            </p>

            {/* Thông tin pháp lý — yếu tố tạo niềm tin, đặc biệt với khách gia đình. */}
            <div className="mt-5 space-y-1.5 rounded-card border border-white/10 bg-white/5 p-4 text-[12.5px] text-ink-300">
              <div className="flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4 shrink-0 text-guide-300" aria-hidden="true" />
                CÔNG TY CỔ PHẦN DU LỊCH &amp; CÔNG NGHỆ TOURAI
              </div>
              <div>
                Mã số doanh nghiệp:{' '}
                <span className="tnum text-white">0109887766</span> do Sở KH&amp;ĐT cấp
              </div>
              <div>
                Giấy phép kinh doanh lữ hành Quốc tế:{' '}
                <span className="tnum text-white">01-1234/2024/TCDL-GP LHQT</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              {[
                { href: 'https://facebook.com', label: 'Facebook', Icon: Facebook },
                { href: 'https://instagram.com', label: 'Instagram', Icon: Instagram },
                { href: 'https://youtube.com', label: 'YouTube', Icon: Youtube },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-card border border-white/10 bg-white/5 text-ink-300 transition-colors hover:border-white/30 hover:bg-white/15 hover:text-white"
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Khám phá tour">
            <li>
              <Link to="/tours" className={`${LINK_CLS} flex items-center gap-2`}>
                <Compass className="h-4 w-4 shrink-0 text-signal-400" aria-hidden="true" />
                Tất cả tour
              </Link>
            </li>
            <li>
              <Link to="/tours?loai=TraiNghiem" className={LINK_CLS}>
                Tour trải nghiệm &amp; khám phá
              </Link>
            </li>
            <li>
              <Link to="/tours?loai=NghiDuong" className={LINK_CLS}>
                Tour nghỉ dưỡng cao cấp
              </Link>
            </li>
            <li>
              <Link to="/tours?loai=VanHoaLichSu" className={LINK_CLS}>
                Tour văn hoá &amp; di sản
              </Link>
            </li>
            <li>
              <Link to="/custom-tour" className={`${LINK_CLS} flex items-center gap-2`}>
                <Gift className="h-4 w-4 shrink-0 text-signal-400" aria-hidden="true" />
                Tour thiết kế riêng
              </Link>
            </li>
          </FooterColumn>

          <FooterColumn title="Hỗ trợ khách hàng">
            <li>
              <Link to="/vouchers" className={LINK_CLS}>
                Mã giảm giá &amp; voucher
              </Link>
            </li>
            <li>
              <Link to="/cam-nang" className={LINK_CLS}>
                Cẩm nang du lịch
              </Link>
            </li>
            <li>
              <Link to="/history" className={LINK_CLS}>
                Lịch sử đặt tour &amp; vé điện tử
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setPolicyOpen(true)}
                className={`${LINK_CLS} text-left`}
              >
                Chính sách hoàn huỷ (DR-04)
              </button>
            </li>
            {onOpenContactModal ? (
              <li>
                <button
                  type="button"
                  onClick={onOpenContactModal}
                  className="text-left font-semibold text-guide-300 transition-colors hover:text-white"
                >
                  Yêu cầu tư vấn nhanh
                </button>
              </li>
            ) : null}
          </FooterColumn>

          <FooterColumn title="Trụ sở &amp; hotline">
            <li className="flex items-start gap-2.5 text-ink-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span>Đường Z115, Xã Quyết Thắng, TP. Thái Nguyên</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-guide-300" aria-hidden="true" />
              <span>
                <a
                  href="tel:0399677693"
                  className="tnum font-display text-[15px] font-bold text-white hover:text-signal-400"
                >
                  0399 677 693
                </a>
                <span className="ml-2 text-[12px] text-ink-400">Hotline 24/7</span>
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-ink-300">
              <Mail className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              <a href="mailto:support@tourai.vn" className={LINK_CLS}>
                support@tourai.vn
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-[12.5px] text-ink-400">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>08:00 – 21:30, kể cả thứ Bảy và Chủ nhật</span>
            </li>
          </FooterColumn>
        </div>

        {/* Dòng cuối */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-[12.5px] text-ink-400 sm:flex-row sm:items-center">
          <div>
            © {new Date().getFullYear()} Đi Thôi Travel. Hệ thống quản lý và tư vấn tour du lịch.
          </div>
          <div className="flex items-center gap-1.5">
            Làm tại Việt Nam
            <Heart className="h-3.5 w-3.5 text-signal-400" aria-hidden="true" />
            cho người Việt đi xa hơn.
          </div>
        </div>
      </div>

      {/* Chính sách hoàn huỷ DR-04 */}
      <Modal
        open={policyOpen}
        onCancel={() => setPolicyOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setPolicyOpen(false)}>
            Đã hiểu
          </Button>,
        ]}
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-guide-500" aria-hidden="true" />
            <span>Chính sách hoàn huỷ tour (DR-04)</span>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-[13.5px] text-ink-700">
          <p>
            Mức hoàn tiền phụ thuộc vào thời điểm bạn thông báo huỷ so với ngày
            khởi hành:
          </p>

          <div className="divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200">
            {[
              {
                label: 'Hoàn 100%',
                cls: 'bg-guide-50 text-guide-600',
                text: 'Thông báo huỷ trước ngày khởi hành từ 7 ngày trở lên.',
              },
              {
                label: 'Hoàn 50%',
                cls: 'bg-signal-50 text-signal-700',
                text: 'Thông báo huỷ trước ngày khởi hành từ 3 đến 6 ngày.',
              },
              {
                label: 'Không hoàn',
                cls: 'bg-stop-50 text-stop-600',
                text: 'Thông báo huỷ trước ngày khởi hành dưới 3 ngày.',
              },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3 p-3.5">
                <span
                  className={`label-sign shrink-0 rounded-sign px-2 py-1.5 ${row.cls}`}
                >
                  {row.label}
                </span>
                <span className="pt-0.5">{row.text}</span>
              </div>
            ))}
          </div>

          <p className="text-[12.5px] text-ink-500">
            Tiền đặt cọc tối thiểu 30% tổng giá trị đơn, theo quy tắc DR-03.
          </p>
        </div>
      </Modal>
    </footer>
  );
}
