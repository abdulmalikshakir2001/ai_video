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
        cus_inter: ["Inter", 'serif' ], // Add Inter font as a default sans option
      },
    },
  },
  daisyui: {
    themes: ['corporate', 'black'],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
};
