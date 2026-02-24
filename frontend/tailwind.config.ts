import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#05050a",
          surface: "#0a0a12",
          border: "rgba(167, 139, 250, 0.12)",
          card: "rgba(15, 12, 28, 0.8)",
        },
        lavender: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          glow: "rgba(167, 139, 250, 0.4)",
          dim: "rgba(167, 139, 250, 0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "float": "float 8s ease-in-out infinite",
        "grid-fade": "grid-fade 20s linear infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "33%": { transform: "translateY(-12px) translateX(4px)" },
          "66%": { transform: "translateY(6px) translateX(-6px)" },
        },
        "grid-fade": {
          "0%": { opacity: "0.03" },
          "50%": { opacity: "0.08" },
          "100%": { opacity: "0.03" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(167, 139, 250, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(167, 139, 250, 0.04) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 70% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 20% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 45%)",
      },
      backgroundSize: {
        grid: "64px 64px",
      },
      boxShadow: {
        "lavender-glow": "0 0 40px rgba(167, 139, 250, 0.15)",
        "lavender-glow-lg": "0 0 80px rgba(167, 139, 250, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
