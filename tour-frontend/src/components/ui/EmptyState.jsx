/**
 * Trạng thái rỗng.
 *
 * Không dùng emoji to giữa khung. Màn hình rỗng là một lời mời hành động:
 * nói rõ chuyện gì đã xảy ra và đưa ra đúng một việc để làm tiếp.
 *
 * @param {boolean} [props.compact] Bản gọn, không có khung panel và không có ô
 *   biểu tượng. Dùng khi component này được nhét vào trong một ô bảng — lúc đó
 *   khung panel sẽ thành cái hộp lồng trong cái hộp.
 */
export default function EmptyState({
  title,
  description,
  action,
  compact = false,
  className = '',
}) {
  if (compact) {
    return (
      <div className={`px-4 py-10 text-center ${className}`}>
        <div className="font-display text-[15px] font-bold text-ink-950">{title}</div>
        {description ? (
          <p className="mx-auto mt-1.5 max-w-[52ch] text-body-s text-ink-600">{description}</p>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={`panel flex flex-col items-center px-6 py-14 text-center ${className}`}
    >
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-sign bg-ink-950 text-white">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>

      <h3 className="font-display text-lg font-bold text-ink-950">{title}</h3>

      {description ? (
        <p className="mt-2 max-w-[46ch] text-body-s text-ink-600">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
