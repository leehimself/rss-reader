/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: [
          '"Cascadia Code"',
          '"Fira Code"',
          '"JetBrains Mono"',
          'monospace',
        ],
      },
      fontSize: {
        base: 'var(--font-size-base, 1rem)',
        lg: 'var(--font-size-lg, 1.125rem)',
        xl: 'var(--font-size-xl, 1.25rem)',
      },
    },
  },
  plugins: [],
};
