/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bn: {
          // Fixed accent colours — same in both themes
          yellow:          '#FCD535',
          'yellow-hover':  '#F0B90B',
          'yellow-dim':    '#3A3A1F',
          ink:             '#181A20',
          up:              '#0ECB81',
          down:            '#F6465D',
          info:            '#3B82F6',
          // Theme-sensitive colours driven by CSS custom properties
          body:            'var(--bn-body)',
          muted:           'var(--bn-muted)',
          'muted-strong':  'var(--bn-muted-strong)',
          canvas:          'var(--bn-canvas)',
          card:            'var(--bn-card)',
          elevated:        'var(--bn-elevated)',
          hairline:        'var(--bn-hairline)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
