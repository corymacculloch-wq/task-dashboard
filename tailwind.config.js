/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'google-blue': '#1a73e8',
        'google-surface-1': '#1e1f20',
        'google-surface-2': '#282a2d',
      },
    },
  },
  plugins: [],
}
