import React, { useState, useEffect, useRef } from 'react';
import {
    Users, UploadCloud, FileCheck, AlertTriangle, FileText, Plus, MinusCircle, Edit, Save, X, BoxSelect, MapPin, Share2, Loader2, History, Copy
} from 'lucide-react';
import { Order, OrderLine, OrderDocument, OrderStatus } from '@/types/commercial';
import { supabaseProductivity as supabase } from '@/integrations/supabase/dual-client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusLogTimeline } from '@/components/commercial/StatusLogTimeline';
import { QRCodeGenerator } from '@/components/commercial/QRCodeGenerator';
import { useUploadOrderDocument, type DocumentType } from '@/hooks/use-order-documents';
import { SLAIndicator } from '@/components/commercial/SLAIndicator';
import { useMaterials } from '@/hooks/use-materials';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';
import { ORDER_STATUS_BADGES } from '@/lib/order-status';

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
}

// --- Utils ---
// --- Component ---

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose, onSave, canDelete = false, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Order>({ ...order });
    const uploadDocument = useUploadOrderDocument();
    const { data: materials } = useMaterials();
    const [savingDoc, setSavingDoc] = useState<DocType | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const fileInputsRef = useRef<Record<DocType, HTMLInputElement | null>>({
        PRESUPUESTO: null,
        PEDIDO_ACEPTADO: null
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...order });
            // Default to editing if it's a new order (no ID or empty order number)
            if (!order.id || !order.order_number) setIsEditing(true);
        }
    }, [order, isOpen]);

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

        // Check for PRESUPUESTO document
        const hasPresupuesto = formData.documents?.some(doc => doc.type === 'PRESUPUESTO');
        if (!hasPresupuesto) {
            errors.push("Debes subir el presupuesto firmado en PDFs");
        }

        // Check for PEDIDO_ACEPTADO document
        const hasPedidoAceptado = formData.documents?.some(doc => doc.type === 'PEDIDO_ACEPTADO');
        if (!hasPedidoAceptado) {
            errors.push("Debes subir el pedido aceptado en PDFs");
        }

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
            width: '', height: '', material: formData.fabric || '', quantity: 1, notes: ''
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
        // Validation using the complete validation function
        const validation = validateOrder();
        if (!validation.isValid) {
            alert("Por favor completa todos los campos obligatorios:\n\n" + validation.errors.join('\n'));
            return;
        }

        try {
            if (formData.id) {
                // Update existing order
                const { error } = await supabase.from('comercial_orders').update({
                    customer_name: formData.customer_name,
                    customer_code: formData.customer_code,
                    customer_company: formData.customer_company,
                    delivery_region: formData.delivery_region || formData.region,
                    delivery_address: formData.delivery_address,
                    delivery_location_url: formData.delivery_location_url,
                    delivery_date: formData.delivery_date,
                    delivery_city: formData.delivery_city,
                    region: formData.delivery_region || formData.region, // Legacy compatibility
                    fabric: formData.fabric,
                    quantity_total: formData.quantity_total,
                    lines: formData.lines,
                    admin_code: formData.admin_code,
                    internal_notes: formData.internal_notes,
                    updated_at: new Date().toISOString()
                } as any).eq('id', formData.id);

                if (error) throw error;
            } else {
                // Create new order
                const { error } = await supabase.from('comercial_orders').insert([{
                    order_number: formData.order_number,
                    customer_name: formData.customer_name,
                    customer_code: formData.customer_code,
                    customer_company: formData.customer_company,
                    delivery_region: formData.delivery_region || formData.region,
                    delivery_address: formData.delivery_address,
                    delivery_location_url: formData.delivery_location_url,
                    delivery_date: formData.delivery_date,
                    delivery_city: formData.delivery_city,
                    region: formData.delivery_region || formData.region, // Legacy compatibility
                    fabric: formData.fabric,
                    quantity_total: formData.quantity_total,
                    lines: formData.lines || [],
                    documents: formData.documents || [],
                    admin_code: formData.admin_code,
                    internal_notes: formData.internal_notes,
                    status: formData.status || 'PENDIENTE_PAGO'
                } as any]);

                if (error) throw error;
            }

            setIsEditing(false);
            if (onSave) onSave(formData);
            alert("Pedido guardado exitosamente");
        } catch (error: any) {
            console.error("Error saving order:", error);
            alert(`Error al guardar: ${error.message}`);
        }
    };

    // --- Render Helpers ---

    const hasDoc = (type: DocType) => (formData.documents || []).some(d => d.type === type);
    const getDoc = (type: DocType) => (formData.documents || []).find(d => d.type === type);
    const isValidForPDF = () => validation.isValid;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#323438] rounded-2xl shadow-2xl border border-[#45474A] w-full max-w-[98%] h-[95vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[#45474A] bg-[#323438] shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-white">Pedido {formData.order_number || 'NUEVO'}</h3>
                            <Badge
                                className={cn(
                                    "border",
                                    ORDER_STATUS_BADGES[formData.status || 'PENDIENTE_PAGO'] ||
                                        (formData.status === "EN_PRODUCCION"
                                            ? ORDER_STATUS_BADGES.EN_PROCESO
                                            : formData.status === "LISTO_ENVIO"
                                            ? ORDER_STATUS_BADGES.PTE_ENVIO
                                            : ORDER_STATUS_BADGES.PENDIENTE_PAGO)
                                )}
                            >
                                {formData.status || 'BORRADOR'}
                            </Badge>
                        </div>
                        <p className="text-sm text-[#8B8D90] mt-1">Ref. Admin: {formData.admin_code || '---'}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        {!isEditing ? (
                            <Button onClick={() => setIsEditing(true)} variant="outline" className="border-[#6E6F71] text-[#B5B8BA] hover:text-white hover:bg-[#45474A]">
                                <Edit className="w-4 h-4 mr-2" /> Editar
                            </Button>
                        ) : (
                            <Button onClick={handleSave} className="bg-[#14CC7F] hover:bg-[#11A366] text-white shadow-lg shadow-[#14CC7F]/20">
                                <Save className="w-4 h-4 mr-2" /> Guardar
                            </Button>
                        )}
                        {canDelete && formData.id && (
                            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                                Eliminar
                            </Button>
                        )}
                        <button onClick={onClose} className="p-2 text-[#8B8D90] hover:text-white hover:bg-[#45474A] rounded-lg transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 bg-[#1A1D1F] custom-scrollbar flex-1">
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
                            <div className="bg-[#323438] p-5 rounded-xl border border-[#45474A] shadow-sm flex flex-col gap-4">
                                {/* Header with Copy Button */}
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-white flex items-center">
                                        <Users className="w-4 h-4 mr-2 text-[#14CC7F]" /> Datos del Cliente
                                    </h4>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const text = `${formData.customer_name}\n${formData.customer_company}\n${formData.phone || ''}\n${formData.delivery_address || ''}`;
                                            navigator.clipboard.writeText(text);
                                            alert('Datos copiados al portapapeles');
                                        }}
                                        className="border-[#14CC7F] text-[#14CC7F] hover:bg-[#14CC7F]/10 h-7 text-xs"
                                    >
                                        <Share2 className="w-3 h-3 mr-1" /> Copiar
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {/* NÚMERO PEDIDO (ADMIN) */}
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Número Pedido (Admin)</label>
                                        <Input
                                            name="admin_code"
                                            value={formData.admin_code || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder=""
                                            className="bg-[#1A1D1F] border-[#45474A] text-white"
                                        />
                                    </div>

                                    {/* CÓDIGO SOLICITUD PRESUPUESTO */}
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Código Solicitud Presupuesto</label>
                                        <Input
                                            name="customer_code"
                                            value={formData.customer_code || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder=""
                                            className="bg-[#1A1D1F] border-[#45474A] text-white"
                                        />
                                    </div>

                                    {/* CLIENTE / RAZÓN SOCIAL */}
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Cliente / Razón Social</label>
                                        <Input
                                            name="customer_company"
                                            value={formData.customer_company || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="Cliente Nuevo"
                                            className="bg-[#1A1D1F] border-[#45474A] text-white"
                                        />
                                    </div>

                                    {/* REGIÓN y TELÉFONO (side by side) */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-[#8B8D90] uppercase font-bold">Región</label>
                                            <Select
                                                disabled={!isEditing}
                                                value={formData.delivery_region || formData.region}
                                                onValueChange={(v) => handleSelectChange('delivery_region', v)}
                                            >
                                                <SelectTrigger className="bg-[#1A1D1F] border-[#45474A] text-white">
                                                    <SelectValue placeholder="Selecciona" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PENINSULA">PENÍNSULA</SelectItem>
                                                    <SelectItem value="BALEARES">BALEARES</SelectItem>
                                                    <SelectItem value="CANARIAS">CANARIAS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-[#8B8D90] uppercase font-bold">Teléfono</label>
                                            <Input
                                                name="phone"
                                                value={formData.phone || ''}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder=""
                                                className="bg-[#1A1D1F] border-[#45474A] text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* NOMBRE CONTACTO */}
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Nombre Contacto</label>
                                        <Input
                                            name="contact_name"
                                            value={formData.contact_name || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder=""
                                            className="bg-[#1A1D1F] border-[#45474A] text-white"
                                        />
                                    </div>

                                    {/* DIRECCIÓN DE ENTREGA */}
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Dirección de Entrega</label>
                                        <Textarea
                                            name="delivery_address"
                                            value={formData.delivery_address || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder=""
                                            rows={3}
                                            className="bg-[#1A1D1F] border-[#45474A] text-white resize-none"
                                        />
                                    </div>

                                    {/* UBICACIÓN (MAPS) */}
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Ubicación (Maps)</label>
                                        <div className="flex items-center justify-end gap-2">
                                            <Input
                                                name="delivery_location_url"
                                                value={formData.delivery_location_url || ''}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="https://maps.google..."
                                                className="bg-[#1A1D1F] border-[#45474A] text-white flex-1"
                                            />
                                            {formData.delivery_location_url && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open(formData.delivery_location_url, '_blank')}
                                                    className="border-[#45474A] hover:bg-[#45474A]"
                                                >
                                                    <MapPin className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* FECHA ENTREGA */}
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Fecha Entrega</label>
                                        <Input
                                            type="date"
                                            name="delivery_date"
                                            value={formData.delivery_date || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="bg-[#1A1D1F] border-[#45474A] text-white"
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
                                    <div className="bg-[#1A1D1F] rounded-lg p-4 border border-[#45474A]">
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
                            <div className="bg-[#323438] p-5 rounded-xl border border-[#45474A] shadow-sm flex flex-col gap-4">
                                <h4 className="font-bold text-white flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-[#14CC7F]" /> Notas Internas
                                </h4>
                                <Textarea
                                    name="internal_notes"
                                    value={formData.internal_notes || ''}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    placeholder="Escribe notas solo para el equipo..."
                                    rows={5}
                                    className="bg-[#1A1D1F] border-[#45474A] text-white resize-none"
                                />
                            </div>
                        </div>

                        {/* COLUMN 2: MATERIALS & LINES */}
                        <div className="w-full xl:w-[50%] flex flex-col gap-6">
                            {/* Lines Table */}
                            <div className="bg-[#323438] p-5 rounded-xl border border-[#45474A] shadow-sm flex flex-col flex-1 min-h-[300px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-white flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-[#14CC7F]" /> Desglose
                                    </h4>
                                    {isEditing && (
                                        <Button onClick={addLine} size="sm" variant="ghost" className="text-[#14CC7F] hover:text-[#14CC7F] hover:bg-[#14CC7F]/10">
                                            <Plus className="w-4 h-4 mr-1" /> Añadir
                                        </Button>
                                    )}
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-[#45474A]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[#1A1D1F]">
                                            <tr className="text-xs text-[#8B8D90] uppercase">
                                                <th className="p-2 text-left">Cant.</th>
                                                <th className="p-2 text-left">Ancho</th>
                                                <th className="p-2 text-left">Alto</th>
                                                <th className="p-2 text-left">Material</th>
                                                <th className="p-2 text-left">Color</th>
                                                <th className="p-2 text-left">Notas</th>
                                                {isEditing && <th className="p-2"></th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#45474A]">
                                            {(formData.lines || []).map((line, idx) => (
                                                <tr key={idx} className="hover:bg-[#45474A]/30">
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            value={line.quantity}
                                                            onChange={(e) => handleLineChange(idx, 'quantity', parseInt(e.target.value))}
                                                            disabled={!isEditing}
                                                            className="w-16 bg-[#1A1D1F] border-[#45474A] text-white h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={line.width}
                                                            onChange={(e) => handleLineChange(idx, 'width', e.target.value)}
                                                            disabled={!isEditing}
                                                            className="w-20 bg-[#1A1D1F] border-[#45474A] text-white h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={line.height}
                                                            onChange={(e) => handleLineChange(idx, 'height', e.target.value)}
                                                            disabled={!isEditing}
                                                            className="w-20 bg-[#1A1D1F] border-[#45474A] text-white h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Select
                                                            value={line.material}
                                                            onValueChange={(value) => handleLineChange(idx, 'material', value)}
                                                            disabled={!isEditing}
                                                        >
                                                            <SelectTrigger className="w-32 bg-[#1A1D1F] border-[#45474A] text-white h-8">
                                                                <SelectValue placeholder="Material" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-[#1A1D1F] border-[#45474A]">
                                                                {materials?.map((mat) => (
                                                                    <SelectItem
                                                                        key={mat.id}
                                                                        value={mat.name}
                                                                        className="text-white hover:bg-[#323438]"
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
                                                            className="w-24 bg-[#1A1D1F] border-[#45474A] text-white h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={line.notes || ''}
                                                            onChange={(e) => handleLineChange(idx, 'notes', e.target.value)}
                                                            disabled={!isEditing}
                                                            placeholder=""
                                                            className="w-32 bg-[#1A1D1F] border-[#45474A] text-white h-8"
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
                            <div className="bg-[#34363A] p-6 rounded-2xl border border-[#3F4247] shadow-sm">
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
                                        <div key={type} className="mb-4 rounded-xl border border-[#5A3F2E] bg-[#3A3432] p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-white font-semibold">
                                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                    <span>{DOC_LABELS[type]}</span>
                                                </div>
                                                {exists ? (
                                                    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-[10px]">OK</Badge>
                                                ) : (
                                                    <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[10px]">PENDIENTE</Badge>
                                                )}
                                            </div>
                                            {!exists && (
                                                <button
                                                    type="button"
                                                    className="mt-3 w-full rounded-lg border border-dashed border-[#5A3F2E] bg-[#24272B] p-3 text-left text-xs text-[#9EA2A8] hover:bg-[#2C2F34]"
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
                                                        className="w-full border-[#3F4247] bg-[#1F2225] text-[#B5B8BA] hover:bg-[#2C2F34]"
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
                            <div className="bg-[#34363A] p-6 rounded-2xl border border-[#3F4247]">
                                <div className="flex items-center gap-2 mb-4">
                                    <BoxSelect className="w-4 h-4 text-[#14CC7F]" />
                                    <h4 className="font-bold text-white">Etiqueta de Produccion</h4>
                                </div>

                                <div className="flex flex-col items-center gap-4">
                                    <div className="bg-white p-4 rounded-2xl shadow-lg">
                                        <QRCodeGenerator order={formData} />
                                    </div>

                                    <div className="w-full bg-[#1F2225] rounded-xl border border-[#3F4247] p-3 space-y-2">
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
                                            <span className="text-white font-medium">
                                                {formData.delivery_date ? new Date(formData.delivery_date).toLocaleDateString('es-ES') : '---'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="w-full bg-[#1F2225] rounded-xl border border-[#3F4247] p-3">
                                        <p className="text-xs text-[#B5B8BA] text-center font-mono break-all">
                                            {`${formData.order_number || 'INT-XXXX'}|${formData.customer_name || 'Cliente'}|${formData.delivery_region || 'Region'}|${formData.delivery_date ? new Date(formData.delivery_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '--/--'}|${formData.lines?.reduce((acc, l) => acc + (l.material || ''), '') || 'Material'}|${formData.status || 'PENDIENTE'}`}
                                        </p>
                                    </div>

                                    <Button
                                        disabled={!isValidForPDF()}
                                        className="w-full bg-[#1F2225] hover:bg-[#2C2F34] text-white border border-[#3F4247] disabled:opacity-50"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        GENERAR ORDEN PDF
                                    </Button>
                                    {!validation.isValid && (
                                        <p className="text-xs text-[#8B8D90] text-center mt-2">
                                            Completa la informacion obligatoria para habilitar la orden.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* EMAIL TEMPLATES SECTION - Redesigned to match reference */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Email Presupuesto */}
                        <div className="bg-[#2F3135] p-5 rounded-2xl border border-[#3B3D41] shadow-sm">
                            <h4 className="font-bold text-white mb-4 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-[#14CC7F]" /> Email Presupuesto
                            </h4>
                            <div className="bg-[#1F2225] rounded-xl p-4 mb-4 max-h-48 overflow-y-auto custom-scrollbar border border-[#3B3D41]">
                                <pre className="text-xs text-[#8B8D90] font-mono whitespace-pre-wrap">
                                    {`<HTML>
<HEAD>
<TITLE>Cliente: ${formData.customer_company || formData.customer_name || 'Nuevo'}</TITLE>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
</HEAD>
<BODY>
<P>Estimado/a cliente,</P>
<P>Adjuntamos presupuesto nº ${formData.admin_code || '{PRESUPUESTO_ID}'} para el pedido solicitado ${formData.order_number || '{REF_PEDIDO}'} con la siguiente información:</P>
<P>Referencia de entrega: ${formData.delivery_address || '{DIRECCION}'}</P>
<P>Plazo de entrega: ${formData.delivery_date ? new Date(formData.delivery_date).toLocaleDateString('es-ES') : '{FECHA}'}</P>
<P>Total: ${formData.quantity_total || 0} unidades</P>
</BODY>
</HTML>`}
                                </pre>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    onClick={() => alert('Vista actualizada')}
                                    variant="outline"
                                    className="border-[#3B3D41] text-[#8B8D90] hover:bg-[#3B3D41] hover:text-white"
                                >
                                    Actualizar vista
                                </Button>
                                <Button
                                    onClick={() => {
                                        const html = `<HTML>\n<HEAD>\n<TITLE>Cliente: ${formData.customer_company || formData.customer_name || 'Nuevo'}</TITLE>\n</HEAD>\n<BODY>\n<P>Estimado/a cliente,</P>\n<P>Adjuntamos presupuesto...</P>\n</BODY>\n</HTML>`;
                                        navigator.clipboard.writeText(html);
                                        alert('HTML copiado');
                                    }}
                                    className="bg-[#14CC7F] hover:bg-[#11A366] text-white"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar HTML
                                </Button>
                            </div>
                        </div>

                        {/* Email Inicio Producción */}
                        <div className="bg-[#2F3135] p-5 rounded-2xl border border-[#3B3D41] shadow-sm">
                            <h4 className="font-bold text-white mb-4 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-[#14CC7F]" /> Email Inicio Producción
                            </h4>
                            <div className="bg-[#1F2225] rounded-xl p-4 mb-4 max-h-48 overflow-y-auto custom-scrollbar border border-[#3B3D41]">
                                <pre className="text-xs text-[#8B8D90] font-mono whitespace-pre-wrap">
                                    {`<HTML>
<HEAD>
<TITLE>Inicio de producción</TITLE>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
</HEAD>
<BODY>
<P>Estimado/a cliente,</P>
<P>Confirmamos que su pedido ${formData.order_number || '{REF_PEDIDO}'} ha sido aprobado y está en producción.</P>
<P>Fecha estimada de entrega: ${formData.delivery_date ? new Date(formData.delivery_date).toLocaleDateString('es-ES') : '{FECHA}'}</P>
<P>Referencia: ${formData.delivery_address || '{DIRECCION}'}</P>
</BODY>
</HTML>`}
                                </pre>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    onClick={() => alert('Vista actualizada')}
                                    variant="outline"
                                    className="border-[#3B3D41] text-[#8B8D90] hover:bg-[#3B3D41] hover:text-white"
                                >
                                    Actualizar vista
                                </Button>
                                <Button
                                    onClick={() => {
                                        const html = `<HTML>\n<HEAD>\n<TITLE>Inicio de producción</TITLE>\n</HEAD>\n<BODY>\n<P>Estimado/a cliente,</P>\n<P>Confirmamos que su pedido está en producción...</P>\n</BODY>\n</HTML>`;
                                        navigator.clipboard.writeText(html);
                                        alert('HTML copiado');
                                    }}
                                    className="bg-[#14CC7F] hover:bg-[#11A366] text-white"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar HTML
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
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
