import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#28251F",
        paper: "#FBF8F1",
        line: "#E6DFD4",
        brand: "#B84A35",
        "brand-soft": "#F7E7E0",
        "brand-line": "#E6C9BE",
        pine: "#355B48",
        mist: "#F0EBE2",
        success: "#176B4D",
        warning: "#A75F00",
      },
      boxShadow: {
        card: "0 12px 30px rgba(40, 37, 31, 0.09)",
        float: "0 24px 80px rgba(40, 37, 31, 0.18)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Georgia", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
