import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

dayjs.locale('vi');

/**
 * Theme AntD theo hệ thống "biển báo & cung đường".
 *
 * Nguyên tắc: AntD lo phần điều khiển (ô nhập, bảng, modal), Tailwind lo phần
 * trình bày. Các token ở đây kéo giao diện AntD về đúng bảng màu, bo góc và
 * nhịp chữ của hệ thống — nhờ vậy 17 trang bảng biểu không phải sửa từng file.
 */
const theme = {
  token: {
    // Xanh biển chỉ dẫn là màu hành động chính.
    colorPrimary: '#0B5D3B',
    colorLink: '#0B5D3B',
    colorLinkHover: '#22805A',
    colorInfo: '#0E6E8C',
    colorSuccess: '#0B5D3B',
    // Vàng đậm hơn signal-400 để chữ cảnh báo đủ tương phản trên nền trắng.
    colorWarning: '#B08A00',
    colorError: '#C62828',

    colorTextBase: '#14161A',
    colorText: '#14161A',
    colorTextSecondary: '#585E67',
    colorTextTertiary: '#767C85',
    colorTextQuaternary: '#9DA2A9',

    colorBgBase: '#FFFFFF',
    colorBgLayout: '#F7F7F4',
    colorBorder: '#DFE1E4',
    colorBorderSecondary: '#EDEEF0',

    // Bo góc có phân cấp: ô nhập nhỏ, panel vừa. Không dùng một cỡ cho tất cả.
    borderRadius: 6,
    borderRadiusLG: 10,
    borderRadiusSM: 4,

    fontFamily: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
    fontSize: 14,
    controlHeight: 40,
    wireframe: false,
    // Bóng mặc định của AntD quá mềm so với ngôn ngữ viền-mực của hệ thống.
    boxShadow: '0 1px 2px 0 rgba(20, 22, 26, 0.06)',
    boxShadowSecondary: '0 8px 24px -8px rgba(20, 22, 26, 0.18)',
  },
  components: {
    Button: {
      controlHeight: 40,
      borderRadius: 6,
      fontWeight: 600,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontFamily: 'Archivo, system-ui, sans-serif',
    },
    Card: {
      borderRadiusLG: 10,
      paddingLG: 24,
      colorBorderSecondary: '#DFE1E4',
    },
    Input: { controlHeight: 42, borderRadius: 6 },
    InputNumber: { controlHeight: 42, borderRadius: 6 },
    Select: { controlHeight: 42, borderRadius: 6 },
    DatePicker: { controlHeight: 42, borderRadius: 6 },
    // Bảng là bề mặt xuất hiện nhiều nhất ở phần nhân viên — chỉnh ở đây
    // là chỉnh được cả 27 trang cùng lúc. Không trang khách nào dùng Table
    // nên đổi ở đây không đụng gì tới web khách hàng.
    Table: {
      // Dải tiêu đề dùng đúng tông giấy-deep của hệ thống (nền chân thẻ tour
      // ngoài web khách) chứ không phải xám lạnh — bảng nhân viên nằm trên nền
      // giấy ấm, một dải xám xanh ở đây lộ ngay là màu ngoại lai.
      headerBg: '#EFEFE9',
      headerColor: '#42474F',
      headerSplitColor: 'transparent',
      borderColor: '#DFE1E4',
      rowHoverBg: '#EFEFE9',
      // 14 -> 11: nhân viên ngồi hàng giờ với bảng, mỗi dòng bớt 6px là mỗi
      // màn hình thêm được hai dòng dữ liệu. Chữ vẫn 14px, không nhỏ đi.
      cellPaddingBlock: 11,
      // 16 -> 12: cùng lý do, và nhờ vậy bảng 9–10 cột bớt phải cuộn ngang.
      cellPaddingInline: 12,
      borderRadius: 10,
      fontWeightStrong: 700,
    },
    Tag: { borderRadiusSM: 4, defaultBg: '#F7F7F8', defaultColor: '#42474F' },
    Modal: { borderRadiusLG: 10, paddingContentHorizontalLG: 28, titleFontSize: 18 },
    Drawer: { paddingLG: 28 },
    Tabs: { inkBarColor: '#0B5D3B', itemSelectedColor: '#0B5D3B', titleFontSize: 14 },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: '#0B5D3B',
      darkItemColor: '#9DA2A9',
      darkItemHoverColor: '#FFFFFF',
      itemBorderRadius: 6,
      itemMarginInline: 8,
      itemHeight: 40,
    },
    Segmented: { itemSelectedBg: '#14161A', itemSelectedColor: '#FFFFFF' },
    Pagination: { itemActiveBg: '#14161A', borderRadius: 6 },
    Progress: { defaultColor: '#0B5D3B' },
    Steps: { colorPrimary: '#0B5D3B' },
    Statistic: { titleFontSize: 13, contentFontSize: 26 },
    // Sao đánh giá mặc định là vàng AntD (#fadb14), lệch hẳn với vàng biển báo
    // và đứng ngay cạnh nút vàng của hệ thống nên lộ rõ.
    Rate: { starColor: '#FFCD00', starBg: '#DFE1E4' },
    Descriptions: { labelBg: '#F7F7F8' },
    Empty: { colorTextDescription: '#767C85' },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider locale={viVN} theme={theme}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
