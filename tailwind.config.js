/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Azules marinos
        navy: {
          900: '#0a1628',  // Más oscuro - fondo principal
          800: '#0d1b33',  // Fondo secundario
          700: '#0f1f3a',  // Fondo terciario
          600: '#162744',  // Superficies
          500: '#1e3354',  // Bordes
          400: '#2a4070',  // Bordes claros
          300: '#3b5998',  // Hover
        },
        // Textos
        text: {
          primary: '#e8eef5',
          secondary: '#94a3b8',
          muted: '#627d98',
        },
        // Acento cian
        accent: {
          DEFAULT: '#0ea5e9',
          hover: '#0284c7',
          light: 'rgba(14, 165, 233, 0.15)',
          glow: 'rgba(14, 165, 233, 0.25)',
        },
        // Colores semánticos
        green: {
          DEFAULT: '#10b981',
          light: 'rgba(16, 185, 129, 0.15)',
        },
        red: {
          DEFAULT: '#ef4444',
          light: 'rgba(239, 68, 68, 0.15)',
        },
        orange: {
          DEFAULT: '#f59e0b',
          light: 'rgba(245, 158, 11, 0.15)',
        },
        purple: {
          DEFAULT: '#8b5cf6',
          light: 'rgba(139, 92, 246, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.15)',
        'glow-sm': '0 0 10px rgba(14, 165, 233, 0.1)',
      },
    },
  },
  plugins: [],
}