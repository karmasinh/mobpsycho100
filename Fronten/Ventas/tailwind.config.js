/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['"Nunito"', 'sans-serif'],
        mono:    ['"Fira Code"', 'monospace'],
      },
      colors: {
        primary:      'rgb(var(--color-primary) / <alpha-value>)',
        secondary:    'rgb(var(--color-secondary) / <alpha-value>)',
        accent:       'rgb(var(--color-accent) / <alpha-value>)',
        surface:      'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2':  'rgb(var(--color-surface-2) / <alpha-value>)',
        'on-surface': 'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        border:       'rgb(var(--color-border) / <alpha-value>)',
        danger:       'rgb(var(--color-danger) / <alpha-value>)',
        warning:      'rgb(var(--color-warning) / <alpha-value>)',
        success:      'rgb(var(--color-success) / <alpha-value>)',
        info:         'rgb(var(--color-info) / <alpha-value>)',
      },
      keyframes: {
        'slide-up':   { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'slide-in':   { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        'pop':        { '0%': { transform: 'scale(0.95)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'pulse-ring': { '0%': { transform: 'scale(1)', opacity: '0.8' }, '100%': { transform: 'scale(1.4)', opacity: '0' } },
      },
      animation: {
        'slide-up':   'slide-up 0.35s cubic-bezier(0.16,1,0.3,1)',
        'slide-in':   'slide-in 0.3s cubic-bezier(0.16,1,0.3,1)',
        'pop':        'pop 0.2s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':    'shimmer 1.8s linear infinite',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
      boxShadow: {
        'card':     '0 1px 4px 0 rgb(0 0 0 / 0.06)',
        'card-lg':  '0 8px 32px -4px rgb(0 0 0 / 0.12)',
        'glow':     '0 0 24px rgb(var(--color-primary) / 0.3)',
      },
    },
  },
  plugins: [],
};
