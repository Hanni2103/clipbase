/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050816',
        card: 'rgba(255,255,255,0.05)',
        primary: '#8B5CF6',
        secondary: '#06B6D4',
        success: '#10B981',
        warning: '#F59E0B',
        surface: {
          primary: 'rgba(139, 92, 246, 0.10)',
          secondary: 'rgba(6, 182, 212, 0.10)',
          ai: 'rgba(139, 92, 246, 0.16)',
          memory: 'rgba(6, 182, 212, 0.14)',
        },
      },
    },
  },
  plugins: [],
}
