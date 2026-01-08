import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, X, Maximize2, Minimize2 } from 'lucide-react';
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
    const [isScanning, setIsScanning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(fullscreen);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const startScanner = async () => {
            try {
                // Solicitar permisos de cámara primero
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } } // Cámara trasera en móvil
                });
                stream.getTracks().forEach(track => track.stop()); // Detener stream temporal

                const devices = await Html5Qrcode.getCameras();
                console.log('Cámaras disponibles:', devices);

                if (devices && devices.length) {
                    // Preferir cámara trasera en móvil
                    let cameraId = devices[0].id;
                    const backCamera = devices.find(device =>
                        device.label.toLowerCase().includes('back') ||
                        device.label.toLowerCase().includes('rear') ||
                        device.label.toLowerCase().includes('trasera')
                    );
                    if (backCamera) {
                        cameraId = backCamera.id;
                        console.log('Usando cámara trasera:', backCamera.label);
                    }

                    const scanner = new Html5Qrcode("reader");
                    scannerRef.current = scanner;

                    // Configuración optimizada para móvil
                    const config = {
                        fps: 10,
                        qrbox: function (viewfinderWidth: number, viewfinderHeight: number) {
                            // Cuadro de escaneo responsive
                            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                            const qrboxSize = Math.floor(minEdge * 0.7);
                            return {
                                width: qrboxSize,
                                height: qrboxSize
                            };
                        },
                        aspectRatio: 1.0,
                        disableFlip: false
                    };

                    await scanner.start(
                        cameraId,
                        config,
                        (decodedText) => {
                            // Vibración táctil en móvil
                            if (navigator.vibrate) {
                                navigator.vibrate(200);
                            }
                            console.log('QR escaneado:', decodedText);
                            onScan(decodedText);
                        },
                        (errorMessage) => {
                            // Solo loguear errores, no mostrarlos (son muy frecuentes)
                            // if (onError) onError(errorMessage);
                        }
                    );
                    setIsScanning(true);
                    console.log('Escáner iniciado correctamente');
                } else {
                    toast.error("No se encontraron cámaras");
                }
            } catch (err: any) {
                console.error("Error iniciando cámara:", err);
                if (err.name === 'NotAllowedError') {
                    toast.error("Permiso de cámara denegado. Por favor, permite el acceso a la cámara.");
                } else if (err.name === 'NotFoundError') {
                    toast.error("No se encontró ninguna cámara en el dispositivo.");
                } else {
                    toast.error("Error al acceder a la cámara: " + err.message);
                }
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                    console.log('Escáner detenido');
                }).catch(err => console.error("Error stopping scanner", err));
            }
        };
    }, [onScan, onError]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className={cn(
            "relative bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700",
            isFullscreen
                ? "fixed inset-0 z-50 rounded-none"
                : "w-full h-[300px] md:h-[400px]",
            className
        )}>
            <div id="reader" className="w-full h-full"></div>

            {/* Botón cerrar */}
            {onClose && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-white hover:bg-black/50 z-10 h-10 w-10 md:h-8 md:w-8"
                    onClick={onClose}
                >
                    <X className="w-6 h-6 md:w-5 md:h-5" />
                </Button>
            )}

            {/* Indicador de escaneo */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full text-xs md:text-sm text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 animate-pulse text-red-500" />
                    Escaneando...
                </div>
            </div>

            {/* Botón fullscreen (solo visible en móvil cuando no está fullscreen) */}
            {!isFullscreen && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 text-white bg-black/50 hover:bg-black/70 z-10 h-10 w-10 md:hidden"
                    onClick={toggleFullscreen}
                >
                    <Maximize2 className="w-5 h-5" />
                </Button>
            )}

            {/* Botón minimizar (solo en fullscreen) */}
            {isFullscreen && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 text-white bg-black/50 hover:bg-black/70 z-10 h-12 w-12"
                    onClick={toggleFullscreen}
                >
                    <Minimize2 className="w-6 h-6" />
                </Button>
            )}
        </div>
    );
};

export default QRScanner;
