/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
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
        // ألوان الهوية الجديدة
        primary: {
          50: '#EBF3FE',
          100: '#D2E4FC',
          200: '#A5C9F9',
          300: '#79AEF6',
          400: '#4C93F3',
          500: '#2F80ED', // أزرق أكاديمي
          600: '#1B66D3',
          700: '#124DA9',
          800: '#0A3380',
          900: '#041A56',
        },
        secondary: {
          50: '#E3F9ED',
          100: '#C8F3DB',
          200: '#91E7B7',
          300: '#5BDB93',
          400: '#34C570',
          500: '#27AE60', // أخضر نعناعي
          600: '#1F8B4C',
          700: '#176839',
          800: '#0F4626',
          900: '#082313',
        },
        error: {
          50: '#FDEEEE',
          100: '#FBDDDD',
          200: '#F7BCBC',
          300: '#F39A9A',
          400: '#EF7878',
          500: '#EB5757', // أحمر معتدل
          600: '#D62C2C',
          700: '#A92222',
          800: '#7C1818',
          900: '#4F0E0E',
        },
        background: {
          DEFAULT: '#F9FAFB', // رمادي فاتح جدًا
          50: '#FFFFFF',
          100: '#F9FAFB',
          200: '#F3F4F6',
          300: '#E5E7EB',
        },
        tiba: {
          primary: {
            50: '#EBF3FE',
            100: '#D2E4FC',
            200: '#A5C9F9',
            300: '#79AEF6',
            400: '#4C93F3',
            500: '#2F80ED',
            600: '#1B66D3',
            700: '#124DA9',
            800: '#0A3380',
            900: '#041A56',
          },
          secondary: {
            50: '#E3F9ED',
            100: '#C8F3DB',
            200: '#91E7B7',
            300: '#5BDB93',
            400: '#34C570',
            500: '#27AE60',
            600: '#1F8B4C',
            700: '#176839',
            800: '#0F4626',
            900: '#082313',
          },
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
          },
          danger: {
            50: '#FDEEEE',
            100: '#FBDDDD',
            200: '#F7BCBC',
            300: '#F39A9A',
            400: '#EF7878',
            500: '#EB5757',
            600: '#D62C2C',
            700: '#A92222',
            800: '#7C1818',
            900: '#4F0E0E',
          },
          warning: {
            50: '#FEF6E9',
            100: '#FCECD3',
            200: '#F9D9A7',
            300: '#F6C77B',
            400: '#F4B54F',
            500: '#F2994A',
            600: '#D97C26',
            700: '#A9601D',
            800: '#794414',
            900: '#49280B',
          },
        },
        text: {
          primary: '#333333', // رمادي غامق
          secondary: '#6B7280',
          disabled: '#9CA3AF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F3F4F6',
        },
        // دعم تنسيقات shadcn بدون تعارض
        destructive: {
          DEFAULT: "hsl(0, 84.2%, 60.2%)",
          foreground: "hsl(0, 0%, 98%)",
        },
        muted: {
          DEFAULT: "hsl(220, 14.3%, 95.9%)",
          foreground: "hsl(220, 8.9%, 46.1%)",
        },
        popover: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(220, 14.3%, 95.9%)",
        },
        card: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(220, 14.3%, 95.9%)",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif']
      },
      boxShadow: {
        'neumorphic': '5px 5px 10px rgba(0, 0, 0, 0.1), -5px -5px 10px rgba(255, 255, 255, 0.8)',
        'neumorphic-inset': 'inset 5px 5px 10px rgba(0, 0, 0, 0.1), inset -5px -5px 10px rgba(255, 255, 255, 0.8)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 
