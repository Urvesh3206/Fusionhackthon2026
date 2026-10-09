/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          red: '#dc2626',
          amber: '#d97706',
          teal: '#0d9488',
          blue: '#2563eb',
        }
      }
    },
  },
  plugins: [],
}
