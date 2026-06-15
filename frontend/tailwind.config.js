export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3D369E',
          50: '#EEEDF9',
          100: '#D6D4F1',
          200: '#ADA9E3',
          300: '#847ED5',
          400: '#5B53C7',
          500: '#3D369E',
          600: '#312B7E',
          700: '#25205F',
          800: '#191540',
          900: '#0D0B20'
        },
        accent: {
          DEFAULT: '#D32324',
          light: '#f87171'
        }
      }
    }
  },
  plugins: []
}
