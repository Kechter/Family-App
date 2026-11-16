/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--bg-canvas) / <alpha-value>)",
        surface: "rgb(var(--bg-surface) / <alpha-value>)",
        "surface-alt": "rgb(var(--bg-surface-alt) / <alpha-value>)",
        header: "rgb(var(--bg-header) / <alpha-value>)",
        admin: "rgb(var(--bg-admin) / <alpha-value>)",
        main: "rgb(var(--text-main) / <alpha-value>)",
        muted: "rgb(var(--text-muted) / <alpha-value>)",
        "on-primary": "rgb(var(--text-on-primary) / <alpha-value>)",
        "on-secondary": "rgb(var(--text-on-secondary) / <alpha-value>)",
        "brand-primary": "rgb(var(--color-primary) / <alpha-value>)",
        "brand-primary-hover": "rgb(var(--color-primary-hover) / <alpha-value>)",
        "brand-secondary": "rgb(var(--color-secondary) / <alpha-value>)",
        "brand-secondary-hover": "rgb(var(--color-secondary-hover) / <alpha-value>)",
        "brand-accent": "rgb(var(--color-accent) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        "ink-border": "rgb(var(--color-ink-border) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        btn: "var(--radius-btn)",
        input: "var(--radius-input)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        btn: "var(--shadow-btn)",
      },
    },
  },
  plugins: [],
};
