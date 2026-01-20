/**
 * ScannerButton - Botón CTA responsive para activar el escáner QR
 * 
 * Características:
 * - Tamaños adaptativos según dispositivo
 * - Animación de pulso cuando inactivo
 * - Estados visuales claros
 * - Touch-friendly (mínimo 48px)
 */

import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScannerButtonProps {
    onActivate: () => void;
    isActive?: boolean;
    isScanning?: boolean;
    size?: 'mobile' | 'tablet' | 'desktop';
    className?: string;
    fullWidth?: boolean;
}

export const ScannerButton: React.FC<ScannerButtonProps> = ({
    onActivate,
    isActive = false,
    isScanning = false,
    size = 'mobile',
    className,
    fullWidth = false
}) => {
    const sizeClasses = {
        mobile: 'min-h-[56px] px-6 text-base',
        tablet: 'min-h-[52px] px-5 text-base',
        desktop: 'min-h-[48px] px-4 text-sm'
    };

    return (
        <button
            onClick={onActivate}
            disabled={isScanning}
            className={cn(
                // Base styles
                'flex items-center justify-center gap-3 rounded-xl font-semibold transition-all',
                'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
                'hover:from-indigo-700 hover:to-purple-700',
                'active:scale-95',
                'shadow-lg hover:shadow-xl',
                'disabled:opacity-50 disabled:cursor-not-allowed',

                // Pulse animation cuando no está activo
                !isActive && !isScanning && 'animate-pulse',

                // Size variants
                sizeClasses[size],

                // Full width
                fullWidth && 'w-full',

                // Custom className
                className
            )}
        >
            {isScanning ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Escaneando...</span>
                </>
            ) : (
                <>
                    <Camera className="w-5 h-5" />
                    <span>{isActive ? 'Cámara Activa' : 'Escanear Pedido'}</span>
                </>
            )}
        </button>
    );
};
