import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        club: {
          black: "#0A0A0A",
          ink: "#1B1B1B",
          panel: "#232323",
          line: "#404040",
          muted: "#8B8B8B",
          soft: "#C7C7C7",
          lime: "#A5FE7D",
          acid: "#97F821",
          red: "#FF4E4E",
          green: "#18A200",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(165,254,125,0.18), 0 24px 80px rgba(151,248,33,0.12)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Pretendard",
          "Apple SD Gothic Neo",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
