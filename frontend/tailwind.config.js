/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        glow: '0 16px 40px rgba(15, 23, 42, 0.25)',
      },
    },
  },
  plugins: [],
}

