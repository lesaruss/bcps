/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bcps: {
          blue: '#1672A7',
          'blue-dark': '#0F5A85',
          yellow: '#F4C436',
          'yellow-dark': '#D4A820',
          gray: '#525252',
          'gray-light': '#EFEFEF',
          'gray-dark': '#262626',
        },
      },
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
