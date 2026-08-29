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
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
