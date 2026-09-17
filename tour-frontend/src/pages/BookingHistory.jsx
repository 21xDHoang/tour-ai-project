import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Modal, Pagination, QRCode, Rate, message } from 'antd';
import { Heart, Info, Landmark, RotateCcw, Ticket } from 'lucide-react';
import dayjs from 'dayjs';
import { customerApi, reviewApi } from '../api/http';
import CountdownTimer from '../components/CountdownTimer';
import SignBar from '../components/ui/SignBar';
import EmptyState from '../components/ui/EmptyState';
import Dong from '../components/ui/Dong';
import {
  KhoiChuyenKhoanCoc,
  ModalKhaiBaoChuyenKhoan,
} from '../components/ThanhToanCoc';
import { TRANG_THAI_DAT_CHO, fmtDate, fmtDateTime, fmtVND } from '../utils/format';
import { donPill } from '../utils/signs';

/** Số đơn mỗi trang — giữ đúng bằng pageSize của bảng cũ. */
const MOI_TRANG = 8;

/** Ước tính hoàn tiền nếu hủy theo chính sách DR-04 (client-side, để tham khảo). */
function uocTinhHoanTien(daCoc, ngayKhoiHanh) {
  const coc = Number(daCoc || 0);
  if (coc <= 0 || !ngayKhoiHanh) return null;
  const delta = dayjs(ngayKhoiHanh).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (delta >= 7) return { hoan: coc, mucPhat: '0% (hoàn 100% cọc)' };
  if (delta >= 3) return { hoan: coc * 0.5, mucPhat: '50% (hoàn 50% cọc)' };
  return { hoan: 0, mucPhat: '100% (không hoàn cọc)' };
}

/** Nhãn của một đơn, chống rỗng nếu backend trả trạng thái lạ. */
const nhanTrangThai = (tt) => TRANG_THAI_DAT_CHO[tt]?.label || tt;

/**
 * Đơn còn thời gian giữ chỗ hay không.
 *
 * Trạng thái `GiuCho` do backend trả về có thể đã cũ: đồng hồ 24h chạy hết
 * nhưng bản ghi chưa kịp chuyển sang `HetHan`. Tính trực tiếp từ `HanGiuCho`
 * để giao diện không nói ngược với chính nó ("đang giữ chỗ" mà bên dưới lại
 * "hết hạn"). Đây chỉ là cách hiển thị — không ghi gì về backend.
 */
const conHanGiu = (r) => !!r.HanGiuCho && dayjs(r.HanGiuCho).isAfter(dayjs());

/** Lịch sử đặt tour của khách: vé điện tử + đánh giá + ước tính hoàn tiền. */
export default function BookingHistory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trang, setTrang] = useState(1);
  const [ticket, setTicket] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  // P2: đơn khách đang khai báo "đã chuyển khoản cọc" (modal dùng chung lo phần
  // ảnh bill + gọi API).
  const [ckTarget, setCkTarget] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await customerApi.myBookings());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = async () => {
    const v = await form.validateFields();
    if (!v.SoSao) {
      message.warning('Vui lòng chọn số sao');
      return;
    }
    setSubmitting(true);
    try {
      await reviewApi.create({
        MaDatCho: reviewTarget.MaDatCho,
        SoSao: v.SoSao,
        NoiDung: v.NoiDung || null,
      });
      message.success('Đã gửi đánh giá — chờ Admin duyệt hiển thị!');
      setReviewTarget(null);
      form.resetFields();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Đơn đang giữ chỗ là đơn duy nhất khách còn phải làm gì đó — tách ra để
  // nhắc ở đầu trang thay vì để khách tự dò trong danh sách. Đơn đã quá hạn
  // không tính: nhắc khách xử lý một việc đã trễ chỉ gây nhiễu.
  const dangGiuCho = rows.filter((r) => r.TrangThai === 'GiuCho' && conHanGiu(r));
  const hienThi = rows.slice((trang - 1) * MOI_TRANG, trang * MOI_TRANG);

  // `pb-28` chừa chỗ dưới đáy cho cụm nút nổi (gọi lại + chat AI), để hàng
  // thao tác của đơn cuối cùng không nằm dưới chúng.
  return (
    <div className="shell space-y-6 pb-28 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-m text-ink-950">Đơn của bạn</h1>
          <p className="mt-1.5 max-w-prose text-body-s text-ink-600">
            Xem vé điện tử, khai báo chuyển khoản cọc, gửi đánh giá sau chuyến đi
            và tra cứu ước tính hoàn tiền theo chính sách hủy (DR-04).
          </p>
        </div>
        <button type="button" onClick={() => navigate('/tours')} className="btn btn-ink">
          Tiếp tục đặt tour
        </button>
      </div>

      {!loading && dangGiuCho.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-card border border-signal-200 bg-signal-50 px-4 py-3">
          <span className="label-sign shrink-0 text-signal-800">
            Đang giữ chỗ · {dangGiuCho.length}
          </span>
          <p className="text-body-s text-ink-700">
            Đã chuyển khoản cọc? Khai báo ở từng đơn bên dưới để đồng hồ 24 giờ
            dừng lại và kế toán đối soát.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel overflow-hidden">
              <div className="skeleton h-[38px]" />
              <div className="space-y-3 p-5">
                <div className="skeleton h-5 w-2/5" />
                <div className="skeleton h-4 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Bạn chưa có đơn đặt chỗ nào"
          description="Chọn một hành trình, giữ chỗ 24 giờ miễn phí rồi mới quyết định cọc. Đơn của bạn sẽ xuất hiện ở đây kèm vé điện tử."
          action={
            <button type="button" onClick={() => navigate('/tours')} className="btn btn-guide">
              Xem danh sách tour
            </button>
          }
        />
      ) : (
        <>
          {/* Mỗi đơn là một biển báo: điểm đến là thứ khách nhớ, nên nó nằm
              trong khối màu; mã đơn và số khách là phần chạy trên nền mực. */}
          <div className="space-y-3">
            {hienThi.map((r) => {
              const est =
                r.TrangThai !== 'DaHuy'
                  ? uocTinhHoanTien(r.DaDatCoc, r.ngay_khoi_hanh)
                  : null;

              return (
                <article key={r.MaDatCho} className="panel overflow-hidden">
                  <SignBar
                    size="sm"
                    mark={r.ten_diem_den || 'Hành trình'}
                    place={r.ten_tour}
                    meta={`#${r.MaDatCho}`}
                  />

                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="label-sign text-ink-500">Khởi hành</div>
                      <div className="tnum mt-1.5 font-display text-[17px] font-extrabold text-ink-950">
                        {fmtDate(r.ngay_khoi_hanh)}
                      </div>
                      <div className="mt-1 text-body-s text-ink-600">
                        {r.SoKhach} khách · đặt ngày {fmtDate(r.NgayDat)}
                      </div>

                      {r.TrangThai === 'GiuCho' && r.HanGiuCho ? (
                        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="label-sign text-ink-500">
                            Hạn giữ chỗ
                          </span>
                          {conHanGiu(r) ? (
                            /* Đồng hồ thu nhỏ cho vừa một dòng trong danh sách. */
                            <span className="[&_span]:!text-[15px]">
                              <CountdownTimer hanGiuCho={r.HanGiuCho} />
                            </span>
                          ) : (
                            <span className="font-display text-[13px] font-bold text-stop-600">
                              Đã qua
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <div className="label-sign text-ink-500">Tổng tiền</div>
                      <div className="tnum mt-1.5 font-display text-[19px] font-extrabold text-ink-950">
                        {fmtVND(r.TongTien)}
                      </div>
                      <div className="tnum mt-1 text-body-s text-ink-600">
                        đã cọc {fmtVND(r.DaDatCoc)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-paper-deep px-4 py-3 sm:px-5">
                    <span className={`chip ${donPill(r.TrangThai)}`}>
                      {nhanTrangThai(r.TrangThai)}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTicket(r)}
                        className="btn btn-quiet !px-3.5 !py-2 !text-[13px]"
                      >
                        <Ticket className="h-4 w-4" aria-hidden="true" />
                        Vé điện tử
                      </button>

                      {r.TrangThai === 'GiuCho' ? (
                        <button
                          type="button"
                          onClick={() => setCkTarget(r)}
                          className="btn btn-ink !px-3.5 !py-2 !text-[13px]"
                        >
                          <Landmark className="h-4 w-4" aria-hidden="true" />
                          Tôi đã chuyển khoản
                        </button>
                      ) : null}

                      {r.TrangThai === 'HoanThanh' ? (
                        <button
                          type="button"
                          onClick={() => setReviewTarget(r)}
                          className="btn btn-signal !px-3.5 !py-2 !text-[13px]"
                        >
                          <Heart className="h-4 w-4" aria-hidden="true" />
                          Đánh giá
                        </button>
                      ) : null}

                      {est && est.hoan > 0 ? (
                        <button
                          type="button"
                          onClick={() => setRefundTarget({ ...r, est })}
                          className="btn btn-quiet !px-3.5 !py-2 !text-[13px]"
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Ước tính hoàn tiền
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Đơn đang giữ chỗ: để thẳng thông tin chuyển khoản trong
                      thẻ. Đây là việc duy nhất khách còn phải làm, mà hạn 24h
                      thì không chờ ai — giấu sau một cú bấm nữa là mất lượt. */}
                  {r.TrangThai === 'GiuCho' && conHanGiu(r) ? (
                    <div className="border-t border-ink-200 p-4 sm:p-5">
                      <KhoiChuyenKhoanCoc
                        maDatCho={r.MaDatCho}
                        soTien={r.coc_toi_thieu}
                      />
                    </div>
                  ) : null}

                  {/* Đã khai báo chuyển khoản: đồng hồ đã dừng, khách chỉ còn
                      chờ kế toán. Hiện lại bill đã gửi để khách biết hệ thống
                      nhận đúng ảnh, không phải gửi lại. */}
                  {r.TrangThai === 'ChoXacNhanCoc' ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-200 bg-signal-50 px-4 py-3 sm:px-5">
                      <span className="label-sign shrink-0 text-signal-800">
                        Chờ kế toán xác nhận
                      </span>
                      <p className="text-body-s text-ink-700">
                        Đã ghi nhận khai báo chuyển khoản và tạm dừng đồng hồ giữ
                        chỗ.
                      </p>
                      {r.HinhAnhChuyenKhoan ? (
                        <a
                          href={r.HinhAnhChuyenKhoan}
                          target="_blank"
                          rel="noreferrer"
                          className="text-body-s font-semibold text-guide-500 underline"
                        >
                          Xem ảnh bill đã gửi
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {rows.length > MOI_TRANG ? (
            <div className="flex justify-center pt-2">
              <Pagination
                current={trang}
                pageSize={MOI_TRANG}
                total={rows.length}
                onChange={setTrang}
                showSizeChanger={false}
              />
            </div>
          ) : null}
        </>
      )}

      {/* Vé điện tử — dựng như tấm vé thật: đầu vé là dải mực, thân vé là danh
          sách số liệu, và đường kẻ đứt đóng vai đường xé. */}
      <Modal
        open={!!ticket}
        onCancel={() => setTicket(null)}
        footer={null}
        width={480}
        title={null}
        /* Chừa một dải giấy ở trên cho nút đóng của AntD — mặc định nó nằm đè
           lên dải mực của tấm vé và che mất mã đơn. */
        styles={{ body: { paddingTop: 46 } }}
      >
        {ticket && (
          <div className="overflow-hidden rounded-card border border-ink-200">
            <SignBar
              tone="ink"
              mark="Vé điện tử"
              place={ticket.ten_tour}
              meta={`#${ticket.MaDatCho}`}
            />

            <div className="grid grid-cols-1 items-center gap-5 p-5 sm:grid-cols-[1fr_auto]">
              <dl className="min-w-0">
                <Dong nhan="Mã đơn">#{ticket.MaDatCho}</Dong>
                <Dong nhan="Trạng thái">
                  <span className={`chip ${donPill(ticket.TrangThai)}`}>
                    {nhanTrangThai(ticket.TrangThai)}
                  </span>
                </Dong>
                <Dong nhan="Khởi hành">{fmtDate(ticket.ngay_khoi_hanh)}</Dong>
                <Dong nhan="Số khách">{ticket.SoKhach} khách</Dong>
                <Dong nhan="Tổng tiền" manh>
                  {fmtVND(ticket.TongTien)}
                </Dong>
                <Dong nhan="Đã cọc">{fmtVND(ticket.DaDatCoc)}</Dong>
                <Dong nhan="Ngày đặt">{fmtDateTime(ticket.NgayDat)}</Dong>
              </dl>

              <div className="flex flex-col items-center gap-2 sm:w-[132px]">
                {/* Nền trắng là điều kiện để máy quét đọc được. */}
                <div className="rounded-card border border-ink-200 bg-white p-2">
                  <QRCode value={`TOURAI-${ticket.MaDatCho}`} size={100} />
                </div>
                <span className="text-center text-[11px] leading-snug text-ink-500">
                  Trình mã này khi lên xe hoặc nhận phòng
                </span>
              </div>
            </div>

            <div className="road-dash mx-5" aria-hidden="true" />

            <div className="px-5 pb-5 pt-4">
              <p className="text-[12px] leading-relaxed text-ink-500">
                Vé có giá trị cho đúng đơn #{ticket.MaDatCho} và số khách ghi trên
                vé. Cần đổi hoặc bổ sung hành khách, liên hệ tư vấn viên phụ trách
                trước ngày khởi hành.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Đánh giá chuyến đi */}
      <Modal
        open={!!reviewTarget}
        onCancel={() => setReviewTarget(null)}
        footer={null}
        width={480}
        title="Đánh giá chuyến đi"
      >
        {reviewTarget && (
          <div className="mb-4 rounded-card border border-ink-200 bg-paper-deep px-4 py-3">
            <div className="font-display text-[15px] font-bold text-ink-950">
              {reviewTarget.ten_tour}
            </div>
            <div className="tnum mt-1 text-body-s text-ink-600">
              Đơn #{reviewTarget.MaDatCho} · {fmtDate(reviewTarget.ngay_khoi_hanh)}
            </div>
          </div>
        )}

        <Form form={form} layout="vertical">
          <Form.Item name="SoSao" label="Số sao" className="!mb-3">
            <Rate allowClear={false} />
          </Form.Item>
          {/* `!mb-5` chứ không phải `!mb-2`: bộ đếm ký tự của AntD nằm đè lên
              đáy ô nhập, để sát quá thì nó chồng lên dòng ghi chú bên dưới. */}
          <Form.Item name="NoiDung" label="Cảm nhận của bạn" className="!mb-5">
            <Input.TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder="Chia sẻ trải nghiệm chuyến đi…"
              className="!rounded-field"
            />
          </Form.Item>
        </Form>

        <p className="text-[12px] leading-relaxed text-ink-500">
          Đánh giá sẽ ở trạng thái Chờ duyệt và hiển thị sau khi Admin duyệt.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setReviewTarget(null)}
            className="btn btn-quiet"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={submitReview}
            disabled={submitting}
            className="btn btn-signal"
          >
            {submitting ? 'Đang gửi…' : 'Gửi đánh giá'}
          </button>
        </div>
      </Modal>

      {/* Khai báo đã chuyển khoản cọc (P2) — modal dùng chung với màn hình
          kết quả đặt chỗ, để hai nơi không nói khác nhau về cùng một việc. */}
      <ModalKhaiBaoChuyenKhoan
        open={!!ckTarget}
        don={ckTarget}
        onClose={() => setCkTarget(null)}
        onDone={load}
      />

      {/* Ước tính hoàn tiền */}
      <Modal
        open={!!refundTarget}
        onCancel={() => setRefundTarget(null)}
        footer={null}
        width={480}
        title="Ước tính hoàn tiền khi hủy"
      >
        {refundTarget && (
          <div>
            <dl>
              <Dong nhan="Tour">{refundTarget.ten_tour}</Dong>
              <Dong nhan="Ngày khởi hành">
                {fmtDate(refundTarget.ngay_khoi_hanh)}
              </Dong>
              <Dong nhan="Đã đặt cọc">{fmtVND(refundTarget.DaDatCoc)}</Dong>
              <Dong nhan="Chính sách (DR-04)">{refundTarget.est.mucPhat}</Dong>
              <Dong nhan="Hoàn lại dự kiến" manh>
                <span className="text-guide-500">
                  {fmtVND(refundTarget.est.hoan)}
                </span>
              </Dong>
            </dl>

            <div className="mt-4 flex items-start gap-2.5 rounded-card border border-tide-100 bg-tide-50 p-3.5">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-tide-600"
                aria-hidden="true"
              />
              <p className="text-[12px] leading-relaxed text-tide-700">
                Con số này chỉ để tham khảo. Việc hủy tour do Kế toán xử lý và
                xác nhận hoàn tiền chính thức theo hồ sơ hủy.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
