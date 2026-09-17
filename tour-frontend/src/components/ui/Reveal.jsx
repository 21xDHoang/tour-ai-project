import { useEffect, useRef, useState } from 'react';

/**
 * Khoảnh khắc vào trang duy nhất.
 *
 * Cố ý chỉ dùng MỘT lần cho mỗi trang (thường là hero). Rải hiệu ứng
 * fade-and-slide lên từng khối là mặc định của trang do máy sinh ra và
 * làm trang nặng nề; một khoảnh khắc được dàn dựng kỹ thì đọng lại tốt hơn.
 *
 * Tôn trọng `prefers-reduced-motion`: người dùng tắt chuyển động thì nội dung
 * hiện ngay, không trễ.
 */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(true);
      return undefined;
    }

    const node = ref.current;
    if (!node) return undefined;

    // Nếu khối đã nằm trong tầm nhìn lúc tải trang thì chạy luôn.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(12px)',
        transition: `opacity 0.5s cubic-bezier(0.22, 0.75, 0.24, 1) ${delay}ms, transform 0.5s cubic-bezier(0.22, 0.75, 0.24, 1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
