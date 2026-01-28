import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Package,
    Factory,
    Truck,
    CheckCircle,
    Clock,
    User,
    Calendar,
    ChevronDown,
    MapPin,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos para el historial unificado
export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description?: string;
    icon: 'order' | 'production' | 'shipping' | 'delivered' | 'installation';
    status: 'completed' | 'current' | 'pending';
    details?: Record<string, string>;
}

export interface UnifiedHistoryItem {
    id: string;
    order_number: string;
    customer_name: string;
    current_status: string;
    created_at: string;
    updated_at: string;

    // Datos comerciales
    commercial?: {
        status: string;
        created_at: string;
        products?: string;
        total?: number;
        notes?: string;
        // Datos adicionales del pedido comercial
        admin_code?: string;
        contact_name?: string;
        phone?: string;
        email?: string;
        delivery_address?: string;
        delivery_city?: string;
        delivery_region?: string;
        delivery_date?: string;
        delivery_location_url?: string;
        customer_code?: string;
        customer_company?: string;
        fabric?: string;
        quantity_total?: number;
        internal_notes?: string;
        lines?: any[];
    };

    // Datos de producción
    production?: {
        status: string;
        started_at?: string;
        completed_at?: string;
        operator?: string;
        quality_status?: string;
        notes?: string;
    };

    // Datos de instalación
    installation?: {
        state: string;
        scheduled_date?: string;
        completed_at?: string;
        technicians?: string[];
        vehicle?: string;
        notes?: string;
    };

    // Datos de envío
    shipping?: {
        status: string;
        tracking_number?: string;
        carrier?: string;
        shipped_at?: string;
        delivered_at?: string;
        address?: string;
    };

    // Timeline generado
    timeline: TimelineEvent[];
}

interface UnifiedHistoryModalProps {
    item: UnifiedHistoryItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const getIconForEvent = (icon: TimelineEvent['icon']) => {
    switch (icon) {
        case 'order': return <Package className="w-4 h-4" />;
        case 'production': return <Factory className="w-4 h-4" />;
        case 'shipping': return <Truck className="w-4 h-4" />;
        case 'delivered': return <CheckCircle className="w-4 h-4" />;
        case 'installation': return <MapPin className="w-4 h-4" />;
        default: return <Clock className="w-4 h-4" />;
    }
};

const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
        case 'completed': return 'bg-emerald-600 border-2 border-emerald-400';
        case 'current': return 'bg-blue-600 border-2 border-blue-400 animate-pulse';
        case 'pending': return 'bg-muted border-2 border-muted-foreground/30';
        default: return 'bg-muted border-2 border-muted-foreground/30';
    }
};

const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        'LISTO_ENVIO': { label: 'Listo para Envío', variant: 'default' },
        'ENVIADO': { label: 'Enviado', variant: 'secondary' },
        'ENTREGADO': { label: 'Entregado', variant: 'default' },
        'CANCELADO': { label: 'Cancelado', variant: 'destructive' },
        'PENDIENTE': { label: 'Pendiente', variant: 'outline' },
        'EN_PROCESO': { label: 'En Proceso', variant: 'secondary' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
};

export function UnifiedHistoryModal({ item, open, onOpenChange }: UnifiedHistoryModalProps) {
    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span className="font-mono text-lg">{item.order_number}</span>
                        {getStatusBadge(item.current_status)}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {item.customer_name}
                        <span className="text-muted-foreground">•</span>
                        <Calendar className="w-4 h-4" />
                        {item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy') : '-'}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    {/* Timeline de Trazabilidad */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                            Timeline de Trazabilidad
                        </h3>
                        <div className="relative">
                            {item.timeline.map((event, index) => (
                                <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                                    {/* Línea vertical */}
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getStatusColor(event.status)}`}>
                                            {getIconForEvent(event.icon)}
                                        </div>
                                        {index < item.timeline.length - 1 && (
                                            <div className={`w-0.5 flex-1 mt-2 ${event.status === 'completed' ? 'bg-emerald-500' : 'bg-border'}`} />
                                        )}
                                    </div>

                                    {/* Contenido del evento */}
                                    <div className="flex-1 pt-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{event.title}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(event.date), 'dd/MM/yyyy HH:mm')}
                                            </span>
                                        </div>
                                        {event.description && (
                                            <p className="text-sm text-muted-foreground">{event.description}</p>
                                        )}
                                        {event.details && Object.keys(event.details).length > 0 && (
                                            <div className="mt-2 text-xs space-y-1">
                                                {Object.entries(event.details).map(([key, value]) => (
                                                    <div key={key} className="flex gap-2">
                                                        <span className="text-muted-foreground">{key}:</span>
                                                        <span>{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Secciones colapsables con detalles */}
                    <div className="space-y-3">
                        {/* Datos Comerciales */}
                        {item.commercial && (
                            <Collapsible defaultOpen>
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-blue-500" />
                                        <span className="font-medium">Datos del Pedido</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-3 space-y-3 text-sm">
                                    {/* Info básica */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><span className="text-muted-foreground">Estado:</span> {item.commercial.status}</div>
                                        <div><span className="text-muted-foreground">Fecha:</span> {item.commercial.created_at ? format(new Date(item.commercial.created_at), 'dd/MM/yyyy') : '-'}</div>
                                        {item.commercial.admin_code && <div><span className="text-muted-foreground">Código Admin:</span> {item.commercial.admin_code}</div>}
                                        {item.commercial.customer_code && <div><span className="text-muted-foreground">Código Cliente:</span> {item.commercial.customer_code}</div>}
                                    </div>

                                    {/* Datos de contacto */}
                                    {(item.commercial.contact_name || item.commercial.phone || item.commercial.email) && (
                                        <div className="border-t border-border/50 pt-2">
                                            <div className="text-xs text-muted-foreground font-medium mb-1">CONTACTO</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {item.commercial.contact_name && <div><span className="text-muted-foreground">Nombre:</span> {item.commercial.contact_name}</div>}
                                                {item.commercial.phone && <div><span className="text-muted-foreground">Teléfono:</span> {item.commercial.phone}</div>}
                                                {item.commercial.email && <div className="col-span-2"><span className="text-muted-foreground">Email:</span> {item.commercial.email}</div>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Datos de entrega */}
                                    {(item.commercial.delivery_address || item.commercial.delivery_region || item.commercial.delivery_date) && (
                                        <div className="border-t border-border/50 pt-2">
                                            <div className="text-xs text-muted-foreground font-medium mb-1">ENTREGA</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {item.commercial.delivery_date && <div><span className="text-muted-foreground">Fecha:</span> {format(new Date(item.commercial.delivery_date), 'dd/MM/yyyy')}</div>}
                                                {item.commercial.delivery_region && <div><span className="text-muted-foreground">Región:</span> {item.commercial.delivery_region}</div>}
                                                {item.commercial.delivery_city && <div><span className="text-muted-foreground">Ciudad:</span> {item.commercial.delivery_city}</div>}
                                                {item.commercial.delivery_address && <div className="col-span-2"><span className="text-muted-foreground">Dirección:</span> {item.commercial.delivery_address}</div>}
                                                {item.commercial.delivery_location_url && (
                                                    <div className="col-span-2">
                                                        <a href={item.commercial.delivery_location_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            Ver ubicación en Maps
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Material/Tela */}
                                    {(item.commercial.fabric || item.commercial.quantity_total) && (
                                        <div className="border-t border-border/50 pt-2">
                                            <div className="text-xs text-muted-foreground font-medium mb-1">MATERIAL</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {item.commercial.fabric && <div><span className="text-muted-foreground">Tela:</span> {item.commercial.fabric}</div>}
                                                {item.commercial.quantity_total && <div><span className="text-muted-foreground">Cantidad Total:</span> {item.commercial.quantity_total}</div>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Líneas del pedido (Desglose) */}
                                    {item.commercial.lines && item.commercial.lines.length > 0 && (
                                        <div className="border-t border-border/50 pt-2">
                                            <div className="text-xs text-muted-foreground font-medium mb-2">DESGLOSE</div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-muted-foreground border-b border-border/30">
                                                            <th className="text-left py-1">Cant.</th>
                                                            <th className="text-left py-1">Ancho</th>
                                                            <th className="text-left py-1">Alto</th>
                                                            <th className="text-left py-1">Material</th>
                                                            <th className="text-left py-1">Color</th>
                                                            <th className="text-left py-1">Notas</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {item.commercial.lines.map((line: any, idx: number) => (
                                                            <tr key={idx} className="border-b border-border/20">
                                                                <td className="py-1">{line.quantity || 1}</td>
                                                                <td className="py-1">{line.width || '-'}</td>
                                                                <td className="py-1">{line.height || '-'}</td>
                                                                <td className="py-1">{line.material || line.description || '-'}</td>
                                                                <td className="py-1">{line.color || '-'}</td>
                                                                <td className="py-1 text-muted-foreground">{line.notes || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Notas */}
                                    {(item.commercial.notes || item.commercial.internal_notes) && (
                                        <div className="border-t border-border/50 pt-2">
                                            {item.commercial.notes && <div className="col-span-2"><span className="text-muted-foreground">Notas:</span> {item.commercial.notes}</div>}
                                            {item.commercial.internal_notes && <div className="col-span-2 text-xs text-amber-500"><span className="text-muted-foreground">Notas internas:</span> {item.commercial.internal_notes}</div>}
                                        </div>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {/* Datos de Producción */}
                        {item.production && item.production.status && (
                            <Collapsible>
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition">
                                    <div className="flex items-center gap-2">
                                        <Factory className="w-4 h-4 text-amber-500" />
                                        <span className="font-medium">Producción</span>
                                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Pedido seleccionado</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-3 space-y-2 text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><span className="text-muted-foreground">Estado:</span> {item.production.status}</div>
                                        {item.production.operator && <div><span className="text-muted-foreground">Operario:</span> {item.production.operator}</div>}
                                        {item.production.quality_status && <div><span className="text-muted-foreground">Control Calidad:</span> {item.production.quality_status}</div>}
                                        {item.production.completed_at && <div><span className="text-muted-foreground">Completado:</span> {format(new Date(item.production.completed_at), 'dd/MM/yyyy HH:mm')}</div>}
                                        {item.production.notes && <div className="col-span-2"><span className="text-muted-foreground">Notas:</span> {item.production.notes}</div>}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {/* Datos de Envío */}
                        {item.shipping && (item.shipping.tracking_number || item.shipping.carrier || item.shipping.delivered_at) && (
                            <Collapsible>
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-purple-500" />
                                        <span className="font-medium">Expediciones y Envíos</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-3 space-y-2 text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        {item.shipping.status && <div><span className="text-muted-foreground">Estado:</span> {item.shipping.status}</div>}
                                        {item.shipping.tracking_number && <div><span className="text-muted-foreground">Tracking:</span> {item.shipping.tracking_number}</div>}
                                        {item.shipping.carrier && <div><span className="text-muted-foreground">Transportista:</span> {item.shipping.carrier}</div>}
                                        {item.shipping.shipped_at && <div><span className="text-muted-foreground">Enviado:</span> {format(new Date(item.shipping.shipped_at), 'dd/MM/yyyy HH:mm')}</div>}
                                        {item.shipping.delivered_at && <div><span className="text-muted-foreground">Entregado:</span> {format(new Date(item.shipping.delivered_at), 'dd/MM/yyyy HH:mm')}</div>}
                                        {item.shipping.address && <div className="col-span-2"><span className="text-muted-foreground">Dirección:</span> {item.shipping.address}</div>}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {/* Datos de Instalación */}
                        {item.installation && (
                            <Collapsible>
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-500" />
                                        <span className="font-medium">Instalación</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-3 space-y-2 text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><span className="text-muted-foreground">Estado:</span> {item.installation.state}</div>
                                        {item.installation.technicians && item.installation.technicians.length > 0 && (
                                            <div><span className="text-muted-foreground">Técnicos:</span> {item.installation.technicians.join(', ')}</div>
                                        )}
                                        {item.installation.vehicle && <div><span className="text-muted-foreground">Vehículo:</span> {item.installation.vehicle}</div>}
                                        {item.installation.completed_at && <div><span className="text-muted-foreground">Completado:</span> {format(new Date(item.installation.completed_at), 'dd/MM/yyyy HH:mm')}</div>}
                                        {item.installation.notes && <div className="col-span-2"><span className="text-muted-foreground">Notas:</span> {item.installation.notes}</div>}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

// Función helper para generar timeline desde los datos
export function generateTimeline(item: Omit<UnifiedHistoryItem, 'timeline'>): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Evento de creación del pedido
    if (item.commercial) {
        events.push({
            id: 'order-created',
            date: item.commercial.created_at,
            title: 'Pedido creado',
            description: item.customer_name,
            icon: 'order',
            status: 'completed'
        });
    }

    // Evento de producción iniciada
    if (item.production?.started_at) {
        events.push({
            id: 'production-started',
            date: item.production.started_at,
            title: 'Producción iniciada',
            description: item.production.operator ? `Operario: ${item.production.operator}` : undefined,
            icon: 'production',
            status: 'completed'
        });
    }

    // Evento de producción completada
    if (item.production?.completed_at) {
        events.push({
            id: 'production-completed',
            date: item.production.completed_at,
            title: 'Producción completada',
            description: item.production.quality_status ? `QC: ${item.production.quality_status}` : undefined,
            icon: 'production',
            status: 'completed'
        });
    }

    // Evento de envío
    if (item.shipping?.shipped_at) {
        events.push({
            id: 'shipped',
            date: item.shipping.shipped_at,
            title: 'Enviado',
            description: item.shipping.tracking_number ? `Tracking: ${item.shipping.tracking_number}` : undefined,
            icon: 'shipping',
            status: item.shipping.delivered_at ? 'completed' : 'current',
            details: item.shipping.carrier ? { Transportista: item.shipping.carrier } : undefined
        });
    }

    // Evento de entrega
    if (item.shipping?.delivered_at) {
        events.push({
            id: 'delivered',
            date: item.shipping.delivered_at,
            title: 'Entregado',
            icon: 'delivered',
            status: 'completed'
        });
    }

    // Evento de instalación
    if (item.installation?.completed_at) {
        events.push({
            id: 'installation-completed',
            date: item.installation.completed_at,
            title: 'Instalación completada',
            description: item.installation.technicians?.join(', '),
            icon: 'installation',
            status: 'completed'
        });
    }

    // Ordenar por fecha
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default UnifiedHistoryModal;
