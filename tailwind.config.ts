import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:"#f7f5ff",
          100:"#eee9ff",
          200:"#d7caff",
          300:"#b89bff",
          400:"#996dff",
          500:"#7a3dff",
          600:"#622fe0",
          700:"#4b23b3",
          800:"#351885",
          900:"#200d57"
        },
        gold: "#c6a664",
        jade: "#2bb673",
      },
      animation: {
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite'
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(122,61,255,0.45)' },
          '50%': { boxShadow: '0 0 40px rgba(198,166,100,0.55)' },
        }
      },
      backgroundImage: {
        'protection-watermark': "radial-gradient(circle at 20% 30%, rgba(198,166,100,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(43,182,115,0.15), transparent 40%)",
      }
    },
  },
  plugins: [],
};
export default config;
