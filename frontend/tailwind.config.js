/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#1f1c2c',
          light: '#928dab',
        },
        accent: {
          pink: '#ff6ec4',
          purple: '#7873f5',
        },
        game: {
          dark: '#0f3460',
          red: '#e94560',
        }
      },
      fontFamily: {
        // Use system font stack — rely on Tailwind defaults / system fonts
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
    },
  },
  plugins: [],
}
