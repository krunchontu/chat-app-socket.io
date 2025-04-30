/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#007bff",
          hover: "#0069d9",
        },
        success: "#43b581",
        danger: "#f04747",
        warning: "#faa61a",
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
            primary: "#36393f",
            secondary: "#2f3136",
            tertiary: "#202225",
            input: "#40444b",
            hover: "#4f545c",
            active: "#5d636b",
            message: "#40444b",
            messageOwn: "#34383c",
          },
          text: {
            primary: "#dcddde",
            secondary: "#b9bbbe",
            tertiary: "#72767d",
          },
          border: {
            primary: "#202225",
            secondary: "#40444b",
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
