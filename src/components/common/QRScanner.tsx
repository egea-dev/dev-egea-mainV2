import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const startScanner = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    const cameraId = devices[0].id;
                    const scanner = new Html5Qrcode("reader");
                    scannerRef.current = scanner;

                    await scanner.start(
                        cameraId,
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 }
                        },
                        (decodedText) => {
                            onScan(decodedText);
                            // Opcional: Pausar tras lectura exitosa para evitar dobles lecturas inmediatas
                        },
                        (errorMessage) => {
                            if (onError) onError(errorMessage);
                        }
                    );
                    setIsScanning(true);
                } else {
                    toast.error("No se encontraron cámaras");
                }
            } catch (err) {
                console.error("Error iniciando cámara", err);
                toast.error("Error al acceder a la cámara");
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(err => console.error("Error stopping scanner", err));
            }
        };
    }, [onScan, onError]);

    return (
        <div className="relative w-full h-[300px] bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700">
            <div id="reader" className="w-full h-full"></div>
            {onClose && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-white hover:bg-black/50 z-10"
                    onClick={onClose}
                >
                    <X className="w-6 h-6" />
                </Button>
            )}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full text-xs text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 animate-pulse text-red-500" /> Escaneando...
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
