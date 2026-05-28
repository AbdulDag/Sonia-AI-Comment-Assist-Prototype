/** @type {import('tailwindcss').Config} */

// All colors expressed in OKLCH for perceptually uniform mixing and tinted neutrals.
// Hue 70-75° "warm wheat" tint threads through every neutral step so the palette
// never looks cold or grey-scale default.
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    // ─── Override defaults — no cold system grays ───────────────────────────
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: 'oklch(100% 0 0)',
      black: 'oklch(0% 0 0)',

      // ── Neutrals: warm wheat tint (hue ~75°) ──────────────────────────────
      cream: {
        50:  'oklch(99%   0.004  75)',   // near-white parchment
        100: 'oklch(97.5% 0.008  75)',   // --color-background  #F8F6F2
        200: 'oklch(94%   0.009  75)',   // --color-border-subtle #F0EDE8
        300: 'oklch(91.5% 0.010  75)',   // --color-border       #E8E5DF
        400: 'oklch(83%   0.012  73)',   // coconut variant
        500: 'oklch(73.5% 0.011  70)',   // --color-text-tertiary #B5B1A9
        600: 'oklch(57%   0.010  70)',   // --color-text-secondary #8A867E
        700: 'oklch(45%   0.010  70)',
        800: 'oklch(32%   0.010  70)',
        900: 'oklch(22%   0.010  70)',   // --color-text-primary  #2C2A26
        950: 'oklch(14%   0.038 168)',   // --forest              #0F221E
      },

      // ── Surface tokens ─────────────────────────────────────────────────────
      surface: {
        DEFAULT: 'oklch(100% 0 0)',
        raised: 'oklch(99% 0.004 75)',
        sunken: 'oklch(97.5% 0.008 75)',
      },

      // ── Accent palette — all desaturated, warm, organic ───────────────────
      sky: {
        DEFAULT: 'oklch(79.5% 0.033 232)',  // --color-accent-sky   #B8C4D4
        light:   'oklch(88%   0.038 232)',
        muted:   'oklch(72%   0.028 232)',
        bora:    'oklch(84%   0.065 232)',  // --bora               #ADD3FF
      },
      sage: {
        DEFAULT: 'oklch(83%   0.036 152)',  // --color-accent-sage  #C5D4C0
        light:   'oklch(90%   0.028 152)',
        muted:   'oklch(73%   0.032 152)',
      },
      lavender: {
        DEFAULT: 'oklch(82%   0.029 330)',  // --color-accent-lavender #D4C4D0
        light:   'oklch(89%   0.022 330)',
        muted:   'oklch(72%   0.026 330)',
      },
      sand: {
        DEFAULT: 'oklch(83%   0.022  90)',  // --color-accent-sand  #D4CDB8
        light:   'oklch(90%   0.016  88)',
        muted:   'oklch(74%   0.020  88)',
      },

      // ── Semantic UI tones ──────────────────────────────────────────────────
      safe: {
        bg:   'oklch(91% 0.06  145)',
        text: 'oklch(37% 0.12  145)',
        ring: 'oklch(72% 0.10  145)',
      },
      flagged: {
        bg:   'oklch(92% 0.07   75)',
        text: 'oklch(42% 0.14   75)',
        ring: 'oklch(72% 0.12   75)',
      },
      blocked: {
        bg:   'oklch(92% 0.07   25)',
        text: 'oklch(40% 0.16   25)',
        ring: 'oklch(70% 0.13   25)',
      },
    },

    // ─── Fluid typography — clamp mirrors Sonia website ──────────────────────
    fontSize: {
      xs:    ['clamp(0.75rem,  0.72rem + 0.12vw, 0.8125rem)',  { lineHeight: '1.5' }],
      sm:    ['clamp(0.875rem, 0.85rem + 0.15vw, 0.9375rem)',  { lineHeight: '1.5' }],
      base:  ['clamp(1rem,     0.95rem + 0.25vw, 1.125rem)',   { lineHeight: '1.6' }],
      lg:    ['clamp(1.125rem, 1.05rem + 0.4vw,  1.375rem)',   { lineHeight: '1.5' }],
      h3:    ['clamp(1.25rem,  1.1rem  + 0.5vw,  1.5rem)',     { lineHeight: '1.3', fontFamily: 'var(--font-serif)' }],
      h2:    ['clamp(1.5rem,   1.25rem + 1vw,    2rem)',       { lineHeight: '1.25', fontFamily: 'var(--font-serif)' }],
      h1:    ['clamp(2rem,     1.5rem  + 1.5vw,  2.75rem)',    { lineHeight: '1.2',  fontFamily: 'var(--font-serif)' }],
      display: ['clamp(2.5rem, 2rem    + 2vw,    4rem)',       { lineHeight: '1.1',  fontFamily: 'var(--font-serif)' }],
    },

    fontFamily: {
      sans:  ['"Source Sans 3"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      serif: ['"Libre Baskerville"', 'Georgia', 'serif'],
      mono:  ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
    },

    extend: {
      // ── Spacing follows Sonia's 4-point scale ──────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },

      borderRadius: {
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '24px',
        '2xl':'32px',
        pill: '9999px',
      },

      // ── Transition easing mirrors Sonia site ───────────────────────────────
      transitionTimingFunction: {
        'sonia': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'blob':  'cubic-bezier(0.37, 0, 0.63, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },

      // ── Blob animation keyframes ───────────────────────────────────────────
      keyframes: {
        'blob-drift-1': {
          '0%, 100%': {
            borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            borderRadius: '55% 45% 60% 40% / 60% 40% 55% 45%',
            transform: 'translate(20px, -15px) scale(1.03)',
          },
          '66%': {
            borderRadius: '40% 60% 45% 55% / 45% 55% 60% 40%',
            transform: 'translate(-12px, 10px) scale(0.97)',
          },
        },
        'blob-drift-2': {
          '0%, 100%': {
            borderRadius: '40% 60% 50% 50% / 60% 45% 55% 40%',
            transform: 'translate(0px, 0px) scale(1)',
          },
          '40%': {
            borderRadius: '55% 45% 40% 60% / 50% 60% 40% 50%',
            transform: 'translate(-18px, 12px) scale(1.04)',
          },
          '70%': {
            borderRadius: '60% 40% 55% 45% / 40% 55% 45% 60%',
            transform: 'translate(10px, -8px) scale(0.98)',
          },
        },
        'blob-drift-3': {
          '0%, 100%': {
            borderRadius: '50% 50% 40% 60% / 55% 45% 60% 40%',
            transform: 'translate(0px, 0px) scale(1)',
          },
          '50%': {
            borderRadius: '45% 55% 60% 40% / 40% 60% 45% 55%',
            transform: 'translate(15px, 20px) scale(1.02)',
          },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'blob-1': 'blob-drift-1 18s ease-in-out infinite',
        'blob-2': 'blob-drift-2 22s ease-in-out infinite 3s',
        'blob-3': 'blob-drift-3 26s ease-in-out infinite 6s',
        'fade-in-up': 'fade-in-up 0.5s ease forwards',
      },

      // ── Box shadows — warm-tinted, no cold blacks ─────────────────────────
      boxShadow: {
        'sm':  '0 1px 2px oklch(22% 0.01 70 / 0.04)',
        'md':  '0 4px 12px oklch(22% 0.01 70 / 0.06)',
        'lg':  '0 8px 24px oklch(22% 0.01 70 / 0.08)',
        'xl':  '0 16px 40px oklch(22% 0.01 70 / 0.10)',
        'card':'0 2px 6px oklch(22% 0.01 70 / 0.05), 0 1px 2px oklch(22% 0.01 70 / 0.04)',
        'none': 'none',
      },

      maxWidth: {
        'content': '1200px',
      },
    },
  },
  plugins: [],
}
