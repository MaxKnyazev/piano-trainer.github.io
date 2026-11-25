import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative assets work both at username.github.io/repository/ and on a custom domain.
export default defineConfig({ plugins: [react()], base: './' });
