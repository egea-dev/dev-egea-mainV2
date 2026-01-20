/**
 * Hook para detectar la orientación del dispositivo
 * Retorna 'portrait' o 'landscape' y se actualiza automáticamente al rotar
 */

import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
    const [orientation, setOrientation] = useState<Orientation>(() => {
        // Inicial: comparar dimensiones de ventana
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    });

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleOrientationChange = () => {
            // Debounce para evitar múltiples actualizaciones
            clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                const newOrientation = window.innerHeight > window.innerWidth
                    ? 'portrait'
                    : 'landscape';

                setOrientation(newOrientation);
            }, 100);
        };

        // Escuchar ambos eventos
        window.addEventListener('resize', handleOrientationChange);
        window.addEventListener('orientationchange', handleOrientationChange);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleOrientationChange);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, []);

    return orientation;
}

/**
 * Hook para detectar tipo de dispositivo basado en ancho de viewport
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDeviceType(): DeviceType {
    const [deviceType, setDeviceType] = useState<DeviceType>(() => {
        const width = window.innerWidth;
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    });

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleResize = () => {
            clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                const width = window.innerWidth;
                let newType: DeviceType;

                if (width < 768) newType = 'mobile';
                else if (width < 1024) newType = 'tablet';
                else newType = 'desktop';

                setDeviceType(newType);
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return deviceType;
}
