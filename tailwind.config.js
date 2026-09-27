/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#e9f6f0",
          100: "#c9e9da",
          200: "#9bd6bc",
          300: "#63bd99",
          400: "#33a37c",
          500: "#0f8a63",
          600: "#0b7350", // primary
          700: "#0a5f43",
          800: "#0b4b37",
          900: "#0a3c2c",
        },
        ink: "#0d1f18",
        sand: "#f4f6f4",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 8px 24px -12px rgba(11, 75, 55, 0.25)",
      },
    },
  },
  plugins: [],
};
