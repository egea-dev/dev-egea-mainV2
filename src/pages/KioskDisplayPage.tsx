import React, { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useWorkOrders, useUpdateWorkOrderStatus } from "@/hooks/use-work-orders";
import { WorkOrderStatus } from "@/types/production";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    QrCode,
    CheckCircle2,
    Play,
    Pause,
    AlertTriangle,
    ArrowRight,
    Package,
    History,
    Timer,
} from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    PENDIENTE: { label: "Pendiente", color: "bg-slate-500/10 text-slate-400 border-slate-500/30", icon: Timer },
    CORTE: { label: "Corte", color: "bg-sky-500/10 text-sky-400 border-sky-500/30", icon: Play },
    CONFECCION: { label: "Confeccion", color: "bg-violet-500/10 text-violet-400 border-violet-500/30", icon: Pause },
    TAPICERIA: { label: "Tapiceria", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", icon: Pause },
    CONTROL_CALIDAD: { label: "Calidad", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: AlertTriangle },
    LISTO_ENVIO: { label: "Listo", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

const KioskDisplayPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token"); // Optional: use token to config defaults

    const [scannedId, setScannedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"scanner" | "list">("scanner");
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    const { data: workOrders, isLoading } = useWorkOrders();
    const updateStatus = useUpdateWorkOrderStatus();

    const selectedOrder = workOrders?.find((o) => o.id === scannedId || o.order_number === scannedId);

    useEffect(() => {
        if (activeTab === "scanner" && !scannerRef.current) {
            // In Kiosk mode, we might want to auto-mount, but Html5QrcodeScanner handles it well
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );
            scannerRef.current.render(onScanSuccess, onScanFailure);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((err) => console.error("Error clearing scanner", err));
                scannerRef.current = null;
            }
        };
    }, [activeTab]);

    function onScanSuccess(decodedText: string) {
        setScannedId(decodedText);
        toast.success(`Orden detectada: ${decodedText}`);
    }

    function onScanFailure(_error: any) { }

    const handleStatusChange = async (newStatus: WorkOrderStatus) => {
        if (!selectedOrder) return;

        try {
            await updateStatus.mutateAsync({
                workOrderId: selectedOrder.id,
                status: newStatus,
                notes: "Actualizacion desde Kiosco Publico",
            });
            if (newStatus === "LISTO_ENVIO") {
                setScannedId(null);
                toast.info("Orden finalizada");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-[#0D0F11] text-white p-4">
            {/* Simplified Header for Kiosk Display */}
            <header className="flex justify-between items-center mb-6 pl-2">
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-widest text-[#B5B8BA]">
                        Modo Kiosco
                    </h1>
                    {token && <span className="text-xs text-emerald-500 font-mono">Terminal ID: {token.slice(0, 8)}</span>}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === "scanner" ? "default" : "outline"}
                        onClick={() => setActiveTab("scanner")}
                        className={activeTab === "scanner" ? "bg-white text-black" : "border-white/20 text-white"}
                    >
                        <QrCode className="mr-2 h-4 w-4" /> Escaner
                    </Button>
                    <Button
                        variant={activeTab === "list" ? "default" : "outline"}
                        onClick={() => setActiveTab("list")}
                        className={activeTab === "list" ? "bg-white text-black" : "border-white/20 text-white"}
                    >
                        <History className="mr-2 h-4 w-4" /> Cola
                    </Button>
                </div>
            </header>

            {activeTab === "scanner" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-100px)]">
                    <Card className="border-white/10 bg-[#1A1D1F] overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-white/5 bg-black/20 py-4">
                            <CardTitle className="text-xs font-bold tracking-[0.2em] uppercase flex items-center text-white">
                                <QrCode className="w-4 h-4 mr-2 text-emerald-500" /> Camara de reconocimiento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 flex items-center justify-center bg-black/40 relative">
                            {/* Container for scanner */}
                            <div id="reader" className="w-full h-full [&>div]:border-none [&>div>img]:hidden"></div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6 overflow-y-auto">
                        {selectedOrder ? (
                            <Card className="border-white/10 bg-[#1A1D1F]">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <Badge className="bg-emerald-900/40 text-emerald-400 border-emerald-500/30 mb-2 px-3 py-1 text-[10px] tracking-widest font-bold uppercase">
                                                Orden activa
                                            </Badge>
                                            <h2 className="text-3xl font-bold tracking-tight text-white uppercase">
                                                {selectedOrder.order_number}
                                            </h2>
                                        </div>
                                        <div className="text-right">
                                            <Badge
                                                className={cn(
                                                    "px-3 py-1 rounded-lg text-xs font-bold tracking-tight border",
                                                    STATUS_CONFIG[selectedOrder.status]?.color || "bg-muted text-muted-foreground border-border/60"
                                                )}
                                            >
                                                {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                            <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-1">
                                                Prioridad
                                            </p>
                                            <p
                                                className={cn(
                                                    "text-lg font-bold",
                                                    selectedOrder.priority > 0 ? "text-amber-400" : "text-gray-400"
                                                )}
                                            >
                                                {selectedOrder.priority === 2
                                                    ? "Urgente"
                                                    : selectedOrder.priority === 1
                                                        ? "Alta"
                                                        : "Normal"}
                                            </p>
                                        </div>
                                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                            <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-1">
                                                Fecha inicio
                                            </p>
                                            <p className="text-lg font-bold text-gray-400">
                                                {selectedOrder.start_date
                                                    ? new Date(selectedOrder.start_date).toLocaleDateString()
                                                    : "--/--/--"}
                                            </p>
                                        </div>
                                    </div>

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
                                                    className={cn(
                                                        "h-20 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all",
                                                        isCurrent
                                                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                                                            : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
                                                    )}
                                                >
                                                    <Icon className={cn("w-6 h-6", isCurrent ? "text-emerald-400" : "text-gray-500")} />
                                                    <span className="text-[10px] font-black tracking-widest uppercase">
                                                        {config.label}
                                                    </span>
                                                </Button>
                                            );
                                        })}
                                    </div>

                                    <Button variant="ghost" onClick={() => setScannedId(null)} className="w-full mt-6 text-gray-400 hover:text-white hover:bg-white/5">
                                        Cerrar y escanear de nuevo
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 text-center bg-[#1A1D1F]">
                                <div className="bg-black/20 p-8 rounded-full mb-6 ring-1 ring-white/5">
                                    <QrCode className="w-16 h-16 text-gray-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-400 mb-2">Esperando orden</h3>
                                <p className="text-gray-500 max-w-sm">
                                    Acerca el codigo QR a la camara para cargar la orden.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "list" && (
                <div className="grid grid-cols-1 gap-4 pb-20">
                    {workOrders?.map((order) => (
                        <Card
                            key={order.id}
                            className="border-white/5 bg-[#1A1D1F] hover:border-emerald-500/30 transition-all cursor-pointer rounded-2xl overflow-hidden"
                            onClick={() => {
                                setScannedId(order.id);
                                setActiveTab("scanner");
                            }}
                        >
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="bg-black/20 p-4 rounded-xl">
                                        <Package className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black uppercase text-white">{order.order_number}</h4>
                                        <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">
                                            {order.status} - Actualizado: {new Date(order.updated_at || Date.now()).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge className={cn("px-3 py-1 rounded text-xs font-bold border", STATUS_CONFIG[order.status]?.color || "bg-muted text-muted-foreground border-border/60")}>
                                        {STATUS_CONFIG[order.status]?.label || order.status}
                                    </Badge>
                                    <ArrowRight className="w-5 h-5 text-gray-600" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KioskDisplayPage;
