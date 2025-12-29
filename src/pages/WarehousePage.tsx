import React, { useState } from 'react';
import { useInventory, useUpdateInventoryStatus, useShipments, useCreateShipment, InventoryStatus, useShipmentItems, useUpdateShipmentStatus, useAddShipmentItems, Shipment } from '@/hooks/use-logistics';
import ShippingModule from '@/components/logistics/ShippingModule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Package,
    Truck,
    Box,
    LayoutGrid,
    Search,
    Filter,
    ArrowUpRight,
    ClipboardCheck,
    MapPin,
    Calendar,
    AlertCircle,
    Printer,
    FileText,
    ExternalLink,
    ChevronRight,
    Plane,
    Anchor,
    Download
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ShippingLabel from '@/components/logistics/ShippingLabel';
import Roadmap from '@/components/logistics/Roadmap';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Edit2, Save } from "lucide-react";
const INVENTORY_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    'EN_ALMACEN': { label: 'En Almacén', color: 'bg-blue-500/10 text-blue-400' },
    'EMBALADO': { label: 'Embalado', color: 'bg-purple-500/10 text-purple-400' },
    'EN_REPARTO': { label: 'En Reparto', color: 'bg-amber-500/10 text-amber-400' },
    'ENTREGADO': { label: 'Entregado', color: 'bg-emerald-500/10 text-emerald-400' },
    'DEVUELTO': { label: 'Devuelto', color: 'bg-rose-500/10 text-rose-400' },
};

const WarehousePage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [printItem, setPrintItem] = useState<any | null>(null);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [showRoadmap, setShowRoadmap] = useState(false);

    const { data: inventory, isLoading: loadingInv } = useInventory();
    const { data: shipments, isLoading: loadingShip } = useShipments();
    const { data: shipmentItems } = useShipmentItems(selectedShipment?.id || '');

    const updateStatus = useUpdateInventoryStatus();
    const updateShipment = useUpdateShipmentStatus();
    const createShipment = useCreateShipment();
    const addShipmentItems = useAddShipmentItems();

    const filteredInventory = inventory?.filter(item =>
        item.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleItemSelection = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCreateShipment = async () => {
        if (selectedItems.length === 0) {
            toast.error("Seleccione al menos un bulto para el envío");
            return;
        }

        try {
            // 1. Crear el envío
            const newShipment = await createShipment.mutateAsync({
                carrier_name: "Reparto Propio",
                recipient_name: "CLIENTE FINAL", // TODO: Obtener de bultos
                delivery_address: "Dirección pendiente",
                delivery_city: "Ciudad pendiente"
            });

            // 2. Vincular items
            await addShipmentItems.mutateAsync({
                shipmentId: newShipment.id,
                inventoryIds: selectedItems
            });

            setSelectedItems([]);
            // toast success ya está en los hooks
        } catch (err) {
            console.error(err);
            toast.error("Error al crear la expedición");
        }
    };

    return (
        <div className="p-6 space-y-8 bg-slate-950 min-h-screen text-slate-200">
            {/* Header Estándar Unificado */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Package className="h-8 w-8 text-blue-500" />
                        Gestión de Almacén
                    </h1>
                    <p className="text-slate-400 mt-1">Control de inventario, expediciones y logística.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Buscar bulto..."
                            className="pl-9 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500 w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards Estándar Unificadas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <span className="text-sm font-medium text-slate-400">Bultos en Stock</span>
                        <Box className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{inventory?.filter(i => i.status === 'EN_ALMACEN').length || 0}</div>
                        <p className="text-xs text-slate-500">Total almacenado</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <span className="text-sm font-medium text-purple-500">Listos para Envío</span>
                        <ClipboardCheck className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{inventory?.filter(i => i.status === 'EMBALADO').length || 0}</div>
                        <p className="text-xs text-slate-500">Preparados</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <span className="text-sm font-medium text-amber-500">En Tránsito</span>
                        <Truck className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{inventory?.filter(i => i.status === 'EN_REPARTO').length || 0}</div>
                        <p className="text-xs text-slate-500">En reparto</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <span className="text-sm font-medium text-emerald-500">Expediciones Hoy</span>
                        <MapPin className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{shipments?.length || 0}</div>
                        <p className="text-xs text-slate-500">Salidas registradas</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="shipping" className="w-full">
                <TabsList className="bg-slate-900 border-slate-800">
                    <TabsTrigger value="inventory" className="gap-2">
                        <Box className="h-4 w-4" /> Inventario
                    </TabsTrigger>
                    <TabsTrigger value="shipments" className="gap-2">
                        <Truck className="h-4 w-4" /> Expediciones
                    </TabsTrigger>
                    <TabsTrigger value="shipping" className="gap-2">
                        <Plane className="h-4 w-4" /> Salidas / Picking
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="inventory" className="space-y-6 mt-6">
                    <div className="flex justify-between items-center bg-slate-900/30 p-4 rounded-lg border border-slate-800">
                        <p className="text-sm font-medium text-slate-400">
                            {selectedItems.length} bultos seleccionados
                        </p>
                        <Button
                            disabled={selectedItems.length === 0}
                            onClick={handleCreateShipment}
                            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Truck className="w-4 h-4" /> Crear Expedición
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredInventory?.map((item) => (
                            <Card
                                key={item.id}
                                className={`bg-slate-900/60 border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer ${selectedItems.includes(item.id) ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''}`}
                                onClick={() => toggleItemSelection(item.id)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded-lg">
                                                <Package className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-white">{item.order_number}</h4>
                                                <p className="text-xs font-medium text-slate-500 uppercase">ORDEN #{item.order_number.split('-')[1] || '00'}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`${INVENTORY_STATUS_CONFIG[item.status]?.color} border-0`}>
                                            {INVENTORY_STATUS_CONFIG[item.status]?.label}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                            <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Ubicación</p>
                                            <p className="text-sm font-medium text-slate-200">
                                                {item.rack ? `${item.rack}-${item.shelf}` : 'Sin asignar'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                            <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Dimensiones</p>
                                            <p className="text-sm font-medium text-slate-200">{item.dimensions_cm || '--'}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); setPrintItem(item); }}
                                                className="h-8 w-8 text-slate-400 hover:text-white"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {(filteredInventory?.length === 0 || !filteredInventory) && (
                            <div className="col-span-full py-12 text-center text-slate-500">
                                No se encontraron bultos en el inventario
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="shipments">
                    <div className="grid grid-cols-1 gap-4">
                        {shipments?.map((shipment) => (
                            <Card
                                key={shipment.id}
                                className="bg-slate-900/60 border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all cursor-pointer group"
                                onClick={() => setSelectedShipment(shipment)}
                            >
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20 group-hover:bg-blue-600/20 transition-colors">
                                            <Truck className="w-8 h-8 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-white flex items-center gap-2">
                                                {shipment.tracking_number || `EXP-${shipment.id.slice(0, 8).toUpperCase()}`}
                                                <ExternalLink className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </h4>
                                            <div className="flex gap-4 mt-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {shipment.delivery_city || 'Destino pendiente'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {new Date(shipment.created_at || '').toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Badge className="bg-slate-800/50 text-slate-400 font-black text-[10px] uppercase border border-slate-700 py-1.5 px-3 rounded-lg">
                                            {shipment.carrier_name || 'Sin transportista'}
                                        </Badge>
                                        <Badge className={`font-black text-[10px] uppercase border-none py-1.5 px-3 rounded-lg ${shipment.status === 'TRANSITO' ? 'bg-amber-500/20 text-amber-400' :
                                            shipment.status === 'ENTREGADO' ? 'bg-emerald-500/20 text-emerald-400' :
                                                'bg-blue-600 text-white'
                                            }`}>
                                            {shipment.status || 'PENDIENTE'}
                                        </Badge>
                                        <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {(shipments?.length === 0 || !shipments) && (
                            <div className="py-20 text-center text-slate-600 uppercase font-black text-xs tracking-widest">
                                No hay expediciones registradas
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="shipping">
                    <ShippingModule />
                </TabsContent>
            </Tabs>

            {/* Modal de Impresión de Etiqueta */}
            <Dialog open={!!printItem} onOpenChange={(open) => !open && setPrintItem(null)}>
                <DialogContent className="max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-slate-800">
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Printer className="w-5 h-5 text-blue-500" /> Previsualización de Etiqueta
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-8 bg-slate-950/50 flex justify-center">
                        {printItem && <ShippingLabel item={printItem} />}
                    </div>
                    <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setPrintItem(null)} className="border-slate-800 text-slate-400">Cancelar</Button>
                        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2">
                            <Printer className="w-4 h-4" /> Confirmar e Imprimir
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Detalle de Expedición */}
            <Dialog open={!!selectedShipment} onOpenChange={(open) => !open && setSelectedShipment(null)}>
                <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 p-0 overflow-hidden rounded-3xl">
                    <DialogHeader className="p-8 border-b border-slate-800 bg-slate-900/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/20 mb-2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                                    Detalle de Expedición
                                </Badge>
                                <DialogTitle className="text-3xl font-black text-white uppercase italic">
                                    {selectedShipment?.tracking_number || `EXP-${selectedShipment?.id.slice(0, 8).toUpperCase()}`}
                                </DialogTitle>
                            </div>
                            <Badge className="bg-blue-600 text-white font-black text-xs py-2 px-4 rounded-xl uppercase border-none">
                                {selectedShipment?.status}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <div className="p-8 grid grid-cols-2 gap-8">
                        {/* Info Destino */}
                        <div className="space-y-6">
                            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500" /> Datos de Entrega
                                </h3>
                                <div className="space-y-1">
                                    <p className="text-xl font-bold text-white">{selectedShipment?.recipient_name || 'Nombre no definido'}</p>
                                    <p className="text-sm text-slate-400">{selectedShipment?.delivery_address}</p>
                                    <p className="text-sm font-bold text-blue-400 uppercase">{selectedShipment?.delivery_city}</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    onClick={() => setShowRoadmap(true)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-xs py-6 rounded-2xl gap-2 h-auto"
                                >
                                    <FileText className="w-5 h-5" /> Hoja de Ruta
                                </Button>
                                <Button
                                    disabled={selectedShipment?.status !== 'PENDIENTE'}
                                    onClick={async () => {
                                        await updateShipment.mutateAsync({ id: selectedShipment!.id, status: 'TRANSITO' });
                                        setSelectedShipment(prev => prev ? { ...prev, status: 'TRANSITO' } : null);
                                    }}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs py-6 rounded-2xl gap-2 h-auto shadow-lg shadow-blue-500/20"
                                >
                                    <Truck className="w-5 h-5" /> Despachar
                                </Button>
                            </div>
                        </div>

                        {/* Listado de Bultos */}
                        <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col h-[300px]">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-500" /> Bultos Incluidos ({shipmentItems?.length})
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {shipmentItems?.map(item => (
                                    <div key={item.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center group">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tighter">{item.order_number}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{item.packaging_type || 'Estándar'} • {item.weight_kg || '0.00'} kg</p>
                                        </div>
                                        <Printer className="w-4 h-4 text-slate-700 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Roadmap (Z-Index alto para impresión) */}
            <Dialog open={showRoadmap} onOpenChange={setShowRoadmap}>
                <DialogContent className="max-w-4xl bg-white border-none shadow-none p-0 overflow-hidden">
                    <div className="p-0 flex flex-col items-center">
                        {selectedShipment && shipmentItems && (
                            <Roadmap shipment={selectedShipment} items={shipmentItems} />
                        )}
                        <div className="fixed bottom-8 flex gap-4 print:hidden">
                            <Button variant="outline" onClick={() => setShowRoadmap(false)} className="bg-slate-900 border-slate-800 text-white rounded-xl">Cerrar</Button>
                            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl gap-2">
                                <Printer className="w-4 h-4" /> Imprimir Hoja de Ruta
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WarehousePage;
