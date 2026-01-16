import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseProductivity } from "@/integrations/supabase";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Clock, CheckCircle2, Package } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface WorkOrder {
    id: string;
    order_number: string;
    work_order_number?: string;
    customer_name?: string; // These might be in JSON or separate columns, adapting to schema
    status: string;
    created_at: string;
    priority: number;
    technical_specs: any;
    quantity_total?: number; // Might need to be calculated or fetched from related items
    quantity?: number;
    notes: string;
}

// Temporary mock type extension until full schema is verified in runtime
interface WorkOrderExtended extends WorkOrder {
    region?: string;
    fabric?: string;
    color?: string;
    stage_progress?: number;
    days_elapsed?: number;
    packages_count?: number;
    due_date?: string | null;
}

export default function PlantBoardPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [orders, setOrders] = useState<WorkOrderExtended[]>([]);
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
        const fetchOrders = async () => {
            // In a real scenario we might need to join with 'orders' table if customer data is there.
            // For now, fetching from work_orders.
            const { data, error } = await supabaseProductivity
                .from("produccion_work_orders")
                .select("*, lines")
                .order("priority", { ascending: false })
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) {
                console.error("Error fetching plant board data:", error);
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

                // Calculate days elapsed
                const days = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));

                // Mock progress based on status
                let progress = 0;
                const normalizedStatus = normalizeStatus(order.status);
                switch (normalizedStatus) {
                    case 'CORTE': progress = 25; break;
                    case 'CONFECCION': progress = 50; break;
                    case 'TAPICERIA': progress = 75; break;
                    case 'CONTROL_CALIDAD': progress = 90; break;
                    case 'LISTO_ENVIO': progress = 100; break;
                    default: progress = 5;
                }

                if (normalizedStatus === "LISTO_ENVIO") {
                    return null;
                }

                return {
                    ...order,
                    order_number: order.order_number || order.work_order_number || order.id,
                    customer_name: order.customer_company || order.customer_name || specs.customer_name || "Cliente Final",
                    region: order.region || specs.region || "PENINSULA",
                    fabric,
                    color,
                    stage_progress: progress,
                    days_elapsed: days,
                    quantity_total: order.quantity_total || order.quantity || specs.quantity || 1,
                    due_date: order.due_date || order.estimated_completion || null,
                    status: normalizedStatus
                };
            }).filter(Boolean) as WorkOrderExtended[];

            setOrders(transformed);
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const isLight = theme === "light";
    const colors = {
        page: isLight ? "bg-white text-slate-900" : "bg-black text-white",
        header: isLight ? "bg-white border-slate-200" : "bg-black border-white/10",
        tableHeader: isLight ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-[#111] text-gray-500 border-white/5",
        row: isLight ? "bg-white" : "bg-[#1A1D1F]",
        progress: isLight ? "bg-slate-200" : "bg-black/50",
        stat: isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#0F1113] border-[#45474A]/60",
        footer: isLight ? "bg-white border-slate-200 text-slate-500" : "bg-black border-white/5 text-gray-500",
    };

    const getDueDateBadge = (order: WorkOrderExtended) => {
        if (!order.due_date) {
            return { label: 'Sin fecha', color: isLight ? 'text-slate-500 bg-slate-100 border-slate-200' : 'text-gray-400 bg-gray-900/20 border-gray-500/30' };
        }
        const days = Math.ceil((new Date(order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (days <= 0) return { label: 'VENCIDO', color: isLight ? 'text-red-600 bg-red-100 border-red-200 animate-pulse' : 'text-red-300 bg-red-900/30 border-red-500/30 animate-pulse' };
        if (days <= 2) return { label: `${days} días`, color: isLight ? 'text-amber-700 bg-amber-100 border-amber-200' : 'text-amber-300 bg-amber-900/30 border-amber-500/30' };
        return { label: `${days} días`, color: isLight ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : 'text-emerald-300 bg-emerald-900/20 border-emerald-500/30' };
    };

    return (
        <div className={cn("min-h-screen font-sans overflow-hidden flex flex-col", colors.page)}>
            {/* HEADER */}
            <header className={cn("px-8 py-6 flex items-center justify-between border-b", colors.header)}>
                <div className="flex items-center gap-6">
                    {/* LOGO: Using absolute path to public folder image */}
                    <img src="/img/Egea- Evolucio Gold.png" alt="Egea Gold" className="h-12 w-auto object-contain" />
                    <div className="flex flex-col">
                        <h1 className={cn("text-3xl font-black tracking-wider uppercase flex items-center gap-3", isLight ? "text-slate-900" : "text-white")}>
                            <span className="text-[#D4AF37]">PRODUCCIÓN</span>
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
                <div className="col-span-2">CLIENTE</div>
                <div className="col-span-3">MATERIAL</div>
                <div className="col-span-1">UNIDADES</div>
                <div className="col-span-1">BULTOS</div>
                <div className="col-span-2">PROGRESO</div>
                <div className="col-span-1 text-right">ESTADO</div>
            </div>

            {/* BODY / SCROLL AREA */}
            <div className="flex-1 px-8 py-4 space-y-3 overflow-y-auto custom-scrollbar">
                {orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-4 opacity-50">
                        <Clock className="w-24 h-24" />
                        <span className="text-2xl font-light uppercase tracking-widest">Esperando Pedidos...</span>
                    </div>
                ) : (
                    orders.map((order) => {
                        // Border color logic based on status and urgency
                        const getMarkerStyle = () => {
                            if (!order.due_date) return { color: 'bg-gray-600', pulse: false };
                            const days = Math.ceil((new Date(order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            if (days <= 0) return { color: 'bg-red-400', pulse: true }; // Vencido
                            if (days <= 2) return { color: 'bg-amber-500', pulse: false }; // Urgente
                            return { color: 'bg-[#D4AF37]', pulse: false }; // Normal (Egea Gold)
                        };

                        const marker = getMarkerStyle();

                        return (
                            <div
                                key={order.id}
                                className={cn(
                                    "relative grid grid-cols-12 gap-4 items-center p-4 rounded-lg shadow-lg animate-in fade-in duration-500 pl-7",
                                    colors.row,
                                    marker.pulse && "bg-red-500/10 animate-pulse"
                                )}
                            >
                                <span
                                    className={cn(
                                        "absolute left-0 top-0 h-full w-3 rounded-l-lg",
                                        marker.color,
                                        marker.pulse && "shadow-[0_0_12px_2px_rgba(248,113,113,0.6)]"
                                    )}
                                />

                                {/* COL 1: REF */}
                                <div className="col-span-2 ml-3">
                                    <div className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>{order.order_number}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">{order.id.slice(0, 8)}</div>
                                </div>

                                {/* COL 2: CLIENTE */}
                                <div className="col-span-2">
                                    <div className={cn("text-2xl font-black truncate", isLight ? "text-slate-900" : "text-white")}>{order.customer_name}</div>
                                    <div className={cn("text-2xl font-black uppercase tracking-wider mt-1", isLight ? "text-slate-900" : "text-white")}>{order.region}</div>
                                </div>

                                {/* COL 3: MATERIAL */}
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

                                {/* COL 5: BULTOS - NEW COLUMN */}
                                <div className="col-span-1">
                                    {order.packages_count ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <Package className="w-5 h-5 text-emerald-500" />
                                            <span className={cn("text-sm font-black", isLight ? "text-slate-900" : "text-white")}>{order.packages_count}</span>
                                        </div>
                                    ) : (
                                        <div className="text-gray-600 text-xs text-center">-</div>
                                    )}
                                </div>

                                {/* COL 6: PROGRESO */}
                                <div className="col-span-2 pr-6">
                                    <div className="flex justify-between text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
                                        <span>{order.stage_progress}%</span>
                                    </div>
                                    <Progress value={order.stage_progress} className={cn("h-3", colors.progress)} indicatorClassName="bg-[#D4AF37]" />
                                    <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-wide text-right font-bold">Fase: {order.status}</div>
                                </div>

                                {/* COL 7: ESTADO - SINGLE LINE (matching ShippingBoardPage) */}
                                <div className="col-span-1 flex items-center justify-end gap-3">
                                    {/* Due Date Badge with Color Logic */}
                                    {(() => {
                                        const dueBadge = getDueDateBadge(order);
                                        return (
                                            <div className={`px-2 py-1 rounded-lg border text-xs font-bold uppercase ${dueBadge.color}`}>
                                                {dueBadge.label}
                                            </div>
                                        );
                                    })()}

                                    {/* Days Elapsed */}
                                    <div className={cn("text-center border rounded-lg px-3 py-1.5", colors.stat)}>
                                        <span className={cn("text-2xl font-black tracking-tighter", isLight ? "text-slate-900" : "text-white")}>{order.days_elapsed}</span>
                                        <span className="text-xs text-gray-500 uppercase font-bold ml-1">{order.days_elapsed === 1 ? 'día' : 'días'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FOOTER LEGEND */}
            <footer className={cn("px-8 py-3 border-t flex gap-8 justify-end text-[10px] uppercase font-bold tracking-widest", colors.footer)}>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div> Prioridad Alta</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> En Proceso</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-700"></div> En Espera</div>
            </footer>
        </div>
    );
}
