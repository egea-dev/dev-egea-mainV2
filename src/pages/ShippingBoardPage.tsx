import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseProductivity } from "@/integrations/supabase";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Truck, Package, Clock, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ShippingOrder {
    id: string;
    order_number: string;
    work_order_number?: string;
    customer_name: string;
    status: string;
    region: string;
    fabric: string;
    color: string;
    quantity_total: number;
    quantity?: number;
    packages_count: number;
    scanned_packages: number;
    tracking_number?: string;
    shipping_date?: string;
    needs_shipping_validation: boolean;
    created_at: string;
    admin_code?: string;
    delivery_address?: string;
    packageProgress: number;
    isUrgent: boolean;
    isRecentShipment: boolean;
    daysElapsed: number;
    due_date?: string | null;
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export default function ShippingBoardPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [orders, setOrders] = useState<ShippingOrder[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [theme, setTheme] = useState<"dark" | "light">("dark");

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
            return data?.config;
        }
    });

    // Clock Ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (kioskConfig && typeof kioskConfig === "object" && !Array.isArray(kioskConfig)) {
            setTheme(kioskConfig.theme === "light" ? "light" : "dark");
        } else {
            setTheme("dark");
        }
    }, [kioskConfig]);

    const isMissingRelation = (error: any) => {
        const message = String(error?.message || "");
        return message.includes("does not exist") || message.includes("relation") || message.includes("schema");
    };

    // Data Fetching
    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        const { data, error } = await supabaseProductivity
            .from("produccion_work_orders")
            .select("*")
            .or("status.eq.PTE_ENVIO,status.eq.LISTO_ENVIO,status.eq.TERMINADO,and(status.eq.EN_PROCESO,needs_shipping_validation.eq.true),status.eq.ENVIADO")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(200);

        if (error) {
            console.error("Error fetching shipping board data:", error);
            return;
        }

        // Transform data for display
        const normalizeStatus = (raw?: string) => {
            const normalized = (raw || "").toUpperCase();
            const map: Record<string, string> = {
                EN_CORTE: "CORTE",
                EN_CONFECCION: "CONFECCION",
                EN_CONTROL_CALIDAD: "CONTROL_CALIDAD",
                TERMINADO: "LISTO_ENVIO"
            };
            return map[normalized] || normalized;
        };

        const transformed = (data || []).map((order: any) => {
            const specs = order.technical_specs || {};
            // Extraer material de lines si existe
            const lines = order.lines || [];
            const firstLine = lines[0] || {};
            const fabric = firstLine.material || specs.fabric || order.fabric || "N/D";
            const color = firstLine.color || specs.color || order.color || "N/D";
            const normalizedStatus = normalizeStatus(order.status);

            // Calculate package progress
            const scannedPackages = order.scanned_packages || 0;
            const totalPackages = order.packages_count || 1;
            const packageProgress = (scannedPackages / totalPackages) * 100;

            // Calculate urgency
            const dueDateDays = order.due_date
                ? Math.ceil((new Date(order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 999;
            const isUrgent = order.needs_shipping_validation || dueDateDays <= 2;

            // Check if recent shipment (last 12h)
            const isRecentShipment =
                normalizedStatus === "ENVIADO" &&
                order.shipping_date &&
                Date.now() - new Date(order.shipping_date).getTime() < TWELVE_HOURS_MS;

            // Calculate days elapsed
            const daysElapsed = Math.floor(
                (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                ...order,
                order_number: order.order_number || order.work_order_number || order.id,
                customer_name: order.customer_company || order.customer_name || specs.customer_name || "Cliente Final",
                region: order.region || specs.region || "PENINSULA",
                fabric,
                color,
                quantity_total: order.quantity_total || order.quantity || specs.quantity || 1,
                packageProgress,
                isUrgent,
                isRecentShipment,
                daysElapsed,
                due_date: order.due_date || order.estimated_completion || null,
                status: normalizedStatus
            } as ShippingOrder;
        });

        setOrders(transformed);
    };

    const isLight = theme === "light";
    const colors = {
        page: isLight ? "bg-white text-slate-900" : "bg-black text-white",
        header: isLight ? "bg-white border-slate-200" : "bg-black border-white/10",
        tableHeader: isLight ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-[#111] text-gray-500 border-white/5",
        row: isLight ? "bg-white" : "bg-[#1A1D1F]",
        progress: isLight ? "bg-slate-200" : "bg-black/50",
        stat: isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#0F1113] border-[#45474A]/60",
        footer: isLight ? "bg-white border-slate-200 text-slate-500" : "bg-black border-white/5 text-gray-500",
        urgent: isLight ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-amber-900/30 border-amber-500/50 text-amber-300",
    };

    const getStatusBadge = (order: ShippingOrder) => {
        if (order.status === "ENVIADO") {
            return { label: "Enviado", color: isLight ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-gray-900/20 text-gray-400 border-gray-500/30" };
        }
        if (order.status === "LISTO_ENVIO") {
            return { label: "Listo", color: isLight ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-emerald-900/20 text-emerald-300 border-emerald-500/30" };
        }
        if (order.status === "PTE_ENVIO") {
            return { label: "Pendiente", color: isLight ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-blue-900/20 text-blue-300 border-blue-500/30" };
        }
        return { label: order.status, color: isLight ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-gray-900/20 text-gray-400 border-gray-500/30" };
    };

    return (
        <div className={cn("min-h-screen font-sans overflow-hidden flex flex-col", colors.page)}>
            {/* HEADER */}
            <header className={cn("px-8 py-6 flex items-center justify-between border-b", colors.header)}>
                <div className="flex items-center gap-6">
                    <img src="/img/Egea- Evolucio Gold.png" alt="Egea Gold" className="h-12 w-auto object-contain" />
                    <div className="flex flex-col">
                        <h1 className={cn("text-3xl font-black tracking-wider uppercase flex items-center gap-3", isLight ? "text-slate-900" : "text-white")}>
                            <span className="text-[#D4AF37]">EXPEDICIONES</span> Y ENVÍOS
                        </h1>
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold uppercase tracking-widest pl-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            En Tiempo Real
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className={cn("text-6xl font-mono font-bold tracking-tight leading-none", isLight ? "text-slate-900" : "text-white")}>
                        {format(currentTime, "HH:mm")}
                    </div>
                    <div className="text-lg text-gray-400 font-medium uppercase tracking-widest mt-1">
                        {format(currentTime, "d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                </div>
            </header>

            {/* TABLE HEADER */}
            <div className={cn("px-8 py-4 grid grid-cols-12 gap-4 font-bold text-sm uppercase tracking-wider border-b", colors.tableHeader)}>
                <div className="col-span-2">PEDIDO / REF</div>
                <div className="col-span-2">CLIENTE / DESTINO</div>
                <div className="col-span-3">MATERIAL</div>
                <div className="col-span-1">UNIDADES</div>
                <div className="col-span-2">BULTOS</div>
                <div className="col-span-2 text-right">ESTADO</div>
            </div>

            {/* BODY / SCROLL AREA */}
            <div className="flex-1 px-8 py-4 space-y-3 overflow-y-auto custom-scrollbar">
                {orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-4 opacity-50">
                        <Truck className="w-24 h-24" />
                        <span className="text-2xl font-light uppercase tracking-widest">Esperando Envíos...</span>
                    </div>
                ) : (
                    orders.map((order) => {
                        const statusBadge = getStatusBadge(order);

                        // Border color logic based on due_date
                        const getMarkerStyle = () => {
                            if (!order.due_date) return { color: 'bg-gray-600', pulse: false };
                            const days = Math.ceil((new Date(order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            if (days <= 0) return { color: 'bg-red-400', pulse: true }; // Vencido
                            if (days <= 2) return { color: 'bg-amber-500', pulse: false }; // Urgente
                            return { color: 'bg-[#D4AF37]', pulse: false }; // Normal (Egea Gold)
                        };

                        return (
                            <div
                                key={order.id}
                                className={cn(
                                    "relative grid grid-cols-12 gap-4 items-center p-4 rounded-lg shadow-lg animate-in fade-in duration-500 pl-7",
                                    colors.row,
                                    getMarkerStyle().pulse && "bg-red-500/10 animate-pulse"
                                )}
                            >
                                {(() => {
                                    const marker = getMarkerStyle();
                                    return (
                                        <span
                                            className={cn(
                                                "absolute left-0 top-0 h-full w-3 rounded-l-lg",
                                                marker.color,
                                                marker.pulse && "shadow-[0_0_12px_2px_rgba(248,113,113,0.6)]"
                                            )}
                                        />
                                    );
                                })()}
                                {/* COL 1: REF */}
                                <div className="col-span-2">
                                    <div className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>{order.order_number}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">{order.admin_code || order.id.slice(0, 8)}</div>
                                </div>

                                {/* COL 2: CLIENTE / DESTINO */}
                                <div className="col-span-2 ml-3">
                                    <div className={cn("text-2xl font-black truncate", isLight ? "text-slate-900" : "text-white")}>{order.customer_name}</div>
                                    <div className={cn("text-2xl font-black uppercase tracking-wider mt-1", isLight ? "text-slate-900" : "text-white")}>{order.region}</div>
                                </div>

                                {/* COL 3: MATERIAL (3 cols) */}
                                <div className="col-span-3">
                                    <div className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-gray-300")}>{order.fabric}</div>
                                    <div className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-gray-400")}>{order.color}</div>
                                </div>

                                {/* COL 4: UNIDADES */}
                                <div className="col-span-1">
                                    <div className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>
                                        {order.quantity_total} uds
                                    </div>
                                </div>

                                {/* COL 5: BULTOS - SEPARATE & LARGE (2 cols) */}
                                <div className="col-span-2">
                                    <div className="flex items-center gap-3">
                                        <Package className={`w-6 h-6 ${order.packageProgress === 100 ? 'text-emerald-500' :
                                            order.packageProgress >= 50 ? 'text-blue-400' :
                                                'text-amber-500'
                                            }`} />
                                        <div className="flex-1">
                                            <div className={cn("text-base font-black mb-1", isLight ? "text-slate-900" : "text-white")}>
                                                {order.scanned_packages}/{order.packages_count}
                                            </div>
                                            <Progress
                                                value={order.packageProgress}
                                                className={cn("h-2.5", colors.progress)}
                                                indicatorClassName={order.packageProgress === 100 ? "bg-emerald-500" : order.packageProgress >= 50 ? "bg-blue-500" : "bg-amber-500"}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* COL 5: ESTADO - WITH TEXT & DAYS (3 cols) */}
                                <div className="col-span-2 flex items-center justify-end gap-3">
                                    {/* Urgency Badge */}
                                    {order.isUrgent && (
                                        <div className={cn("flex items-center gap-1 border px-2 py-1 rounded-lg", colors.urgent)}>
                                            <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
                                        </div>
                                    )}

                                    {/* Status Badge with Icon AND Text */}
                                    <div className={`px-3 py-1.5 rounded-lg border-2 text-sm font-black uppercase flex items-center gap-2 ${statusBadge.color}`}>
                                        {order.status === "ENVIADO" && <CheckCircle2 className="w-4 h-4" />}
                                        {order.status === "LISTO_ENVIO" && <Truck className="w-4 h-4" />}
                                        {order.status === "PTE_ENVIO" && <Clock className="w-4 h-4" />}
                                        {statusBadge.label}
                                    </div>

                                    {/* Days Elapsed */}
                                    <div className={cn("text-center border rounded-lg px-3 py-1.5", colors.stat)}>
                                        <span className={cn("text-2xl font-black tracking-tighter", isLight ? "text-slate-900" : "text-white")}>{order.daysElapsed}</span>
                                        <span className="text-xs text-gray-500 uppercase font-bold ml-1">{order.daysElapsed === 1 ? 'día' : 'días'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FOOTER LEGEND */}
            <footer className={cn("px-8 py-3 border-t flex gap-8 justify-end text-[10px] uppercase font-bold tracking-widest", colors.footer)}>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Urgente
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Completo
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-700"></div> Enviado
                </div>
            </footer>
        </div>
    );
}
