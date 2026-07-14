import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F1B20",
        bgalt: "#14232A",
        panel: "#182B33",
        line: "#24343D",
        blue: {
          DEFAULT: "#2E8FBE",
          hover: "#3AA3D4",
          soft: "rgba(46,143,190,0.12)",
        },
        ink: "#E8EEF1",
        mute: "#8CA3AD",
        ok: "#6FBF8E",
        wa: "#25D366",
        deep: "#0B1418",
        dark: "#08141A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-archivo)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
