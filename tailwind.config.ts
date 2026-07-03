import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#09090b",
        line: "#e4e4e7",
        panel: "#f4f4f5",
        brand: "#0e7177",
        warn: "#9a3412"
      }
    }
  },
  plugins: []
};

export default config;
