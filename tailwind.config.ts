import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        resin: {
          bg:        '#F5EFE7',
          'bg-2':    '#EDE4D8',
          'bg-3':    '#E0D5C5',
          amber:     '#C8884A',
          'amber-l': '#E8BF8A',
          'amber-d': '#A0663A',
          'amber-g': '#E8A857',
          green:     '#4D6652',
          'green-l': '#8A9B89',
          brown:     '#8C7B6A',
          charcoal:  '#2E2A26',
          gray:      '#C8C3BE',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        warm: '0 5px 12px rgba(200,136,74,0.15), 0 2px 4px rgba(0,0,0,0.05)',
        'warm-lg': '0 10px 24px rgba(200,136,74,0.2), 0 4px 8px rgba(0,0,0,0.08)',
      }
    }
  },
  plugins: []
} satisfies Config;
