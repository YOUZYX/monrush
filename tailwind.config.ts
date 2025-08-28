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
        // MonadRush custom color palette
        'charcoal': '#0b0f14',
        'ink': '#0d1218',
        'electric-cyan': '#28e1ff',
        'purple-accent': '#7a5fff',
        'soft-white': '#e8f1ff',
        'success-lime': '#8aff7a',
        'danger': '#ff5b5b',
        'monad-purple': '#836EF9',
      },
      fontFamily: {
        'futuristic': ['Orbitron', 'Rajdhani', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
        'shake': 'shake 0.5s ease-in-out',
        'fall': 'fall linear',
        'pop-in': 'pop-in 0.3s ease-out',
        'glitch': 'glitch 0.3s ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%': { 
            boxShadow: '0 0 5px rgb(40, 225, 255, 0.5)',
            transform: 'scale(1)',
          },
          '100%': { 
            boxShadow: '0 0 20px rgb(40, 225, 255, 0.8), 0 0 30px rgb(40, 225, 255, 0.4)',
            transform: 'scale(1.05)',
          },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        'fall': {
          '0%': { transform: 'translateY(-100px)' },
          '100%': { transform: 'translateY(calc(100vh + 100px))' },
        },
        'pop-in': {
          '0%': { 
            transform: 'scale(0) rotate(-180deg)',
            opacity: '0',
          },
          '100%': { 
            transform: 'scale(1) rotate(0deg)',
            opacity: '1',
          },
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'neon-cyan': '0 0 5px rgb(40, 225, 255, 0.5), 0 0 20px rgb(40, 225, 255, 0.3)',
        'neon-purple': '0 0 5px rgb(122, 95, 255, 0.5), 0 0 20px rgb(122, 95, 255, 0.3)',
        'neon-lime': '0 0 5px rgb(138, 255, 122, 0.5), 0 0 20px rgb(138, 255, 122, 0.3)',
        'glassmorphism': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
