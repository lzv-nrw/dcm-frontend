import flowbite from "flowbite-react/tailwind";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", flowbite.content()],
  plugins: [flowbite.plugin()],
  theme: {
    extend: {
      colors: {
        // make flowbite default available
        primary: {
          700: "#0e7490",
          800: "#155e75",
        },
      },
    },
  },
};
