import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#B6E62E',
        'primary-dark': '#9DCB1F',
        dark: '#0A1404',
        card: '#16220D',
        surface: '#1E2D12',
        muted: '#2A3D18',
      },
    },
  },
  plugins: [],
}

export default config
