export default {
  content: ['./index.html', './App.tsx', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { primary: '#D47F7F', 'background-light': '#F3F4F6', 'paper-light': '#FFFFFF', 'border-light': '#E5E7EB' },
    fontFamily: { sans: ['Inter', 'sans-serif'], serif: ['Merriweather', 'serif'] }
  } },
  plugins: []
};
