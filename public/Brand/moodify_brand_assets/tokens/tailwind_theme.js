/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        moodify: {
          primary: '#7A5CFF',
          accent: '#F557B6',
          soft: '#EED9FF',
          dark: '#0D1224',
          surface: '#161B2E',
          light: '#F6F7FB',
          gray: '#A7AABC',
        }
      },
      backgroundImage: {
        'moodify-gradient': 'linear-gradient(135deg, #7A5CFF 0%, #F557B6 100%)',
        'moodify-dark-card': 'linear-gradient(180deg, #161B2E 0%, #0D1224 100%)',
      },
      fontFamily: {
        moodify: ['Poppins', 'sans-serif'],
      }
    }
  }
};
