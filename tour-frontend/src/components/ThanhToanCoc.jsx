import { useEffect, useState } from 'react';
import { Modal, Upload, message } from 'antd';
import { Check, Copy, Landmark, Paperclip } from 'lucide-react';
import { bookingApi, paymentApi, uploadApi } from '../api/http';
import Dong from './ui/Dong';
import { fmtVND } from '../utils/format';

/**
 * Khối "Thanh toán cọc" dùng chung cho màn hình đặt chỗ và trang Đơn của bạn.
 *
 * Trước đây khách đặt giữ chỗ xong chỉ thấy mã đơn và số tiền, không có gì để
 * chuyển tiền và không có chỗ khai báo — muốn cọc phải tự hỏi tư vấn viên. Khối
 * này bù đúng ba thứ còn thiếu: tài khoản nhận tiền, số tiền cần chuyển, và
 * "mã thanh toán" để khách chép vào nội dung chuyển khoản.
 *
 * Cả hai nơi dùng chung một component vì chúng nói về cùng một đơn — số tài
 * khoản và số tiền phải giống hệt nhau, nếu không khách phải đọc lại từ đầu để
 * đối chiếu (xem ghi chú cùng lý do ở ui/Dong.jsx).
 */

/**
 * Ảnh QR VietQR dựng từ thông tin ngân hàng trong .env.
 *
 * Dùng template `qr_only` (490×490, vuông) chứ không phải `compact2`
 * (540×640): khung chứa là hình vuông, ảnh cao hơn rộng sẽ bị ép méo và máy
 * quét không đọc được. Số tiền và nội dung đã in thành chữ ngay cạnh QR rồi,
 * không cần template tự vẽ lại.
 */
const urlVietQR = (nh, soTien, noiDung) =>
  'https://img.vietqr.io/image/' +
  `${encodeURIComponent(nh.BankId)}-${encodeURIComponent(nh.SoTaiKhoan)}-qr_only.png` +
  `?amount=${Math.round(Number(soTien) || 0)}` +
  `&addInfo=${encodeURIComponent(noiDung)}` +
  `&accountName=${encodeURIComponent(nh.ChuTaiKhoan || '')}`;

/**
 * "Mã thanh toán" của một đơn: tiền tố + mã đơn, ví dụ TOURAI-899.
 *
 * Đây không phải mã trang trí. Nó chính là chuỗi phải nằm trong nội dung
 * chuyển khoản để `PaymentService.reconcile_webhook` khớp được đơn khi ngân
 * hàng gọi về (xem payment_service.py — webhook dò mã đơn trong MoTa). Đổi
 * định dạng ở đây mà không đổi bên đó thì đối soát tự động sẽ ngừng khớp.
 */
export const maThanhToan = (tienTo, maDatCho) =>
  `${tienTo || 'TOURAI-'}${maDatCho}`;

// Nhiều khối cùng nằm trên một trang (vd danh sách đơn) — giữ lại promise để
// chỉ gọi API một lần thay vì mỗi khối một request.
let henNganHang = null;

function taiNganHang() {
  if (!henNganHang) {
    henNganHang = paymentApi.bankInfo().catch(() => null);
  }
  return henNganHang;
}

/**
 * Thông tin tài khoản nhận cọc.
 *
 * Trả về `undefined` khi còn đang tải, `null` khi không lấy được. Phân biệt hai
 * trường hợp này để khối không nhấp nháy: đang tải thì chưa kết luận gì.
 */
export function useNganHang() {
  const [tt, setTt] = useState(undefined);

  useEffect(() => {
    let con = true;
    taiNganHang().then((d) => {
      if (con) setTt(d || null);
    });
    return () => {
      con = false;
    };
  }, []);

  return tt;
}

/** Mã thanh toán kèm nút chép — khách dán thẳng vào app ngân hàng. */
function MaChepDuoc({ ma }) {
  const [daChep, setDaChep] = useState(false);

  const chep = async () => {
    try {
      await navigator.clipboard.writeText(ma);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard (không phải HTTPS/localhost) — vẫn phải
      // cho khách cách lấy mã, nên in thẳng ra thông báo.
      message.warning(`Không chép được tự động. Mã thanh toán: ${ma}`);
    }
  };

  return (
    <button
      type="button"
      onClick={chep}
      title="Chép mã thanh toán"
      className="inline-flex items-center gap-2 rounded-sign border border-ink-200 bg-white px-2.5 py-1.5 transition-colors duration-150 hover:border-ink-400"
    >
      <span className="tnum font-display text-[14px] font-extrabold tracking-wide text-ink-950">
        {ma}
      </span>
      {daChep ? (
        <Check className="h-3.5 w-3.5 text-guide-500" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Khối thông tin chuyển khoản tiền cọc.
 *
 * @param {number} props.maDatCho  Mã đơn — ghép vào mã thanh toán
 * @param {number} props.soTien    Số tiền cần chuyển (cọc tối thiểu 30%)
 * @param {string} [props.className]
 */
export function KhoiChuyenKhoanCoc({ maDatCho, soTien, className = '' }) {
  const nh = useNganHang();

  // Chưa tải xong: im lặng, chưa kết luận gì.
  if (nh === undefined) return null;

  if (!nh?.SoTaiKhoan) {
    return (
      <div className={`rounded-card border border-ink-200 bg-paper-deep p-4 ${className}`}>
        <div className="label-sign text-ink-500">Thanh toán cọc</div>
        <p className="mt-2 text-body-s text-ink-700">
          Hệ thống chưa cấu hình tài khoản nhận cọc. Vui lòng liên hệ tư vấn
          viên để được hướng dẫn chuyển tiền.
        </p>
      </div>
    );
  }

  const ma = maThanhToan(nh.TienToNoiDung, maDatCho);

  return (
    <div className={`rounded-card border border-ink-200 bg-paper-deep p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="label-sign text-ink-500">Thanh toán cọc</div>
        <div className="label-sign text-ink-400">Cọc tối thiểu 30%</div>
      </div>

      <div className="tnum mt-1.5 font-display text-[22px] font-extrabold text-ink-950">
        {fmtVND(soTien)}
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-5 sm:grid-cols-[auto_1fr]">
        {/* Nền trắng là điều kiện để máy quét đọc được ảnh QR. */}
        <div className="rounded-card border border-ink-200 bg-white p-2">
          <img
            src={urlVietQR(nh, soTien, ma)}
            alt={`Mã QR chuyển khoản cho đơn #${maDatCho}`}
            width={148}
            height={148}
            className="block h-[148px] w-[148px]"
          />
        </div>

        <div className="min-w-0">
          <dl>
            <Dong nhan="Ngân hàng">{nh.BankId}</Dong>
            <Dong nhan="Số tài khoản">
              <span className="tracking-wide">{nh.SoTaiKhoan}</span>
            </Dong>
            <Dong nhan="Chủ tài khoản">{nh.ChuTaiKhoan}</Dong>
          </dl>

          <div className="mt-3">
            <div className="label-sign mb-1.5 text-ink-500">
              Mã thanh toán · ghi vào nội dung chuyển khoản
            </div>
            <MaChepDuoc ma={ma} />
            <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
              Ghi đúng mã này khi chuyển tiền để hệ thống tự khớp đơn. Sai nội
              dung thì kế toán phải đối soát tay, cọc lâu được xác nhận hơn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal khách khai báo "đã chuyển khoản cọc", kèm ảnh bill không bắt buộc.
 *
 * Khai báo KHÔNG làm đơn thành "Đã cọc" — nó chỉ chuyển sang ChoXacNhanCoc và
 * tạm dừng đồng hồ 24h. Việc ghi nhận tiền vẫn là của kế toán (DR-03), nên ở
 * đây không có nút nào tự xác nhận thanh toán.
 *
 * @param {boolean} props.open
 * @param {{MaDatCho:number, ten_tour?:string, TongTien:number, coc_toi_thieu?:number}} props.don
 * @param {() => void} props.onClose
 * @param {() => void} [props.onDone]  Gọi sau khi khai báo thành công (để tải lại)
 */
export function ModalKhaiBaoChuyenKhoan({ open, don, onClose, onDone }) {
  const [fileList, setFileList] = useState([]);
  const [dangGui, setDangGui] = useState(false);
  const nh = useNganHang();

  // Đóng/mở cho đơn khác thì bỏ ảnh của đơn trước, tránh gửi nhầm bill.
  useEffect(() => {
    if (!open) setFileList([]);
  }, [open]);

  const gui = async () => {
    if (!don) return;
    setDangGui(true);
    try {
      let hinhAnh = null;
      if (fileList.length > 0 && fileList[0].originFileObj) {
        const up = await uploadApi.uploadImage(fileList[0].originFileObj, 'bills');
        hinhAnh = up.data?.url || null;
      }
      await bookingApi.xacNhanChuyenKhoan(don.MaDatCho, { HinhAnh: hinhAnh });
      message.success('Đã ghi nhận — vui lòng chờ kế toán xác nhận cọc!');
      onDone?.();
      onClose?.();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Khai báo chuyển khoản thất bại');
    } finally {
      setDangGui(false);
    }
  };

  const soTien = don?.coc_toi_thieu ?? Number(don?.TongTien || 0) * 0.3;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      title="Xác nhận đã chuyển khoản cọc"
    >
      {don ? (
        <div className="mb-4 rounded-card border border-ink-200 bg-paper-deep px-4 py-3">
          <div className="font-display text-[15px] font-bold text-ink-950">
            {don.ten_tour || `Đơn #${don.MaDatCho}`}
          </div>
          <div className="tnum mt-1 text-body-s text-ink-600">
            Đơn #{don.MaDatCho} · cọc tối thiểu {fmtVND(soTien)}
          </div>
        </div>
      ) : null}

      {nh?.SoTaiKhoan ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-card border border-ink-200 px-4 py-3">
          <Landmark className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
          <span className="text-body-s text-ink-700">
            Chuyển tới <b className="font-semibold text-ink-950">{nh.SoTaiKhoan}</b>
            {nh.ChuTaiKhoan ? ` (${nh.ChuTaiKhoan})` : ''}
          </span>
          <span className="tnum rounded-sign bg-signal-50 px-2 py-1 font-display text-[12px] font-bold text-signal-800">
            {maThanhToan(nh.TienToNoiDung, don?.MaDatCho)}
          </span>
        </div>
      ) : null}

      <p className="text-body-s text-ink-700">
        Bạn đã chuyển khoản tiền cọc cho tour này? Nhấn xác nhận để{' '}
        <b className="font-semibold text-ink-950">tạm dừng đồng hồ 24h</b> và kế
        toán đối soát ngân hàng. Đính kèm ảnh chụp bill hoặc uỷ nhiệm chi thì
        được xác nhận nhanh hơn (không bắt buộc).
      </p>

      <Upload
        listType="picture"
        maxCount={1}
        accept="image/*"
        fileList={fileList}
        beforeUpload={() => false}
        onChange={({ fileList: fl }) => setFileList(fl)}
      >
        <button type="button" className="btn btn-quiet mt-3">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          {fileList.length > 0 ? 'Đổi ảnh bill khác' : 'Tải ảnh bill chuyển khoản'}
        </button>
      </Upload>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn btn-quiet">
          Đóng
        </button>
        <button
          type="button"
          onClick={gui}
          disabled={dangGui}
          className="btn btn-ink"
        >
          {dangGui ? 'Đang gửi…' : 'Tôi đã chuyển khoản'}
        </button>
      </div>
    </Modal>
  );
}
