import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        line: "#d7dde2",
        panel: "#f7f8f8",
        brand: "#176b5b",
        warn: "#9a3412"
      }
    }
  },
  plugins: []
};

export default config;
