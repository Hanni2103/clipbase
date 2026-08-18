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
      },
    },
  },
  plugins: [],
}
