import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/react";
import typography from '@tailwindcss/typography';
import animate from "tailwindcss-animate";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
  	extend: {
      fontFamily: {
        sans: ['var(--font-cairo)', 'Cairo', 'system-ui', '-apple-system', 'sans-serif'],
        cairo: ['var(--font-cairo)', 'Cairo', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'monospace'],
      },
  		colors: {
        tiba: {
          primary: {
            '50': '#EEF2FF',
            '100': '#E0E7FF',
            '200': '#C7D2FE',
            '300': '#A5B4FC',
            '400': '#818CF8',
            '500': '#6366F1',
            '600': '#4F46E5',
            '700': '#4338CA',
            '800': '#3730A3',
            '900': '#312E81',
            '950': '#1E3A8A',
          },
          secondary: {
            '50': '#ECFDF5',
            '100': '#D1FAE5',
            '200': '#A7F3D0',
            '300': '#6EE7B7',
            '400': '#34D399',
            '500': '#10B981',
            '600': '#059669',
            '700': '#047857',
            '800': '#065F46',
            '900': '#064E3B',
            '950': '#022C22',
          },
          warning: {
            '50': '#FFFBEB',
            '100': '#FEF3C7',
            '200': '#FDE68A',
            '300': '#FCD34D',
            '400': '#FBBF24',
            '500': '#F59E0B',
            '600': '#D97706',
            '700': '#B45309',
            '800': '#92400E',
            '900': '#78350F',
            '950': '#451A03',
          },
          danger: {
            '50': '#FEF2F2',
            '100': '#FEE2E2',
            '200': '#FECACA',
            '300': '#FCA5A5',
            '400': '#F87171',
            '500': '#EF4444',
            '600': '#DC2626',
            '700': '#B91C1C',
            '800': '#991B1B',
            '900': '#7F1D1D',
            '950': '#450A0A',
          },
          gray: {
            '50': '#F9FAFB',
            '100': '#F3F4F6',
            '200': '#E5E7EB',
            '300': '#D1D5DB',
            '400': '#9CA3AF',
            '500': '#6B7280',
            '600': '#4B5563',
            '700': '#374151',
            '800': '#1F2937',
            '900': '#111827',
            '950': '#030712',
          },
        },
  			blue: {
  				'50': '#eff6ff',
  				'100': '#dbeafe',
  				'200': '#bfdbfe',
  				'300': '#93c5fd',
  				'400': '#60a5fa',
  				'500': '#3b82f6',
  				'600': '#2563eb',
  				'700': '#1d4ed8',
  				'800': '#1e40af',
  				'900': '#1e3a8a'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		animation: {
  			gradient: 'gradient 6s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-in-out',
        'slide-in-left': 'slideInLeft 0.3s ease-in-out',
        'slide-in-bottom': 'slideInBottom 0.3s ease-in-out',
        'scale-in': 'scaleIn 0.3s ease-in-out',
        'blob': 'blob 7s infinite',
        'slide-in-top': 'slideInTop 0.3s ease-out',
        'pulse-glow': 'pulseGlow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  		},
  		keyframes: {
  			gradient: {
  				'0%, 100%': {
  					'background-position': '0% 50%'
  				},
  				'50%': {
  					'background-position': '100% 50%'
  				}
  			},
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInBottom: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        slideInTop: {
          '0%': { transform: 'translate(-50%, -20px)', opacity: '0' },
          '100%': { transform: 'translate(-50%, 0)', opacity: '1' },
        },
  		},
      animationDelay: {
        '2000': '2s',
        '4000': '4s',
      },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
      boxShadow: {
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.1)',
        'primary': '0 4px 14px 0 rgba(30, 58, 138, 0.3)',
        'secondary': '0 4px 14px 0 rgba(16, 185, 129, 0.3)',
      },
  	}
  },
  plugins: [
    typography,
    animate,
    nextui({
      defaultTheme: "light",
      layout: {
        fontFamily: {
          sans: "var(--font-cairo), Cairo, system-ui, -apple-system, sans-serif",
          mono: "IBM Plex Mono, Menlo, monospace",
        },
      },
    })
  ],
};

export default config;
