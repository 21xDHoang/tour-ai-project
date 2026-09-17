/**
 * Một dòng trong biên nhận hoặc vé: nhãn bên trái, giá trị bên phải.
 *
 * Dùng chung cho màn hình kết quả đặt chỗ và vé điện tử. Hai chỗ đó nói về
 * cùng một đơn, nên số liệu phải trình bày giống hệt nhau — nếu không, khách
 * phải đọc lại từ đầu để đối chiếu.
 *
 * @param {string} props.nhan   Tên trường
 * @param {boolean} [props.manh] Dòng tổng: chữ lớn hơn, mực đậm hơn
 */
export default function Dong({ nhan, children, manh = false, className = '' }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-ink-200 py-2.5 last:border-b-0 ${className}`}
    >
      <dt className="shrink-0 text-body-s text-ink-500">{nhan}</dt>
      <dd
        className={`min-w-0 text-right ${
          manh
            ? 'tnum font-display text-lg font-extrabold text-ink-950'
            : 'tnum text-body-s font-semibold text-ink-800'
        }`}
      >
        {children}
      </dd>
    </div>
  );
}
