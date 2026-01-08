import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, ScanLine } from 'lucide-react';
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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const startCamera = async () => {
        try {
            // Usar API nativa del navegador para cámara
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' }, // Cámara trasera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play();
                setStream(mediaStream);
                setIsScanning(true);

                // Vibración de confirmación
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }

                // Intentar usar BarcodeDetector API si está disponible
                if ('BarcodeDetector' in window) {
                    startBarcodeDetection(mediaStream);
                } else {
                    toast.info('Escáner QR listo. Enfoca el código QR en la cámara.');
                }
            }
        } catch (err: any) {
            console.error('Error al iniciar cámara:', err);
            if (err.name === 'NotAllowedError') {
                toast.error('Permiso de cámara denegado. Permite el acceso en la configuración del navegador.');
            } else if (err.name === 'NotFoundError') {
                toast.error('No se encontró cámara en el dispositivo.');
            } else {
                toast.error('Error al acceder a la cámara: ' + err.message);
            }
            if (onError) onError(err);
        }
    };

    const startBarcodeDetection = async (mediaStream: MediaStream) => {
        try {
            // @ts-ignore - BarcodeDetector puede no estar en todos los navegadores
            const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });

            scanIntervalRef.current = setInterval(async () => {
                if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                    const canvas = canvasRef.current;
                    const video = videoRef.current;

                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        try {
                            const barcodes = await barcodeDetector.detect(canvas);
                            if (barcodes.length > 0) {
                                const qrCode = barcodes[0].rawValue;
                                console.log('QR detectado:', qrCode);

                                // Vibración de éxito
                                if (navigator.vibrate) {
                                    navigator.vibrate([200, 100, 200]);
                                }

                                onScan(qrCode);
                                stopCamera();
                            }
                        } catch (e) {
                            // Silenciar errores de detección
                        }
                    }
                }
            }, 100); // Escanear cada 100ms
        } catch (err) {
            console.error('BarcodeDetector no disponible:', err);
            toast.warning('Escáner QR en modo manual. Usa el input de texto para ingresar el código.');
        }
    };

    const stopCamera = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setIsScanning(false);
    };

    React.useEffect(() => {
        startCamera();

        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className={cn(
            "relative bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700",
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
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64 md:w-80 md:h-80">
                    {/* Esquinas del cuadro de escaneo */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-green-500"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-green-500"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-green-500"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-green-500"></div>

                    {/* Línea de escaneo animada */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ScanLine className="w-full h-1 text-green-500 animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Botón cerrar */}
            {onClose && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-white hover:bg-black/50 z-10 h-12 w-12"
                    onClick={() => {
                        stopCamera();
                        onClose();
                    }}
                >
                    <X className="w-6 h-6" />
                </Button>
            )}

            {/* Indicador de escaneo */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <div className="bg-black/70 backdrop-blur px-6 py-3 rounded-full text-sm text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 animate-pulse text-green-500" />
                    <span className="font-medium">Enfoca el código QR</span>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
