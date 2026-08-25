/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dfeaff',
          200: '#c5d8ff',
          300: '#a1bcff',
          400: '#7a97ff',
          500: '#5b6ef5',
          600: '#4b4ee8',
          700: '#403fce',
          800: '#3537a6',
          900: '#303483',
        },
      },
      boxShadow: {
        card: '0 4px 20px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
