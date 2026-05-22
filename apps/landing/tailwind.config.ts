import type { Config } from "tailwindcss";

const config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        carbon: "#050506",
        ink: "#0b0c0e",
        panel: "#111318",
        line: "rgba(255,255,255,0.10)",
        mist: "rgba(255,255,255,0.68)",
        frost: "rgba(255,255,255,0.88)",
        cyan: "#38bdf8",
        green: "#22c55e",
        amber: "#f59e0b",
        rose: "#fb7185",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 26px 90px rgba(0,0,0,0.58)",
        soft: "0 16px 50px rgba(0,0,0,0.34)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
