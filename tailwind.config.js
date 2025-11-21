/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FAC638",
        "background-light": "#f8f8f5",
        "sidebar-dark": "#2D3748",
        "card-light": "#FFFFFF",
        "border-light": "#E2E8F0",
        "border-dark": "#4A5568",
        "text-primary-light": "#1A202C",
        "text-primary-dark": "#F7FAFC",
        "text-secondary-light": "#718096",
        "text-secondary-dark": "#A0AEC0",
        success: "#38A169",
        danger: "#E53E3E",
      },
      fontFamily: {
        display: [
          "PingFang TC",
          "Noto Sans TC",
          "Microsoft JhengHei",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [
    // @tailwindcss/line-clamp is now included by default in Tailwind CSS v3.3+
  ],
}
