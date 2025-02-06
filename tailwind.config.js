/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'], // ++++++
  theme: {
    extend: {
      screens: {
        xl: '1000px' // 添加一个名为 2xl 的断点，宽度为 1536px
      }
    }
  },
  plugins: []
}
