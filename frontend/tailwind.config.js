/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: '#0A0A0A',
          800: '#1A1A1A',
          700: '#222222',
        },
        neon: {
          cyan: '#00E5FF',
          magenta: '#FF00E5',
          blue: '#0066FF',
        },
      },
      backgroundImage: {
        'neon-mesh':
          'radial-gradient(circle at 20% 20%, rgba(0,229,255,0.2), transparent 45%), radial-gradient(circle at 80% 75%, rgba(255,0,229,0.18), transparent 50%), linear-gradient(145deg, #0A0A0A 0%, #1A1A1A 100%)',
        'hero-gradient': 'linear-gradient(90deg, #00E5FF 0%, #FF00E5 50%, #0066FF 100%)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-neon': {
          '0%, 100%': {
            boxShadow: '0 0 0.6rem rgba(0,229,255,0.2), 0 0 2rem rgba(0,102,255,0.2)',
          },
          '50%': {
            boxShadow: '0 0 1rem rgba(255,0,229,0.35), 0 0 2.4rem rgba(0,229,255,0.26)',
          },
        },
      },
      animation: {
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'pulse-neon': 'pulse-neon 3.4s ease-in-out infinite',
      },
      boxShadow: {
        glow: '0 16px 40px rgba(15, 23, 42, 0.25)',
        neon: '0 0 0.5rem rgba(0,229,255,0.32), 0 0 2rem rgba(0,102,255,0.2)',
      },
    },
  },
  plugins: [],
}

