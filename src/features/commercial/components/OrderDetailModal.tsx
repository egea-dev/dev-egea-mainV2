import React, { useState, useEffect, useRef } from 'react';
import {
    Users, UploadCloud, FileCheck, AlertTriangle, FileText, Plus, MinusCircle, Edit, Save, X, BoxSelect, MapPin, Share2, Loader2, History, Copy, Mail
} from 'lucide-react';
import { Order, OrderLine, OrderDocument, OrderStatus } from '@/types/commercial';
import { supabaseProductivity as supabase } from '@/integrations/supabase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusLogTimeline } from './StatusLogTimeline';
import { QRCodeGenerator } from './QRCodeGenerator';
import { useUploadOrderDocument, type DocumentType } from '@/hooks/use-order-documents';
import { SLAIndicator } from './SLAIndicator';
import { useMaterials } from '@/hooks/use-materials';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';
import {
    generatePresupuestoApprovalEmail,
    generatePresupuestoApprovalSubject,
    generateProduccionInicioEmail,
    generateProduccionInicioSubject,
    generateShippingEmail,
    generateShippingSubject
} from '@/utils/email-templates';
import { generateOrderPDF } from '@/utils/pdf-generator';
import { generateQRPayload } from '@/lib/qr-utils';
import { toast } from 'sonner';
import { useSLADays } from '@/hooks/use-sla-days';
import { useUpdateOrder, useCreateOrder, useUpdateOrderStatus, useMarkShippingNotificationSent } from '@/hooks/use-orders';

// --- Types & Constants ---

type DocType = DocumentType;
const DOC_LABELS: Record<DocType, string> = {
    PRESUPUESTO: 'Presupuesto',
    PEDIDO_ACEPTADO: 'Pedido Aceptado'
};



interface OrderDetailModalProps {
    order: Order;
    isOpen: boolean;
    onClose: () => void;
    onSave?: (updatedOrder: Order) => void;
    canDelete?: boolean;
    onDelete?: (orderId: string) => void | Promise<void>;
    userRole?: string; // Añadido para control de permisos
}

// --- Utils ---
// --- Component ---

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose, onSave, canDelete = false, onDelete, userRole }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Order>({ ...order });
    const uploadDocument = useUploadOrderDocument();
    const updateOrder = useUpdateOrder();
    const updateOrderStatus = useUpdateOrderStatus();
    const createOrder = useCreateOrder();
    const markShippingSent = useMarkShippingNotificationSent();
    const { data: { user } = { user: null } } = { data: { user: { id: 'commercial-user' } } }; // Fallback safe
    const { data: materials } = useMaterials();
    const [savingDoc, setSavingDoc] = useState<DocType | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paidConfirmOpen, setPaidConfirmOpen] = useState(false);
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    const fileInputsRef = useRef<Record<DocType, HTMLInputElement | null>>({
        PRESUPUESTO: null,
        PEDIDO_ACEPTADO: null
    });
    const qrContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...order });
            // Default to editing if it's a new order (no ID or empty order number)
            if (!order.id || !order.order_number) setIsEditing(true);
        }
    }, [order, isOpen]);

    // --- AUTOMATIZACIÓN SLA POR REGIÓN ---
    // Recalcular delivery_date al cambiar la región (si no tiene fecha)
    useEffect(() => {
        const region = formData.delivery_region || formData.region;
        const hasNoDate = !formData.delivery_date;

        if (region && hasNoDate) {
            const slaDays = useSLADays(region);

            const target = new Date();
            target.setDate(target.getDate() + slaDays);

            setFormData(prev => ({
                ...prev,
                delivery_date: target.toISOString().split('T')[0]
            }));
        }
    }, [formData.delivery_region, formData.region, formData.delivery_date]);

    useEffect(() => {
        const total = (formData.lines || []).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
        setFormData(prev => ({ ...prev, quantity_total: total }));
    }, [formData.lines]);

    // Validation function matching reference modal
    const validateOrder = (): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!formData.customer_name) {
            errors.push("Es necesario el nombre completo");
        }
        if (!formData.customer_company) {
            errors.push("Es necesario el cliente / razón social");
        }
        if (!formData.delivery_region && !formData.region) {
            errors.push("Es necesario seleccionar la región");
        }
        if (!formData.admin_code) {
            errors.push("Es necesario el número de presupuesto");
        }

        // ⚠️ VALIDACIÓN DE PDFs DESACTIVADA TEMPORALMENTE (2026-01-16)
        // TODO: Reactivar cuando sea necesario descomentar las siguientes líneas

        // Check for PRESUPUESTO document
        // const hasPresupuesto = formData.documents?.some(doc => doc.type === 'PRESUPUESTO');
        // if (!hasPresupuesto) {
        //     errors.push("Debes subir el presupuesto firmado en PDFs");
        // }

        // Check for PEDIDO_ACEPTADO document
        // const hasPedidoAceptado = formData.documents?.some(doc => doc.type === 'PEDIDO_ACEPTADO');
        // if (!hasPedidoAceptado) {
        //     errors.push("Debes subir el pedido aceptado en PDFs");
        // }

        // Check for at least one line
        if (!formData.lines || formData.lines.length === 0) {
            errors.push("Debes añadir al menos una línea de medidas");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    const validation = validateOrder();

    if (!isOpen) return null;

    // --- Handlers ---

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLineChange = (index: number, field: keyof OrderLine, value: string | number) => {
        const newLines = [...(formData.lines || [])];
        newLines[index] = { ...newLines[index], [field]: value };
        setFormData(prev => ({ ...prev, lines: newLines }));
    };

    const addLine = () => {
        const newLine: OrderLine = {
            width: '', height: '', material: '', quantity: 1, notes: ''
        };
        setFormData(prev => ({ ...prev, lines: [...(prev.lines || []), newLine] }));
    };

    const removeLine = (index: number) => {
        setFormData(prev => ({ ...prev, lines: formData.lines.filter((_, i) => i !== index) }));
    };



    // --- Docs Logic ---

    const handleDocUpload = async (type: DocType, file: File) => {
        if (!order.id) {
            alert("Guarda el pedido primero antes de subir documentos.");
            return;
        }

        try {
            await uploadDocument.mutateAsync({ orderId: order.id, file, type });
            // Refresh form data after upload
            // The mutation will invalidate queries, so data will refresh automatically
        } catch (error) {
            console.error("Upload error:", error);
        }
    };

    const triggerFileSelect = (type: DocType) => fileInputsRef.current[type]?.click();

    const handleSave = async () => {
        // Solo validar si el usuario es comercial
        if (!isAdminOrManager) {
            const validation = validateOrder();
            if (!validation.isValid) {
                alert("Por favor completa todos los campos obligatorios:\n\n" + validation.errors.join('\n'));
                return;
            }
        }

        try {
            const payload: any = {
                id: formData.id, // Requerido para el update
                customer_name: formData.customer_name,
                customer_code: formData.customer_code,
                customer_company: formData.customer_company,
                contact_name: formData.contact_name,
                phone: formData.phone,
                email: formData.email,
                delivery_region: formData.delivery_region || formData.region,
                delivery_address: formData.delivery_address,
                delivery_location_url: formData.delivery_location_url,
                delivery_date: formData.delivery_date,
                delivery_city: formData.delivery_city,
                region: formData.delivery_region || formData.region,
                fabric: formData.fabric,
                quantity_total: formData.quantity_total,
                lines: formData.lines,
                admin_code: formData.admin_code,
                internal_notes: formData.internal_notes,
                updated_at: new Date().toISOString()
            };

            if (formData.id) {
                await updateOrder.mutateAsync(payload);
            } else {
                await createOrder.mutateAsync({
                    ...payload,
                    order_number: formData.order_number,
                    documents: formData.documents || [],
                    status: formData.status || 'PENDIENTE_PAGO'
                });
            }

            setIsEditing(false);
            if (onSave) onSave(formData);
            alert("Pedido actualizado correctamente");
        } catch (error: any) {
            console.error("CRITICAL ERROR SAVING ORDER:", error);
            alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
        }
    };

    // --- Render Helpers ---

    const hasDoc = (type: DocType) => (formData.documents || []).some(d => d.type === type);
    const getDoc = (type: DocType) => (formData.documents || []).find(d => d.type === type);
    const isValidForPDF = () => validation.isValid;
    const canPrint = isAdminOrManager && Boolean(formData.order_number);

    const handlePrintLabel = () => {
        if (!qrContainerRef.current) {
            alert("No se pudo generar la etiqueta.");
            return;
        }
        const svg = qrContainerRef.current.querySelector("svg");
        if (!svg) {
            alert("No se pudo generar el QR.");
            return;
        }
        const win = window.open("", "_blank");
        if (!win) return;
        win.document.write(`
            <html>
                <head>
                    <title>Etiqueta Produccion</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 24px; text-align: center; }
                        .label { display: inline-block; padding: 16px; border: 1px solid #ddd; }
                        .code { margin-top: 12px; font-size: 12px; color: #555; font-family: monospace; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        ${svg.outerHTML}
                        <div class="code">${formData.order_number || "INT-XXXX"}</div>
                    </div>
                </body>
            </html>
        `);
        win.document.close();
        win.focus();
        win.print();
        win.close();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 px-4 pb-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-[98%] h-[95vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border bg-card shrink-0 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-foreground">Pedido {formData.order_number || 'NUEVO'}</h3>
                            <OrderStatusBadge status={formData.status} size="md" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Ref. Admin: {formData.admin_code || '---'}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        {/* Botón Marcar como Pagado */}
                        {formData.status === 'PENDIENTE_PAGO' && (
                            <Button
                                onClick={() => setPaidConfirmOpen(true)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <FileCheck className="w-4 h-4 mr-2" /> Marcar como Pagado
                            </Button>
                        )}

                        {!isEditing ? (
                            <Button onClick={() => setIsEditing(true)} variant="outline" className="border-border text-foreground hover:bg-muted">
                                <Edit className="w-4 h-4 mr-2" /> Editar
                            </Button>
                        ) : (
                            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
                                <Save className="w-4 h-4 mr-2" /> Guardar
                            </Button>
                        )}
                        {canDelete && formData.id && (
                            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                                Eliminar
                            </Button>
                        )}
                        <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 bg-background custom-scrollbar flex-1">
                    {/* Validation Alert Banner */}
                    {!validation.isValid && (
                        <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="text-red-400 font-bold mb-2">
                                        Pedido bloqueado hasta completar la información obligatoria:
                                    </h4>
                                    <ul className="space-y-1">
                                        {validation.errors.map((error, idx) => (
                                            <li key={idx} className="text-red-300 text-sm flex items-start gap-2">
                                                <span className="text-red-500 mt-0.5">•</span>
                                                <span>{error}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col xl:flex-row gap-6 mb-6">

                        {/* COLUMN 1: CLIENT DATA */}
                        <div className="w-full xl:w-[25%] flex flex-col gap-6">
                            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col gap-4">
                                {/* Header with Copy Button */}
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-foreground flex items-center">
                                        <Users className="w-4 h-4 mr-2 text-primary" /> Datos del Cliente
                                    </h4>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const text = `${formData.customer_name}\n${formData.customer_company}\n${formData.phone || ''}\n${formData.delivery_address || ''}`;
                                            navigator.clipboard.writeText(text);
                                            alert('Datos copiados al portapapeles');
                                        }}
                                        className="border-primary text-primary hover:bg-primary/10 h-7 text-xs font-bold"
                                    >
                                        <Share2 className="w-3 h-3 mr-1" /> Copiar
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {/* NÚMERO PEDIDO (ADMIN) */}
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Número Pedido (Admin)</label>
                                        <Input
                                            name="admin_code"
                                            value={formData.admin_code || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder=""
                                            className="bg-muted/30 border-border text-foreground font-bold mt-1"
                                        />
                                    </div>

                                    {/* CÓDIGO SOLICITUD PRESUPUESTO */}
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Código Solicitud Presupuesto</label>
                                        <Input
                                            name="customer_code"
                                            value={formData.customer_code || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder=""
                                            className="bg-muted/30 border-border text-foreground font-medium mt-1"
                                        />
                                    </div>

                                    {/* CLIENTE / RAZÓN SOCIAL */}
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Cliente / Razón Social</label>
                                        <Input
                                            name="customer_company"
                                            value={formData.customer_company || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="Cliente Nuevo"
                                            className="bg-muted/30 border-border text-foreground font-bold mt-1"
                                        />
                                    </div>

                                    {/* REGIÓN y TELÉFONO (side by side) */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Región</label>
                                            <Select
                                                disabled={!isEditing}
                                                value={formData.delivery_region || formData.region}
                                                onValueChange={(v) => handleSelectChange('delivery_region', v)}
                                            >
                                                <SelectTrigger className="bg-muted/30 border-border text-foreground font-bold mt-1">
                                                    <SelectValue placeholder="Selecciona" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card border-border">
                                                    <SelectItem value="PENINSULA">PENÍNSULA (+10d lab.)</SelectItem>
                                                    <SelectItem value="BALEARES">BALEARES (+7d lab.)</SelectItem>
                                                    <SelectItem value="CANARIAS">CANARIAS (+20d lab.)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {isEditing && (
                                                <div className="mt-1 text-[10px] text-primary font-black uppercase tracking-tighter">
                                                    SLA: {
                                                        {
                                                            'PENINSULA': '10 días laborables',
                                                            'BALEARES': '7 días laborables',
                                                            'CANARIAS': '20 días laborables'
                                                        }[formData.delivery_region || formData.region || 'PENINSULA']
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Teléfono</label>
                                            <Input
                                                name="phone"
                                                value={formData.phone || ''}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder=""
                                                className="bg-muted/30 border-border text-foreground font-bold mt-1"
                                            />
                                        </div>
                                    </div>

                                    {/* NOMBRE CONTACTO */}
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Nombre Contacto</label>
                                        <Input
                                            name="contact_name"
                                            value={formData.contact_name || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder=""
                                            className="bg-muted/30 border-border text-foreground font-medium mt-1"
                                        />
                                    </div>

                                    {/* EMAIL */}
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Email</label>
                                        <Input
                                            name="email"
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="correo@ejemplo.com"
                                            className="bg-muted/30 border-border text-foreground font-medium mt-1"
                                        />
                                    </div>

                                    {/* DIRECCIÓN DE ENTREGA */}
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Dirección de Entrega</label>
                                        <Textarea
                                            name="delivery_address"
                                            value={formData.delivery_address || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder=""
                                            rows={3}
                                            className="bg-muted/30 border-border text-foreground font-medium mt-1 resize-none"
                                        />
                                    </div>

                                    {/* UBICACIÓN (MAPS) */}
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Ubicación (Maps)</label>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            <Input
                                                name="delivery_location_url"
                                                value={formData.delivery_location_url || ''}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="https://maps.google..."
                                                className="bg-muted/30 border-border text-foreground flex-1 font-mono text-[10px]"
                                            />
                                            {formData.delivery_location_url && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open(formData.delivery_location_url, '_blank')}
                                                    className="border-border hover:bg-muted"
                                                >
                                                    <MapPin className="w-4 h-4 text-primary" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* FECHA ENTREGA */}
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Fecha Entrega</label>
                                        <Input
                                            type="date"
                                            name="delivery_date"
                                            value={formData.delivery_date || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="bg-muted/30 border-border text-foreground font-bold mt-1"
                                        />
                                    </div>

                                    {/* SLA Indicator */}
                                    {formData.delivery_date && (
                                        <div>
                                            <label className="text-xs text-[#8B8D90] uppercase font-bold">Estado SLA</label>
                                            <div className="mt-1">
                                                <SLAIndicator deliveryDate={formData.delivery_date} size="md" />
                                            </div>
                                        </div>
                                    )}

                                    {/* TOTAL UNIDADES - Redesigned like reference */}
                                    <div className="bg-muted/30 rounded-lg p-4 border border-border/60">
                                        <div className="text-xs text-[#8B8D90] uppercase font-bold text-center mb-2">
                                            Total Unidades
                                        </div>
                                        <div className="text-4xl font-bold text-white text-center">
                                            {formData.quantity_total || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* NOTAS INTERNAS */}
                            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col gap-4">
                                <h4 className="font-bold text-foreground flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-primary" /> Notas Internas
                                </h4>
                                <Textarea
                                    name="internal_notes"
                                    value={formData.internal_notes || ''}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    placeholder="Escribe notas solo para el equipo..."
                                    rows={5}
                                    className="bg-muted/30 border-border text-foreground font-medium resize-none"
                                />
                            </div>
                        </div>

                        {/* COLUMN 2: MATERIALS & LINES */}
                        <div className="w-full xl:w-[50%] flex flex-col gap-6">
                            {/* Lines Table */}
                            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col flex-1 min-h-[300px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-foreground flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-primary" /> Desglose
                                    </h4>
                                    {isEditing && (
                                        <Button onClick={addLine} size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 font-bold">
                                            <Plus className="w-4 h-4 mr-1" /> Añadir
                                        </Button>
                                    )}
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                                <th className="p-2 text-left">Cant.</th>
                                                <th className="p-2 text-left">Ancho</th>
                                                <th className="p-2 text-left">Alto</th>
                                                <th className="p-2 text-left">Material</th>
                                                <th className="p-2 text-left">Color</th>
                                                <th className="p-2 text-left">Notas</th>
                                                {isEditing && <th className="p-2"></th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {(formData.lines || []).map((line, idx) => (
                                                <tr key={idx} className="hover:bg-muted/50">
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            value={line.quantity}
                                                            onChange={(e) => handleLineChange(idx, 'quantity', parseInt(e.target.value))}
                                                            disabled={!isEditing}
                                                            className="w-16 bg-muted/30 border-border text-foreground h-8 font-bold"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={line.width}
                                                            onChange={(e) => handleLineChange(idx, 'width', e.target.value)}
                                                            disabled={!isEditing}
                                                            className="w-20 bg-muted/30 border-border text-foreground h-8 font-mono"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={line.height}
                                                            onChange={(e) => handleLineChange(idx, 'height', e.target.value)}
                                                            disabled={!isEditing}
                                                            className="w-20 bg-muted/30 border-border text-foreground h-8 font-mono"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Select
                                                            value={line.material}
                                                            onValueChange={(value) => handleLineChange(idx, 'material', value)}
                                                            disabled={!isEditing}
                                                        >
                                                            <SelectTrigger className="w-32 bg-muted/30 border-border/60 text-foreground h-8">
                                                                <SelectValue placeholder="Material" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-popover/95 border-border/60">
                                                                {materials?.map((mat) => (
                                                                    <SelectItem
                                                                        key={mat.id}
                                                                        value={mat.name}
                                                                        className="text-foreground hover:bg-muted/60"
                                                                    >
                                                                        {mat.name} {mat.reference && `(${mat.reference})`}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={line.color || ''}
                                                            onChange={(e) => handleLineChange(idx, 'color', e.target.value)}
                                                            disabled={!isEditing}
                                                            placeholder=""
                                                            className="w-24 bg-muted/30 border-border/60 text-foreground h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={line.notes || ''}
                                                            onChange={(e) => handleLineChange(idx, 'notes', e.target.value)}
                                                            disabled={!isEditing}
                                                            placeholder=""
                                                            className="w-32 bg-muted/30 border-border/60 text-foreground h-8"
                                                        />
                                                    </td>
                                                    {isEditing && (
                                                        <td className="p-2">
                                                            <button onClick={() => removeLine(idx)} className="text-[#8B8D90] hover:text-red-500">
                                                                <MinusCircle className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                            {(formData.lines || []).length === 0 && (
                                                <tr>
                                                    <td colSpan={isEditing ? 8 : 7} className="p-8">
                                                        <div className="bg-[#8B4513]/20 border border-[#D2691E] rounded-lg p-4 flex items-center justify-center gap-2">
                                                            <AlertTriangle className="w-5 h-5 text-[#FF8C00]" />
                                                            <span className="text-[#FF8C00] italic">Es obligatorio añadir al menos una línea de medidas.</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 3: DOCS & ACTIONS */}
                        <div className="w-full xl:w-[25%] flex flex-col gap-6">
                            <div className="bg-card/80 p-6 rounded-2xl border border-border/60 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <UploadCloud className="w-4 h-4 text-purple-300" />
                                    <h4 className="font-bold text-white">Documentacion obligatoria - PDFs</h4>
                                </div>
                                <p className="text-sm text-[#8B8D90] mb-4">
                                    Los archivos se guardan en el bucket order-docs. Solo se aceptan PDFs firmados.
                                </p>

                                {(['PRESUPUESTO', 'PEDIDO_ACEPTADO'] as DocType[]).map(type => {
                                    const doc = getDoc(type);
                                    const exists = !!doc;
                                    return (
                                        <div key={type} className="mb-4 rounded-xl border border-border/60 bg-muted/40 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-foreground font-semibold">
                                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                    <span>{DOC_LABELS[type]}</span>
                                                </div>
                                                {exists ? (
                                                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40">
                                                        OK
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40">
                                                        Pendiente
                                                    </Badge>
                                                )}
                                            </div>
                                            {!exists && (
                                                <button
                                                    type="button"
                                                    className="mt-3 w-full rounded-lg border border-dashed border-border/60 bg-background p-3 text-left text-xs text-muted-foreground hover:bg-muted/60"
                                                    onClick={() => triggerFileSelect(type)}
                                                    disabled={!order.id || savingDoc === type}
                                                >
                                                    {savingDoc === type ? "Subiendo PDF..." : "Sube el PDF correspondiente para desbloquear este requisito."}
                                                </button>
                                            )}
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                ref={el => fileInputsRef.current[type] = el}
                                                onChange={(e) => e.target.files?.[0] && handleDocUpload(type, e.target.files[0])}
                                            />
                                            {exists && (
                                                <div className="mt-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/60"
                                                        onClick={() => window.open(doc.url, '_blank')}
                                                    >
                                                        Ver PDF
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* QR Code Section */}
                            {/* QR CODE SECTION - Matching Image 2 */}
                            <div className="bg-card/80 p-6 rounded-2xl border border-border/60">
                                <div className="flex items-center gap-2 mb-4">
                                    <BoxSelect className="w-4 h-4 text-[#14CC7F]" />
                                    <h4 className="font-bold text-white">Etiqueta de Produccion</h4>
                                </div>

                                <div className="flex flex-col items-center gap-4">
                                    <div className="bg-white p-4 rounded-2xl shadow-lg">
                                        <QRCodeGenerator order={formData} containerRef={qrContainerRef} />
                                    </div>

                                    <div className="w-full bg-muted/40 rounded-xl border border-border/60 p-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#8B8D90] flex items-center gap-2">
                                                Entrada:
                                            </span>
                                            <span className="text-white font-medium">
                                                {formData.created_at ? new Date(formData.created_at).toLocaleDateString('es-ES') : '---'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#8B8D90] flex items-center gap-2">
                                                Salida Est.:
                                            </span>
                                            <span className="text-foreground font-medium">
                                                {formData.delivery_date ? new Date(formData.delivery_date).toLocaleDateString('es-ES') : '---'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="w-full bg-muted/20 rounded-xl border border-border/40 p-3">
                                        <p className="text-xs text-muted-foreground text-center font-mono break-all italic opacity-80">
                                            {`${formData.order_number || 'INT-XXXX'}|${formData.customer_company || formData.customer_name || 'Cliente'}|${formData.delivery_region || 'Region'}|${formData.delivery_date ? new Date(formData.delivery_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '--/--'}|${formData.lines?.reduce((acc, l) => acc + (l.material || ''), '') || 'Material'}|${formData.status || 'PENDIENTE'}`}
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handlePrintLabel}
                                        disabled={!canPrint}
                                        className="w-full bg-muted/40 hover:bg-muted/60 text-foreground border border-border/60 disabled:opacity-50"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        IMPRIMIR ETIQUETA
                                    </Button>
                                    <Button
                                        disabled={!canPrint}
                                        onClick={() => {
                                            const qrPayload = generateQRPayload({
                                                orderNumber: formData.order_number,
                                                customerName: formData.customer_company || formData.customer_name || 'Cliente',
                                                region: formData.delivery_region || formData.region,
                                                deliveryDate: formData.delivery_date,
                                                lines: formData.lines?.map(l => ({
                                                    material: l.material,
                                                    quantity: l.quantity
                                                })) || [],
                                                status: formData.status,
                                            });
                                            generateOrderPDF({
                                                ...formData,
                                                qr_payload: qrPayload,
                                                lines: formData.lines.map(l => ({
                                                    ...l,
                                                    width: Number(l.width) || 0,
                                                    height: Number(l.height) || 0
                                                }))
                                            } as any);
                                        }}
                                        className="w-full bg-muted/40 hover:bg-muted/60 text-foreground border border-border/60 disabled:opacity-50"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        GENERAR ORDEN PDF
                                    </Button>
                                    {!isAdminOrManager && (
                                        <p className="text-xs text-[#8B8D90] text-center mt-2">
                                            Solo admin y manager pueden imprimir o generar PDFs.
                                        </p>
                                    )}
                                    {isAdminOrManager && !validation.isValid && (
                                        <p className="text-xs text-[#8B8D90] text-center mt-2">
                                            La informacion incompleta puede generar una etiqueta incorrecta.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-card/80 p-4 rounded-2xl border border-border/60">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-[#B5B8BA]">Estado SLA</span>
                                    <SLAIndicator deliveryDate={formData.delivery_date} size="sm" />
                                </div>
                                <div className="bg-muted/40 rounded-xl border border-border/60 p-4 text-center">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Unidades</p>
                                    <p className="text-3xl font-bold text-foreground mt-1">{formData.quantity_total || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN DE EMAILS EN PARALELO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* SECCIÓN EMAIL PRESUPUESTO */}
                        <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm flex flex-col">
                            <h4 className="font-bold text-foreground mb-4 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-primary" /> Email Presupuesto para Aprobación
                            </h4>
                            <div className="bg-muted/30 rounded-xl p-4 mb-4 border border-border/60 flex-grow max-h-[300px] overflow-y-auto custom-scrollbar">
                                <div className="text-xs text-muted-foreground">
                                    <div className="mb-2 pb-2 border-b border-border/60">
                                        <p className="text-foreground font-semibold">Para: {formData.email || '{EMAIL_CLIENTE}'}</p>
                                        <p className="text-muted-foreground">
                                            Asunto: {generatePresupuestoApprovalSubject(formData.admin_code || 'PENDIENTE')}
                                        </p>
                                    </div>
                                    <div className="space-y-2 font-mono">
                                        <p><strong>Número Pedido:</strong> {formData.admin_code || 'Pendiente'}</p>
                                        <p><strong>Cliente:</strong> {formData.customer_company || formData.customer_name}</p>
                                        <p><strong>Región:</strong> {formData.delivery_region || formData.region}</p>
                                        <p><strong>Total:</strong> {formData.quantity_total || 0} uds</p>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-border/60">
                                        <p className="text-primary font-medium">Email profesional con logo EGEA</p>
                                        <p className="text-primary font-medium">Presupuesto adjunto en PDF</p>
                                        <p className="text-primary font-medium">Instrucciones de pago con comprobante</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-auto">
                                <Button
                                    onClick={() => {
                                        const emailHTML = generatePresupuestoApprovalEmail({
                                            adminCode: formData.admin_code || 'PENDIENTE',
                                            customerName: formData.customer_name || '',
                                            customerCompany: formData.customer_company || '',
                                            customerCIF: formData.customer_code || '',
                                            contactName: formData.contact_name || '',
                                            phone: formData.phone || '',
                                            email: formData.email || '',
                                            deliveryAddress: formData.delivery_address || '',
                                            deliveryRegion: (formData.delivery_region || formData.region || 'PENINSULA') as 'PENINSULA' | 'BALEARES' | 'CANARIAS',
                                            totalAmount: formData.quantity_total || 0
                                        });
                                        const win = window.open('', '_blank');
                                        if (win) {
                                            win.document.write(`<base href="${window.location.origin}/">` + emailHTML);
                                            win.document.close();
                                        }
                                    }}
                                    variant="outline"
                                    className="border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    Vista Previa
                                </Button>
                                <Button
                                    onClick={() => {
                                        const subject = generatePresupuestoApprovalSubject(formData.admin_code || 'PENDIENTE');
                                        navigator.clipboard.writeText(subject);
                                        toast.success('Asunto copiado');
                                    }}
                                    variant="outline"
                                    className="border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar asunto
                                </Button>
                                <Button
                                    onClick={() => {
                                        const emailHTML = generatePresupuestoApprovalEmail({
                                            adminCode: formData.admin_code || 'PENDIENTE',
                                            customerName: formData.customer_name || '',
                                            customerCompany: formData.customer_company || '',
                                            customerCIF: formData.customer_code || '',
                                            contactName: formData.contact_name || '',
                                            phone: formData.phone || '',
                                            email: formData.email || '',
                                            deliveryAddress: formData.delivery_address || '',
                                            deliveryRegion: (formData.delivery_region || formData.region || 'PENINSULA') as 'PENINSULA' | 'BALEARES' | 'CANARIAS',
                                            totalAmount: formData.quantity_total || 0
                                        });
                                        navigator.clipboard.writeText(emailHTML);
                                        toast.success('HTML copiado');
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar HTML
                                </Button>
                            </div>
                        </div>

                        {/* SECCIÓN EMAIL INICIO PRODUCCIÓN */}
                        <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm flex flex-col">
                            <h4 className="font-bold text-foreground mb-4 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-primary" /> Email Inicio de Producción
                            </h4>
                            <div className="bg-muted/30 rounded-xl p-4 mb-4 border border-border/60 flex-grow max-h-[300px] overflow-y-auto custom-scrollbar">
                                <div className="text-xs text-muted-foreground">
                                    <div className="mb-2 pb-2 border-b border-border/60">
                                        <p className="text-foreground font-semibold">Para: {formData.email || '{EMAIL_CLIENTE}'}</p>
                                        <p className="text-muted-foreground">
                                            Asunto: {generateProduccionInicioSubject(formData.admin_code || 'PENDIENTE')}
                                        </p>
                                    </div>
                                    <div className="space-y-2 font-mono">
                                        <p><strong>Número Pedido:</strong> {formData.admin_code || 'Pendiente'}</p>
                                        <p><strong>Cliente:</strong> {formData.customer_company || formData.customer_name}</p>
                                        <p><strong>Región:</strong> {formData.delivery_region || formData.region}</p>
                                        <p><strong>Plazo:</strong> {
                                            formData.delivery_region === 'BALEARES' ? '7 días' :
                                                formData.delivery_region === 'PENINSULA' ? '10 días' :
                                                    formData.delivery_region === 'CANARIAS' ? '15 días' : 'Por determinar'
                                        }</p>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-border/60">
                                        <p className="text-primary font-medium">✓ Pago confirmado</p>
                                        <p className="text-primary font-medium">✓ Pedido en producción</p>
                                        <p className="text-primary font-medium">✓ Plazos según región</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-auto">
                                <Button
                                    onClick={() => {
                                        const emailHTML = generateProduccionInicioEmail({
                                            adminCode: formData.admin_code || 'PENDIENTE',
                                            customerName: formData.customer_name || '',
                                            customerCompany: formData.customer_company || '',
                                            customerCIF: formData.customer_code || '',
                                            contactName: formData.contact_name || '',
                                            phone: formData.phone || '',
                                            email: formData.email || '',
                                            deliveryAddress: formData.delivery_address || '',
                                            deliveryRegion: (formData.delivery_region || formData.region || 'PENINSULA') as 'PENINSULA' | 'BALEARES' | 'CANARIAS',
                                            totalAmount: formData.quantity_total || 0
                                        });
                                        const win = window.open('', '_blank');
                                        if (win) {
                                            win.document.write(`<base href="${window.location.origin}/">` + emailHTML);
                                            win.document.close();
                                        }
                                    }}
                                    variant="outline"
                                    className="border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    Vista Previa
                                </Button>
                                <Button
                                    onClick={() => {
                                        const subject = generateProduccionInicioSubject(formData.admin_code || 'PENDIENTE');
                                        navigator.clipboard.writeText(subject);
                                        toast.success('Asunto copiado');
                                    }}
                                    variant="outline"
                                    className="border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar asunto
                                </Button>
                                <Button
                                    onClick={() => {
                                        const emailHTML = generateProduccionInicioEmail({
                                            adminCode: formData.admin_code || 'PENDIENTE',
                                            customerName: formData.customer_name || '',
                                            customerCompany: formData.customer_company || '',
                                            customerCIF: formData.customer_code || '',
                                            contactName: formData.contact_name || '',
                                            phone: formData.phone || '',
                                            email: formData.email || '',
                                            deliveryAddress: formData.delivery_address || '',
                                            deliveryRegion: (formData.delivery_region || formData.region || 'PENINSULA') as 'PENINSULA' | 'BALEARES' | 'CANARIAS',
                                            totalAmount: formData.quantity_total || 0
                                        });
                                        navigator.clipboard.writeText(emailHTML);
                                        toast.success('HTML copiado');
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar HTML
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN EMAIL NOTIFICACIÓN ENVÍO (Solo si el pedido está enviado) */}
                    <div className={cn(
                        "bg-card p-5 rounded-2xl border border-border/60 shadow-sm flex flex-col mt-6",
                        formData.status !== 'ENVIADO' && "opacity-40 grayscale pointer-events-none"
                    )}>
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-foreground flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-primary" /> Notificación de Envío (Agencia)
                            </h4>
                            {formData.shipping_notification_pending && (
                                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-500 border-amber-500/50 animate-pulse">
                                    Pendiente de enviar
                                </Badge>
                            )}
                        </div>

                        <div className="bg-muted/30 rounded-xl p-4 mb-4 border border-border/60 flex-grow max-h-[300px] overflow-y-auto custom-scrollbar">
                            <div className="text-xs text-muted-foreground">
                                <div className="mb-2 pb-2 border-b border-border/60">
                                    <p className="text-foreground font-semibold">Para: {formData.email || '{EMAIL_CLIENTE}'}</p>
                                    <p className="text-muted-foreground">
                                        Asunto: {generateShippingSubject(formData.admin_code || 'PENDIENTE')}
                                    </p>
                                </div>
                                <div className="space-y-2 font-mono mt-3">
                                    <p className="text-primary font-medium">✓ Pedido Validado en Almacén</p>
                                    <p className="text-primary font-medium">✓ Despachado por Agencia</p>
                                    <p className="text-primary font-medium">✓ Instrucciones de recepción</p>
                                </div>
                                <p className="mt-4 text-[10px] leading-relaxed italic">
                                    * Este email se envía cuando el operario valida el bulto en la zona de logística.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 mt-auto">
                            <Button
                                onClick={() => {
                                    const emailHTML = generateShippingEmail({
                                        adminCode: formData.admin_code || 'PENDIENTE',
                                        customerName: formData.customer_name || '',
                                        customerCompany: formData.customer_company || '',
                                        customerCIF: formData.customer_code || '',
                                        contactName: formData.contact_name || '',
                                        phone: formData.phone || '',
                                        email: formData.email || '',
                                        deliveryAddress: formData.delivery_address || '',
                                        deliveryRegion: (formData.delivery_region || formData.region || 'PENINSULA') as any,
                                        totalAmount: formData.quantity_total || 0
                                    });
                                    const win = window.open('', '_blank');
                                    if (win) {
                                        win.document.write(`<base href="${window.location.origin}/">` + emailHTML);
                                        win.document.close();
                                    }
                                }}
                                variant="outline"
                                className="border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                Vista Previa
                            </Button>
                            <Button
                                onClick={() => {
                                    const emailHTML = generateShippingEmail({
                                        adminCode: formData.admin_code || 'PENDIENTE',
                                        customerName: formData.customer_name || '',
                                        customerCompany: formData.customer_company || '',
                                        customerCIF: formData.customer_code || '',
                                        contactName: formData.contact_name || '',
                                        phone: formData.phone || '',
                                        email: formData.email || '',
                                        deliveryAddress: formData.delivery_address || '',
                                        deliveryRegion: (formData.delivery_region || formData.region || 'PENINSULA') as any,
                                        totalAmount: formData.quantity_total || 0
                                    });
                                    navigator.clipboard.writeText(emailHTML);
                                    toast.success('HTML de envío copiado');
                                }}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copiar HTML
                            </Button>

                            {formData.shipping_notification_pending && (
                                <Button
                                    onClick={async () => {
                                        if (!formData.id) return;
                                        try {
                                            await markShippingSent.mutateAsync({
                                                orderId: formData.id,
                                                userId: (user as any)?.id || 'commercial-user'
                                            });
                                            setFormData(prev => ({ ...prev, shipping_notification_pending: false }));
                                        } catch (err) {
                                            console.error(err);
                                        }
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    <FileCheck className="w-4 h-4 mr-2" />
                                    Marcar como Notificado
                                </Button>
                            )}
                        </div>
                    </div>

                </div>

            </div>
            {/* Diálogo de Confirmación de Pago */}
            {paidConfirmOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card/95 p-6 rounded-2xl border border-border/60 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-emerald-500">
                            <FileCheck className="w-6 h-6" />
                            <h3 className="text-xl font-bold text-foreground">Confirmación de Pago</h3>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                            <p className="text-sm text-emerald-600 dark:text-emerald-200 leading-relaxed font-medium text-center italic">
                                "Recuerda tener el presupuesto y la aceptación, verifica los datos del cliente y que estén asociados al código de producción, gracias."
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setPaidConfirmOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                                onClick={async () => {
                                    try {
                                        setPaidConfirmOpen(false);
                                        await updateOrderStatus.mutateAsync({
                                            orderId: formData.id,
                                            status: 'PAGADO',
                                            comment: 'Validación con revisión de datos por comercial'
                                        });
                                        setFormData(prev => ({ ...prev, status: 'PAGADO' }));
                                        toast.success('Pedido marcado como PAGADO y enviado a producción');
                                        if (onSave) onSave({ ...formData, status: 'PAGADO' });
                                    } catch (error: any) {
                                        toast.error(`Error: ${error.message}`);
                                    }
                                }}
                            >
                                Confirmar Pago
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <DoubleConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={() => {
                    if (formData.id) {
                        onDelete?.(formData.id);
                    }
                }}
                title="Eliminar pedido"
                description="Se eliminara el pedido y su historial asociado."
                confirmText="ELIMINAR"
                requiredWord="ELIMINAR"
            />
        </div>
    );
};
