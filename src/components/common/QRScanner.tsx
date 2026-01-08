import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ScanLine, AlertCircle, Keyboard } from 'lucide-react';
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
    onClose,
    fullscreen = false,
    className
}) => {
    const [manualInput, setManualInput] = useState('');

    const handleManualScan = () => {
        if (manualInput.trim()) {
            onScan(manualInput.trim());
            setManualInput('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleManualScan();
        }
    };

    return (
        <div className={cn(
            "relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden shadow-2xl border-2 border-blue-500/50",
            fullscreen
                ? "fixed inset-0 z-50 rounded-none"
                : "w-full",
            className
        )}>
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <ScanLine className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Escaneo Manual</h3>
                            <p className="text-sm text-gray-400">Ingresa el código del pedido</p>
                        </div>
                    </div>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10"
                            onClick={onClose}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    )}
                </div>

                {/* Info Alert */}
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-yellow-200 font-semibold mb-1">Cámara no disponible</p>
                        <p className="text-yellow-300/80">
                            La cámara requiere HTTPS. Por favor, ingresa el código manualmente o escanea con un lector externo.
                        </p>
                    </div>
                </div>

                {/* Manual Input */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Código del Pedido
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ej: PED-2024-001 o escanea con lector externo"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                    autoFocus
                                />
                            </div>
                            <Button
                                onClick={handleManualScan}
                                disabled={!manualInput.trim()}
                                className="px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Buscar
                            </Button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h4 className="text-sm font-semibold text-white mb-2">💡 Instrucciones:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>• Escribe o pega el número de pedido</li>
                            <li>• Usa un lector QR externo y pega el resultado aquí</li>
                            <li>• Presiona Enter o click en "Buscar"</li>
                        </ul>
                    </div>

                    {/* HTTPS Info */}
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        <h4 className="text-sm font-semibold text-blue-300 mb-2">ℹ️ Para habilitar la cámara:</h4>
                        <p className="text-xs text-blue-200/80">
                            La API de cámara del navegador requiere conexión HTTPS.
                            Contacta con el administrador para configurar un certificado SSL.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
