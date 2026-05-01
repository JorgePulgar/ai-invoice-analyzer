/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bn: {
          yellow:          '#FCD535',
          'yellow-hover':  '#F0B90B',
          'yellow-dim':    '#3A3A1F',
          ink:             '#181A20',
          body:            '#EAECEF',
          muted:           '#707A8A',
          'muted-strong':  '#929AA5',
          canvas:          '#0B0E11',
          card:            '#1E2329',
          elevated:        '#2B3139',
          hairline:        '#2B3139',
          up:              '#0ECB81',
          down:            '#F6465D',
          info:            '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
