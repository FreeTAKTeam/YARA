import formsPlugin from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'selector',
    content: [
        "./src/frontend/index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx,html}",
    ],
    theme: {
        extend: {
            // REM "Night ops" palette; zinc is remapped to navy so existing dark: classes follow the theme
            colors: {
                zinc: {
                    50: "#f3fbff",
                    100: "#def1ff",
                    200: "#d1e9ff",
                    300: "#afbed8",
                    400: "#9cb3d6",
                    500: "#4f6f9f",
                    600: "#2d4a78",
                    700: "#1d3560",
                    800: "#0f2347",
                    900: "#091932",
                    950: "#050f22",
                },
                rem: {
                    base: "#020710",
                    text: "#def1ff",
                    strong: "#f3fbff",
                    muted: "#9cb3d6",
                    label: "#8da7cd",
                    tab: "#8ea5ca",
                    accent: "#64beff",
                    "accent-soft": "#8fcaff",
                    button: "#8fdbff",
                    eyebrow: "#38bdf8",
                    cta: "#00a8ff",
                    "cta-end": "#14f0ff",
                    "on-cta": "#032748",
                    ok: "#8df3c1",
                    granted: "#70f0a4",
                    warning: "#ffd36e",
                    pending: "#ffcf7b",
                    alert: "#ff6475",
                    running: "#6ac1ff",
                },
            },
            fontFamily: {
                sans: ["'Chakra Petch'", "ui-sans-serif", "system-ui", "sans-serif"],
                ui: ["Rajdhani", "ui-sans-serif", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [
        formsPlugin,
    ],
}
