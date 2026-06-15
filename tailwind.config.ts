import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#fdf6ee',
          100: '#faebd7',
          200: '#f5d5a8',
          300: '#edb96a',
          400: '#e49a3a',
          500: '#d4821e',
          600: '#b86818',
          700: '#8f4e15',
          800: '#6e3d14',
          900: '#4a2a0e',
        }
      }
    },
  },
  plugins: [],
}
export default config
