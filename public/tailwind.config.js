/**
 * STRATO Technozen — Tailwind Configuration
 * ==========================================
 * Premium dark-mode design system with glassmorphic surfaces,
 * dynamic blur effects, and buttery-smooth transitions.
 *
 * Loaded via <script> before the Tailwind Play CDN processes the page.
 */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Void Base ────────────────────────────────── */
        void: {
          950: '#050508',
          900: '#0a0a0f',
          850: '#0d0d14',
          800: '#12121a',
          700: '#1a1a25',
          600: '#22222f',
          500: '#2a2a3a',
        },

        /* ── Accent Spectrum ──────────────────────────── */
        accent: {
          cyan:   { DEFAULT: '#06b6d4', dim: 'rgba(6,182,212,0.15)',  glow: '0 0 20px rgba(6,182,212,0.3)' },
          pink:   { DEFAULT: '#ec4899', dim: 'rgba(236,72,153,0.15)', glow: '0 0 20px rgba(236,72,153,0.3)' },
          violet: { DEFAULT: '#8b5cf6', dim: 'rgba(139,92,246,0.15)',glow: '0 0 20px rgba(139,92,246,0.3)' },
          green:  { DEFAULT: '#10b981', dim: 'rgba(16,185,129,0.15)', glow: '0 0 20px rgba(16,185,129,0.3)' },
          amber:  { DEFAULT: '#f59e0b', dim: 'rgba(245,158,11,0.15)',glow: '0 0 20px rgba(245,158,11,0.3)' },
        },

        /* ── Text Tokens ──────────────────────────────── */
        txt: {
          primary:   '#f1f5f9',
          secondary: '#94a3b8',
          muted:     '#475569',
          ghost:     '#1e293b',
        },

        /* ── Surface Glass ────────────────────────────── */
        glass: {
          DEFAULT:  'rgba(255,255,255,0.03)',
          light:    'rgba(255,255,255,0.06)',
          medium:   'rgba(255,255,255,0.08)',
          heavy:    'rgba(255,255,255,0.12)',
          border:   'rgba(255,255,255,0.06)',
          'border-light': 'rgba(255,255,255,0.10)',
        },
      },

      fontFamily: {
        sans:  ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      backdropBlur: {
        xs: '2px',
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-expo':  'cubic-bezier(0.7, 0, 0.84, 0)',
        'spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      animation: {
        'fade-in':      'fadeIn 0.3s ease-out',
        'fade-up':      'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-down':    'fadeDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in':     'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right':  'slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left':   'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer':      'shimmer 1.8s ease-in-out infinite',
        'pulse-glow':   'pulseGlow 2s ease-in-out infinite',
        'float':        'float 6s ease-in-out infinite',
        'glow-border':  'glowBorder 3s ease-in-out infinite',
        'spin-slow':    'spin 3s linear infinite',
      },

      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp:     { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeDown:   { '0%': { opacity: '0', transform: 'translateY(-12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:    { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        slideRight: { '0%': { opacity: '0', transform: 'translateX(-20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideLeft:  { '0%': { opacity: '0', transform: 'translateX(20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        shimmer:    { '0%, 100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
        pulseGlow:  { '0%, 100%': { boxShadow: '0 0 5px rgba(6,182,212,0.2)' }, '50%': { boxShadow: '0 0 20px rgba(6,182,212,0.4)' } },
        float:      { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        glowBorder: { '0%, 100%': { borderColor: 'rgba(6,182,212,0.2)' }, '50%': { borderColor: 'rgba(6,182,212,0.5)' } },
      },

      boxShadow: {
        'glass':     '0 8px 32px rgba(0,0,0,0.3)',
        'glass-lg':  '0 16px 48px rgba(0,0,0,0.4)',
        'glass-sm':  '0 4px 16px rgba(0,0,0,0.2)',
        'inner-glow':'inset 0 1px 0 rgba(255,255,255,0.05)',
        'accent':    '0 0 30px rgba(6,182,212,0.15)',
      },

      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
};
