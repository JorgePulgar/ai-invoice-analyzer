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
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        fadeSlideUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeSlideUpBlur: {
          'from': {
            opacity: '0.01',
            transform: 'translateY(20px)',
            filter: 'blur(4px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
            filter: 'blur(0)',
          },
        },
        scaleIn: {
          'from': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          'to': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        lift: {
          'from': { transform: 'translateY(0)' },
          'to': { transform: 'translateY(-4px)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out both',
        fadeSlideUp: 'fadeSlideUp 0.6s ease-out both',
        fadeSlideUpBlur: 'fadeSlideUpBlur 0.6s ease-out both',
        scaleIn: 'scaleIn 0.5s ease-out both',
        lift: 'lift 0.3s ease-out both',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
