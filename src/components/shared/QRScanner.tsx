import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, Camera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
    fullscreen?: boolean;
    className?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({
    onScan,
    onError,
    onClose,
    fullscreen = false,
    className
}) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const scannerId = "qr-reader-container";

        const startScanner = async () => {
            try {
                console.log('🎥 Iniciando escáner con html5-qrcode...');
                setIsLoading(true);
                setError('');

                // Limpiar instancia previa si existe
                if (scannerRef.current) {
                    try {
                        await scannerRef.current.stop();
                    } catch (e) {
                        // Ignorar si no estaba iniciado
                    }
                }

                const html5QrCode = new Html5Qrcode(scannerId);
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        console.log('✅ QR detectado:', decodedText);
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                        onScan(decodedText);
                    },
                    (errorMessage) => {
                        // Errores de escaneo (no detectado) se ignoran
                    }
                );

                if (mounted) {
                    setIsLoading(false);
                    if (navigator.vibrate) navigator.vibrate(100);
                    console.log('✅ Escáner iniciado correctamente');
                }
            } catch (err: any) {
                console.error('❌ Error al iniciar escáner:', err);
                let errorMessage = 'Error al acceder a la cámara';

                if (String(err).includes('NotAllowedError')) {
                    errorMessage = 'Permiso de cámara denegado. Permite el acceso en la configuración del navegador.';
                } else if (String(err).includes('NotFound')) {
                    errorMessage = 'No se encontró cámara en el dispositivo.';
                } else {
                    errorMessage = String(err) || 'Error desconocido';
                }

                if (mounted) {
                    setError(errorMessage);
                    setIsLoading(false);
                    toast.error(errorMessage);
                    if (onError) onError(err);
                }
            }
        };

        const timer = setTimeout(() => {
            if (mounted) startScanner();
        }, 300);

        return () => {
            mounted = false;
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(e => console.error("Error stopping scanner:", e));
            }
        };
    }, [onScan, onError]);

    return (
        <div className={cn(
            "relative bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-green-500/50",
            fullscreen ? "fixed inset-0 z-50 rounded-none" : "w-full aspect-[3/4] min-h-[600px]",
            className
        )}>
            <div id="qr-reader-container" className="w-full h-full" />

            {/* Loading */}
            {isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white p-6">
                        <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse text-green-400" />
                        <p className="text-lg font-semibold">Iniciando cámara...</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 z-30">
                    <div className="text-center text-white max-w-md">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                        <p className="text-lg font-semibold mb-2">Error de Cámara</p>
                        <p className="text-sm text-gray-300">{error}</p>
                    </div>
                </div>
            )}

            {/* Botón cerrar */}
            {onClose && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 text-white bg-black/70 hover:bg-black/90 z-40 h-12 w-12 rounded-full"
                    onClick={onClose}
                >
                    <X className="w-6 h-6" />
                </Button>
            )}

            {/* Indicador */}
            {!error && !isLoading && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur px-6 py-3 rounded-full text-sm text-white flex items-center gap-3 border border-green-500/30">
                        <Camera className="w-5 h-5 text-green-400 animate-pulse" />
                        <span className="font-semibold">Enfoca el código QR</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
