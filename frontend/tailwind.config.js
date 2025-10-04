/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Purple/Pink Brand Colors - Single Source of Truth
        purple: {
          50: '#faf5f9',
          100: '#f5ebf3',
          200: '#ead6e7',
          300: '#dab5d5',
          400: '#c388bb',
          500: '#9e829c',  // Mountbatten Pink - Secondary accent
          600: '#7d5c7b',
          700: '#644862',
          800: '#533e52',
          900: '#291528',  // Dark Purple - Primary brand
          950: '#1a0d18',
        },
        ghost: {
          50: '#ffffff',   // Pure white for cards
          100: '#f0eff4',  // Ghost white - Main background
          200: '#e1e0e9',
          300: '#d2d1de',
          400: '#a9a8b5',
          500: '#80808c',
          600: '#5a5a66',
          700: '#3a3e3b',  // Black Olive - Body text
          800: '#2a2a2a',
          900: '#1a1a1a',
          950: '#0a0a0a',
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "luxury-sm":
          "0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(41, 21, 40, 0.15)",
        luxury:
          "0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(41, 21, 40, 0.15)",
        "luxury-lg":
          "0 10px 15px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(41, 21, 40, 0.15)",
        "glass": "0 4px 30px rgba(0, 0, 0, 0.05)",
        "elegant": "0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)",
        "card-hover": "0 12px 28px -8px rgba(41, 21, 40, 0.3), 0 4px 10px -5px rgba(41, 21, 40, 0.2)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" }, // Ensure 0 is a string if Radix expects it
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }, // Ensure 0 is a string
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gentle-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.03)", opacity: "0.9" },
        },
        'delicate-sweep-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(35px) rotateX(-15deg) scale(0.97)',
            filter: 'blur(2px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) rotateX(0deg) scale(1)',
            filter: 'blur(0px)',
          },
        },
        'icon-subtle-bob': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-3px) scale(1.05)' },
        },
        float: { 
          "0%, 100%": {
            transform: "translate(0px, 0px) rotate(0deg) scale(1)",
          },
          "33%": {
            transform: "translate(10px, -10px) rotate(2deg) scale(1.01)",
          },
          "66%": {
            transform: "translate(-5px, 5px) rotate(-1deg) scale(0.99)",
          },
        },
        gradient: { 
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        // Modern slide animations
        "slide-in-from-bottom": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        // Scale animations
        "zoom-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "zoom-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.8)", opacity: "0" },
        },
        // Rotation animations
        "rotate-in": {
          "0%": { transform: "rotate(-180deg) scale(0.8)", opacity: "0" },
          "100%": { transform: "rotate(0deg) scale(1)", opacity: "1" },
        },
        // Glow effect
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)" },
        },
        // Bounce in
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Elastic scale
        "elastic-scale": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.25)" },
          "40%": { transform: "scale(0.75)" },
          "60%": { transform: "scale(1.15)" },
          "80%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        // Morph number animation
        "morph-num": {
          "0%": { "--num": "0" },
          "100%": { "--num": "100" },
        },
        // Scale in animation
        "scale-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.7s ease-out forwards",
        "gentle-pulse": "gentle-pulse 2.5s ease-in-out infinite",
        'delicate-sweep-in': 'delicate-sweep-in 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'icon-subtle-bob': 'icon-subtle-bob 0.6s ease-in-out',
        float: "float 20s ease-in-out infinite", 
        gradient: "gradient 8s ease infinite",
        shimmer: "shimmer 8s ease-in-out infinite", 
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        // Modern animations
        "slide-in-bottom": "slide-in-from-bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-top": "slide-in-from-top 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slide-in-from-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-from-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "zoom-in": "zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "zoom-out": "zoom-out 0.2s cubic-bezier(0.4, 0, 1, 1)",
        "rotate-in": "rotate-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "glow": "glow 2s ease-in-out infinite",
        "bounce-in": "bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "elastic-scale": "elastic-scale 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "gradient-shift": "gradient 15s ease infinite",
        "morph-num": "morph-num 2s ease-out forwards",
        "scale-in": "scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        mono: ["Monaco", "Consolas", "Courier New", "monospace"],
        montserrat: ["var(--font-montserrat)", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
        "3xl": "64px",
      },
      backgroundImage: {
        "text-gradient-purple": "linear-gradient(to right, #9e829c, #644862, #291528)",
        "purple-gradient": "linear-gradient(135deg, #9e829c 0%, #291528 100%)",
        "shine": "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
        "luxury-gradient": "linear-gradient(to right, hsl(var(--primary)), #9e829c, hsl(var(--primary)))",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities, theme }) {
      addUtilities({
        ".animation-delay-2000": { "animation-delay": "2s" },
        ".animation-delay-4000": { "animation-delay": "4s" },
        ".text-balance": { "text-wrap": "balance" },
        ".text-shadow-sm": { "text-shadow": "0 1px 2px rgba(0, 0, 0, 0.1)" },
        ".text-shadow-md": { "text-shadow": "0 2px 4px rgba(0, 0, 0, 0.1)" },
        ".backdrop-blur-xs": { "backdrop-filter": "blur(2px)" },
        ".bg-clip-text": {
          "-webkit-background-clip": "text",
          "background-clip": "text",
        },
        ".subtle-shadow": {
          "box-shadow": "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        },
        ".text-gradient-purple": {
          "background-image": theme('backgroundImage.text-gradient-purple'),
          "-webkit-background-clip": "text",
          "background-clip": "text",
          color: "transparent",
        },
        ".perspective": { "perspective": "1000px" },
        ".glass": {
          "background": "rgba(255, 255, 255, 0.02)",
          "backdrop-filter": "blur(10px)",
          "-webkit-backdrop-filter": "blur(10px)",
          "border": "1px solid rgba(255, 255, 255, 0.06)",
        },
        ".glass-hover": {
          "transition": "all 0.3s ease",
        },
        ".shadow-glow": {
          "box-shadow": "0 0 20px rgba(158, 130, 156, 0.5)",
        },
        ".shadow-glow-lg": {
          "box-shadow": "0 0 40px rgba(158, 130, 156, 0.6)",
        },
        ".shadow-glow-sm": {
          "box-shadow": "0 0 10px rgba(158, 130, 156, 0.4)",
        },
        ".text-gradient": {
          "background": "linear-gradient(to right, #9e829c, #644862, #9e829c)",
          "-webkit-background-clip": "text",
          "background-clip": "text",
          "color": "transparent",
        },
        ".gradient-primary": {
          "background": "linear-gradient(135deg, #9e829c 0%, #291528 100%)",
        },
        ".animation-delay-100": { "animation-delay": "100ms" },
        ".animation-delay-200": { "animation-delay": "200ms" },
        ".animation-delay-300": { "animation-delay": "300ms" },
        ".animation-delay-400": { "animation-delay": "400ms" },
        ".animation-delay-500": { "animation-delay": "500ms" },
        ".animation-delay-600": { "animation-delay": "600ms" },
        ".animation-delay-700": { "animation-delay": "700ms" },
        ".animation-delay-800": { "animation-delay": "800ms" },
        ".animation-delay-1000": { "animation-delay": "1000ms" },
      });
    },
  ],
};