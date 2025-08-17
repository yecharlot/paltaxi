import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss'; // 👈 Importa Tailwind
import autoprefixer from 'autoprefixer'; // 👈 Importa Autoprefixer

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss(), // 👈 Usa Tailwind como plugin
        autoprefixer(), // 👈 Usa Autoprefixer
      ],
    },
  },
});
