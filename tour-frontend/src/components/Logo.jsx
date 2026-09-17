/**
 * Logo "Đi Thôi Travel".
 *
 * Ảnh mascot được đóng trong một tấm biển vuông góc cạnh (bo 4px, viền mực
 * 1px) chứ không phải ô bo tròn 16px đổ bóng mềm: cả hệ giao diện này lấy
 * hình thức từ biển báo, nên logo cũng phải là một tấm biển.
 *
 * Chữ "TRAVEL" xuống thành dòng phụ dưới tên thương hiệu, dùng đúng kiểu chữ
 * nhãn biển (.label-sign) thay cho viên thuốc màu xanh lá. Bản cũ vừa đổ
 * gradient ba màu vừa thêm một viên thuốc màu thứ tư — bốn tín hiệu màu cho
 * một khối cao 44px, không tín hiệu nào còn đọc được.
 */

export function LogoIcon({ size = 42, className = '' }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-sign border border-ink-300 bg-white ${className}`}
    >
      <img
        src="/dithoi_logo.jpg"
        alt=""
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}

/**
 * Component Logo chính của nền tảng "Đi Thôi Travel"
 * @param {Object} props
 * @param {'light'|'dark'} props.theme - 'light': trên nền sáng, 'dark': trên nền tối
 * @param {'sm'|'md'|'lg'} props.size - kích cỡ hiển thị
 */
export default function Logo({
  theme = 'light',
  size = 'md',
  className = '',
}) {
  const iconSize = { sm: 36, md: 44, lg: 58 }[size] || 44;
  const wordSize = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[size] || 'text-lg';
  const isDark = theme === 'dark';

  return (
    <div
      className={`group flex shrink-0 select-none items-center gap-2.5 whitespace-nowrap ${className}`}
    >
      <div className="shrink-0 transition-transform duration-300 ease-road group-hover:scale-105">
        <LogoIcon size={iconSize} />
      </div>

      {/* Tên thương hiệu + dòng phụ chạy theo kiểu nhãn biển. */}
      <div className="flex shrink-0 flex-col justify-center gap-1 whitespace-nowrap">
        <span
          className={`font-display font-extrabold leading-none tracking-tight ${wordSize} ${
            isDark ? 'text-white' : 'text-ink-950'
          }`}
        >
          ĐI THÔI
        </span>
        <span className={`label-sign ${isDark ? 'text-ink-400' : 'text-ink-500'}`}>
          Travel
        </span>
      </div>
    </div>
  );
}
