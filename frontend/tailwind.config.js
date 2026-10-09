/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#060911',
          900: '#0b1120',
          850: '#0f172a',
          800: '#1e293b',
          750: '#283548',
          700: '#334155',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        brand: {
          dark: '#060911',
          card: '#0b1120',
          border: '#1e293b',
          red: '#ef4444',
          amber: '#f59e0b',
          teal: '#10b981',
          blue: '#3b82f6',
          violet: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-red': '0 0 25px -5px rgba(239, 68, 68, 0.4)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.35)',
      },
      animation: {
        'radar-sweep': 'radar 4s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        glowPulse: {
          '0%': { opacity: '0.6', filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.4))' },
          '100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}
