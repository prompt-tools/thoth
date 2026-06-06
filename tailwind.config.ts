import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        surface: "hsl(var(--surface))"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.08)",
        soft: "0 2px 8px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
