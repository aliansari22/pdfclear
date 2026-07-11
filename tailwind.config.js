/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ------------------------------------------
         * BRAND — "Editorial Indigo"
         * A stronger primary system color that moves the UI away from the
         * all-teal look while preserving a polished, trustworthy feel.
         * ------------------------------------------ */
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1', // Primary Action
          600: '#4F46E5', // Darker Hover
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },

        /* ------------------------------------------
         * LOGO — original PDFClear brand teal.
         * Keep this separate so app accents can be multicolor without
         * recoloring the main brand mark/wordmark.
         * ------------------------------------------ */
        logo: {
          50:  '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0F968C',
          700: '#0D766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },

        /* ------------------------------------------
         * ACCENT — "Solar Coral"
         * Warm, energetic, distinct from error red.
         * Used for "New" badges or primary marketing calls.
         * ------------------------------------------ */
        accent: {
          50:  '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E', // Standard Rose
          600: '#E11D48',
          700: '#BE123C',
        },

        /* ------------------------------------------
         * FUNCTIONAL / SYSTEM
         * ------------------------------------------ */
        success: '#10B981', // Emerald - distinctive from Brand Teal
        error:   '#EF4444', // Red
        warning: '#F59E0B', // Amber
        info:    '#3B82F6', // Blue

        /* ------------------------------------------
         * NEUTRALS — "Clean Slate"
         * Using a Slate tint (blue-grey) feels more premium 
         * than neutral grey.
         * ------------------------------------------ */
        
        // Light Mode
        'light-body': '#F8FAFC',          // Slate-50: Crisp, not blinding white
        'light-card': '#FFFFFF',
        'border-light': '#E2E8F0',        // Slate-200
        'text-light-primary': '#0F172A',  // Slate-900: High contrast, sharp
        'text-light-secondary': '#64748B',// Slate-500: Readable but subtle

        // Dark Mode (The "Cozy" Midnight Theme)
        'dark-body': '#0B1120',           // Deep Navy/Black (Rich depth)
        'dark-card': '#151E32',           // Lighter Navy (distinct elevation)
        'border-dark': '#1E293B',         // Slate-800
        'text-dark-primary': '#F1F5F9',   // Slate-100: Soft white, not harsh
        'text-dark-secondary': '#94A3B8', // Slate-400: High legibility
      },

      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)', // Smoother elevation
        'glow': '0 0 18px rgba(79, 70, 229, 0.28)',    // Primary indigo glow
        'glow-accent': '0 0 18px rgba(219, 39, 119, 0.28)', // Rose/fuchsia glow
        'glow-sky': '0 0 18px rgba(2, 132, 199, 0.24)',
        'glow-amber': '0 0 18px rgba(217, 119, 6, 0.24)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
