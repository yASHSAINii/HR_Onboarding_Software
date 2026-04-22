/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    ".public/**/*.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        bowlby: ['"Bowlby One SC"', 'cursive'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],

  
}