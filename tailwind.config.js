/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        escape: {
          dark: '#12080a',
          card: '#1e0c10',
          accent: '#dc2626',
          gold: '#f59e0b',
          glow: '#991b1b',
        },
        laser: {
          dark: '#050b14',
          card: '#0c1626',
          accent: '#06b6d4',
          neon: '#10b981',
          glow: '#0284c7',
        }
      }
    },
  },
  plugins: [],
}
