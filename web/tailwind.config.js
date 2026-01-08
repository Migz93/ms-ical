export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E53935',
          dark: '#c62828',
          darker: '#b71c1c',
        },
        background: {
          DEFAULT: '#121212',
          paper: '#1e1e1e',
        },
      },
    },
  },
  plugins: [],
}
