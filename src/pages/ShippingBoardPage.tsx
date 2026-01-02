import { useState, useEffect } from "react";
import { supabaseProductivity } from "@/integrations/supabase/dual-client";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Truck, Package, Clock, CheckCircle2 } from "lucide-react";

interface ShippingOrder {
    id: string;
    order_number: string;
    customer_name: string;
    status: string;
    region: string;
    fabric: string;
    color: string;
    quantity_total: number;
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
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export default function ShippingBoardPage() {
    const [orders, setOrders] = useState<ShippingOrder[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Clock Ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
            .or("status.eq.PTE_ENVIO,status.eq.LISTO_ENVIO,and(status.eq.EN_PROCESO,needs_shipping_validation.eq.true),status.eq.ENVIADO")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(20);

        if (error) {
            console.error("Error fetching shipping board data:", error);
            return;
        }

        // Transform data for display
        const transformed = (data || []).map((order: any) => {
            const specs = order.technical_specs || {};
            const fabric = specs.fabric || order.fabric || "Estándar";
            const color = specs.color || order.color || "N/D";

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
                order.status === "ENVIADO" &&
                order.shipping_date &&
                Date.now() - new Date(order.shipping_date).getTime() < TWELVE_HOURS_MS;

            // Calculate days elapsed
            const daysElapsed = Math.floor(
                (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                ...order,
                customer_name: order.customer_name || specs.customer_name || "Cliente Final",
                region: order.region || specs.region || "PENÍNSULA",
                fabric,
                color,
                quantity_total: order.quantity_total || specs.quantity || 1,
                packageProgress,
                isUrgent,
                isRecentShipment,
                daysElapsed,
            } as ShippingOrder;
        });

        setOrders(transformed);
    };

    const getStatusBadge = (order: ShippingOrder) => {
        if (order.status === "ENVIADO") {
            return { label: "Enviado", color: "bg-gray-900/20 text-gray-400 border-gray-500/30" };
        }
        if (order.status === "LISTO_ENVIO") {
            return { label: "Listo", color: "bg-emerald-900/20 text-emerald-300 border-emerald-500/30" };
        }
        if (order.status === "PTE_ENVIO") {
            return { label: "Pendiente", color: "bg-blue-900/20 text-blue-300 border-blue-500/30" };
        }
        return { label: order.status, color: "bg-gray-900/20 text-gray-400 border-gray-500/30" };
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col">
            {/* HEADER */}
            <header className="px-8 py-6 flex items-center justify-between bg-black border-b border-white/10">
                <div className="flex items-center gap-6">
                    <img src="/img/Egea- Evolucio Gold.png" alt="Egea Gold" className="h-12 w-auto object-contain" />
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-wider text-white uppercase flex items-center gap-3">
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
                <div className="col-span-3">CLIENTE / DESTINO</div>
                <div className="col-span-3">MATERIAL / BULTOS</div>
                <div className="col-span-2">TRACKING</div>
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
                        return (
                            <div
                                key={order.id}
                                className={`grid grid-cols-12 gap-4 items-center bg-[#1A1D1F] p-4 rounded-lg shadow-lg animate-in fade-in duration-500 ${order.isUrgent ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-[#D4AF37]"
                                    }`}
                            >
                                {/* COL 1: REF */}
                                <div className="col-span-2">
                                    <div className="text-2xl font-black text-white">{order.order_number}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">{order.admin_code || order.id.slice(0, 8)}</div>
                                </div>

                                {/* COL 2: CLIENTE / DESTINO */}
                                <div className="col-span-3">
                                    <div className="text-white font-bold text-lg truncate w-[90%]">{order.customer_name}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">{order.region}</div>
                                    {order.delivery_address && (
                                        <div className="text-xs text-gray-600 truncate w-[90%] mt-0.5">{order.delivery_address}</div>
                                    )}
                                </div>

                                {/* COL 3: MATERIAL / BULTOS */}
                                <div className="col-span-3">
                                    <div className="text-gray-300 font-medium">{order.fabric}</div>
                                    <div className="text-sm text-gray-500 mb-2">{order.color}</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-gray-400 font-bold">
                                            <span>BULTOS</span>
                                            <span>
                                                {order.scanned_packages}/{order.packages_count}
                                            </span>
                                        </div>
                                        <Progress
                                            value={order.packageProgress}
                                            className="h-2 bg-black/50"
                                            indicatorClassName={order.packageProgress === 100 ? "bg-emerald-500" : "bg-amber-500"}
                                        />
                                    </div>
                                </div>

                                {/* COL 4: TRACKING */}
                                <div className="col-span-2">
                                    {order.tracking_number ? (
                                        <>
                                            <div className="text-white font-mono font-bold text-sm">{order.tracking_number}</div>
                                            {order.shipping_date && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {format(new Date(order.shipping_date), "dd/MM/yyyy HH:mm")}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-gray-600 text-sm italic">Sin tracking</div>
                                    )}
                                </div>

                                {/* COL 5: ESTADO */}
                                <div className="col-span-2 flex flex-col items-end gap-2">
                                    {order.isUrgent && (
                                        <div className="flex items-center gap-1 bg-amber-900/20 border border-amber-500/30 px-2 py-1 rounded-full">
                                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                                            <span className="text-xs font-bold text-amber-400 uppercase">URGENTE</span>
                                        </div>
                                    )}
                                    <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase ${statusBadge.color}`}>
                                        {statusBadge.label}
                                    </div>
                                    <div className="text-center">
                                        <span className="text-2xl font-bold text-white tracking-tighter">{order.daysElapsed}</span>
                                        <span className="text-xs text-gray-500 uppercase font-bold ml-1">días</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FOOTER LEGEND */}
            <footer className="px-8 py-3 bg-black border-t border-white/5 flex gap-8 justify-end text-[10px] text-gray-500 uppercase font-bold tracking-widest">
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
