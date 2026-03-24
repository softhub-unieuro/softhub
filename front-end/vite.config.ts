import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(() => {
    return {
        plugins: [
            react(),
            tailwindcss(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['ICONE.png', 'icons/*.png'],
                manifestFilename: 'manifest.json',
                devOptions: {
                    enabled: true // Permite testar PWA em localhost
                },
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                    cleanupOutdatedCaches: true,
                },
                manifest: {
                    name: 'SoftHub - Fábrica de Software',
                    short_name: 'SoftHub',
                    description: 'Sistema de Gestão da Fábrica de Software Unieuro',
                    theme_color: '#001a33',
                    background_color: '#001a33',
                    display: 'standalone',
                    start_url: '/',
                    scope: '/',
                    icons: [
                        {
                            src: 'icons/icon-72x72.png',
                            sizes: '72x72',
                            type: 'image/png'
                        },
                        {
                            src: 'icons/icon-96x96.png',
                            sizes: '96x96',
                            type: 'image/png'
                        },
                        {
                            src: 'icons/icon-128x128.png',
                            sizes: '128x128',
                            type: 'image/png'
                        },
                        {
                            src: 'icons/icon-144x144.png',
                            sizes: '144x144',
                            type: 'image/png'
                        },
                        {
                            src: 'icons/icon-152x152.png',
                            sizes: '152x152',
                            type: 'image/png'
                        },
                        {
                            src: 'icons/icon-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any maskable'
                        },
                        {
                            src: 'icons/icon-384x384.png',
                            sizes: '384x384',
                            type: 'image/png'
                        },
                        {
                            src: 'icons/icon-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any maskable'
                        }
                    ]
                }
            })
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            proxy: {
                '/api': {
                    target: 'https://api.softhub.workers.dev',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
});
