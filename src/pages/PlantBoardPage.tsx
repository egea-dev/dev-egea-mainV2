import { useState, useEffect } from "react";
import { supabaseProductivity } from "@/integrations/supabase";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Clock, CheckCircle2, Package } from "lucide-react";

interface WorkOrder {
    id: string;
    order_number: string;
    customer_name?: string; // These might be in JSON or separate columns, adapting to schema
    status: string;
    created_at: string;
    priority: number;
    technical_specs: any;
    quantity_total?: number; // Might need to be calculated or fetched from related items
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
    const [orders, setOrders] = useState<WorkOrderExtended[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Clock Ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Data Fetching
    useEffect(() => {
        const fetchOrders = async () => {
            // In a real scenario we might need to join with 'orders' table if customer data is there.
            // For now, fetching from work_orders.
            const { data, error } = await supabaseProductivity
                .from("produccion_work_orders")
                .select("*")
                .order("priority", { ascending: false }) // Higher priority first
                .order("created_at", { ascending: true }) // FIFO
                .neq("status", "LISTO_ENVIO") // Don't show shipped? Or maybe show them at bottom.
                .limit(20);

            if (error) {
                console.error("Error fetching plant board data:", error);
                return;
            }

            // Transform data for display
            const transformed = data.map((order: any) => {
                const specs = order.technical_specs || {};
                const fabric = specs.fabric || "Estándar";
                const color = specs.color || "Gris";

                // Calculate days elapsed
                const days = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));

                // Mock progress based on status
                let progress = 0;
                switch (order.status) {
                    case 'CORTE': progress = 25; break;
                    case 'CONFECCION': progress = 50; break;
                    case 'TAPICERIA': progress = 75; break;
                    case 'CONTROL_CALIDAD': progress = 90; break;
                    case 'LISTO_ENVIO': progress = 100; break;
                    default: progress = 5;
                }

                return {
                    ...order,
                    customer_name: order.customer_name || specs.customer_name || "Cliente Final",
                    region: order.region || specs.region || "PENÍNSULA",
                    fabric,
                    color,
                    stage_progress: progress,
                    days_elapsed: days,
                    quantity_total: order.quantity_total || specs.quantity || 1
                };
            });

            setOrders(transformed);
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const getDueDateBadge = (order: WorkOrderExtended) => {
        if (!order.due_date) {
            return { label: 'Sin fecha', color: 'text-gray-400 bg-gray-900/20 border-gray-500/30' };
        }
        const days = Math.ceil((new Date(order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (days <= 0) return { label: 'VENCIDO', color: 'text-red-300 bg-red-900/30 border-red-500/30 animate-pulse' };
        if (days <= 2) return { label: `${days} días`, color: 'text-amber-300 bg-amber-900/30 border-amber-500/30' };
        return { label: `${days} días`, color: 'text-emerald-300 bg-emerald-900/20 border-emerald-500/30' };
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col">
            {/* HEADER */}
            <header className="px-8 py-6 flex items-center justify-between bg-black border-b border-white/10">
                <div className="flex items-center gap-6">
                    {/* LOGO: Using absolute path to public folder image */}
                    <img src="/img/Egea- Evolucio Gold.png" alt="Egea Gold" className="h-12 w-auto object-contain" />
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-wider text-white uppercase flex items-center gap-3">
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
                    <div className="text-6xl font-mono font-bold tracking-tight leading-none text-white">
                        {format(currentTime, "HH:mm")}
                    </div>
                    <div className="text-lg text-gray-400 font-medium uppercase tracking-widest mt-1">
                        {format(currentTime, "d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                </div>
            </header>

            {/* TABLE HEADER */}
            <div className="px-8 py-4 bg-[#111] grid grid-cols-12 gap-4 text-gray-500 font-bold text-sm uppercase tracking-wider border-b border-white/5">
                <div className="col-span-2">PEDIDO / REF</div>
                <div className="col-span-2">CLIENTE</div>
                <div className="col-span-2">MATERIAL</div>
                <div className="col-span-1">BULTOS</div>
                <div className="col-span-3">PROGRESO</div>
                <div className="col-span-2 text-right">ESTADO</div>
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
                        const getBorderColor = () => {
                            if (!order.due_date) return 'border-l-gray-600';
                            const days = Math.ceil((new Date(order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            if (days <= 0) return 'border-l-red-500'; // Vencido
                            if (days <= 2) return 'border-l-amber-500'; // Urgente
                            return 'border-l-[#D4AF37]'; // Normal (Egea Gold)
                        };

                        return (
                            <div key={order.id} className={`grid grid-cols-12 gap-4 items-center bg-[#1A1D1F] p-4 rounded-lg border-l-4 ${getBorderColor()} shadow-lg animate-in fade-in duration-500`}>

                                {/* COL 1: REF */}
                                <div className="col-span-2">
                                    <div className="text-2xl font-black text-white">{order.order_number}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">{order.id.slice(0, 8)}</div>
                                </div>

                                {/* COL 2: CLIENTE */}
                                <div className="col-span-2">
                                    <div className="text-white font-bold text-base truncate">{order.customer_name}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">{order.region}</div>
                                </div>

                                {/* COL 3: MATERIAL */}
                                <div className="col-span-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-300 font-bold text-sm">{order.fabric}</span>
                                        <span className="text-gray-600">·</span>
                                        <span className="text-gray-400 text-xs">{order.color}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        {order.quantity_total} uds
                                    </div>
                                </div>

                                {/* COL 4: BULTOS - NEW COLUMN */}
                                <div className="col-span-1">
                                    {order.packages_count ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <Package className="w-5 h-5 text-emerald-500" />
                                            <span className="text-sm font-black text-white">{order.packages_count}</span>
                                        </div>
                                    ) : (
                                        <div className="text-gray-600 text-xs text-center">-</div>
                                    )}
                                </div>

                                {/* COL 5: PROGRESO */}
                                <div className="col-span-3 pr-8">
                                    <div className="flex justify-between text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
                                        <span>{order.stage_progress}%</span>
                                        <span>{order.quantity_total} uds</span>
                                    </div>
                                    <Progress value={order.stage_progress} className="h-3 bg-black/50" indicatorClassName="bg-[#D4AF37]" />
                                    <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-wide text-right font-bold">Fase: {order.status}</div>
                                </div>

                                {/* COL 6: ESTADO - SINGLE LINE (matching ShippingBoardPage) */}
                                <div className="col-span-2 flex items-center justify-end gap-3">
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
                                    <div className="text-center bg-[#0F1113] border border-[#45474A]/60 rounded-lg px-3 py-1.5">
                                        <span className="text-2xl font-black text-white tracking-tighter">{order.days_elapsed}</span>
                                        <span className="text-xs text-gray-500 uppercase font-bold ml-1">{order.days_elapsed === 1 ? 'día' : 'días'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FOOTER LEGEND */}
            <footer className="px-8 py-3 bg-black border-t border-white/5 flex gap-8 justify-end text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div> Prioridad Alta</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> En Proceso</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-700"></div> En Espera</div>
            </footer>
        </div>
    );
}
