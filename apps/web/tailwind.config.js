/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        hand: ["'Patrick Hand'", "cursive"],
        chewy: ["'Chewy'", "cursive"],
      },
      colors: {
        canvas: {
          bg: "#fdfcf9",
          primary: "#0b7cff",
          green: "#93f4be",
          yellow: "#ffe978",
          pink: "#f28cbd",
          orange: "#ffbd91",
          blue: "#9fe5ff",
        },
      },
      boxShadow: {
        card: "0 0.375rem 0 #000",
        "card-inset":
          "inset 0 0 0 0.125rem rgba(255,255,255,0.75), 0 0.2rem 0 #000",
        sticky: "0 1.25rem 2.5rem rgba(0,0,0,0.13)",
      },
    },
  },
  plugins: [],
};
