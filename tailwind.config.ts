import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'primary': "var(--color-primary)",
        'primary-bright': "var(--color-primary-bright)",
        'primary-bright-20': "var(--color-primary-bright-20)",
        'primary-glow': "var(--color-primary-glow)",
        'background': "var(--background)",
        'background-alt': "var(--background-alt)",
        'background-hover': "var(--background-hover)",
        'background-marble': "var(--background-marble)",
        'foreground': "var(--foreground)",
        'foreground-muted': "var(--foreground-muted)",
        'foreground-subtle': "var(--foreground-subtle)",
      },
      boxShadow: {
        'glow': "var(--card-glow)",
        'glow-hover': "var(--card-hover-glow)",
        'holo': "var(--holo-ring)",
        'holo-glow': "var(--holo-glow)",
        'timeline': "var(--timeline-glow)",
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'progressBar': 'progressBar 1s ease-out forwards',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        progressBar: {
          '0%': { width: '0px' },
          '100%': { width: '50px' },
        },
      },
      zIndex: {
        'timeline': '1',
        'nodes': '10',
        'hover': '20',
        'modal': '30',
        'overlay': '40',
        'tooltip': '50',
      },
    },
  },
  plugins: [],
} satisfies Config;
