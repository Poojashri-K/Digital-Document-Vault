/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3d9eb',
          300: '#95bedc',
          400: '#619ecb',
          500: '#3c81b8',
          600: '#2b669b',
          700: '#23527d',
          800: '#204668',
          900: '#1b3b57',
          950: '#0f2437',
        },
        navy: {
          800: '#111c2e',
          900: '#0b1320',
          950: '#070c14',
        }
      },
    },
  },
  plugins: [],
}
