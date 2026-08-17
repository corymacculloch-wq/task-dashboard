/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        google: {
          dark: '#131314',
          surface: '#1e1f20',
          surfaceHover: '#282a2d',
          border: '#3c4043',
          blue: '#8ab4f8',
          green: '#81c995',
          yellow: '#fdd663',
          purple: '#c58af9',
          red: '#f28b82'
        }
      }
    },
  },
  plugins: [],
}
