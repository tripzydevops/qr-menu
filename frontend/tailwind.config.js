/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0B",
        foreground: "#ECECEE",
        card: {
          DEFAULT: "#131316",
          foreground: "#ECECEE"
        },
        primary: {
          DEFAULT: "#D97706", // Amber 600 - represents warm food/brass aesthetic
          foreground: "#FFFFFF"
        },
        accent: {
          DEFAULT: "#C2410C", // Orange 700
          foreground: "#FFFFFF"
        },
        muted: {
          DEFAULT: "#26262B",
          foreground: "#8E8E9F"
        }
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
