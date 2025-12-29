import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ShoppingCart,
    Package,
    Eye,
    Plus,
    LayoutList,
    History,
} from "lucide-react";
import { useOrders } from "@/hooks/use-orders";
import { cn } from "@/lib/utils";
import { OrderDetailModal } from "@/components/commercial/OrderDetailModal";
import { CalendarModule } from "@/components/dashboard/CalendarModule";
import { OrderStatus } from "@/types/commercial";
import { toast } from "sonner";

// Status Badge Configuration
const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
        'PENDIENTE_PAGO': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'PAGADO': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'EN_PRODUCCION': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        'LISTO_ENVIO': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'ENVIADO': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        'ENTREGADO': 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
        'CANCELADO': 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return badges[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
};

export default function CommercialPage() {
    const { data: orders = [], isLoading } = useOrders();
    const [newOrderModal, setNewOrderModal] = useState(false);
    const [comment, setComment] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const activeOrders = orders.filter(o => o.status !== 'ENVIADO' && o.status !== 'CANCELADO');
    const archivedOrders = orders.filter(o => o.status === 'ENVIADO' || o.status === 'CANCELADO');
    const displayedOrders = viewMode === 'ACTIVE' ? activeOrders : archivedOrders;

    const validateOrderReadyForProduction = (order: any): { valid: boolean, error?: string } => {
        if (!order.admin_code || order.admin_code.trim() === '') {
            return { valid: false, error: 'Falta el Número de Pedido (Ref. Administración).' };
        }
        const hasPresupuesto = order.documents?.some((d: any) => d.type === 'PRESUPUESTO');
        const hasPedido = order.documents?.some((d: any) => d.type === 'PEDIDO_ACEPTADO');
        if (!hasPresupuesto || !hasPedido) {
            return { valid: false, error: 'Falta subir Presupuesto o Pedido Aceptado.' };
        }
        if (!order.lines || order.lines.length === 0) {
            return { valid: false, error: 'El desglose de medidas está vacío.' };
        }
        return { valid: true };
    };

    const handleCreateOrder = async () => {
        const orderNum = `INT-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        try {
            toast.success(`Pedido ${orderNum} creado en DB`);
            setNewOrderModal(false);
        } catch (error) {
            toast.error('Error al crear pedido');
        }
    };

    const changeStatus = async (order: any, newStatus: OrderStatus) => {
        if (!comment) {
            toast.error('Comentario obligatorio');
            return;
        }
        if (newStatus === 'PAGADO') {
            const check = validateOrderReadyForProduction(order);
            if (!check.valid) {
                toast.error(`NO SE PUEDE ENVIAR A PRODUCCIÓN:\n${check.error}`);
                return;
            }
        }
        try {
            toast.success(`Estado cambiado a ${newStatus}: ${comment}`);
            setComment('');
        } catch (error) {
            toast.error('Error al cambiar estado');
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 min-h-screen" style={{ backgroundColor: '#0F1419' }}>
            {/* Header - Exact match to Instalaciones */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <ShoppingCart className="h-6 w-6 text-emerald-400" />
                    <h1 className="text-xl font-bold text-white">Gestión Comercial</h1>
                    <span className="text-sm text-gray-500">Administración de pedidos y clientes</span>
                </div>
                <Button
                    onClick={() => setNewOrderModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Pedido
                </Button>
            </div>

            {/* Calendar - NO CARD WRAPPER, direct integration like Instalaciones */}
            <div className="w-full">
                <CalendarModule selectedDate={selectedDate} onDateSelect={setSelectedDate} />
            </div>

            {/* Tabs - Matching Instalaciones style */}
            <div className="flex items-center gap-6 border-b border-gray-800">
                <button
                    onClick={() => setViewMode('ACTIVE')}
                    className={cn(
                        "flex items-center gap-2 px-1 py-3 border-b-2 transition-colors text-sm font-medium",
                        viewMode === 'ACTIVE' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                    )}
                >
                    <LayoutList className="w-4 h-4" />
                    Pedidos Activos
                    <Badge variant="secondary" className="ml-1 bg-gray-800 text-gray-400 text-xs">{activeOrders.length}</Badge>
                </button>
                <button
                    onClick={() => setViewMode('ARCHIVED')}
                    className={cn(
                        "flex items-center gap-2 px-1 py-3 border-b-2 transition-colors text-sm font-medium",
                        viewMode === 'ARCHIVED' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                    )}
                >
                    <History className="w-4 h-4" />
                    Historial
                    <Badge variant="secondary" className="ml-1 bg-gray-800 text-gray-400 text-xs">{archivedOrders.length}</Badge>
                </button>
            </div>

            {/* Orders Grid */}
            {isLoading ? (
                <div className="text-center py-20 text-gray-500">Cargando pedidos...</div>
            ) : displayedOrders.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-800 rounded-lg">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500">No se encontraron pedidos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayedOrders.map(order => (
                        <Card key={order.id} className="bg-[#1A1F26] border-gray-800 hover:border-gray-700 transition-all">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-sm font-mono text-white">{order.order_number}</CardTitle>
                                        <CardDescription className={cn("text-xs font-medium mt-1", order.admin_code ? 'text-gray-500' : 'text-red-400')}>
                                            {order.admin_code || 'FALTA REF. ADMIN'}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5", getStatusBadge(order.status))}>
                                        {order.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-600 uppercase font-medium">Cliente</p>
                                        <p className="text-sm text-gray-300 font-medium truncate">{order.customer_name}</p>
                                    </div>
                                    {order.region && (
                                        <div>
                                            <p className="text-xs text-gray-600 uppercase font-medium">Región</p>
                                            <p className="text-sm text-gray-400">{order.region}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardContent className="pt-3 border-t border-gray-800 bg-[#151A1F]">
                                <div className="flex items-center justify-between gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 text-xs h-8">
                                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver / Editar
                                    </Button>
                                    {order.status === 'PENDIENTE_PAGO' && (
                                        <div className="flex gap-2">
                                            <Input type="text" placeholder="Nota..." className="h-7 w-20 text-xs bg-[#0F1419] border-gray-800 text-white" value={comment} onChange={(e) => setComment(e.target.value)} />
                                            <Button size="sm" onClick={() => changeStatus(order, 'PAGADO')} className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-2 font-bold">
                                                VALIDAR
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* New Order Modal */}
            {newOrderModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card className="bg-[#1A1F26] border-gray-800 w-full max-w-md">
                        <CardHeader>
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                                <Package className="w-6 h-6 text-emerald-400" />
                            </div>
                            <CardTitle className="text-xl text-white">Crear Nuevo Pedido</CardTitle>
                            <CardDescription className="text-gray-500">Se insertará un nuevo registro en la base de datos industrial de EgeaOS.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setNewOrderModal(false)} className="text-gray-500 hover:text-white">Cancelar</Button>
                                <Button onClick={handleCreateOrder} className="bg-emerald-500 hover:bg-emerald-600 text-white">Crear en DB</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <OrderDetailModal
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    order={selectedOrder}
                    onSave={() => setSelectedOrder(null)}
                />
            )}
        </div>
    );
}
