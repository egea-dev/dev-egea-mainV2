import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Importar librería jsQR para escaneo QR confiable
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

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                // Solicitar cámara trasera
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true');
                    await videoRef.current.play();

                    // Vibración de confirmación
                    if (navigator.vibrate) {
                        navigator.vibrate(100);
                    }

                    requestAnimationFrame(tick);
                }
            } catch (err: any) {
                console.error('Error al iniciar cámara:', err);
                let errorMessage = 'Error al acceder a la cámara';

                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    errorMessage = 'Permiso de cámara denegado. Ve a Configuración del navegador → Permisos → Cámara y permite el acceso.';
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    errorMessage = 'No se encontró cámara en el dispositivo.';
                } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    errorMessage = 'La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.';
                } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
                    errorMessage = 'No se pudo configurar la cámara con los parámetros solicitados.';
                }

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
                        console.log('QR detectado:', code.data);

                        // Vibración de éxito
                        if (navigator.vibrate) {
                            navigator.vibrate([200, 100, 200]);
                        }

                        onScan(code.data);

                        // Detener escaneo
                        if (animationRef.current) {
                            cancelAnimationFrame(animationRef.current);
                        }
                        if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                        }
                        return;
                    }
                }
            }
            animationRef.current = requestAnimationFrame(tick);
        };

        startCamera();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [onScan, onError]);

    return (
        <div className={cn(
            "relative bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-green-500/50",
            fullscreen
                ? "fixed inset-0 z-50 rounded-none"
                : "w-full aspect-[4/3]",
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

            {/* Overlay de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64 md:w-80 md:h-80">
                    {/* Esquinas del cuadro de escaneo */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>

                    {/* Línea de escaneo animada */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                    </div>
                </div>
            </div>

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

            {/* Indicador de escaneo */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <div className="bg-black/80 backdrop-blur px-6 py-3 rounded-full text-sm text-white flex items-center gap-3 border border-green-500/30">
                    <ScanLine className="w-5 h-5 text-green-400 animate-pulse" />
                    <span className="font-semibold">Enfoca el código QR</span>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
