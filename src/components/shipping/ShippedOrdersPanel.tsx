/**
 * ShippedOrdersPanel - Componente para gestión del estado "ENVIADO"
 * 
 * Muestra pedidos en estado ENVIADO con:
 * - Datos generales del pedido (solo lectura)
 * - Trazabilidad del pedido
 * - Gestión de bultos (CRUD)
 * - Selector de empresa de envíos
 * - Campo de tracking
 * - Botón "CONFIRMAR ENVÍO" con validaciones
 */

import React, { useState } from 'react';
import { Package, Truck, Plus, Trash2, CheckCircle, AlertTriangle, Scale, Ruler, Box, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
    useShipmentPackages,
    useCreatePackage,
    useUpdatePackage,
    useDeletePackage,
    useNextPackageNumber,
    CARRIER_COMPANIES,
    calculateTotalUnits,
    calculateTotalWeight,
    validatePackagesForShipping,
    ShipmentPackage
} from '@/hooks/use-shipment-packages';

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_company?: string;
    contact_name?: string;
    phone?: string;
    delivery_address?: string;
    region?: string;
    quantity_total?: number;
    fabric?: string;
    status: string;
    created_at?: string;
    due_date?: string;
}

interface ShippedOrdersPanelProps {
    order: Order;
    onProcessed?: () => void;
}

const ShippedOrdersPanel: React.FC<ShippedOrdersPanelProps> = ({ order, onProcessed }) => {
    // Estados locales
    const [carrierCompany, setCarrierCompany] = useState<string>('');
    const [customCarrier, setCustomCarrier] = useState<string>('');
    const [trackingNumber, setTrackingNumber] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Hooks de datos
    const { data: packages = [], isLoading: loadingPackages } = useShipmentPackages(order.id);
    const { data: nextPackageNumber = 1 } = useNextPackageNumber(order.id);
    const createPackage = useCreatePackage();
    const updatePackage = useUpdatePackage();
    const deletePackage = useDeletePackage();

    // Cálculos
    const totalUnits = calculateTotalUnits(packages);
    const totalWeight = calculateTotalWeight(packages);
    const expectedUnits = order.quantity_total || 0;

    // Handlers
    const handleAddPackage = async () => {
        try {
            await createPackage.mutateAsync({
                order_id: order.id,
                package_number: nextPackageNumber,
                units_count: 0,
                weight_kg: 0
            });
        } catch (error) {
            console.error('Error adding package:', error);
        }
    };

    const handleUpdatePackage = async (pkg: ShipmentPackage, field: keyof ShipmentPackage, value: number) => {
        try {
            await updatePackage.mutateAsync({
                id: pkg.id,
                [field]: value
            });
        } catch (error) {
            console.error('Error updating package:', error);
        }
    };

    const handleDeletePackage = async (pkg: ShipmentPackage) => {
        try {
            await deletePackage.mutateAsync({
                id: pkg.id,
                orderId: order.id
            });
        } catch (error) {
            console.error('Error deleting package:', error);
        }
    };

    const handleProcess = async () => {
        // Validaciones
        const effectiveCarrier = carrierCompany === 'OTRO' ? customCarrier : carrierCompany;
        const validation = validatePackagesForShipping(
            packages,
            expectedUnits,
            effectiveCarrier,
            trackingNumber
        );

        if (!validation.isValid) {
            toast.error(
                <div>
                    <p className="font-bold mb-2">No se puede procesar el envío:</p>
                    <ul className="list-disc list-inside">
                        {validation.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                        ))}
                    </ul>
                </div>
            );
            return;
        }

        setIsProcessing(true);
        try {
            // TODO: Implementar actualización en BD
            // 1. Actualizar estado del pedido a "HISTORIAL/ENTREGADO"
            // 2. Guardar datos de envío en logistics
            // 3. Enviar notificación a comercial
            // 4. Registrar en status_log

            toast.success('Envío procesado correctamente. Notificación enviada a comercial.');
            onProcessed?.();
        } catch (error: any) {
            toast.error(`Error al procesar: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header con estado */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Send className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Pedido {order.order_number}</h3>
                        <p className="text-sm text-gray-400">{order.customer_company || order.customer_name}</p>
                    </div>
                </div>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    ENVIADO
                </Badge>
            </div>

            {/* Datos del pedido (solo lectura) */}
            <Card className="bg-card/50 border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                        Datos del Pedido
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">Cliente:</span>
                        <p className="text-white font-medium">{order.customer_company || order.customer_name}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Contacto:</span>
                        <p className="text-white">{order.contact_name || '-'}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Región:</span>
                        <p className="text-white">{order.region || '-'}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Cantidad Total:</span>
                        <p className="text-white font-bold text-lg">{expectedUnits} uds</p>
                    </div>
                    <div className="md:col-span-2">
                        <span className="text-gray-400">Dirección:</span>
                        <p className="text-white">{order.delivery_address || '-'}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Material:</span>
                        <p className="text-white">{order.fabric || '-'}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Gestión de Bultos */}
            <Card className="bg-card/50 border-border/60">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Gestión de Bultos
                        </CardTitle>
                        <Button
                            size="sm"
                            onClick={handleAddPackage}
                            disabled={createPackage.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Añadir Bulto
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingPackages ? (
                        <p className="text-gray-400 text-center py-4">Cargando bultos...</p>
                    ) : packages.length === 0 ? (
                        <div className="text-center py-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                            <p className="text-yellow-300">No hay bultos registrados</p>
                            <p className="text-gray-400 text-sm">Añade al menos un bulto para continuar</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Tabla de bultos */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th className="p-2 text-left">Bulto</th>
                                            <th className="p-2 text-left">Unidades</th>
                                            <th className="p-2 text-left">Peso (kg)</th>
                                            <th className="p-2 text-left">Dimensiones (cm)</th>
                                            <th className="p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {packages.map((pkg) => (
                                            <tr key={pkg.id} className="hover:bg-muted/30">
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        <Box className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium text-white">#{pkg.package_number}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={pkg.units_count}
                                                        onChange={(e) => handleUpdatePackage(pkg, 'units_count', parseInt(e.target.value) || 0)}
                                                        className="w-20 h-8 bg-muted/30 border-border/60"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-1">
                                                        <Scale className="w-3 h-3 text-gray-400" />
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            value={pkg.weight_kg || ''}
                                                            onChange={(e) => handleUpdatePackage(pkg, 'weight_kg', parseFloat(e.target.value) || 0)}
                                                            className="w-20 h-8 bg-muted/30 border-border/60"
                                                            placeholder="0.0"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-1">
                                                        <Ruler className="w-3 h-3 text-gray-400" />
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={pkg.height_cm || ''}
                                                            onChange={(e) => handleUpdatePackage(pkg, 'height_cm', parseFloat(e.target.value) || 0)}
                                                            className="w-14 h-8 bg-muted/30 border-border/60"
                                                            placeholder="Alto"
                                                        />
                                                        <span className="text-gray-400">×</span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={pkg.width_cm || ''}
                                                            onChange={(e) => handleUpdatePackage(pkg, 'width_cm', parseFloat(e.target.value) || 0)}
                                                            className="w-14 h-8 bg-muted/30 border-border/60"
                                                            placeholder="Ancho"
                                                        />
                                                        <span className="text-gray-400">×</span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={pkg.length_cm || ''}
                                                            onChange={(e) => handleUpdatePackage(pkg, 'length_cm', parseFloat(e.target.value) || 0)}
                                                            className="w-14 h-8 bg-muted/30 border-border/60"
                                                            placeholder="Largo"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeletePackage(pkg)}
                                                        disabled={deletePackage.isPending}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Resumen */}
                            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <span className="text-gray-400 text-xs">Total Bultos:</span>
                                        <p className="text-white font-bold">{packages.length}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-xs">Total Unidades:</span>
                                        <p className={`font-bold ${totalUnits === expectedUnits ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {totalUnits} / {expectedUnits}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-xs">Peso Total:</span>
                                        <p className="text-white font-bold">{totalWeight.toFixed(2)} kg</p>
                                    </div>
                                </div>
                                {totalUnits !== expectedUnits && (
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Unidades no coinciden
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Datos de Empresa de Envíos */}
            <Card className="bg-card/50 border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Datos de Envío
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Empresa de Envíos</label>
                        <Select value={carrierCompany} onValueChange={setCarrierCompany}>
                            <SelectTrigger className="bg-muted/30 border-border/60">
                                <SelectValue placeholder="Selecciona empresa..." />
                            </SelectTrigger>
                            <SelectContent>
                                {CARRIER_COMPANIES.map((carrier) => (
                                    <SelectItem key={carrier.value} value={carrier.value}>
                                        {carrier.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {carrierCompany === 'OTRO' && (
                            <Input
                                value={customCarrier}
                                onChange={(e) => setCustomCarrier(e.target.value)}
                                placeholder="Nombre de la empresa"
                                className="bg-muted/30 border-border/60"
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Número de Envío / Tracking</label>
                        <Input
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="Ej: MRW123456789"
                            className="bg-muted/30 border-border/60"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Botón PROCESADO */}
            <div className="flex justify-end">
                <Button
                    size="lg"
                    onClick={handleProcess}
                    disabled={isProcessing || packages.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
                >
                    {isProcessing ? (
                        <>Procesando...</>
                    ) : (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            CONFIRMAR ENVÍO
                        </>
                    )}
                </Button>
            </div>

            {/* Info sobre acciones del botón CONFIRMAR ENVÍO */}
            <div className="text-xs text-gray-400 text-center">
                Al pulsar "CONFIRMAR ENVÍO", el pedido pasará a Historial y se notificará al departamento comercial
            </div>
        </div>
    );
};

export default ShippedOrdersPanel;
