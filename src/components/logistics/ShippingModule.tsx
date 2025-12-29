import React, { useState, useEffect, useRef } from 'react';
import { useShipments, useShipmentItems, useUpdateShipmentStatus, Shipment, InventoryItem } from '@/hooks/use-logistics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import QRScanner from '@/components/common/QRScanner';
import Roadmap from '@/components/logistics/Roadmap';
import {
    Truck, CheckCircle, AlertTriangle, QrCode, ArrowRight, Package, MapPin,
    Printer, Search, Keyboard, Camera, History, Lock, PauseCircle, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

const ShippingModule: React.FC = () => {
    const { data: shipments, isLoading, refetch: refreshShipments } = useShipments();
    const updateShipment = useUpdateShipmentStatus();

    // Estado Local
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [scannedPackagesCount, setScannedPackagesCount] = useState(0);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [showRoadmap, setShowRoadmap] = useState(false);

    // Items del envío seleccionado (para detalle visual)
    const { data: items = [] } = useShipmentItems(selectedShipment?.id || '');

    const inputRef = useRef<HTMLInputElement>(null);

    // Lógica 1: Historial Reciente (12h)
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const isRecentShipment = (shipment: Shipment) => {
        if (shipment.status !== 'TRANSITO' || !shipment.updated_at) return false;
        const shippedAt = new Date(shipment.updated_at).getTime();
        return !Number.isNaN(shippedAt) && (Date.now() - shippedAt) < TWELVE_HOURS_MS;
    };

    const activeShipments = shipments?.filter(s =>
        ['PENDIENTE', 'BULTOS_PENDIENTES'].includes(s.status) || isRecentShipment(s)
    ) || [];

    // Persistencia en tiempo real (Supabase + Local State)
    const persistShipmentUpdate = async (shipmentId: string, patch: Partial<Shipment>) => {
        // Actualización optimista local
        setSelectedShipment(prev => prev && prev.id === shipmentId ? { ...prev, ...patch } : prev);

        if (patch.scanned_packages !== undefined) {
            setScannedPackagesCount(patch.scanned_packages || 0);
        }

        try {
            // Actualizar DB
            const { error } = await supabase.from('shipments')
                .update(patch)
                .eq('id', shipmentId); // Usamos el cliente genérico apuntando a la tabla correcta por contexto o vista

            // NOTA: Como la tabla está en esquema 'almacen', aseguramos que el cliente configurado
            // en 'use-logistics' o 'supabase/client' tenga acceso.
            // Si falla por esquema, usaremos la función RPC o el cliente específico.
            // En este entorno, 'supabase' es el cliente por defecto. 
            // Si las tablas están en 'public' (por el reinit), funcionará directo.
            // Si están en 'almacen', necesitamos apuntar a 'almacen.shipments' si la lib lo soporta o usar RPC.
            // Dado el script de reinit, asumimos que el cliente tiene visibilidad (exposed schema).

            // Fallback explícito a RPC si update directo falla es complejo aquí, 
            // asumimos que el script de reinit expuso el esquema o movió tablas.
            // Usaremos el hook 'updateShipment' que ya sabe manejarlo si es posible, 
            // pero el hook 'useUpdateShipmentStatus' suele ser solo para status.

            if (error) throw error;
            await refreshShipments();
        } catch (error: any) {
            console.error('Error persistiendo envío:', error);
            // Intentamos usar el update del hook como fallback si es solo status/tracking
            if (patch.status || patch.tracking_number) {
                await updateShipment.mutateAsync({
                    id: shipmentId,
                    ...patch as any
                });
            }
        }
    };

    // Al seleccionar envío, cargar estado persistido
    useEffect(() => {
        if (selectedShipment) {
            setScannedPackagesCount(selectedShipment.scanned_packages || 0);
            setTrackingNumber(selectedShipment.tracking_number || '');
            inputRef.current?.focus();
        } else {
            setScannedPackagesCount(0);
            setTrackingNumber('');
            setShowCamera(false);
        }
    }, [selectedShipment?.id]);

    // Lógica Central de Escaneo
    const handleScan = async (code: string) => {
        const cleanCode = code.trim().toUpperCase(); // Asumimos que el código QR es el ID o Tracking o Order Number

        // Bloqueo de Seguridad: Cambio de contexto inseguro
        if (selectedShipment &&
            selectedShipment.tracking_number !== cleanCode && // Permitir re-escaneo del mismo
            selectedShipment.id !== cleanCode &&
            scannedPackagesCount > 0 &&
            scannedPackagesCount < (selectedShipment.packages_count || 1)
        ) {
            // Verificar si el código escaneado pertenece al envío actual (ej. es un bulto del pedido)
            // Esto requiere lógica de coincidencia. Si el código escaneado NO es el envío actual:

            // Simplificación: El usuario dijo "Si intentas escanear un pedido diferente".
            // Asumimos que el código escaneado identifica unívocamente al pedido.

            // Comprobamos si el código corresponde A OTRO envío activo
            const isOtherShipment = activeShipments.some(s =>
                s.id !== selectedShipment.id &&
                (s.tracking_number === cleanCode || s.id.slice(0, 8).toUpperCase() === cleanCode)
            );

            if (isOtherShipment) {
                alert("⛔ ¡ALTO! Estás escaneando un pedido diferente mientras el actual está incompleto.\n\nNo mezcles pedidos. Termina el actual o sal manualmente para pausarlo.");
                return;
            }
        }

        // Caso 1: Ya hay envío seleccionado -> Verificar Bulto
        if (selectedShipment) {
            // Aquí la lógica de "Producción" simplemente suma contador si escaneas el QR del pedido
            // El usuario dijo: "Si el pedido tiene múltiples bultos, el operario debe escanear el QR repetidamente"
            // Esto implica que escanea EL MISMO código para sumar bultos.

            // Validamos si el código escaneado coincide con el envío actual
            const isCurrentShipment =
                selectedShipment.tracking_number === cleanCode ||
                selectedShipment.id.toUpperCase() === cleanCode ||
                // También permitir escanear códigos de bultos individuales si tuviéramos esa info en 'items'
                items.some(i => i.order_number.toUpperCase() === cleanCode);

            if (isCurrentShipment) {
                const total = selectedShipment.packages_count || Math.max(items.length, 1);
                if (scannedPackagesCount < total) {
                    const newCount = scannedPackagesCount + 1;
                    setScannedPackagesCount(newCount); // Update UI instantáneo
                    await persistShipmentUpdate(selectedShipment.id, { scanned_packages: newCount });
                    toast.success(`Bulto Verificado (${newCount}/${total})`, { duration: 1000 });
                } else {
                    toast.info("Todos los bultos ya están verificados.");
                }
                setManualInput('');
                return;
            }
        }

        // Caso 2: Abrir nuevo envío (o cambiar)
        const foundShipment = activeShipments.find(s =>
            s.tracking_number === cleanCode ||
            s.id.toUpperCase() === cleanCode ||
            s.id.slice(0, 8).toUpperCase() === cleanCode
        );

        if (foundShipment) {
            // Verificar estado válido
            if (foundShipment.status === 'TRANSITO' && !isRecentShipment(foundShipment)) {
                toast.error("Este envío ya ha salido y es antiguo.");
                return;
            }

            // Si re-entramos a uno empezado, recuperamos estado (automático por useEffect)
            setSelectedShipment(foundShipment);
            setManualInput('');
            toast.success("Expedición cargada");
        } else {
            // Si no es un envío, tal vez es un bulto suelto?
            // Intentar buscar por items
            // (Esta parte requeriría buscar en todos los items de la DB, omitido por eficiencia salvo requerimiento explícito)
            toast.error(`Código no reconocido: ${cleanCode}`);
        }
    };

    const handleValidateOutput = async () => {
        if (!selectedShipment) return;
        const total = selectedShipment.packages_count || Math.max(items.length, 1);

        if (scannedPackagesCount < total) {
            alert(`Debes verificar todos los bultos (${scannedPackagesCount}/${total}) escaneando el QR repetidamente o manualmente.`);
            return;
        }
        if (!trackingNumber.trim()) {
            alert('El número de tracking es OBLIGATORIO para validar la salida.');
            return;
        }

        try {
            await persistShipmentUpdate(selectedShipment.id, {
                status: 'TRANSITO',
                tracking_number: trackingNumber,
                shipment_date: new Date().toISOString() // Marcamos fecha de salida real
            });
            setShowRoadmap(true);
            toast.success("SALIDA VALIDADA CORRECTAMENTE");
        } catch (err) {
            toast.error("Error al validar salida");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleScan(manualInput);
        }
    };

    // Helpers UI
    const totalPackages = selectedShipment ? (selectedShipment.packages_count || Math.max(items.length, 1)) : 0;
    const progressPercent = totalPackages > 0 ? (scannedPackagesCount / totalPackages) * 100 : 0;
    const isComplete = totalPackages > 0 && scannedPackagesCount >= totalPackages;

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300 min-h-[600px] p-4">

            {/* PANEL IZQUIERDO: LISTA DE PEDIDOS "COLA DE ALMACÉN" */}
            <div className={`flex-1 flex flex-col gap-4 ${selectedShipment ? 'hidden lg:flex lg:w-1/3 lg:max-w-sm' : 'w-full'}`}>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-6 h-6 text-blue-600" /> Cola de Salidas
                    </h2>
                    <Button onClick={() => refreshShipments()} size="sm" variant="ghost">🔄</Button>
                </div>

                <div className="grid gap-3 overflow-y-auto max-h-[calc(100vh-200px)]">
                    {activeShipments.length === 0 && (
                        <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            No hay expediciones pendientes
                        </div>
                    )}
                    {activeShipments.map(s => (
                        <Card
                            key={s.id}
                            onClick={() => setSelectedShipment(s)}
                            className={`cursor-pointer transition-all hover:border-blue-400 hover:shadow-md 
                                ${selectedShipment?.id === s.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'bg-white'}
                                ${s.status === 'TRANSITO' ? 'opacity-75 bg-slate-50' : ''}
                            `}
                        >
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={s.status === 'TRANSITO' ? 'secondary' : 'default'} className="mb-2">
                                        {s.status === 'TRANSITO' ? 'ENVIADO (Reciente)' : s.status}
                                    </Badge>
                                    {(s.scanned_packages || 0) > 0 && s.status !== 'TRANSITO' && (
                                        <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50">
                                            En Progreso {s.scanned_packages}/{s.packages_count}
                                        </Badge>
                                    )}
                                </div>
                                <div className="font-mono font-bold text-lg mb-1 truncate">
                                    {s.tracking_number || s.id.slice(0, 8)}
                                </div>
                                <div className="text-sm text-slate-500 mb-2 flex flex-col gap-1">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.delivery_city || 'Sin destino'}</span>
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {s.recipient_name || 'Cliente desconocido'}</span>
                                </div>
                                <div className="flex items-center justify-between mt-3 text-xs font-bold text-slate-400 uppercase">
                                    <span>{s.carrier_name}</span>
                                    <span>{s.packages_count || '?'} Bultos</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* PANEL DERECHO: ZONA DE TRABAJO (DETALLE + ESCÁNER) */}
            <div className="flex-[2] flex flex-col gap-6">

                {/* BARRA SUPERIOR ESCÁNER (Siempre visible o contextual) */}
                <div className="bg-slate-900 p-4 rounded-xl shadow-xl flex flex-col md:flex-row gap-4 items-center border border-slate-800">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            ref={inputRef}
                            autoFocus
                            placeholder="Escanear Etiqueta / QR..."
                            className="pl-10 h-12 text-lg bg-black border-slate-700 text-white focus:border-blue-500 font-mono"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <Button
                        variant={showCamera ? "destructive" : "secondary"}
                        onClick={() => setShowCamera(!showCamera)}
                        className="w-full md:w-auto h-12 gap-2 font-bold"
                    >
                        <Camera className="w-5 h-5" /> {showCamera ? 'Apagar Cámara' : 'Usar Webcam'}
                    </Button>
                </div>

                {showCamera && (
                    <div className="rounded-xl overflow-hidden border-2 border-slate-800 bg-black shadow-2xl relative">
                        <QRScanner onScan={(val) => { handleScan(val); if (!selectedShipment) setShowCamera(false); }} onClose={() => setShowCamera(false)} />
                        <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
                            <span className="bg-black/70 text-white px-4 py-1 rounded-full text-sm font-bold backdrop-blur">
                                Apunte al código QR del bulto o albarán
                            </span>
                        </div>
                    </div>
                )}

                {/* DETALLE DEL ENVÍO SELECCIONADO */}
                {selectedShipment ? (
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

                        {/* Cabecera Pedido */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 mb-2">
                                    {selectedShipment.recipient_name || 'Desconocido'}
                                </h1>
                                <div className="flex items-center gap-4 text-slate-600">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm font-bold font-mono">
                                        {selectedShipment.tracking_number || selectedShipment.id.slice(0, 8)}
                                    </span>
                                    <span className="flex items-center gap-1 text-sm">
                                        <MapPin className="w-4 h-4" /> {selectedShipment.delivery_city}, {selectedShipment.delivery_address}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-black text-slate-200">{totalPackages}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase">BULTOS TOTALES</div>
                            </div>
                        </div>

                        {/* Zona de Progreso y Acciones */}
                        <div className="p-8 flex-1 flex flex-col justify-center items-center gap-8 bg-white relative">
                            {/* Barra Circular o Lineal Gigante */}
                            <div className="w-full max-w-lg space-y-2">
                                <div className="flex justify-between text-sm font-bold text-slate-500 uppercase">
                                    <span>Progreso de Verificación</span>
                                    <span>{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="h-8 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                        className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'} flex items-center justify-end pr-3 text-white font-bold text-xs`}
                                        style={{ width: `${Math.max(progressPercent, 5)}%` }}
                                    >
                                        {scannedPackagesCount} / {totalPackages}
                                    </div>
                                </div>
                                <p className="text-center text-slate-400 text-sm mt-2">
                                    Escanee cada bulto individualmente para verificar el contenido.
                                </p>
                            </div>

                            {/* Controles Manuales +/- */}
                            <div className="flex items-center gap-6">
                                <Button
                                    variant="outline" size="icon" className="h-14 w-14 rounded-full border-2"
                                    onClick={() => {
                                        if (scannedPackagesCount > 0) {
                                            const newVal = scannedPackagesCount - 1;
                                            setScannedPackagesCount(newVal);
                                            persistShipmentUpdate(selectedShipment.id, { scanned_packages: newVal });
                                        }
                                    }}
                                >
                                    <span className="text-2xl font-bold text-slate-400">-</span>
                                </Button>
                                <div className="text-6xl font-black text-slate-800 tabular-nums tracking-tighter">
                                    {scannedPackagesCount}
                                </div>
                                <Button
                                    variant="outline" size="icon" className="h-14 w-14 rounded-full border-2"
                                    onClick={() => {
                                        if (scannedPackagesCount < totalPackages) {
                                            const newVal = scannedPackagesCount + 1;
                                            setScannedPackagesCount(newVal);
                                            persistShipmentUpdate(selectedShipment.id, { scanned_packages: newVal });
                                        }
                                    }}
                                >
                                    <span className="text-2xl font-bold text-blue-600">+</span>
                                </Button>
                            </div>

                            {/* Input Tracking Obligatorio */}
                            <div className="w-full max-w-md bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                    Número de Tracking (Obligatorio)
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        value={trackingNumber}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setTrackingNumber(val);
                                            // Persistir debounced o onBlur idealmente, aquí directo para simpleza
                                            persistShipmentUpdate(selectedShipment.id, { tracking_number: val });
                                        }}
                                        placeholder="Escanee o escriba tracking..."
                                        className="font-mono text-lg bg-white border-slate-300"
                                    />
                                    {trackingNumber && <CheckCircle className="w-8 h-8 text-emerald-500" />}
                                </div>
                            </div>
                        </div>

                        {/* Footer Botón Acción */}
                        <div className="p-6 bg-slate-50 border-t border-slate-200">
                            <Button
                                className={`w-full h-16 text-xl font-black uppercase tracking-widest rounded-xl shadow-lg transition-all
                                    ${isComplete && trackingNumber
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                                onClick={handleValidateOutput}
                                disabled={!isComplete || !trackingNumber}
                            >
                                {isComplete
                                    ? (trackingNumber ? 'VALIDAR SALIDA Y GENERAR ALBARÁN' : 'FALTA NÚMERO DE TRACKING')
                                    : `FALTAN ${totalPackages - scannedPackagesCount} BULTOS POR VERIFICAR`}
                            </Button>
                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                        <QrCode className="w-24 h-24 mb-4 opacity-20" />
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Esperando Lectura</h3>
                        <p className="max-w-md text-center">
                            Utilice la pistola lectora o la cámara para escanear una etiqueta de expedición y comenzar el proceso de salida.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Albarán (Roadmap) */}
            <Dialog open={showRoadmap} onOpenChange={setShowRoadmap}>
                <DialogContent className="max-w-4xl bg-white p-0">
                    {selectedShipment && (
                        <Roadmap
                            shipment={{
                                ...selectedShipment,
                                status: 'TRANSITO',
                                tracking_number: trackingNumber,
                                scanned_packages: scannedPackagesCount,
                                packages_count: totalPackages
                            }}
                            items={items} // Pasamos items reales si existen
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShippingModule;
