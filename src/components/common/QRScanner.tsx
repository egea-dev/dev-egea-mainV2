import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Camera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsQR from 'jsqr';

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let mounted = true;

        const startCamera = async () => {
            try {
                console.log('🎥 Iniciando cámara con HTTPS...');
                setIsLoading(true);
                setError('');

                // Verificar que getUserMedia está disponible
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('getUserMedia no disponible. Asegúrate de estar usando HTTPS.');
                }

                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (!mounted || !videoRef.current) return;

                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', 'true');
                await videoRef.current.play();

                setIsLoading(false);
                if (navigator.vibrate) navigator.vibrate(100);

                console.log('✅ Cámara iniciada correctamente');
                requestAnimationFrame(tick);
            } catch (err: any) {
                console.error('❌ Error al iniciar cámara:', err);
                let errorMessage = 'Error al acceder a la cámara';

                if (err.name === 'NotAllowedError') {
                    errorMessage = 'Permiso de cámara denegado. Permite el acceso en la configuración del navegador.';
                } else if (err.name === 'NotFoundError') {
                    errorMessage = 'No se encontró cámara en el dispositivo.';
                } else if (err.name === 'NotReadableError') {
                    errorMessage = 'La cámara está siendo usada por otra aplicación.';
                } else {
                    errorMessage = err.message || 'Error desconocido';
                }

                setError(errorMessage);
                setIsLoading(false);
                toast.error(errorMessage);
                if (onError) onError(err);
            }
        };

        const tick = () => {
            if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const canvas = canvasRef.current;
                const video = videoRef.current;

                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'dontInvert',
                    });

                    if (code) {
                        console.log('✅ QR detectado:', code.data);
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                        onScan(code.data);
                        return; // Detener escaneo
                    }
                }
            }
            animationRef.current = requestAnimationFrame(tick);
        };

        startCamera();

        return () => {
            mounted = false;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [onScan, onError]);

    return (
        <div className={cn(
            "relative bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-green-500/50",
            fullscreen ? "fixed inset-0 z-50 rounded-none" : "w-full aspect-video",
            className
        )}>
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Loading */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center text-white p-6">
                        <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse text-green-400" />
                        <p className="text-lg font-semibold">Iniciando cámara...</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6">
                    <div className="text-center text-white max-w-md">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                        <p className="text-lg font-semibold mb-2">Error de Cámara</p>
                        <p className="text-sm text-gray-300">{error}</p>
                    </div>
                </div>
            )}

            {/* Overlay de escaneo */}
            {!error && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-64 h-64 md:w-80 md:h-80">
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-green-400 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-green-400 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-green-400 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-green-400 rounded-br-xl"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Botón cerrar */}
            {onClose && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 text-white bg-black/70 hover:bg-black/90 z-10 h-12 w-12 rounded-full"
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
