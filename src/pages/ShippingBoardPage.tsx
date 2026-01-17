import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseProductivity } from "@/integrations/supabase";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CheckCircle2, Package, Truck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { summarizeMaterials } from "@/lib/materials";

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
    packages_count: number;
    scanned_packages: number;
    shipping_date?: string;
    created_at: string;
    admin_code?: string;
    packageProgress: number;
    isUrgent: boolean;
    isRecentShipment: boolean;
    due_date?: string | null;
    lines?: any[];
    dueBadge: { label: string; color: string; boxValue: string; boxLabel: string };
    needs_shipping_validation?: boolean;
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
            return (data as any)?.config;
        }
    });

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

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        const { data: ordersData, error: ordersError } = await supabaseProductivity
            .from("produccion_work_orders")
            .select("*")
            .or("status.eq.PTE_ENVIO,status.eq.LISTO_ENVIO,status.eq.TERMINADO,and(status.eq.EN_PROCESO,needs_shipping_validation.eq.true),status.eq.ENVIADO,status.eq.ENTREGADO")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(200);

        if (ordersError) {
            console.error("Error fetching shipping board data:", ordersError);
            return;
        }

        const { data: linesData } = await supabaseProductivity
            .from("produccion_work_order_lines")
            .select("*")
            .in("work_order_id", ordersData?.map((o: any) => o.id) || []);

        const orderNumbers = ordersData?.map((o: any) => o.order_number).filter(Boolean) || [];
        const adminCodes = ordersData?.map((o: any) => o.admin_code).filter(Boolean) || [];
        let commercialOrders: any[] | null = null;
        if (orderNumbers.length > 0 || adminCodes.length > 0) {
            const escapedOrders = orderNumbers
                .map((value: any) => `"${String(value).replace(/"/g, '""')}"`)
                .join(',');
            const escapedAdmins = adminCodes
                .map((value: any) => `"${String(value).replace(/"/g, '""')}"`)
                .join(',');
            const orFilters = [
                escapedOrders ? `order_number.in.(${escapedOrders})` : null,
                escapedAdmins ? `admin_code.in.(${escapedAdmins})` : null
            ].filter(Boolean).join(',');
            const { data } = await supabaseProductivity
                .from('comercial_orders')
                .select('order_number, admin_code, lines, fabric')
                .or(orFilters);
            commercialOrders = data as any[] | null;
        }

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

        const transformed = (ordersData || []).map((order: any) => {
            const commOrder = commercialOrders?.find((c: any) =>
                c.order_number === order.order_number ||
                (order.admin_code && c.admin_code === order.admin_code) ||
                c.admin_code === order.order_number
            );
            const specs = order.technical_specs || {};

            const commLines = Array.isArray(commOrder?.lines) ? commOrder.lines : [];
            const orderLines = Array.isArray(order.lines) ? order.lines : [];
            const relLines = linesData?.filter((l: any) => l.work_order_id === order.id) || [];
            const lines = [...commLines, ...orderLines, ...relLines].filter(Boolean);
            const materialList = summarizeMaterials(lines, "N/D");

            const colorList = lines.length > 0
                ? lines.map((l: any) => l.color).filter(Boolean).join(", ")
                : (specs.color || order.color || "N/D");

            const nStatus = normalizeStatus(order.status);
            const now = new Date();
            const due = order.due_date ? new Date(order.due_date) : null;
            const diffDays = due ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

            let dueBadge = { label: "SIN FECHA", color: "bg-gray-100 text-gray-500 border-gray-200", boxValue: "-", boxLabel: "DÍAS" };
            if (diffDays !== null) {
                if (diffDays < 0) {
                    dueBadge = {
                        label: "VENCIDO",
                        color: "bg-red-100 text-red-600 border-red-200",
                        boxValue: Math.abs(diffDays).toString(),
                        boxLabel: Math.abs(diffDays) === 1 ? "DÍA" : "DÍAS"
                    };
                } else {
                    dueBadge = {
                        label: diffDays <= 3 ? "URGENTE" : "A TIEMPO",
                        color: diffDays <= 3 ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-emerald-100 text-emerald-600 border-emerald-200",
                        boxValue: diffDays.toString(),
                        boxLabel: diffDays === 1 ? "DÍA" : "DÍAS"
                    };
                }
            }

            return {
                ...order,
                order_number: order.order_number || order.work_order_number || order.id,
                customer_name: order.customer_company || order.customer_name || specs.customer_name || "Cliente Final",
                region: order.region || specs.region || "PENINSULA",
                fabric: materialList || "N/D",
                color: colorList || "N/D",
                quantity_total: order.quantity_total || order.quantity || specs.quantity || 1,
                packageProgress: order.packages_count ? (order.scanned_packages / order.packages_count) * 100 : 0,
                isUrgent: order.needs_shipping_validation || (diffDays !== null && diffDays <= 2),
                isRecentShipment: nStatus === "ENVIADO" && order.shipping_date && (Date.now() - new Date(order.shipping_date).getTime() < TWELVE_HOURS_MS),
                dueBadge,
                status: nStatus,
                lines
            };
        });

        setOrders(transformed as any);
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
    };

    return (
        <div className={cn("min-h-screen font-sans overflow-hidden flex flex-col", colors.page)}>
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

            <div className={cn("px-8 py-4 grid grid-cols-12 gap-4 font-bold text-sm uppercase tracking-wider border-b", colors.tableHeader)}>
                <div className="col-span-2">PEDIDO / REF</div>
                <div className="col-span-2">CLIENTE</div>
                <div className="col-span-3">MATERIAL</div>
                <div className="col-span-1">UNIDADES</div>
                <div className="col-span-2">BULTOS</div>
                <div className="col-span-2 text-right">ESTADO</div>
            </div>

            <div className="flex-1 px-8 py-4 space-y-3 overflow-y-auto custom-scrollbar">
                {orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-4 opacity-50">
                        <Truck className="w-24 h-24" />
                        <span className="text-2xl font-light uppercase tracking-widest">Esperando Envíos...</span>
                    </div>
                ) : (
                    orders.map((order) => {
                        const getMarkerStyle = () => {
                            if (order.status === "ENVIADO") return { color: 'bg-gray-600', pulse: false };
                            if (order.dueBadge.label === "VENCIDO") return { color: 'bg-red-400', pulse: true };
                            if (order.dueBadge.label === "URGENTE") return { color: 'bg-amber-500', pulse: false };
                            return { color: 'bg-[#D4AF37]', pulse: false };
                        };

                        return (
                            <div key={order.id} className={cn("relative grid grid-cols-12 gap-4 items-center p-4 rounded-lg shadow-lg pl-7", colors.row, getMarkerStyle().pulse && "bg-red-500/10 animate-pulse")}>
                                {(() => {
                                    const marker = getMarkerStyle();
                                    return <span className={cn("absolute left-0 top-0 h-full w-3 rounded-l-lg", marker.color, marker.pulse && "shadow-[0_0_12px_2px_rgba(248,113,113,0.6)]")} />;
                                })()}
                                <div className="col-span-2">
                                    <div className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>{order.order_number}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">{order.admin_code || order.id.slice(0, 8)}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className={cn("text-2xl font-black truncate", isLight ? "text-slate-900" : "text-white")}>{order.customer_name}</div>
                                    <div className={cn("text-2xl font-black uppercase tracking-wider mt-1", isLight ? "text-slate-900" : "text-white")}>{order.region}</div>
                                </div>
                                <div className="col-span-3">
                                    <div className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-gray-300")}>{order.fabric}</div>
                                    <div className={cn("text-2xl font-black mb-2", isLight ? "text-slate-900" : "text-gray-400")}>{order.color}</div>
                                    {order.lines && order.lines.some((l: any) => l.material || l.fabric || (l.width && l.height)) && (
                                        <div className="space-y-1 mt-2 border-t border-white/5 pt-2">
                                            {order.lines
                                                .filter((l: any) => l.material || l.fabric || (l.width && l.height))
                                                .map((l: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center text-[10px] font-bold uppercase opacity-70">
                                                        <span>{l.quantity}x {l.material || l.fabric || 'Pieza'}</span>
                                                        {l.width && l.height && <span>{l.width}x{l.height}</span>}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-1">
                                    <div className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>{order.quantity_total} uds</div>
                                </div>
                                <div className="col-span-2 pr-10">
                                    <div className="flex items-center gap-3">
                                        <Package className={`w-8 h-8 ${order.packageProgress === 100 ? 'text-emerald-500' : order.packageProgress >= 50 ? 'text-blue-400' : 'text-amber-500'}`} />
                                        <div className="flex-1">
                                            <div className={cn("text-2xl font-black mb-1", isLight ? "text-slate-900" : "text-white")}>
                                                {order.scanned_packages || 0}/{order.packages_count || 1}
                                            </div>
                                            <Progress
                                                value={order.packageProgress}
                                                className={cn("h-3", colors.progress)}
                                                indicatorClassName={order.packageProgress === 100 ? "bg-emerald-500" : order.packageProgress >= 50 ? "bg-blue-500" : "bg-amber-500"}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-wide text-right font-bold">Fase: {order.status}</div>
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-3">
                                    <div className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase ${order.dueBadge.color}`}>{order.dueBadge.label}</div>
                                    <div className={cn("text-center border rounded-lg px-3 py-1.5 min-w-[80px]", colors.stat)}>
                                        <span className={cn("text-2xl font-black tracking-tighter", isLight ? "text-slate-900" : "text-white")}>{order.dueBadge.boxValue}</span>
                                        <span className="text-[10px] text-gray-500 uppercase font-black ml-1">{order.dueBadge.boxLabel}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <footer className={cn("px-8 py-3 border-t flex gap-8 justify-end text-[10px] uppercase font-bold tracking-widest", colors.footer)}>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Urgente
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div> Egea Gold
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div> Vencido
                </div>
            </footer>
        </div>
    );
}
