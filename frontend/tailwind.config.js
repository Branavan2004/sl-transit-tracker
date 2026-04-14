// Configures Tailwind utility scanning for all frontend source files.
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#0f766e"
      }
    }
  },
  plugins: []
};
