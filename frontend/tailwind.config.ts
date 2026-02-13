import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#050505", // Deep Void
                surface: "#0f0f12",    // Panel Background
                primary: "#00f3ff",    // Neon Cyan
                secondary: "#7000ff",  // Cyber Purple
                alert: "#ff003c",      // Critical Crimson
                warning: "#ffbd00",    // Amber
                success: "#00ff9f",    // Matrix Green
            },
            fontFamily: {
                mono: ["var(--font-jetbrains-mono)", "monospace"],
                sans: ["var(--font-inter)", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
