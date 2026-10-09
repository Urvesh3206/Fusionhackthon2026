/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch Tactical Telemetry & Mission Command Tokens
        surface: '#0d1320',
        'surface-dim': '#0d1320',
        'surface-bright': '#333948',
        'surface-container-lowest': '#080e1b',
        'surface-container-low': '#161b29',
        'surface-container': '#1a1f2d',
        'surface-container-high': '#242a38',
        'surface-container-highest': '#2f3543',
        'surface-variant': '#2f3543',
        'on-surface': '#dde2f5',
        'on-surface-variant': '#94a3b8',
        'inverse-surface': '#dde2f5',
        'inverse-on-surface': '#2a303f',
        outline: '#ab8986',
        'outline-variant': '#5b403e',
        secondary: '#4cd7f6',
        'secondary-container': '#03b5d3',
        'on-secondary': '#003640',
        'on-secondary-container': '#00424e',
        'secondary-fixed': '#acedff',
        'secondary-fixed-dim': '#4cd7f6',
        tertiary: '#ffb95f',
        'tertiary-container': '#ca8100',
        'on-tertiary': '#472a00',
        'on-tertiary-container': '#3e2400',
        'tertiary-fixed': '#ffddb8',
        'tertiary-fixed-dim': '#ffb95f',
        primary: '#ffb3ad',
        'primary-container': '#ff5451',
        'on-primary': '#68000a',
        'on-primary-container': '#5c0008',
        'inverse-primary': '#b91a24',
        error: '#ffb4ab',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',

        // Backward compatibility
        slate: {
          950: '#080e1b',
          900: '#0d1320',
          850: '#161b29',
          800: '#1a1f2d',
          750: '#242a38',
          700: '#2f3543',
        },
        cyan: {
          400: '#4cd7f6',
          500: '#03b5d3',
          600: '#0891b2',
        },
        brand: {
          dark: '#080e1b',
          card: '#161b29',
          border: '#242a38',
          red: '#ff5451',
          amber: '#ffb95f',
          teal: '#4cd7f6',
          blue: '#3b82f6',
          violet: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'telemetry': ['JetBrains Mono', 'monospace'],
        'headline': ['Inter', 'sans-serif'],
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
