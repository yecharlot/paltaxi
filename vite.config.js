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
    host: '0.0.0.0',  // Acepta conexiones externas (necesario para Render)
    port: 5173,       // Puerto opcional (ajusta si es necesario)
    strictPort: true,  // Evita que Vite cambie el puerto si está ocupado
    allowedHosts: 'all', // ⚠️ Desactiva la protección (¡No seguro en producción!)
  },
  preview: {          // Configuración para `vite preview` (producción)
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: 'all', // ⚠️ Desactiva también en preview
  },
  },
});
