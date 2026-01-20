import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useWorkOrders, useUpdateWorkOrderStatus, normalizeStatus } from "@/hooks/use-work-orders";
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
    Calendar,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { supabaseProductivity } from "@/integrations/supabase";
import { parseQRCode, extractOrderNumber } from "@/lib/qr-utils";
import { summarizeMaterials } from "@/lib/materials";
import { isMondayToWednesday, daysToDueDate, getUrgencyBadge } from "@/services/priority-service";


const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    PENDIENTE: { label: "Pendiente", color: "bg-slate-500/10 text-slate-400 border-slate-500/30", icon: Timer },
    CORTE: { label: "Corte", color: "bg-sky-500/10 text-sky-400 border-sky-500/30", icon: Play },
    CONFECCION: { label: "Confección", color: "bg-violet-500/10 text-violet-400 border-violet-500/30", icon: Pause },
    TAPICERIA: { label: "Tapicería", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", icon: Pause },
    CONTROL_CALIDAD: { label: "Calidad", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: AlertTriangle },
    LISTO_ENVIO: { label: "Listo", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

const KioskDisplayPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [scannedId, setScannedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"scanner" | "list">("scanner");
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const lastScannedRef = useRef<string | null>(null); // Referencia para evitar parpadeo/spam
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    const { data: workOrders } = useWorkOrders();
    const updateStatus = useUpdateWorkOrderStatus();

    const { data: kioskConfig } = useQuery({
        queryKey: ["kiosk-screen-config", token],
        enabled: !!token,
        refetchInterval: 30000,
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .from("kiosk_screens")
                .select("config")
                .eq("id", token)
                .maybeSingle();
            if (error) throw error;
            return (data as any)?.config;
        }
    });

    // Consulta consolidada: Busca en producción y, si es necesario, complementa con comercial
    const {
        data: selectedOrder,
        isLoading: isLoadingBase,
        isFetching: isFetchingBase,
        isError: isErrorBase
    } = useQuery({
        queryKey: ["scanned-order-lookup", scannedId],
        enabled: !!scannedId,
        staleTime: 60000, // Los datos escaneados son estables; solo se invalidan por acción
        queryFn: async () => {
            if (!scannedId) return null;

            // 1. Validar UUID para evitar error PostgREST
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scannedId);

            let prodQuery = supabaseProductivity
                .from("produccion_work_orders")
                .select("*");

            if (isUUID) {
                prodQuery = prodQuery.or(`id.eq.${scannedId},order_number.eq.${scannedId}`);
            } else {
                prodQuery = prodQuery.eq("order_number", scannedId);
            }

            const { data: prodData } = await prodQuery.maybeSingle();
            let linesData: any[] | null = null;
            if (prodData?.id) {
                const { data: lines } = await supabaseProductivity
                    .from("produccion_work_order_lines")
                    .select("*")
                    .eq("work_order_id", prodData.id);
                linesData = lines as any[] | null;
            }

            // 2. Buscar en comercial_orders (siempre necesario para la "Verdad Absoluta")
            const orderNumToSearch = prodData?.order_number || scannedId;
            const { data: commData } = await supabaseProductivity
                .from("comercial_orders")
                .select("*")
                .eq("order_number", orderNumToSearch)
                .maybeSingle();

            if (!prodData && !commData) return null;

            // 3. Merge Logic Consolidada
            const base = prodData || {
                id: (commData as any)?.id,
                order_number: (commData as any)?.order_number,
                customer_name: (commData as any)?.customer_company || (commData as any)?.customer_name,
                status: 'PENDIENTE',
                is_only_commercial: true
            };

            const order = base as any;
            const specs = order.technical_specs || {};
            const commLines = Array.isArray((commData as any)?.lines) ? (commData as any).lines : [];
            const orderLines = Array.isArray(order.lines) ? order.lines : [];
            const relLines = linesData || [];
            const rawLines = [...commLines, ...orderLines, ...relLines].filter(Boolean);

            // Deduplicar y agrupar líneas por material+dimensiones
            const deduplicateLines = (lines: any[]) => {
                const grouped = lines.reduce((acc, line) => {
                    const material = line.material || line.fabric || 'Pieza';
                    const key = `${material}-${line.width || 0}x${line.height || 0}-${line.color || ''}`;
                    if (!acc[key]) {
                        acc[key] = { ...line, quantity: 0, material };
                    }
                    acc[key].quantity += line.quantity || 1;
                    return acc;
                }, {} as Record<string, any>);
                return Object.values(grouped);
            };

            const lines = deduplicateLines(rawLines);
            const materialList = summarizeMaterials(rawLines, "N/D");

            // Verificar si el pedido ya está en estado final (archivado)
            const finalStatuses = ['ENVIADO', 'ENTREGADO', 'CANCELADO'];
            const isArchived = finalStatuses.includes(order.status?.toUpperCase?.() || order.status);

            return {
                ...order,
                status: normalizeStatus(order.status),
                fabric: materialList,
                color: lines.map((l: any) => l.color).filter(Boolean).join(", ") || (specs.color || order.color || "N/D"),
                lines: lines,
                due_date: (commData as any)?.delivery_date || order.due_date,
                is_archived: isArchived  // Flag para mostrar mensaje en UI
            };
        }
    });

    useEffect(() => {
        if (activeTab === "scanner" && !scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
            scannerRef.current.render(onScanSuccess, onScanFailure);
        }
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((err) => console.error("Error clearing scanner", err));
                scannerRef.current = null;
            }
        };
    }, [activeTab]);

    useEffect(() => {
        if (kioskConfig && typeof kioskConfig === "object" && !Array.isArray(kioskConfig)) {
            setTheme(kioskConfig.theme === "light" ? "light" : "dark");
        } else {
            setTheme("dark");
        }
    }, [kioskConfig]);

    function onScanSuccess(decodedText: string) {
        const qrData = parseQRCode(decodedText);
        const orderNum = qrData.orderNumber || extractOrderNumber(decodedText);

        // Evitar procesar el mismo código repetidamente (causa parpadeo de toasts y estado)
        if (orderNum === lastScannedRef.current) return;
        lastScannedRef.current = orderNum;

        setScannedId(orderNum);
        toast.success(`✓ Orden detectada: ${orderNum}`);
    }

    function onScanFailure(_error: any) { }

    const handleStatusChange = async (newStatus: WorkOrderStatus) => {
        if (!selectedOrder) return;

        // Si el pedido solo existe en comercial, avisar que no se puede actualizar en producción directamente
        if ((selectedOrder as any).is_only_commercial) {
            toast.error("Este pedido no ha sido aceptado en producción todavía. Acéptalo primero en la zona comercial.");
            return;
        }

        try {
            await updateStatus.mutateAsync({
                workOrderId: selectedOrder.id,
                status: newStatus,
                notes: "Actualización desde Kiosco de Operario",
            });

            // Invalidad la búsqueda específica inmediatamente
            queryClient.invalidateQueries({ queryKey: ["scanned-order-lookup", scannedId] });

            if (newStatus === "LISTO_ENVIO") {
                setScannedId(null);
                lastScannedRef.current = null;
                toast.info("Orden finalizada correctamente");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const isLight = theme === "light";
    const colors = {
        page: isLight ? "bg-white text-slate-900" : "bg-[#0D0F11] text-white",
        headerMuted: isLight ? "text-slate-600" : "text-[#B5B8BA]",
        token: isLight ? "text-emerald-700" : "text-emerald-500",
        buttonActive: isLight ? "bg-slate-900 text-white" : "bg-white text-black",
        buttonInactive: isLight ? "border-slate-300 text-slate-700" : "border-white/20 text-white",
        card: isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#1A1D1F]",
        cardHeader: isLight ? "border-b border-slate-200 bg-slate-50" : "border-b border-white/5 bg-black/20",
        panel: isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/5",
        panelMuted: isLight ? "bg-slate-100/80" : "bg-black/40",
        mutedText: isLight ? "text-slate-500" : "text-gray-500",
        softText: isLight ? "text-slate-600" : "text-gray-400",
        ghostBtn: isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-gray-400 hover:text-white hover:bg-white/5",
    };

    // Days logic for the scanned detail
    const getDueBadge = () => {
        if (!selectedOrder?.due_date) return null;
        const now = new Date();
        const due = new Date(selectedOrder.due_date);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: "VENCIDO", color: "bg-red-900/40 text-red-400 border-red-500/30", box: Math.abs(diffDays) };
        if (diffDays <= 3) return { label: "URGENTE", color: "bg-amber-900/40 text-amber-400 border-amber-500/30", box: diffDays };
        return { label: "A TIEMPO", color: "bg-emerald-900/40 text-emerald-400 border-emerald-500/30", box: diffDays };
    };

    const dueBadge = getDueBadge();

    return (
        <div className={cn("min-h-screen p-4 flex flex-col", colors.page)}>
            <header className="flex justify-between items-center mb-6 pl-2">
                <div>
                    <h1 className={cn("text-xl font-bold uppercase tracking-widest", colors.headerMuted)}>
                        Modo Kiosco <span className="text-[#D4AF37] ml-2 font-black">Industrial</span>
                    </h1>
                    {token && <span className={cn("text-[10px] font-mono opacity-50 uppercase", colors.token)}>Terminal: {token.slice(0, 8)}</span>}
                </div>
                <div className="flex gap-2">
                    <Button variant={activeTab === "scanner" ? "default" : "outline"} onClick={() => setActiveTab("scanner")} className={activeTab === "scanner" ? colors.buttonActive : colors.buttonInactive}>
                        <QrCode className="mr-2 h-4 w-4" /> Escaner
                    </Button>
                    <Button variant={activeTab === "list" ? "default" : "outline"} onClick={() => setActiveTab("list")} className={activeTab === "list" ? colors.buttonActive : colors.buttonInactive}>
                        <History className="mr-2 h-4 w-4" /> Cola Activa
                    </Button>
                </div>
            </header>

            {activeTab === "scanner" && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 h-full pb-6">
                    <Card className={cn("overflow-hidden flex flex-col", colors.card)}>
                        <CardHeader className={cn("py-4", colors.cardHeader)}>
                            <CardTitle className={cn("text-xs font-bold tracking-[0.2em] uppercase flex items-center", isLight ? "text-slate-800" : "text-white")}>
                                <QrCode className={cn("w-4 h-4 mr-2", colors.token)} /> Lector de Pedidos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn("flex-1 p-0 flex items-center justify-center relative", colors.panelMuted)}>
                            <div id="reader" className="w-full h-full [&>div]:border-none [&>div>img]:hidden"></div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6 overflow-y-auto">
                        {selectedOrder ? (
                            <Card className={cn(colors.card, "relative")}>
                                {isFetchingBase && (
                                    <div className="absolute top-2 right-2 flex items-center gap-2 text-[10px] font-bold text-emerald-500 animate-pulse">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Actualizando...
                                    </div>
                                )}
                                <CardContent className="p-6">
                                    {/* Alerta si el pedido ya está archivado */}
                                    {(selectedOrder as any).is_archived && (
                                        <div className="mb-4 p-4 rounded-xl bg-amber-900/30 border border-amber-500/50 text-amber-400">
                                            <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                                ⚠️ PEDIDO ARCHIVADO
                                            </div>
                                            <p className="text-xs opacity-80">
                                                Este pedido ya fue enviado y está en el historial. No requiere más acciones de producción.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <Badge className="bg-emerald-900/40 text-emerald-400 border-emerald-500/30 mb-2 px-3 py-1 text-[10px] tracking-widest font-bold uppercase">
                                                Información del Pedido
                                            </Badge>
                                            <h2 className={cn("text-4xl font-black tracking-tight uppercase", isLight ? "text-slate-900" : "text-white")}>
                                                {selectedOrder.order_number}
                                            </h2>
                                        </div>
                                        {dueBadge && (
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge className={cn("px-2 py-1 text-[10px] font-black uppercase", dueBadge.color)}>
                                                    {dueBadge.label}
                                                </Badge>
                                                <div className={cn("text-center border rounded-xl px-4 py-2 min-w-[100px]", colors.panel)}>
                                                    <span className="text-3xl font-black block leading-none">{dueBadge.box}</span>
                                                    <span className="text-[10px] opacity-60 uppercase font-black">Días</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className={cn("p-4 rounded-2xl border", colors.panel)}>
                                            <p className={cn("text-[10px] font-black tracking-widest uppercase mb-1", colors.mutedText)}>Material Principal</p>
                                            <p className={cn("text-lg font-black truncate", colors.softText)}>{selectedOrder.fabric || "N/D"}</p>
                                        </div>
                                        <div className={cn("p-4 rounded-2xl border", colors.panel)}>
                                            <p className={cn("text-[10px] font-black tracking-widest uppercase mb-1", colors.mutedText)}>Acabado / Color</p>
                                            <p className={cn("text-lg font-black truncate", colors.softText)}>{selectedOrder.color || "N/D"}</p>
                                        </div>
                                    </div>

                                    {selectedOrder.lines && selectedOrder.lines.length > 0 && (
                                        <div className={cn("mb-6 p-4 rounded-2xl border", colors.panel)}>
                                            <p className={cn("text-[10px] font-black tracking-widest uppercase mb-3", colors.mutedText)}>Desglose Operativo</p>
                                            <div className="space-y-2">
                                                {selectedOrder.lines.map((line: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-emerald-400 text-base">{line.quantity}x</span>
                                                            <span className={cn("font-bold uppercase", colors.softText)}>{line.material || line.fabric || "Pieza"}</span>
                                                            {line.width && line.height && <span className="text-[10px] opacity-70">({line.width}x{line.height})</span>}
                                                        </div>
                                                        {line.color && <span className="text-[10px] opacity-70 uppercase font-black">{line.color}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                                            const isCurrent = selectedOrder.status === statusKey;
                                            return (
                                                <Button key={statusKey} disabled={isCurrent || updateStatus.isPending} onClick={() => handleStatusChange(statusKey as WorkOrderStatus)} className={cn("h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all", isCurrent ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : colors.panel)}>
                                                    <span className="text-[10px] font-black tracking-widest uppercase">{config.label}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>

                                    <Button variant="ghost" onClick={() => setScannedId(null)} className={cn("w-full mt-6 h-12 rounded-xl uppercase font-black tracking-widest text-xs", colors.ghostBtn)}>
                                        Escanear siguiente
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : isErrorBase ? (
                            <div className={cn("h-full flex flex-col items-center justify-center border-2 border-red-500/20 border-dashed rounded-3xl p-12 text-center", colors.card)}>
                                <AlertTriangle className="w-20 h-20 mb-6 text-red-500 opacity-50" />
                                <h3 className={cn("text-2xl font-black uppercase tracking-widest mb-2", isLight ? "text-red-900" : "text-red-400")}>Error de Carga</h3>
                                <p className={cn("max-w-xs text-sm", colors.mutedText)}>No se pudo conectar con la base de datos. Por favor, reintente el escaneo.</p>
                                <Button variant="outline" onClick={() => { setScannedId(null); lastScannedRef.current = null; }} className="mt-4 border-white/10">Reiniciar Escáner</Button>
                            </div>
                        ) : isLoadingBase ? (
                            <div className={cn("h-full flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-12 text-center", colors.card)}>
                                <RefreshCw className={cn("w-20 h-20 mb-6 animate-spin", colors.softText)} />
                                <h3 className={cn("text-2xl font-black uppercase tracking-widest mb-2", colors.softText)}>Buscando Pedido...</h3>
                                <p className={cn("max-w-xs text-sm", colors.mutedText)}>Consultando base de datos centralizada.</p>
                            </div>
                        ) : (
                            <div className={cn("h-full flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-12 text-center", colors.card)}>
                                <QrCode className={cn("w-20 h-20 mb-6 opacity-20", colors.softText)} />
                                <h3 className={cn("text-2xl font-black uppercase tracking-widest mb-2", colors.softText)}>Esperando Escaneo</h3>
                                <p className={cn("max-w-xs text-sm", colors.mutedText)}>Posicione el código QR frente al lector para visualizar los detalles del pedido.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "list" && (
                <div className="grid grid-cols-1 gap-3 pb-10">
                    {/* Filtrar solo pedidos en estados activos de producción */}
                    {(workOrders || [])
                        .filter(order => {
                            const archivedStatuses = ['ENVIADO', 'ENTREGADO', 'CANCELADO'];
                            return !archivedStatuses.includes(order.status?.toUpperCase?.() || order.status);
                        })
                        .map((order) => {
                            // Calcular metadata de prioridad
                            const isCanariasUrgent =
                                order.region?.toUpperCase() === 'CANARIAS' &&
                                    order.created_at ?
                                    isMondayToWednesday(order.created_at) :
                                    false;

                            const daysRemaining = daysToDueDate(order.due_date);
                            const urgencyBadge = getUrgencyBadge(daysRemaining);

                            // Detectar agrupación de material (comparar con otros pedidos)
                            const materialGroup = (workOrders || []).filter(
                                o => o.fabric === order.fabric && o.fabric && o.id !== order.id
                            );
                            const isGrouped = materialGroup.length >= 1;

                            return (
                                <Card
                                    key={order.id}
                                    className={cn(
                                        "rounded-2xl overflow-hidden cursor-pointer transition-all",
                                        colors.card,
                                        isGrouped && "agrupado-material",
                                        isCanariasUrgent && "prioridad-canarias"
                                    )}
                                    onClick={() => {
                                        setScannedId(order.id);
                                        lastScannedRef.current = order.id;
                                        setActiveTab("scanner");
                                    }}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-3 rounded-xl", colors.panel)}>
                                                <Package className={cn("w-6 h-6", colors.mutedText)} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className={cn("text-xl font-black uppercase", isLight ? "text-slate-900" : "text-white")}>
                                                        {order.order_number}
                                                    </h4>
                                                    {isCanariasUrgent && (
                                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-[8px] px-2 py-0.5">
                                                            🔥 CANARIAS L-M
                                                        </Badge>
                                                    )}
                                                    {isGrouped && (
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-[8px] px-2 py-0.5">
                                                            📦 AGRUPADO
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className={cn("text-[10px] font-bold uppercase", colors.mutedText)}>
                                                    {order.status} - {order.fabric || 'N/D'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {urgencyBadge && (
                                                <Badge className={cn("px-2 py-1 text-[10px] font-black uppercase border", urgencyBadge.color)}>
                                                    {urgencyBadge.label}
                                                </Badge>
                                            )}
                                            <Badge className={cn("px-2 py-1 text-[10px] font-black uppercase border", STATUS_CONFIG[order.status]?.color)}>
                                                {STATUS_CONFIG[order.status]?.label || order.status}
                                            </Badge>
                                            <ArrowRight className={cn("w-4 h-4", colors.mutedText)} />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                </div>
            )}
        </div>
    );
};

export default KioskDisplayPage;
