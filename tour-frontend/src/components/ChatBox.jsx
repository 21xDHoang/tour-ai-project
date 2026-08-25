import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Avatar, Button, Input, Spin, Tag, Tooltip, Typography } from 'antd';
import {
  CloseOutlined,
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { aiApi, tourApi } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { fmtVND } from '../utils/format';

const { Text, Paragraph } = Typography;

// Số Zalo tư vấn (link dạng https://zalo.me/<sđt>)
const ZALO_LINK = 'https://zalo.me/0399677693';

const SUGGESTIONS = [
  'Tour biển 3 ngày 2 đêm, ngân sách 5 triệu',
  'Tour gia đình có trẻ nhỏ, đi Đà Lạt',
  'Tour nghỉ dưỡng cao cấp 4 ngày',
];

const nowTime = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/**
 * Widget Chatbot AI tư vấn (UC-10).
 *
 * - `embedded`: khi true, render dạng khối luôn hiển thị (nhúng vào trang,
 *   không có nút nổi, không có nút đóng). Mặc định false = nút nổi góc phải.
 */
export default function ChatBox({ embedded = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(!embedded);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tourMap, setTourMap] = useState(new Map());
  const listRef = useRef(null);

  // Nạp danh mục tour để vẽ thẻ gợi ý cho mọi trang.
  useEffect(() => {
    tourApi
      .list()
      .then((rows) => setTourMap(new Map(rows.map((t) => [t.MaTour, t]))))
      .catch(() => {});
  }, []);

  // Tự cuộn xuống tin nhắn mới nhất.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  // Cho phép mở khung chat từ nơi khác (vd nút "Chat với AI tư vấn" ở banner).
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

  const goLogin = () => navigate('/login', { state: { from: '/' } });
  const openZalo = () => window.open(ZALO_LINK, '_blank', 'noopener,noreferrer');

  const lastAi = [...messages].reverse().find((m) => m.role === 'ai');
  const showFallback = !!lastAi?.result && lastAi.result.nguon === 'Fallback';

  const messagesCls = embedded
    ? 'flex h-[460px] flex-col gap-3 overflow-y-auto bg-slate-50 p-3'
    : 'flex min-h-[240px] flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-3';

  const renderPanel = (onClose) => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <Avatar
            size={38}
            icon={<RobotOutlined style={{ fontSize: 20 }} />}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          />
          <div>
            <div className="text-sm font-semibold leading-tight">AI Tư vấn Tour</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-sky-100">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Trực tuyến · Gemini
            </div>
          </div>
        </div>
        {onClose && (
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ color: '#fff' }}
          />
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} className={messagesCls}>
        {messages.length === 0 && (
          <div className="m-auto max-w-sm px-2 text-center text-slate-400">
            <MessageOutlined style={{ fontSize: 40 }} />
            <p className="mt-3 text-sm">
              Chào bạn! Hãy mô tả chuyến đi bạn mong muốn, ví dụ:
              <br />
              <span className="italic">
                "Tour biển 3 ngày 2 đêm, ngân sách khoảng 7 triệu cho gia đình"
              </span>
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex items-end justify-end gap-2">
              <div className="flex max-w-[85%] flex-col items-end">
                <div className="rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white shadow-sm">
                  {m.text}
                </div>
                <Text className="mt-0.5 text-[10px] text-slate-400">{m.time}</Text>
              </div>
              <Avatar
                size={26}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#4b4ee8' }}
              />
            </div>
          ) : m.error ? (
            <div key={m.id} className="flex items-end justify-start gap-2">
              <Avatar
                size={26}
                icon={<RobotOutlined />}
                style={{ backgroundColor: '#2563eb' }}
              />
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-red-50 px-3 py-2 text-sm text-red-600">
                {m.error}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-end justify-start gap-2">
              <Avatar
                size={26}
                icon={<RobotOutlined />}
                style={{ backgroundColor: '#2563eb' }}
              />
              <div className="flex max-w-[90%] flex-col gap-2">
                <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="mb-1 flex items-center gap-1">
                    <Tag color="blue" className="m-0">
                      Gợi ý
                    </Tag>
                    {m.result.nguon === 'Fallback' && (
                      <Tag color="orange" className="m-0">
                        Fallback
                      </Tag>
                    )}
                  </div>
                  <Paragraph className="mb-1 text-sm">{m.result.ly_do}</Paragraph>
                  {m.result.luu_y && (
                    <Text type="secondary" className="text-xs italic">
                      💡 {m.result.luu_y}
                    </Text>
                  )}

                  {/* Thẻ các tour gợi ý */}
                  <div className="mt-2 flex flex-col gap-2">
                    {(m.result.tour_ids || []).map((id) => {
                      const t = tourMap.get(id);
                      if (!t) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-800">
                              {t.TenTour}
                            </div>
                            <div className="text-xs text-slate-500">
                              {t.SoNgay} ngày · {fmtVND(t.GiaKhuyenMai ?? t.GiaCoBan)}
                            </div>
                          </div>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => navigate(`/tours/${id}`)}
                          >
                            Xem ngay
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Text className="text-[10px] text-slate-400">{m.time}</Text>
              </div>
            </div>
          ),
        )}

        {loading && (
          <div className="flex items-end justify-start gap-2">
            <Avatar
              size={26}
              icon={<RobotOutlined />}
              style={{ backgroundColor: '#2563eb' }}
            />
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              <Spin size="small" /> AI đang phân tích yêu cầu...
            </div>
          </div>
        )}
      </div>

      {/* Cảnh báo fallback */}
      {showFallback && (
        <Alert
          type="warning"
          showIcon
          message="Gemini tạm không khả dụng — kết quả đang dùng phương án Fallback."
          className="mx-3 mb-2 text-xs"
        />
      )}

      {/* Input */}
      <div className="border-t border-slate-100 bg-white p-2">
        {user ? (
          <div className="flex items-center gap-2">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 4 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Nhập nhu cầu của bạn..."
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              onClick={() => send()}
              loading={loading}
            />
          </div>
        ) : (
          <Button block type="primary" ghost onClick={goLogin}>
            Đăng nhập để dùng AI tư vấn
          </Button>
        )}
      </div>

      {/* Nút liên hệ người thật qua Zalo */}
      <button
        type="button"
        onClick={openZalo}
        className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-white py-2.5 text-sm font-medium text-[#0068ff] transition hover:bg-blue-50"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0068ff] text-xs font-bold text-white">
          Z
        </span>
        Gặp tư vấn qua Zalo
      </button>
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {renderPanel(null)}
      </div>
    );
  }

  return (
    <>
      {/* Nút nổi */}
      {!open && (
        <Tooltip title="AI tư vấn tour" placement="left">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-2xl transition hover:scale-105"
          >
            <RobotOutlined style={{ fontSize: 24 }} />
          </button>
        </Tooltip>
      )}

      {/* Khung chat nổi */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-6 sm:right-6 sm:h-auto sm:max-h-[720px] sm:w-[460px] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl">
          {renderPanel(() => setOpen(false))}
        </div>
      )}
    </>
  );
}
