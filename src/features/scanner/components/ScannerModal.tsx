/**
 * ScannerModal - Modal responsive para escáner QR con cámara
 * 
 * Características:
 * - Full-screen en móvil con slide-up animation
 * - Semi-modal en desktop con fade
 * - Cierre rápido (X button, Esc, backdrop click)
 * - Indicador de estado de cámara
 * - Focus trap para accesibilidad
 */

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import QRScanner from '@/components/shared/QRScanner';
import { useOrientation } from '@/hooks/useOrientation';

export interface ScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
    title?: string;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
    isOpen,
    onClose,
    onScan,
    title = 'Escanear Código QR'
}) => {
    const orientation = useOrientation();

    // Cerrar con tecla Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevenir scroll del body cuando modal está abierto
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const handleScanSuccess = useCallback((code: string) => {
        onScan(code);
        // Auto-cerrar después de escanear exitosamente (opcional)
        // onClose();
    }, [onScan]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 bg-black/80 z-40 transition-opacity',
                    'animate-in fade-in duration-200'
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="scanner-modal-title"
                className={cn(
                    'fixed z-50 bg-[#1A1D1F] border border-[#45474A] shadow-2xl',

                    // Mobile: Full screen con slide-up
                    'inset-0 md:inset-auto',
                    'animate-in slide-in-from-bottom duration-300 md:fade-in',

                    // Desktop: Centered modal
                    'md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
                    'md:w-[600px] md:max-h-[80vh] md:rounded-2xl',

                    // Responsive padding
                    'p-4 md:p-6'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2
                        id="scanner-modal-title"
                        className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"
                    >
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        {title}
                    </h2>

                    <button
                        onClick={onClose}
                        className={cn(
                            'p-2 rounded-lg transition-colors',
                            'text-gray-400 hover:text-white hover:bg-white/10',
                            'focus:outline-none focus:ring-2 focus:ring-indigo-500'
                        )}
                        aria-label="Cerrar escáner"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scanner Area */}
                <div className={cn(
                    'relative bg-black rounded-xl overflow-hidden',
                    // Aspect ratio según orientación
                    orientation === 'portrait'
                        ? 'aspect-[3/4] max-h-[70vh]'
                        : 'aspect-video'
                )}>
                    <QRScanner
                        onScan={handleScanSuccess}
                        onClose={onClose}
                    />
                </div>

                {/* Instructions */}
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-400">
                        Coloca el código QR dentro del recuadro
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Presiona <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">Esc</kbd> para cerrar
                    </p>
                </div>

                {/* Close Button (Mobile) */}
                <button
                    onClick={onClose}
                    className={cn(
                        'w-full mt-4 py-3 rounded-lg font-semibold transition-colors',
                        'bg-[#45474A] text-white hover:bg-[#6E6F71]',
                        'md:hidden' // Solo visible en móvil
                    )}
                >
                    Cerrar Cámara
                </button>
            </div>
        </>
    );
};
