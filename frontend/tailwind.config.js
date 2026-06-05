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
        background: "#1C1C28",
        foreground: "#E8E8E8",
        card: {
          DEFAULT: "#16213E",
          foreground: "#E8E8E8"
        },
        primary: {
          DEFAULT: "#722F37", // Rich Garnet
          foreground: "#FFFFFF"
        },
        secondary: {
          DEFAULT: "#C9A84C", // Warm Gold
          foreground: "#1C1C28"
        },
        accent: {
          DEFAULT: "#C67B4E", // Terracotta
          foreground: "#FFFFFF"
        },
        muted: {
          DEFAULT: "#2A2A3D",
          foreground: "#9A9AA6"
        },
        success: {
          DEFAULT: "#5B8A3C",
          foreground: "#FFFFFF"
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF"
        }
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-dm-sans)", "DM Sans", "monospace"],
      },
      animation: {
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "shimmer": "shimmer 2s infinite linear",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

