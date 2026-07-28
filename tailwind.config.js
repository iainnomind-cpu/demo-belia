/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Belia Brand Palette ────────────────────────────────────────
        "belia-red":     "#F6423C",   // Primario: CTAs, acentos de marca
        "belia-coral":   "#FB7A76",   // Secundario: hovers, degradados suaves
        "belia-pink":    "#FF8FA3",   // Acento rosa (pedido por cliente: "más rosa")
        "belia-blush":   "#FFF0F3",   // Fondo rosa muy suave para tarjetas
        "belia-cream":   "#FDF8F5",   // Fondo crema cálido (fondo base del sitio)
        "belia-charcoal":"#232323",   // Texto principal, variante de logo oscuro
        "belia-gray":    "#9A9A9A",   // Bordes, texto secundario, variante logo gris
        "belia-white":   "#FFFFFF",

        // ─── Tokens semánticos de superficie ───────────────────────────
        "surface":                  "#FDF8F5",
        "surface-container":        "#FFF0F3",
        "surface-container-low":    "#FFF5F7",
        "surface-container-high":   "#FFE4E9",
        "surface-dim":              "#F5E6E8",
        "surface-bright":           "#FFFFFF",
        "surface-tint":             "#FFF0F3",
        "surface-variant":          "#FFE4E9",
        "surface-container-highest":"#FFDDE3",
        "surface-container-lowest": "#FFFFFF",

        // ─── Tokens semánticos de texto ────────────────────────────────
        "text-primary":    "#1A1A1A",
        "text-secondary":  "#4A4A4A",
        "text-meta":       "#9A9A9A",
        "on-primary":      "#FFFFFF",
        "on-background":   "#1A1A1A",
        "on-surface":      "#1A1A1A",
        "on-surface-variant": "#5C3D42",

        // ─── Tokens de estado ──────────────────────────────────────────
        "primary":           "#F6423C",
        "primary-container": "#FFE4E9",
        "secondary":         "#B56576",
        "secondary-container": "#FFD9E1",
        "error":             "#BA1A1A",
        "error-container":   "#FFDAD6",
        "success-green":     "#2B8A3E",

        // ─── Bordes y divisores ────────────────────────────────────────
        "divider":           "#EEDDE0",
        "outline":           "#C9A0A6",
        "outline-variant":   "#EEDDE0",

        // ─── Tokens de inversión ───────────────────────────────────────
        "inverse-surface":     "#3E2326",
        "inverse-on-surface":  "#FFEDEE",
        "inverse-primary":     "#FFB3BB",

        // ─── Compatibilidad legacy (no borrar — usado en admin) ────────
        "belia-red-deep":      "#E63A30",
        "tertiary":            "#A0496B",
        "tertiary-container":  "#FFD8E4",
        "on-tertiary":         "#FFFFFF",
        "on-tertiary-container":"#3D0020",
        "tertiary-fixed":      "#FFD8E4",
        "tertiary-fixed-dim":  "#FFB0C8",
        "on-tertiary-fixed":   "#3D0020",
        "on-tertiary-fixed-variant":"#7D2B4A",
        "on-secondary":        "#FFFFFF",
        "on-primary-container":"#FFFBFF",
        "on-secondary-container":"#5C3D42",
        "on-secondary-fixed":  "#1A0011",
        "on-secondary-fixed-variant":"#4A2030",
        "on-error-container":  "#93000A",
        "on-error":            "#FFFFFF",
        "primary-fixed":       "#FFDDE3",
        "primary-fixed-dim":   "#FFB3BB",
        "on-primary-fixed":    "#400010",
        "on-primary-fixed-variant":"#800029",
        "secondary-fixed":     "#FFD9E1",
        "secondary-fixed-dim": "#FFB0C8",
        "background":          "#FDF8F5",
      },

      // ─── Tipografía Belia ──────────────────────────────────────────────
      // Plus Jakarta Sans: alternativa cercana a TT Norms (sin licencia comercial requerida)
      fontFamily: {
        "headline-lg": ['"Plus Jakarta Sans"', 'sans-serif'],
        "headline-md": ['"Plus Jakarta Sans"', 'sans-serif'],
        "headline-sm": ['"Plus Jakarta Sans"', 'sans-serif'],
        "body-lg":     ['"Plus Jakarta Sans"', 'sans-serif'],
        "body-md":     ['"Plus Jakarta Sans"', 'sans-serif'],
        "body-sm":     ['"Plus Jakarta Sans"', 'sans-serif'],
        "label-md":    ['"Plus Jakarta Sans"', 'sans-serif'],
        "hero-display":['"Plus Jakarta Sans"', 'sans-serif'],
        // Si el cliente provee licencia TT Norms, solo cambiar aquí ↑
      },

      // ─── Radio de borde premium (Double-Bezel) ─────────────────────────
      borderRadius: {
        "DEFAULT": "0.5rem",
        "sm":      "0.375rem",
        "md":      "0.75rem",
        "lg":      "1rem",
        "xl":      "1.25rem",
        "2xl":     "1.5rem",
        "3xl":     "2rem",
        "full":    "9999px",
      },

      // ─── Espaciado (8-point grid) ──────────────────────────────────────
      spacing: {
        "base":           "8px",
        "element-gap":    "16px",
        "gutter":         "24px",
        "margin":         "32px",
        "card-padding":   "24px",
        "section-mobile": "48px",
        "section-desktop":"72px",
      },

      // ─── Animaciones spring physics ────────────────────────────────────
      transitionTimingFunction: {
        "spring":    "cubic-bezier(0.32, 0.72, 0, 1)",
        "spring-out":"cubic-bezier(0.22, 0.61, 0.36, 1)",
        "bounce":    "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "450": "450ms",
        "600": "600ms",
        "800": "800ms",
      },

      // ─── Box shadows premium (difusos, no duros) ──────────────────────
      boxShadow: {
        "belia-sm":   "0 2px 12px rgba(246, 66, 60, 0.08)",
        "belia-md":   "0 8px 32px rgba(246, 66, 60, 0.12)",
        "belia-lg":   "0 16px 48px rgba(246, 66, 60, 0.16)",
        "belia-xl":   "0 24px 64px rgba(246, 66, 60, 0.20)",
        "card-hover": "0 12px 40px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(246, 66, 60, 0.06)",
        "mega-menu":  "0 16px 48px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.04)",
        "inner-glow": "inset 0 1px 1px rgba(255, 255, 255, 0.15)",
      },

      // ─── Keyframes para animaciones de entrada ─────────────────────────
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          "0%":   { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up":    "fade-up 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "fade-in":    "fade-in 0.4s ease both",
        "scale-in":   "scale-in 0.35s cubic-bezier(0.32, 0.72, 0, 1) both",
        "slide-down": "slide-down 0.25s cubic-bezier(0.32, 0.72, 0, 1) both",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
