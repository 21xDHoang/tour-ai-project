import { Button, Dropdown, Popconfirm, Tooltip } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

/**
 * Cụm thao tác trên một dòng bảng.
 *
 * Bản cũ để mỗi trang tự xếp nút: màn Kế toán có dòng hiện tới bốn nút và tự
 * xuống dòng làm dòng bảng cao gấp đôi; màn Quản lý Tour để nút "Xóa" là chữ
 * trần đứng cạnh nút "Sửa" nên hai thao tác trái ngược nhau trông ngang hàng.
 *
 * Quy tắc ở đây: MỘT thao tác chính hiện thẳng, phần còn lại vào menu "⋯",
 * thao tác nguy hiểm xếp cuối và tô đỏ. Nhờ vậy cột thao tác luôn rộng đúng
 * một nút, và việc hay làm nhất không phải mở menu.
 *
 * `disabledReason` là phần đáng giá nhất: nút bị vô hiệu mà không nói vì sao
 * là kiểu bế tắc tốn thời gian nhất khi làm việc. Truyền lý do vào là có
 * tooltip giải thích ngay.
 *
 * NGOẠI LỆ của quy tắc trên: thao tác có `xacNhan` (tức là thao tác không hoàn
 * tác được) KHÔNG vào menu mà hiện thẳng cạnh nút chính, kèm hộp xác nhận.
 * Menu chỉ có một cú bấm là chạy, mà một cú bấm thì không đủ để nuốt lại việc
 * xoá nhầm — giấu thao tác nguy hiểm đi không làm nó an toàn hơn, chỉ làm nó
 * khó tìm hơn.
 */

/** Bọc nút vô hiệu để tooltip vẫn hiện.
 *
 * AntD Tooltip nghe sự kiện chuột ở phần tử bọc ngoài; nút `disabled` thật của
 * HTML không phát sự kiện chuột nào, nên tooltip gắn thẳng vào nút sẽ câm. */
function CoTooltip({ reason, children }) {
  if (!reason) return children;
  return (
    <Tooltip title={reason}>
      <span className="inline-flex">{children}</span>
    </Tooltip>
  );
}

function NutChinh({ nhan, icon, onClick, disabled, disabledReason, danger, loading, manh, xacNhan }) {
  const nut = (
    <Button
      size="small"
      type={manh ? 'primary' : 'default'}
      danger={danger}
      disabled={disabled}
      loading={loading}
      onClick={xacNhan ? undefined : onClick}
      icon={icon}
      className="!rounded-field !text-[12.5px] !font-semibold"
    >
      {nhan}
    </Button>
  );

  return (
    <CoTooltip reason={disabled ? disabledReason : undefined}>
      {xacNhan ? (
        <Popconfirm
          title={xacNhan}
          onConfirm={onClick}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true, loading }}
        >
          {nut}
        </Popconfirm>
      ) : (
        nut
      )}
    </CoTooltip>
  );
}

/**
 * @param {object}   props.chinh Thao tác chính: { nhan, icon, onClick, disabled, disabledReason, loading, xacNhan }
 * @param {object[]} [props.khac] Các thao tác còn lại, cùng hình dạng; `danger: true` để tô đỏ,
 *   `xacNhan` để bắt xác nhận trước khi chạy — nhận chuỗi, hoặc một nút JSX khi hộp xác nhận cần
 *   nói thêm điều kiện (vd: tour chỉ xoá được khi chưa có đơn nào).
 *   `loading` để nút xoay trong lúc chờ máy chủ — thao tác chậm mà im lặng thì người dùng bấm lại.
 *   `manh: true` cho nút chính của cả trang, chỉ dùng khi bảng chỉ có MỘT loại việc
 *   cần làm (màn Quyết toán: dòng nào chưa có phiếu thì nút "Quyết toán" là việc
 *   của dòng đó). Bật khắp nơi là tự tắt chức năng chỉ đường của màu.
 * @param {boolean} [props.hienHet] Hiện tất cả thao tác thành nút, không gom vào
 *   menu "⋯". Chỉ dùng khi mỗi dòng có ĐÚNG HAI việc ngang hàng nhau và cả hai
 *   đều hay dùng (màn Điều hành: "Gợi ý AI" và "Phân công HDV" là hai cách làm
 *   cùng một việc, không cách nào là mặc định). Khi đó menu "⋯" chỉ giấu đúng một
 *   nút, tức là thêm một cú bấm mà không giấu được gì.
 */
export default function HangThaoTac({ chinh, khac = [], hienHet }) {
  const conLai = khac.filter(Boolean);

  // Thao tác có xác nhận đứng thẳng cạnh nút chính — xem chú thích đầu tệp.
  // Không tự tô đỏ: "Ẩn đánh giá" cũng cần xác nhận nhưng không phá gì cả, còn
  // màu đỏ thì phải để dành cho việc không lấy lại được.
  const coXacNhan = conLai.filter((n) => n.xacNhan);
  const trongMenu = conLai.filter((n) => !n.xacNhan);

  // Menu chỉ đáng tồn tại khi nó giấu được từ hai việc trở lên, HOẶC khi có một
  // thao tác chính đứng cạnh để menu lùi về sau. Không có thao tác chính mà menu
  // chỉ có một mục thì mở menu cũng chỉ để bấm đúng một nút — thêm một cú bấm mà
  // không giấu được gì, nên mục đó hiện thẳng (và xếp sau, đúng chỗ của thao tác
  // nguy hiểm).
  const gonVaoMenu = !hienHet && (!!chinh || trongMenu.length > 1);
  const hienThang = gonVaoMenu ? coXacNhan : [...coXacNhan, ...trongMenu];

  if (!chinh && conLai.length === 0) return <span className="text-ink-400">—</span>;

  const items = (gonVaoMenu ? trongMenu : []).map((n, i) => ({
    key: String(i),
    label: n.nhan,
    icon: n.icon,
    danger: n.danger,
    disabled: n.disabled,
    onClick: n.onClick,
  }));

  return (
    <div className="flex items-center gap-1.5">
      {chinh ? <NutChinh {...chinh} /> : null}
      {hienThang.map((n, i) => (
        <NutChinh key={`ht-${i}`} {...n} />
      ))}
      {items.length ? (
        <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            aria-label="Thao tác khác"
            className="!rounded-field !text-ink-600"
          />
        </Dropdown>
      ) : null}
    </div>
  );
}
