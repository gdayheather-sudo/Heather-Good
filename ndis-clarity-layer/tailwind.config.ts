import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f8f9",
          100: "#eef0f2",
          200: "#dbdfe4",
          300: "#b8c0c8",
          400: "#8a95a1",
          500: "#5d6a78",
          600: "#46505c",
          700: "#363e48",
          800: "#262c34",
          900: "#171b21",
        },
        brand: {
          50: "#eff7f5",
          100: "#d8ece6",
          200: "#a9d6c8",
          300: "#76bda7",
          400: "#46a487",
          500: "#2c8a6f",
          600: "#226e59",
          700: "#1c5848",
          800: "#16443a",
          900: "#0f2e28",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
