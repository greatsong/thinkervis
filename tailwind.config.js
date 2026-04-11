/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coach: {
          50: '#fef9f0',
          100: '#fef0db',
          200: '#fde0b7',
          300: '#fbcb85',
          400: '#f9a94d',
          500: '#f78c2a',
          600: '#e8701a',
          700: '#c15614',
          800: '#9a4518',
          900: '#7c3a16',
        },
        tinker: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
    },
  },
  plugins: [],
};
