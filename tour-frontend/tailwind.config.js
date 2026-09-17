/**
 * Hệ thống thiết kế "Đi Thôi Travel" — ngôn ngữ biển báo & cung đường.
 *
 * Bảng màu lấy từ hệ thống biển báo giao thông Việt Nam và từ chính logo Hà Giang:
 *   paper    — nền giấy lạnh, sáng (nền thống trị của toàn bộ giao diện)
 *   ink      — màu mực in, dùng cho chữ và panel biển báo
 *   signal   — vàng biển báo nguy hiểm / dải chevron chỉ hướng cua
 *   guide    — xanh biển chỉ dẫn = màu hành động chính
 *   tide     — xanh dương biển chỉ dẫn
 *   heritage — nâu biển chỉ dẫn du lịch (VN dùng nâu cho di tích)
 *   stop     — đỏ biển cấm
 *
 * Ba loại tour ánh xạ vào ba màu biển báo có thật — xem src/utils/signs.js.
 */

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Archivo: grotesque xuất thân từ signage/wayfinding. Tiêu đề, số, nhãn biển.
        display: ['Archivo', 'system-ui', 'sans-serif'],
        // Be Vietnam Pro: xưởng chữ Việt, tối ưu dấu tiếng Việt ở cỡ nhỏ.
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },

      colors: {
        paper: {
          DEFAULT: '#F7F7F4',
          deep: '#EFEFE9',
          sunk: '#E7E7E0',
        },
        ink: {
          50: '#F7F7F8',
          100: '#EDEEF0',
          200: '#DFE1E4',
          300: '#C4C7CC',
          400: '#9DA2A9',
          500: '#767C85',
          600: '#585E67',
          700: '#42474F',
          800: '#2C3037',
          900: '#1D2025',
          950: '#14161A',
        },
        signal: {
          50: '#FFFBE8',
          100: '#FFF3BF',
          200: '#FFE885',
          300: '#FFDA3D',
          400: '#FFCD00',
          500: '#E0B000',
          600: '#B08A00',
          700: '#7A6000',
          800: '#4A3A00',
          900: '#241C00',
        },
        guide: {
          50: '#E9F4EE',
          100: '#C9E5D6',
          200: '#96C9AF',
          300: '#57A47F',
          400: '#22805A',
          500: '#0B5D3B',
          600: '#094C30',
          700: '#073B25',
          800: '#052A1A',
          900: '#03190F',
        },
        tide: {
          50: '#E7F4F8',
          100: '#C2E3EE',
          200: '#8AC7DC',
          300: '#47A3C2',
          400: '#1A7F9E',
          500: '#0E6E8C',
          600: '#0B5A73',
          700: '#08455A',
          800: '#063040',
          900: '#041C26',
        },
        heritage: {
          50: '#F7F0E9',
          100: '#EBDCCD',
          200: '#D6B99E',
          300: '#BC9068',
          400: '#9A6B3F',
          500: '#7A4A28',
          600: '#653D21',
          700: '#4E2F1A',
          800: '#372112',
          900: '#20130A',
        },
        stop: {
          50: '#FDECEC',
          100: '#FAD2D2',
          200: '#F2A3A3',
          300: '#E56B6B',
          400: '#D63C3C',
          500: '#C62828',
          600: '#A32020',
          700: '#7D1919',
          800: '#551111',
          900: '#2E0909',
        },
      },

      /**
       * Thang bo góc có phân cấp — thay cho việc dùng một `rounded-3xl` cho mọi thứ.
       * Biển báo là hình chữ nhật nên panel biển bo rất nhỏ.
       */
      borderRadius: {
        sign: '4px',
        card: '10px',
        field: '6px',
      },

      boxShadow: {
        // Bóng cứng kiểu in/stencil — chỉ dùng cho hover card + nút chính.
        press: '3px 3px 0 0 #14161A',
        'press-sm': '2px 2px 0 0 #14161A',
        // Panel nổi nhẹ, thay cho shadow-card xám mềm cũ.
        panel: '0 1px 2px 0 rgba(20, 22, 26, 0.06)',
        rail: '0 12px 32px -12px rgba(20, 22, 26, 0.28)',
      },

      maxWidth: {
        // Bề rộng đọc của web khách: một cột chữ, không rộng hơn.
        shell: '1240px',
        // Bề rộng bàn làm việc của nhân viên. Bảng biểu cần chỗ cho 8–10 cột
        // nên rộng hơn hẳn web khách, nhưng vẫn phải có trần — màn 27 inch mà
        // kéo hết chiều ngang thì mắt phải quét quá xa giữa nhãn dòng và số liệu.
        bench: '1440px',
        prose: '68ch',
      },

      fontSize: {
        // Thang chữ có bước nhảy kiểu biển báo, không dàn đều.
        'display-xl': ['clamp(2.25rem, 6vw, 3.75rem)', { lineHeight: '1.04', letterSpacing: '-0.03em', fontWeight: '900' }],
        'display-l': ['clamp(1.75rem, 4vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '800' }],
        'display-m': ['clamp(1.375rem, 2.4vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '800' }],
        title: ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '700' }],
        'body-l': ['1.0625rem', { lineHeight: '1.65' }],
        'body-s': ['0.84375rem', { lineHeight: '1.65' }],
        sign: ['0.75rem', { lineHeight: '1', letterSpacing: '0.14em', fontWeight: '800' }],
      },

      transitionTimingFunction: {
        // Nhịp "vào cua": nhanh vào, chậm ra.
        road: 'cubic-bezier(0.22, 0.75, 0.24, 1)',
      },

      keyframes: {
        chevronSweep: {
          '0%': { transform: 'translateX(-14px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        markIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },

      animation: {
        'chevron-sweep': 'chevronSweep 0.5s cubic-bezier(0.22, 0.75, 0.24, 1) both',
        'mark-in': 'markIn 0.45s cubic-bezier(0.22, 0.75, 0.24, 1) both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
