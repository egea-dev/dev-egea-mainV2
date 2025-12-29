import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useWorkOrders, useUpdateWorkOrderStatus, WorkOrderStatus } from '@/hooks/use-work-orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    QrCode,
    Settings,
    CheckCircle2,
    Play,
    Pause,
    AlertTriangle,
    ArrowRight,
    Package,
    History,
    Timer
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    'PENDIENTE': { label: 'Pendiente', color: 'bg-slate-500', icon: Timer },
    'CORTE': { label: 'Corte', color: 'bg-blue-600', icon: Play },
    'CONFECCION': { label: 'Confección', color: 'bg-purple-600', icon: Settings },
    'TAPICERIA': { label: 'Tapicería', color: 'bg-indigo-600', icon: Settings },
    'CONTROL_CALIDAD': { label: 'Calidad', color: 'bg-amber-500', icon: AlertTriangle },
    'LISTO_ENVIO': { label: 'Listo', color: 'bg-emerald-600', icon: CheckCircle2 },
};

const KioskPage: React.FC = () => {
    const [scannedId, setScannedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'scanner' | 'list'>('scanner');
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    const { data: workOrders, isLoading } = useWorkOrders();
    const updateStatus = useUpdateWorkOrderStatus();

    const selectedOrder = workOrders?.find(o => o.id === scannedId || o.order_number === scannedId);

    useEffect(() => {
        if (activeTab === 'scanner' && !scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
            );
            scannerRef.current.render(onScanSuccess, onScanFailure);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Error clearing scanner", err));
                scannerRef.current = null;
            }
        };
    }, [activeTab]);

    function onScanSuccess(decodedText: string) {
        setScannedId(decodedText);
        toast.success(`Orden detectada: ${decodedText}`);
        // Opcional: Sonido de éxito
    }

    function onScanFailure(error: any) {
        // console.warn(`Code scan error = ${error}`);
    }

    const handleStatusChange = async (newStatus: WorkOrderStatus) => {
        if (!selectedOrder) return;

        try {
            await updateStatus.mutateAsync({
                id: selectedOrder.id,
                status: newStatus,
                notes: `Actualización desde Kiosco Industrial`
            });
            // Limpiar después de actualizar para volver al scanner
            if (newStatus === 'LISTO_ENVIO') {
                setScannedId(null);
                toast.info("Orden finalizada");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1115] text-white p-4 font-sans selection:bg-blue-500/30">
            {/* Header Standard Industrial */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 px-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <QrCode className="h-8 w-8" />
                        Punto de Control Kiosco
                    </h1>
                    <p className="text-slate-400 mt-1">Sistema de Control de Planta v3.0</p>
                </div>
                <div className="flex gap-4">
                    <Button
                        variant={activeTab === 'scanner' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('scanner')}
                        className={`rounded-xl px-6 py-6 transition-all active:scale-95 ${activeTab === 'scanner' ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <QrCode className="mr-2 h-6 w-6" /> ESCÁNER
                    </Button>
                    <Button
                        variant={activeTab === 'list' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('list')}
                        className={`rounded-xl px-6 py-6 transition-all active:scale-95 ${activeTab === 'list' ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <History className="mr-2 h-6 w-6" /> COLA DE TRABAJO
                    </Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                {activeTab === 'scanner' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Sección Escáner */}
                        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden shadow-xl h-full">
                            <CardHeader className="border-b border-slate-800 bg-slate-900/20 py-4">
                                <CardTitle className="text-slate-400 text-xs font-bold tracking-[0.2em] uppercase flex items-center">
                                    <QrCode className="w-4 h-4 mr-2 text-white" /> Cámara de Reconocimiento
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 flex items-center justify-center min-h-[300px] bg-black/40">
                                <div id="reader" className="w-full h-full"></div>
                            </CardContent>
                        </Card>

                        {/* Sección Detalles de Orden */}
                        <div className="space-y-6">
                            {selectedOrder ? (
                                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
                                    <CardContent className="p-8">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <Badge className="bg-slate-800 text-slate-300 border-slate-700 mb-2 px-3 py-1 text-xs tracking-widest font-bold uppercase">
                                                    ORDEN ACTIVA
                                                </Badge>
                                                <h2 className="text-5xl font-bold tracking-tight text-white uppercase">{selectedOrder.order_number}</h2>
                                            </div>
                                            <div className="text-right">
                                                <Badge className={`${STATUS_CONFIG[selectedOrder.status]?.color || 'bg-slate-500'} text-white px-4 py-2 rounded-lg text-lg font-black tracking-tight`}>
                                                    {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">Prioridad</p>
                                                <p className={`text-xl font-bold ${selectedOrder.priority > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                                                    {selectedOrder.priority === 2 ? 'URGENTE' : selectedOrder.priority === 1 ? 'ALTA' : 'NORMAL'}
                                                </p>
                                            </div>
                                            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">Fecha Inicio</p>
                                                <p className="text-xl font-bold text-slate-300">
                                                    {selectedOrder.start_date ? new Date(selectedOrder.start_date).toLocaleDateString() : '--/--/--'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Dashboard de Acciones Industriales */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                                                const Icon = config.icon;
                                                const isCurrent = selectedOrder.status === statusKey;
                                                const isDisabled = updateStatus.isPending;

                                                return (
                                                    <Button
                                                        key={statusKey}
                                                        disabled={isCurrent || isDisabled}
                                                        onClick={() => handleStatusChange(statusKey as WorkOrderStatus)}
                                                        className={`h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${isCurrent
                                                            ? 'bg-blue-600/20 border-2 border-blue-500 text-blue-400'
                                                            : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400'
                                                            }`}
                                                    >
                                                        <Icon className={`w-8 h-8 ${isCurrent ? 'text-blue-400' : 'text-slate-500'}`} />
                                                        <span className="text-[10px] font-black tracking-widest uppercase">{config.label}</span>
                                                    </Button>
                                                )
                                            })}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            onClick={() => setScannedId(null)}
                                            className="w-full mt-6 text-slate-500 hover:text-white"
                                        >
                                            Cerrar y Escanear de nuevo
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center bg-slate-900/20">
                                    <div className="bg-slate-800/30 p-8 rounded-full mb-6 ring-1 ring-slate-700">
                                        <Package className="w-16 h-16 text-slate-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-400 mb-2">Esperando Orden</h3>
                                    <p className="text-slate-600 max-w-sm">Use el escáner de la izquierda para cargar los detalles técnicos de la orden de producción.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'list' && (
                    <div className="grid grid-cols-1 gap-4">
                        {workOrders?.map((order) => (
                            <Card
                                key={order.id}
                                className="bg-slate-900/40 border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group rounded-2xl overflow-hidden"
                                onClick={() => { setScannedId(order.id); setActiveTab('scanner'); }}
                            >
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-slate-800/50 p-4 rounded-xl group-hover:bg-blue-600/20 transition-colors">
                                            <Package className="w-8 h-8 text-slate-500 group-hover:text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black uppercase">{order.order_number}</h4>
                                            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">
                                                {order.status} • Actualizado: {new Date(order.updated_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge className={`${STATUS_CONFIG[order.status]?.color || 'bg-slate-500'} px-3 py-1 rounded text-xs font-bold`}>
                                            {STATUS_CONFIG[order.status]?.label || order.status}
                                        </Badge>
                                        <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {(!workOrders || workOrders.length === 0) && (
                            <div className="text-center p-20 text-slate-600">No hay órdenes en cola actualmente</div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer Industrial Stats */}
            <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-slate-800 p-4 px-8 flex justify-between items-center text-[10px] font-bold tracking-[0.3em] uppercase text-slate-500">
                <div className="flex gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        CONEXIÓN ESTABLE
                    </div>
                    <div>TERMINAL: KIOSK-INDUSTRIAL-01</div>
                </div>
                <div className="flex gap-6">
                    <span>{workOrders?.length || 0} ÓRDENES TOTALES</span>
                    <span className="text-blue-500">SECTOR CONFECCIÓN ACTIVO</span>
                </div>
            </footer>
        </div>
    );
};

export default KioskPage;
