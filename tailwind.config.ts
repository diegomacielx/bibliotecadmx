import type { Config } from 'tailwindcss';

/**
 * Design System DMX — tokens cinematográficos premium.
 * Tailwind v4: referenciado via @config em src/index.css.
 * Apenas `extend` — não altera plugins ou presets.
 */
export default {
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--dmx-canvas)',
          elevated: 'var(--dmx-canvas-elevated)',
          sunken: 'var(--dmx-canvas-sunken)',
        },
        surface: {
          DEFAULT: 'var(--dmx-surface)',
          raised: 'var(--dmx-surface-raised)',
          overlay: 'var(--dmx-glass-bg)',
        },
        border: {
          subtle: 'var(--dmx-border-subtle)',
          DEFAULT: 'var(--dmx-border)',
          strong: 'var(--dmx-border-strong)',
        },
        accent: {
          DEFAULT: '#ef4444',
          muted: 'rgba(239, 68, 68, 0.15)',
          glow: 'rgba(239, 68, 68, 0.25)',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'Inter Variable', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['clamp(0.625rem, 0.55rem + 0.35vw, 0.75rem)', { lineHeight: '1.6', letterSpacing: '0.03em' }],
        xs: ['clamp(0.6875rem, 0.6rem + 0.4vw, 0.8125rem)', { lineHeight: '1.6', letterSpacing: '0.02em' }],
        sm: ['clamp(0.8125rem, 0.75rem + 0.5vw, 0.9375rem)', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        base: ['clamp(0.9375rem, 0.875rem + 0.6vw, 1.0625rem)', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        lg: ['clamp(1.0625rem, 0.95rem + 0.8vw, 1.25rem)', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        xl: ['clamp(1.25rem, 1.1rem + 1vw, 1.5rem)', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        '2xl': ['clamp(1.5rem, 1.25rem + 1.5vw, 2rem)', { lineHeight: '1.3', letterSpacing: '0.005em' }],
        '3xl': ['clamp(1.875rem, 1.5rem + 2vw, 2.5rem)', { lineHeight: '1.25', letterSpacing: '0' }],
        '4xl': ['clamp(2.25rem, 1.75rem + 2.5vw, 3.5rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        '5xl': ['clamp(2.75rem, 2rem + 4vw, 4.5rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        '6xl': ['clamp(3.25rem, 2.5rem + 5vw, 5.5rem)', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        display: ['clamp(2.5rem, 1.5rem + 5vw, 5rem)', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        hero: ['clamp(3rem, 2rem + 6vw, 6rem)', { lineHeight: '1.12', letterSpacing: '-0.015em', fontWeight: '700' }],
      },
      spacing: {
        'fluid-xs': 'clamp(0.5rem, 1vw, 0.75rem)',
        'fluid-sm': 'clamp(0.75rem, 1.5vw, 1rem)',
        'fluid-md': 'clamp(1rem, 2vw, 1.5rem)',
        'fluid-lg': 'clamp(1.5rem, 3vw, 2.5rem)',
        'fluid-xl': 'clamp(2rem, 4vw, 4rem)',
        'fluid-2xl': 'clamp(3rem, 5vw, 6rem)',
      },
      maxWidth: {
        cinema: '100%',
      },
      boxShadow: {
        cinematic:
          '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'cinematic-sm':
          '0 1px 1px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.06)',
        'cinematic-lg':
          '0 32px 64px -16px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'cinematic-red':
          '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.12)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.15)',
        'glow-white': '0 0 20px rgba(255, 255, 255, 0.1)',
        glow: '0 0 40px rgba(239, 68, 68, 0.12)',
      },
      borderRadius: {
        cinema: 'clamp(1.5rem, 2vw, 2.5rem)',
        'cinema-lg': 'clamp(2rem, 3vw, 3.5rem)',
      },
      letterSpacing: {
        cinematic: '0.02em',
        'cinematic-wide': '0.08em',
      },
      lineHeight: {
        title: '1.1',
        body: '1.6',
      },
      fontWeight: {
        cinematic: '700',
      },
      aspectRatio: {
        'card-mobile': '9 / 16',
        'card-poster': '4 / 5',
        hero: '21 / 9',
        'hero-compact': '16 / 9',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'cinematic-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'cinematic-in': 'cubic-bezier(0.4, 0, 1, 1)',
      },
      transitionDuration: {
        cinematic: '250ms',
        'cinematic-slow': '400ms',
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
} satisfies Config;
