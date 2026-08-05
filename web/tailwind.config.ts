import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#faf7f2",
          100: "#f2ece1",
          200: "#e4d9c6",
        },
        deep: {
          700: "#1f4d47",
          800: "#163a35",
          900: "#0f2926",
        },
        clay: {
          500: "#c9663a",
          600: "#b0552e",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
