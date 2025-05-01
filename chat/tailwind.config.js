/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a73e8", // More modern blue
          hover: "#1765cc",
          50: "#e8f0fe",
          100: "#d2e3fc",
          200: "#aacbfa",
          300: "#7baaf7",
          400: "#4c8df5",
          700: "#1967d2",
          800: "#185abc",
        },
        success: "#34a853", // More standard green
        danger: "#ea4335", // Consistent red
        warning: "#fbbc04", // Improved warning color
        // Light theme colors
        light: {
          bg: {
            primary: "#ffffff",
            secondary: "#f5f5f5",
            tertiary: "#e9e9e9",
            input: "#f0f0f0",
            hover: "#e6e6e6",
            active: "#d9d9d9",
            message: "#f0f0f0",
            messageOwn: "#e1f0ff",
          },
          text: {
            primary: "#2e3338",
            secondary: "#4f545c",
            tertiary: "#747f8d",
          },
          border: {
            primary: "#dadce0",
            secondary: "#e3e5e8",
          },
        },
        // Dark theme colors
        dark: {
          bg: {
            primary: "#202124", // Darker background
            secondary: "#292a2d", // Subtle contrast
            tertiary: "#35363a", // For elements that need to stand out
            input: "#3c3c3f", // More visible input fields
            hover: "#3c4043", // Lighter hover state
            active: "#5f6368", // Active state
            message: "#3c3c3f", // Message background
            messageOwn: "#174ea6", // Own message background (matches primary theme)
          },
          text: {
            primary: "#e8eaed", // Brighter primary text
            secondary: "#9aa0a6", // Secondary text
            tertiary: "#80868b", // Tertiary/disabled text
          },
          border: {
            primary: "#3c4043", // Stronger border color
            secondary: "#5f6368", // Secondary border
          },
        },
      },
      boxShadow: {
        sm: "0 2px 4px rgba(0, 0, 0, 0.1)",
        md: "0 3px 10px rgba(0, 0, 0, 0.2)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
        slideIn: "slideIn 0.3s ease-out",
        pulse: "pulse 0.3s ease-in-out",
        bounce: "bounce 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulse: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        bounce: {
          "0%, 20%, 50%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-10px)" },
          "60%": { transform: "translateY(-5px)" },
        },
      },
    },
  },
  plugins: [],
};
