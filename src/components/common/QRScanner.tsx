import React, { useEffect, useRef, useState } from 'react';
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
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let mounted = true;

        const startCamera = async () => {
            try {
                console.log('🎥 Iniciando cámara...');
                setIsLoading(true);
                setError('');

                // Configuración simple para máxima compatibilidad
                const constraints = {
                    video: {
                        facingMode: 'environment', // Cámara trasera
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                };

                console.log('📱 Solicitando permisos de cámara...');
                stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (!mounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                console.log('✅ Permisos concedidos, configurando video...');

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true');
                    videoRef.current.setAttribute('autoplay', 'true');
                    videoRef.current.setAttribute('muted', 'true');

                    // Esperar a que el video esté listo
                    videoRef.current.onloadedmetadata = () => {
                        console.log('📹 Video listo, reproduciendo...');
                        videoRef.current?.play().then(() => {
                            console.log('✅ Cámara funcionando correctamente');
                            setIsLoading(false);
                            if (navigator.vibrate) {
                                navigator.vibrate(100);
                            }
                        }).catch(err => {
                            console.error('❌ Error al reproducir video:', err);
                            setError('Error al reproducir video: ' + err.message);
                            setIsLoading(false);
                        });
                    };

                    videoRef.current.onerror = (err) => {
                        console.error('❌ Error en elemento video:', err);
                        setError('Error en elemento video');
                        setIsLoading(false);
                    };
                }
            } catch (err: any) {
                console.error('❌ Error al iniciar cámara:', err);
                let errorMessage = 'Error desconocido';

                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    errorMessage = 'Permiso de cámara denegado. Ve a Configuración del navegador y permite el acceso a la cámara.';
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    errorMessage = 'No se encontró cámara en el dispositivo.';
                } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    errorMessage = 'La cámara está siendo usada por otra aplicación.';
                } else if (err.name === 'OverconstrainedError') {
                    errorMessage = 'No se pudo configurar la cámara.';
                } else {
                    errorMessage = err.message || 'Error al acceder a la cámara';
                }

                setError(errorMessage);
                setIsLoading(false);
                toast.error(errorMessage);
                if (onError) onError(err);
            }
        };

        startCamera();

        return () => {
            mounted = false;
            if (stream) {
                console.log('🛑 Deteniendo cámara...');
                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log('Track detenido:', track.label);
                });
            }
        };
    }, [onError]);

    return (
        <div className={cn(
            "relative bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-green-500/50",
            fullscreen
                ? "fixed inset-0 z-50 rounded-none"
                : "w-full aspect-video",
            className
        )}>
            {/* Video */}
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
            />

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center text-white p-6">
                        <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse text-green-400" />
                        <p className="text-lg font-semibold">Iniciando cámara...</p>
                        <p className="text-sm text-gray-400 mt-2">Por favor, permite el acceso</p>
                    </div>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6">
                    <div className="text-center text-white max-w-md">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                        <p className="text-lg font-semibold mb-2">Error de Cámara</p>
                        <p className="text-sm text-gray-300">{error}</p>
                        <Button
                            onClick={() => window.location.reload()}
                            className="mt-6 bg-green-600 hover:bg-green-700"
                        >
                            Reintentar
                        </Button>
                    </div>
                </div>
            )}

            {/* Overlay de escaneo (solo si no hay error) */}
            {!error && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-64 h-64 md:w-80 md:h-80">
                        {/* Esquinas del cuadro de escaneo */}
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-green-400 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-green-400 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-green-400 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-green-400 rounded-br-xl"></div>

                        {/* Línea de escaneo animada */}
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

            {/* Indicador de escaneo */}
            {!error && !isLoading && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur px-6 py-3 rounded-full text-sm text-white flex items-center gap-3 border border-green-500/30">
                        <Camera className="w-5 h-5 text-green-400 animate-pulse" />
                        <span className="font-semibold">Enfoca el código QR</span>
                    </div>
                </div>
            )}

            {/* Instrucciones adicionales */}
            {!error && !isLoading && (
                <div className="absolute top-16 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <div className="bg-yellow-500/90 backdrop-blur px-4 py-2 rounded-lg text-xs text-black font-semibold">
                        ⚠️ Usa el input manual debajo si la cámara no funciona
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
