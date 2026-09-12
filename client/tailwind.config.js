/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0F1115',
        surface: {
          DEFAULT: '#171A21',
          hover: '#1D212A',
          card: '#12151B',
        },
        elevated: '#20242E',
        hairline: '#232833',
        text: {
          primary: '#EDEFF2',
          secondary: '#8B93A1',
          muted: '#5F687A',
        },
        accent: {
          DEFAULT: '#5B8CFF',
          hover: '#4375ED',
          glow: 'rgba(91, 140, 255, 0.35)',
          deep: '#1E40AF',
        },
        success: '#4ADE80',
        warning: '#FBBF24',
        danger: '#EF4444',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
        'full': '9999px',
      },
      boxShadow: {
        'float': '0 16px 40px -12px rgba(0, 0, 0, 0.55)',
        'glow-accent': '0 0 25px -5px rgba(91, 140, 255, 0.5)',
        'glow-accent-lg': '0 0 50px -10px rgba(91, 140, 255, 0.6)',
        'inner-glow': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
        'orb': '0 0 60px 20px rgba(91, 140, 255, 0.4), inset 0 0 30px 10px rgba(255, 255, 255, 0.6)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'shimmer': 'shimmer 2s infinite',
        'beam': 'beamMove 8s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        beamMove: {
          '0%': { opacity: '0.6', transform: 'rotate(-25deg) scale(1)' },
          '100%': { opacity: '0.9', transform: 'rotate(-22deg) scale(1.08)' },
        }
      },
      transitionTimingFunction: {
        'ease-out-custom': 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
