import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f7fbfc",
        ink: "#0f172a",
        accent: "#0f766e",
        accentDark: "#115e59",
        border: "#cbd5e1"
      }
    }
  },
  plugins: []
};

export default config;
