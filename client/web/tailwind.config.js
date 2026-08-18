/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050816',
        card: 'rgba(255,255,255,0.05)',
        primary: '#8B5CF6',
        'primary-soft': '#A78BFA',
        secondary: '#06B6D4',
        'secondary-soft': '#22D3EE',
        success: '#10B981',
        warning: '#F59E0B',
        surface: {
          primary: 'rgba(139, 92, 246, 0.10)',
          secondary: 'rgba(6, 182, 212, 0.10)',
          ai: 'rgba(139, 92, 246, 0.16)',
          memory: 'rgba(6, 182, 212, 0.14)',
        },
      },
      boxShadow: {
        'glow-primary': '0 0 40px rgba(139, 92, 246, 0.35)',
        'glow-cyan': '0 0 40px rgba(6, 182, 212, 0.32)',
        'glow-soft': '0 12px 48px rgba(0, 0, 0, 0.55)',
        'glow-card': '0 0 0 1px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.5)',
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3.5s ease-in-out infinite',
        'spin-slow': 'spin 40s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
