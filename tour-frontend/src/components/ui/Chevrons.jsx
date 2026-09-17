/**
 * Dải chevron chỉ hướng cua — mũi tên trên biển báo đèo.
 *
 * Đây là ký hiệu nhận diện của thương hiệu, nên nó chỉ được xuất hiện ở
 * đúng hai chỗ: thanh biển báo và nút hành động chính. Không dùng làm
 * hoạ tiết nền, viền trang hay trang trí rải rác.
 */
export default function Chevrons({
  className = '',
  width = 26,
  height = 12,
  strokeWidth = 2.6,
}) {
  return (
    <svg
      viewBox="0 0 26 12"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M1.4 1.4 L6.2 6 L1.4 10.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.7 1.4 L14.5 6 L9.7 10.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 1.4 L22.8 6 L18 10.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
