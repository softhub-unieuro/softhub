import { useState, useEffect } from 'react';

/**
 * Hook para detectar características do dispositivo.
 * - isMobile: baseado no breakpoint 'lg' do Tailwind (1024px).
 * - isIOS: detecta se o usuário está em um iPhone/iPad/iPod.
 */
export function usarDispositivo() {
    const [isMobile, setIsMobile] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        const checkIsIOS = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            setIsIOS(/iphone|ipad|ipod/.test(userAgent));
        };

        // Verificações iniciais
        checkIsMobile();
        checkIsIOS();

        // Ouve redimensionamento
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    return { isMobile, isIOS };
}
