import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        fraunces: ["var(--font-fraunces)", "serif"],
        dmsans: ["var(--font-dm-sans)", "sans-serif"],
        dmmono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        mid: "var(--mid)",
        muted: "var(--muted)",
        rule: "var(--rule)",
        light: "var(--light)",
        cream: "var(--cream)",
        white: "var(--white)",
        sage: "var(--sage)",
        sage2: "var(--sage2)",
        sagep: "var(--sagep)",
        emerald: "var(--emerald)",
        glass: "var(--glass)",
        "glass-strong": "var(--glass-strong)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
