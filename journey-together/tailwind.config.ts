import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep teal/navy primary with warm amber accent.
        ink: {
          DEFAULT: "#0B1F2A",
          soft: "#143041",
        },
        teal: {
          50: "#E6F1F3",
          100: "#C7E1E6",
          200: "#8FC3CD",
          300: "#56A5B4",
          400: "#1F8799",
          500: "#0E6C7E",
          600: "#0A5566",
          700: "#0A4350",
          800: "#08323D",
          900: "#062831",
        },
        amber: {
          50: "#FFF7E6",
          100: "#FFE8B8",
          200: "#FFD680",
          300: "#FFC247",
          400: "#F5A623",
          500: "#D88914",
          600: "#A4660A",
        },
        coral: {
          DEFAULT: "#E25A4F",
          dark: "#B33B30",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        base: ["17px", "1.55"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,31,42,0.06), 0 8px 24px rgba(11,31,42,0.08)",
        ring: "0 0 0 3px rgba(245,166,35,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
