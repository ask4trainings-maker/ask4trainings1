/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D6E4F',
          hover: '#09533B',
          light: '#ECFDF5',
        },
        accent: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          light: '#FEF3C7',
        },
        whatsapp: {
          DEFAULT: '#25D366',
          hover: '#1EBE57',
        },
        slate: {
          dark: '#0F172A',
          body: '#334155',
          muted: '#64748B',
          surface: '#FFFFFF',
          bg: '#F8FAFC',
          border: '#E2E8F0',
        },
        surface: {
          0: '#FFFFFF',
          50: '#F8FAFC',
          100: '#E2E8F0',
        },
        ink: {
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
        },
        border: {
          DEFAULT: '#E2E8F0',
        },
        error: {
          DEFAULT: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
