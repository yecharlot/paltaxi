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
      ],server: {
    host: '0.0.0.0',
    port: 5173,
         allowedHosts: [
      'paltaxi.onrender.com', // Permite tu dominio de Render
    ],
  }
    },
  },
});
