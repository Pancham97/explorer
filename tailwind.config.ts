import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            textShadow: {
                sm: "0 1px 2px var(--tw-shadow-color)",
                DEFAULT: "0 2px 4px var(--tw-shadow-color)",
                lg: "0 8px 16px var(--tw-shadow-color)",
            },
            boxShadow: {
                "top-left": "-5px -5px 15px rgba(0, 0, 0, 0.4)",
            },
            fontFamily: {
                sans: [
                    "Inter",
                    "ui-sans-serif",
                    "system-ui",
                    "sans-serif",
                    "Apple Color Emoji",
                    "Segoe UI Emoji",
                    "Segoe UI Symbol",
                    "Noto Color Emoji",
                ],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                chart: {
                    "1": "hsl(var(--chart-1))",
                    "2": "hsl(var(--chart-2))",
                    "3": "hsl(var(--chart-3))",
                    "4": "hsl(var(--chart-4))",
                    "5": "hsl(var(--chart-5))",
                },
            },
            transitionDuration: {
                "5000": "5000ms",
            },
            keyframes: {
                "soft-pulse": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
                "breathing-glow": {
                    "0%": {
                        transform: "scale(1)",
                        opacity: "0.4",
                    },
                    "50%": {
                        transform: "scale(1.03)",
                        opacity: "0.8",
                    },
                    "100%": {
                        transform: "scale(1)",
                        opacity: "0",
                    },
                },
                "fill-up": {
                    "0%": { height: "0%" },
                    "100%": { height: "100%" },
                },
                "expand-fade": {
                    "0%": { transform: "scaleY(1)", opacity: "1" },
                    "50%": {
                        transform: "scaleY(1.05)",
                        opacity: "0.9",
                    },
                    "100%": { transform: "scaleY(1)", opacity: "0" },
                },
            },
            animation: {
                "expand-fade": "expand-fade 1s ease-out forwards",
                "fill-up": "fill-up 1s ease-out forwards",
                "soft-pulse":
                    "soft-pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "breathing-glow": "breathing-glow 1s ease-out forwards",
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
        require("@tailwindcss/typography"),
        function ({ matchUtilities, theme }: any) {
            matchUtilities(
                {
                    "text-shadow": (value: any) => ({
                        textShadow: value,
                    }),
                },
                { values: theme("textShadow") }
            );
        },
    ],
} satisfies Config;
