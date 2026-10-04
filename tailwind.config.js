import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'oklch(0.274 0.025 291)',
        cream: 'oklch(0.981 0.014 79)',
        moss: 'oklch(0.52 0.1 55)',
        brand: 'oklch(0.52 0.1 55)',
        'brand-soft': 'oklch(0.91 0.045 55)',
        cinnamon: 'oklch(0.52 0.1 55)',
        'cinnamon-soft': 'oklch(0.91 0.045 55)',
        coral: 'oklch(0.724 0.169 29)',
        butter: 'oklch(0.941 0.105 94)',
        tile: 'oklch(0.97 0.008 75)',
        'page-warm': 'oklch(0.925 0.07 70)',
      },
      boxShadow: {
        float: '0 1px 2px rgba(38, 35, 49, .06), 0 10px 24px rgba(38, 35, 49, .08)',
        sticker: '0 2px 0 rgba(38, 35, 49, .10), 0 8px 0 rgba(38, 35, 49, .04)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.92) rotate(-3deg)', opacity: '0' }, '100%': { transform: 'scale(1) rotate(0)', opacity: '1' } },
      },
      animation: {
        pop: 'pop .34s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [animate],
}
