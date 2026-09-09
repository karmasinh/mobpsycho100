/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  // Habilitar modo oscuro por clase (no media-query)
  darkMode: 'class',
  theme: {
    extend: {
      // ── Fuentes ─────────────────────────────────────────────────
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      // ── Colores del sistema de temas via CSS vars ────────────────
      colors: {
        primary:   'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent:    'rgb(var(--color-accent) / <alpha-value>)',
        surface:   'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2':'rgb(var(--color-surface-2) / <alpha-value>)',
        'on-surface': 'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        border:    'rgb(var(--color-border) / <alpha-value>)',
        danger:    'rgb(var(--color-danger) / <alpha-value>)',
        warning:   'rgb(var(--color-warning) / <alpha-value>)',
        success:   'rgb(var(--color-success) / <alpha-value>)',
        info:      'rgb(var(--color-info) / <alpha-value>)',
      },
      // ── Animaciones personalizadas ──────────────────────────────
      keyframes: {
        'slide-in-left': {
          '0%':   { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',      opacity: '1' },
        },
        'fade-up': {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(1.4)', opacity: '0.7' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-up':       'fade-up 0.4s cubic-bezier(0.16,1,0.3,1)',
        'pulse-dot':     'pulse-dot 1.5s ease-in-out infinite',
        'shimmer':       'shimmer 1.8s linear infinite',
      },
      // ── Sombras ────────────────────────────────────────────────
      boxShadow: {
        'card':    '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-lg': '0 4px 24px -4px rgb(0 0 0 / 0.12)',
        'glow':    '0 0 20px rgb(var(--color-primary) / 0.35)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },
    },
  },
  plugins: [],
};
