/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#4c6ef5',
          500: '#1B4FD8',
          600: '#1340B0',
          700: '#0d318a',
          800: '#092566',
          900: '#061a4a',
        },
        surface: '#ffffff',
        muted: '#f8fafc',
        border: '#e2e8f0',
        ink: '#0f172a',
        sub: '#64748b',
        faint: '#cbd5e1',
      },
      animation: {
        'fade-up': 'fadeUp 0.55s cubic-bezier(.16,1,.3,1) forwards',
        'slide-in': 'slideIn 0.4s cubic-bezier(.16,1,.3,1) forwards',
        'slide-right': 'slideRight 0.35s cubic-bezier(.16,1,.3,1) forwards',
        'marquee': 'marquee 30s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: 0, transform: 'translateX(-16px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { opacity: 0, transform: 'translateX(40px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      boxShadow: {
        'product': '0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.06)',
        'product-hover': '0 8px 32px rgba(27,79,216,.12)',
        'card': '0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.06)',
        'pop': '0 20px 60px rgba(27,79,216,.18)',
      },
    },
  },
  plugins: [],
}
