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
import { sortWorkOrdersByPriority, isMondayToWednesday, isCanarias, daysToDueDate, getUrgencyBadge } from "@/services/priority-service";
import { ScannerButton } from "@/features/scanner/components/ScannerButton";
import { ScannerModal } from "@/features/scanner/components/ScannerModal";
import { useOrientation, useDeviceType } from "@/hooks/useOrientation";
import { getWorkdaysRemaining } from "@/utils/workday-utils";


const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    PENDIENTE: { label: "Pendiente", color: "bg-slate-500/10 text-slate-400 border-slate-500/30", icon: Timer },
    CORTE: { label: "Corte", color: "bg-sky-500/10 text-sky-400 border-sky-500/30", icon: Play },
    CONFECCION: { label: "Confección", color: "bg-violet-500/10 text-violet-400 border-violet-500/30", icon: Pause },
    TAPICERIA: { label: "Tapicería", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", icon: Pause },
    CONTROL_CALIDAD: { label: "Calidad", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: AlertTriangle },
    LISTO_ENVIO: { label: "Listo", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: CheckCircle2 },
};

const KioskDisplayPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [scannedId, setScannedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"scanner" | "list">("scanner");
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    // Hooks responsive
    const orientation = useOrientation();
    const deviceType = useDeviceType();

    const lastScannedRef = useRef<string | null>(null);
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
        staleTime: 60000,
        queryFn: async () => {
            if (!scannedId) return null;

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
            if ((prodData as any)?.id) {
                const { data: lines } = await supabaseProductivity
                    .from("produccion_work_order_lines")
                    .select("*")
                    .eq("work_order_id", (prodData as any).id);
                linesData = lines as any[] | null;
            }

            const orderNumToSearch = (prodData as any)?.order_number;
            const orFilters = [];
            if (orderNumToSearch) {
                orFilters.push(`order_number.eq.${orderNumToSearch}`);
            }
            orFilters.push(`order_number.eq.${scannedId}`);
            orFilters.push(`admin_code.eq.${scannedId}`);

            const { data: commResp, error: commError } = await supabaseProductivity
                .from('comercial_orders')
                .select('id, order_number, admin_code, lines, fabric, delivery_region, region, customer_company, customer_name, delivery_date')
                .or(orFilters.join(','));

            if (commError) {
                console.error("Error fetching commercial order:", commError);
            }

            const commDataList = (commResp as any[]) || [];

            let finalCommData: any = null;
            if (prodData && commDataList.length > 0) {
                finalCommData = commDataList.find((c: any) => c.order_number === (prodData as any).order_number) || commDataList[0];
            } else if (commDataList.length > 0) {
                finalCommData = commDataList[0];
            }

            if (!prodData && !finalCommData) return null;

            const base = (prodData as any) || {
                id: finalCommData?.id,
                order_number: finalCommData?.order_number,
                customer_name: finalCommData?.customer_company || finalCommData?.customer_name,
                status: 'PENDIENTE',
                fabric: finalCommData?.fabric || 'N/D',
                quantity_total: 1,
                is_only_commercial: true
            };

            const region = finalCommData?.delivery_region || finalCommData?.region || base.region || 'PENINSULA';

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

            const rawLines = Array.isArray(base.lines) && base.lines.length > 0 ? base.lines : (linesData || []);
            const lines = deduplicateLines(rawLines);
            const materialList = summarizeMaterials(rawLines, finalCommData?.fabric || "N/D");

            const finalStatuses = ['ENVIADO', 'ENTREGADO', 'CANCELADO'];
            const isArchived = finalStatuses.includes(base.status?.toUpperCase?.() || base.status);

            return {
                ...base,
                region,
                status: normalizeStatus(base.status),
                fabric: materialList,
                color: lines.map((l: any) => l.color).filter(Boolean).join(", ") || (base.technical_specs?.color || base.color || "N/D"),
                lines: lines,
                due_date: finalCommData?.delivery_date || base.due_date,
                is_archived: isArchived,
                _is_canarias_urgent: isCanarias(region) && isMondayToWednesday(),
                _is_grouped_material: lines.length > 0
            };
        }
    });

    const activeWorkOrders = React.useMemo(() => {
        if (!workOrders) return [];
        const filtered = workOrders.filter(order => {
            const archivedStatuses = ['ENVIADO', 'ENTREGADO', 'CANCELADO'];
            return !archivedStatuses.includes(order.status?.toUpperCase?.() || order.status);
        });
        return sortWorkOrdersByPriority(filtered as any);
    }, [workOrders]);

    const onScanSuccess = (decodedText: string) => {
        const qrData = parseQRCode(decodedText);
        const orderNum = qrData.orderNumber || extractOrderNumber(decodedText);

        if (orderNum) {
            setScannedId(orderNum);
            setScannerModalOpen(false);
            toast.success(`Orden detectada: ${orderNum}`);
        }
    };

    function onScanFailure(_error: any) { }

    const handleStatusChange = async (newStatus: WorkOrderStatus) => {
        if (!selectedOrder) return;

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

    const getDueBadge = () => {
        if (!selectedOrder?.due_date) return null;
        const workdaysRemaining = getWorkdaysRemaining(selectedOrder.due_date);
        const region = selectedOrder.region || 'PENINSULA';
        const badge = getUrgencyBadge(workdaysRemaining, region);

        if (!badge) return null;

        return {
            label: badge.label,
            color: badge.color,
            box: workdaysRemaining === 999 ? '-' : Math.abs(workdaysRemaining)
        };
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
                        <CardContent className={cn("flex-1 p-6 flex flex-col items-center justify-center relative gap-6", colors.panelMuted)}>
                            <div className="text-center space-y-2 mb-4">
                                <p className={cn("text-sm font-medium", isLight ? "text-slate-600" : "text-slate-400")}>
                                    Pulsa el botón para activar la cámara
                                </p>
                            </div>

                            <ScannerButton
                                onActivate={() => setScannerModalOpen(true)}
                                isActive={scannerModalOpen}
                                size={deviceType === 'mobile' ? 'mobile' : 'tablet'}
                                fullWidth
                                className="max-w-xs h-16 text-lg"
                            />

                            <div className="mt-8 p-4 bg-black/20 rounded-xl border border-white/5 max-w-sm text-center">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Instrucciones</p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Enfoca el código QR de la orden de trabajo. Se cargará automáticamente el desglose y opciones de validación.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <ScannerModal
                        isOpen={scannerModalOpen}
                        onClose={() => setScannerModalOpen(false)}
                        onScan={onScanSuccess}
                        title="Lector Modo Kiosco"
                    />

                    <div className="space-y-6 overflow-y-auto">
                        {selectedOrder ? (
                            <Card className={cn(colors.card, "relative")}>
                                {isFetchingBase && (
                                    <div className="absolute top-2 right-2 flex items-center gap-2 text-[10px] font-bold text-emerald-500 animate-pulse">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Actualizando...
                                    </div>
                                )}
                                <CardContent className="p-6">
                                    {(selectedOrder as any).is_archived && (
                                        <div className="mb-4 p-4 rounded-xl bg-amber-900/30 border border-amber-500/50 text-amber-400">
                                            <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                                PEDIDO ARCHIVADO
                                            </div>
                                            <p className="text-xs opacity-80">
                                                Este pedido ya fue enviado y está en el historial. No requiere más acciones de producción.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex flex-col gap-3">
                                            <Badge className="bg-emerald-900/40 text-emerald-400 border-emerald-500/30 w-fit px-3 py-1 text-[10px] tracking-widest font-bold uppercase">
                                                Resumen del Pedido
                                            </Badge>
                                            <h2 className={cn("text-4xl font-black tracking-tight uppercase", isLight ? "text-slate-900" : "text-white")}>
                                                {selectedOrder.order_number}
                                            </h2>
                                            <div className="flex gap-2">
                                                {(selectedOrder as any)._is_canarias_urgent && (
                                                    <span className="px-3 py-1.5 bg-orange-600/20 border border-orange-500/50 rounded-lg text-xs font-black text-orange-300 flex items-center gap-2">
                                                        CANARIAS
                                                    </span>
                                                )}
                                                {(selectedOrder as any)._is_grouped_material && (
                                                    <span className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/50 rounded-lg text-xs font-black text-emerald-300 flex items-center gap-2">
                                                        AGRUPADO
                                                    </span>
                                                )}
                                            </div>
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
                    {activeWorkOrders.map((order) => {
                        const daysRemaining = daysToDueDate(order.due_date);
                        const urgencyBadge = getUrgencyBadge(daysRemaining, order.region);
                        const level = order._priority_level;

                        return (
                            <Card
                                key={order.id}
                                className={cn(
                                    "rounded-2xl overflow-hidden cursor-pointer transition-all border-4",
                                    colors.card,
                                    level === 'critical' ? "blink-priority-urgent" :
                                        level === 'warning' ? "blink-priority-canarias" :
                                            level === 'material' ? "blink-priority-material" : ""
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
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={cn("text-xl font-black uppercase", isLight ? "text-slate-900" : "text-white")}>
                                                    {order.order_number}
                                                </h4>
                                                {order._is_canarias_urgent && (
                                                    <Badge className="bg-orange-600/20 text-orange-400 border-orange-500/50 text-[10px] font-black px-2 py-0.5">
                                                        CANARIAS
                                                    </Badge>
                                                )}
                                                {order._is_grouped_material && (
                                                    <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/50 text-[10px] font-black px-2 py-0.5">
                                                        AGRUPADO
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <p className={cn("text-[10px] font-bold uppercase", colors.mutedText)}>
                                                    {order.status} - {order.fabric || 'N/D'}
                                                </p>
                                                <p className={cn("text-[10px] font-bold uppercase opacity-60", colors.mutedText)}>
                                                    {order.customer_name}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end gap-1">
                                            {urgencyBadge && (
                                                <Badge className={cn("px-2 py-1 text-[10px] font-black uppercase border", urgencyBadge.color)}>
                                                    {urgencyBadge.label}
                                                </Badge>
                                            )}
                                            <Badge className={cn("px-2 py-1 text-[10px] font-black uppercase border w-fit", STATUS_CONFIG[order.status]?.color)}>
                                                {STATUS_CONFIG[order.status]?.label || order.status}
                                            </Badge>
                                        </div>

                                        {order.due_date && (
                                            <div className={cn("text-center border rounded-xl px-3 py-1.5 min-w-[70px]", colors.panel)}>
                                                <span className="text-xl font-black block leading-none">{daysRemaining === 999 ? '-' : daysRemaining}</span>
                                                <span className="text-[8px] opacity-60 uppercase font-black">Días</span>
                                            </div>
                                        )}
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
