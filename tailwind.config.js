module.exports = {
  mode: 'jit',
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    'node_modules/daisyui/dist/**/*.js',
    'node_modules/react-daisyui/dist/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        cus_inter: ["Inter", 'serif' ],
        cus_monserrat: ["Montserrat", 'sans-serif' ],
      },
      colors:{
        dark_purple:'rgba(119, 17, 255, 0.14)', 
        cus_light_grey:'rgba(4, 4, 4, 0.05)',
        cus_dark_pink:'rgba(119, 17, 255, 1)',
        cus_dark_gray:'rgba(63, 61, 86, 1)',
        cus_gray_shade:'#FAFAFA',
      }
    },
  },
  daisyui: {
    themes: ['corporate', 'black'],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
};
