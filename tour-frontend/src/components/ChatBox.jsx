import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Input, Spin } from 'antd';
import {
  ArrowRightOutlined,
  CloseOutlined,
  PhoneOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { aiApi, tourApi } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { fmtVND } from '../utils/format';
import { getTourImage } from '../utils/tourImages';

const ZALO_LINK = 'https://zalo.me/0399677693';

const SUGGESTIONS = [
  '🌊 Tour biển 3 ngày 2 đêm, ngân sách 5 triệu',
  '🏔️ Tour gia đình có trẻ nhỏ, đi Sa Pa',
  '✨ Tour nghỉ dưỡng cao cấp 4 ngày ở Phú Quốc',
  '🏯 Tour văn hóa di sản miền Trung 4N3Đ',
];

const nowTime = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export default function ChatBox({ embedded = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Mặc định đóng. Bản cũ mở sẵn ở mọi trang, che mất thanh tìm kiếm và
  // phần đầu của lưới tour — đúng thứ khách cần thấy trước tiên.
  // `embedded` vẫn tự render bất kể trạng thái này (xem `embedded || open`).
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'ai',
      result: {
        phan_hoi: 'Xin chào! Tôi là Trợ lý AI du lịch TourAI 🏝️. Bạn đang tìm tour đi đâu, vào thời gian nào hay với ngân sách ra sao? Hãy chia sẻ để tôi gợi ý lịch trình phù hợp nhất nhé!',
        tours_goi_y: [],
        nguon: 'Gemini',
      },
      time: nowTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tourMap, setTourMap] = useState(new Map());
  const listRef = useRef(null);

  useEffect(() => {
    tourApi
      .list()
      .then((rows) => setTourMap(new Map(rows.map((t) => [t.MaTour, t]))))
      .catch(() => { });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener('tour:open-chat', openChat);
    return () => window.removeEventListener('tour:open-chat', openChat);
  }, []);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setMessages((m) => [
      ...m,
      { id: m.length + 1, role: 'user', text: content, time: nowTime() },
    ]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.advise({ YeuCau: content });
      setMessages((m) => [
        ...m,
        { id: m.length + 1, role: 'ai', result: res, time: nowTime() },
      ]);
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        'Rất tiếc, không thể tư vấn ngay. Vui lòng thử lại sau.';
      setMessages((m) => [
        ...m,
        { id: m.length + 1, role: 'ai', error: detail, time: nowTime() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openZalo = () => window.open(ZALO_LINK, '_blank', 'noopener,noreferrer');

  const containerCls = embedded
    ? 'flex h-[600px] w-full flex-col overflow-hidden rounded-card border border-ink-200 bg-paper shadow-panel'
    : 'fixed bottom-6 right-6 z-50 flex h-[580px] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-card border border-ink-200 bg-paper shadow-panel';

  return (
    <>
      {/* Nút bấm nổi mở chat */}
      {!embedded && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-signal fixed bottom-6 right-6 z-50 !px-4 !py-3"
        >
          {/* Khối chevron vàng, cùng dấu hiệu với thanh biển báo trên thẻ tour. */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sign bg-ink-950 text-signal-400">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="pr-1 text-left">
            <span className="block font-display text-[13px] font-extrabold leading-tight">
              Tư vấn cùng AI
            </span>
            <span className="block text-[11px] font-medium text-ink-800">
              Hỏi giá &amp; gợi ý tour
            </span>
          </span>
        </button>
      )}

      {/* Cửa sổ chat */}
      {(embedded || open) && (
        <div className={containerCls}>
          {/* Header — nền mực, chân có vạch kẻ đường như thanh biển báo. */}
          <div className="on-ink relative px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-sign bg-signal-400 text-ink-950">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-950 bg-guide-300"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-display text-sm font-bold leading-tight text-white">
                    Trợ lý AI TourAI
                  </div>
                  <div className="text-[11px] text-ink-300">
                    Tư vấn lịch trình &amp; ngân sách tức thì
                  </div>
                </div>
              </div>

              {!embedded && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng cửa sổ tư vấn"
                  className="flex h-8 w-8 items-center justify-center rounded-sign text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <CloseOutlined className="text-sm" />
                </button>
              )}
            </div>
            <span className="road-dash absolute inset-x-0 bottom-0 block h-[3px]" aria-hidden="true" />
          </div>

          {/* Body tin nhắn */}
          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-paper-deep p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'ai' && (
                  <Avatar
                    size={32}
                    className="!mt-0.5 !shrink-0 !bg-guide-500 !font-display !text-white"
                  >
                    AI
                  </Avatar>
                )}

                <div
                  className={`max-w-[85%] rounded-card p-3.5 text-xs ${m.role === 'user'
                      ? 'rounded-br-none bg-ink-950 text-white'
                      : 'rounded-tl-none border border-ink-200 bg-white text-ink-800'
                    }`}
                >
                  {m.text && <p className="whitespace-pre-line leading-relaxed">{m.text}</p>}

                  {m.error && <p className="font-medium text-stop-600">{m.error}</p>}

                  {m.result && (
                    <div className="space-y-2.5">
                      <p className="whitespace-pre-line leading-relaxed">
                        {m.result.phan_hoi}
                      </p>

                      {/* Danh sách tour được AI đề xuất */}
                      {Array.isArray(m.result.tours_goi_y) && m.result.tours_goi_y.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-ink-200 pt-2.5">
                          <div className="label-sign text-ink-500">
                            Tour phù hợp nhất
                          </div>
                          {m.result.tours_goi_y.map((item) => {
                            const tour = tourMap.get(item.ma_tour);
                            return (
                              <div
                                key={item.ma_tour}
                                onClick={() => navigate(`/tours/${item.ma_tour}`)}
                                className="group flex cursor-pointer items-center gap-2.5 rounded-card border border-ink-200 bg-paper p-2 transition-colors hover:border-guide-500 hover:bg-white"
                              >
                                <img
                                  src={getTourImage(tour)}
                                  alt={item.ten_tour}
                                  className="h-12 w-12 rounded-sign object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-display text-[13px] font-bold text-ink-950 group-hover:text-guide-500">
                                    {item.ten_tour}
                                  </div>
                                  <div className="tnum text-[11px] font-bold text-guide-500">
                                    {tour?.GiaKhuyenMai != null ? fmtVND(tour.GiaKhuyenMai) : tour ? fmtVND(tour.GiaCoBan) : ''}
                                  </div>
                                  <div className="truncate text-[10px] text-ink-500">
                                    {item.ly_do}
                                  </div>
                                </div>
                                <ArrowRightOutlined className="text-xs text-ink-400 group-hover:text-guide-500" />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {m.result.nguon === 'Fallback' && (
                        <div className="rounded-sign border border-signal-200 bg-signal-50 p-2 text-[10px] text-signal-800">
                          Gợi ý từ bộ quy tắc tự động (kết nối AI đang bảo trì).
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`tnum mt-1.5 text-[10px] ${
                      m.role === 'user' ? 'text-right text-ink-400' : 'text-ink-500'
                    }`}
                  >
                    {m.time}
                  </div>
                </div>

                {m.role === 'user' && (
                  <Avatar
                    size={32}
                    className="!mt-0.5 !shrink-0 !bg-ink-600 !font-display !text-white"
                  >
                    {user?.HoTen ? user.HoTen[0].toUpperCase() : 'U'}
                  </Avatar>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex w-max items-center gap-2 rounded-card border border-ink-200 bg-white p-3 text-xs text-ink-600">
                <Spin size="small" />
                <span>Đang tìm tour phù hợp…</span>
              </div>
            )}
          </div>

          {/* Gợi ý nhanh (Quick Chips) */}
          <div className="border-t border-ink-200 bg-white px-3 py-2">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => send(s)}
                  className="shrink-0 rounded-sign border border-ink-200 bg-paper px-2.5 py-1 text-ink-700 transition-colors hover:border-guide-500 hover:text-guide-500"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Ô nhập & Gửi */}
          <div className="border-t border-ink-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={() => send()}
                placeholder="Nhập câu hỏi (vd: 3 ngày ở Đà Nẵng giá sao?)..."
                disabled={loading}
                className="!rounded-field"
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => send()}
                loading={loading}
                aria-label="Gửi câu hỏi"
                className="!rounded-field"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
              <span>Hỗ trợ 24/7</span>
              <button
                type="button"
                onClick={openZalo}
                className="flex items-center gap-1 font-medium text-guide-500 hover:underline"
              >
                <PhoneOutlined /> Chat Zalo tư vấn viên
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
