import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060e1a',
          900: '#0a1929',
          800: '#0e2237',
          700: '#162d47',
          600: '#1e3a5f',
        },
      },
    },
  },
  plugins: [],
}
export default config
