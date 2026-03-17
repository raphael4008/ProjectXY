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
            animation: {
                "crt-flicker": "crtFlicker 0.15s infinite",
                "pulse-glow": "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "scan-line": "scanLine 4s linear infinite",
                "text-glitch": "textGlitch 3s infinite",
                "glass-shimmer": "glassShimmer 3s ease-in-out infinite",
            },
            backdropBlur: {
                xs: "4px",
            },
            keyframes: {
                crtFlicker: {
                    "0%": { opacity: "0.95" },
                    "10%": { opacity: "0.8" },
                    "20%": { opacity: "0.95" },
                    "30%": { opacity: "0.9" },
                    "40%": { opacity: "1" },
                    "50%": { opacity: "0.85" },
                    "60%": { opacity: "0.95" },
                    "70%": { opacity: "1" },
                    "80%": { opacity: "0.9" },
                    "90%": { opacity: "0.85" },
                    "100%": { opacity: "0.95" },
                },
                pulseGlow: {
                    "0%, 100%": { opacity: "1", filter: "brightness(100%) drop-shadow(0 0 8px currentColor)" },
                    "50%": { opacity: ".7", filter: "brightness(80%) drop-shadow(0 0 2px currentColor)" },
                },
                scanLine: {
                    "0%": { top: "0%", opacity: "0" },
                    "5%": { opacity: "1" },
                    "95%": { opacity: "1" },
                    "100%": { top: "100%", opacity: "0" },
                },
                textGlitch: {
                    "0%, 14%": { transform: "translate(0, 0)" },
                    "15%": { transform: "translate(-2px, 1px)" },
                    "16%": { transform: "translate(2px, -1px)" },
                    "17%, 100%": { transform: "translate(0, 0)" }
                },
                glassShimmer: {
                    "0%, 100%": { backdropFilter: "blur(10px)", opacity: "0.8" },
                    "50%": { backdropFilter: "blur(15px)", opacity: "0.95" },
                }
            }
        },
    },
    plugins: [],
};
export default config;
