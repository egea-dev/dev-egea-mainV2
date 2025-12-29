import React, { useState, useEffect, useRef } from 'react';
import {
    Users, UploadCloud, FileCheck, AlertTriangle, FileText, Plus, MinusCircle, Edit, Save, X, BoxSelect, MapPin, Share2, Loader2
} from 'lucide-react';
import { Order, OrderLine, OrderDocument, OrderStatus } from '@/types/commercial';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Types & Constants ---

type DocType = 'PRESUPUESTO' | 'PEDIDO_ACEPTADO';
const DOC_LABELS: Record<DocType, string> = {
    PRESUPUESTO: 'Presupuesto',
    PEDIDO_ACEPTADO: 'Pedido Aceptado'
};

const MATERIALS_LIST = [
    'Lino', 'Terciopelo', 'Loneta', 'Opaco', 'Visillo',
    'Ignífugo', 'Estampado', 'Blackout', 'Polipiel'
];

interface OrderDetailModalProps {
    order: Order;
    isOpen: boolean;
    onClose: () => void;
    onSave?: (updatedOrder: Order) => void;
}

// --- Utils ---
const triggerPrint = (htmlContent: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
};

const STATUS_BADGES: Record<string, string> = {
    'PENDIENTE_PAGO': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'PAGADO': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'EN_PROCESO': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'PTE_ENVIO': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    'ENVIADO': 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    'ENTREGADO': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'CANCELADO': 'bg-red-500/10 text-red-500 border-red-500/20',
};

// --- Component ---

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Order>({ ...order });
    const [savingDoc, setSavingDoc] = useState<DocType | null>(null);
    const [materialPickerRow, setMaterialPickerRow] = useState<number | null>(null);
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

    const handleMaterialSelect = (material: string) => {
        if (!isEditing) return;
        setFormData(prev => ({ ...prev, fabric: material }));
    };

    // --- Docs Logic ---

    const ensureDocId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

    const handleDocUpload = async (type: DocType, file: File) => {
        if (!order.id) {
            alert("Guarda el pedido primero antes de subir documentos.");
            return;
        }
        setSavingDoc(type);

        // Simulate upload for now if bucket not ready, but try real upload
        const bucket = supabase.storage.from('order-docs');
        const path = `${order.id}/${type}/${Date.now()}_${file.name}`;

        try {
            const { error } = await bucket.upload(path, file);
            if (error) throw error;

            const { data: { publicUrl } } = bucket.getPublicUrl(path);

            const newDoc: OrderDocument = {
                type,
                url: publicUrl,
                storage_path: path,
                name: file.name,
                uploaded_at: new Date().toISOString()
            };

            const nextDocs = [...(formData.documents || []).filter(d => d.type !== type), newDoc];

            // Update DB
            const { error: dbError } = await supabase.from('orders').update({ documents: nextDocs } as any).eq('id', order.id);
            if (dbError) throw dbError;

            setFormData(prev => ({ ...prev, documents: nextDocs }));

        } catch (e) {
            console.error("Upload error:", e);
            alert("Error al subir documento. Verifica la conexión.");
        } finally {
            setSavingDoc(null);
        }
    };

    const triggerFileSelect = (type: DocType) => fileInputsRef.current[type]?.click();

    const handleSave = async () => {
        // Basic validation
        if (!formData.customer_name) {
            alert("El nombre del cliente es obligatorio.");
            return;
        }

        try {
            if (formData.id) {
                const { error } = await supabase.from('orders').update({
                    customer_name: formData.customer_name,
                    region: formData.region,
                    fabric: formData.fabric,
                    quantity_total: formData.quantity_total,
                    lines: formData.lines,
                    admin_code: formData.admin_code,
                    // Add other fields...
                } as any).eq('id', formData.id);
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase.from('orders').insert([{
                    customer_name: formData.customer_name,
                    status: 'PENDIENTE_PAGO',
                    lines: formData.lines || [],
                    documents: []
                }] as any);
                if (error) throw error;
            }
            onSave?.(formData);
            setIsEditing(false);
            onClose(); // Optional: close on save or stay? Stay is better usually.
        } catch (e) {
            console.error("Save error:", e);
            alert("Error al guardar.");
        }
    };

    // --- Render Helpers ---

    const hasDoc = (type: DocType) => (formData.documents || []).some(d => d.type === type);
    const getDoc = (type: DocType) => (formData.documents || []).find(d => d.type === type);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#323438] rounded-2xl shadow-2xl border border-[#45474A] w-full max-w-[98%] h-[95vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[#45474A] bg-[#323438] shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-white">Pedido {formData.order_number || 'NUEVO'}</h3>
                            <Badge className={cn("border", STATUS_BADGES[formData.status || 'PENDIENTE_PAGO'] || STATUS_BADGES['PENDIENTE_PAGO'])}>
                                {formData.status || 'BORRADOR'}
                            </Badge>
                        </div>
                        <p className="text-sm text-[#8B8D90] mt-1">Ref. Admin: {formData.admin_code || '---'}</p>
                    </div>
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <Button onClick={() => setIsEditing(true)} variant="outline" className="border-[#6E6F71] text-[#B5B8BA] hover:text-white hover:bg-[#45474A]">
                                <Edit className="w-4 h-4 mr-2" /> Editar
                            </Button>
                        ) : (
                            <Button onClick={handleSave} className="bg-[#14CC7F] hover:bg-[#11A366] text-white shadow-lg shadow-[#14CC7F]/20">
                                <Save className="w-4 h-4 mr-2" /> Guardar
                            </Button>
                        )}
                        <button onClick={onClose} className="p-2 text-[#8B8D90] hover:text-white hover:bg-[#45474A] rounded-lg transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 bg-[#1A1D1F] custom-scrollbar flex-1">
                    <div className="flex flex-col xl:flex-row gap-6 mb-6">

                        {/* COLUMN 1: CLIENT DATA */}
                        <div className="w-full xl:w-[25%] flex flex-col gap-6">
                            <div className="bg-[#323438] p-5 rounded-xl border border-[#45474A] shadow-sm flex flex-col gap-4">
                                <h4 className="font-bold text-white flex items-center">
                                    <Users className="w-4 h-4 mr-2 text-[#14CC7F]" /> Datos del Cliente
                                </h4>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Cliente</label>
                                        <Input
                                            name="customer_name"
                                            value={formData.customer_name || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="bg-[#1A1D1F] border-[#45474A] text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Región</label>
                                        <Select disabled={!isEditing} value={formData.region} onValueChange={(v) => handleSelectChange('region', v)}>
                                            <SelectTrigger className="bg-[#1A1D1F] border-[#45474A] text-white">
                                                <SelectValue placeholder="Selecciona" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PENINSULA">PENINSULA</SelectItem>
                                                <SelectItem value="BALEARES">BALEARES</SelectItem>
                                                <SelectItem value="CANARIAS">CANARIAS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#8B8D90] uppercase font-bold">Ref. Admin</label>
                                        <Input
                                            name="admin_code"
                                            value={formData.admin_code || ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="bg-[#1A1D1F] border-[#45474A] text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 2: MATERIALS & LINES */}
                        <div className="w-full xl:w-[50%] flex flex-col gap-6">
                            {/* Material Selector */}
                            <div className="bg-[#323438] p-5 rounded-xl border border-[#45474A] shadow-sm">
                                <h4 className="font-bold text-white mb-3 flex items-center">
                                    <BoxSelect className="w-4 h-4 mr-2 text-indigo-400" /> Selección de Material
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {MATERIALS_LIST.map((material) => (
                                        <button
                                            key={material}
                                            onClick={() => handleMaterialSelect(material)}
                                            disabled={!isEditing}
                                            className={cn(
                                                "py-3 px-2 rounded-lg text-xs font-bold uppercase transition-all border",
                                                formData.fabric === material
                                                    ? "bg-[#14CC7F] text-white border-[#14CC7F] shadow-lg shadow-[#14CC7F]/20"
                                                    : "bg-[#1A1D1F] text-[#8B8D90] border-[#45474A] hover:bg-[#45474A]",
                                                !isEditing && "opacity-70 cursor-not-allowed"
                                            )}
                                        >
                                            {material}
                                        </button>
                                    ))}
                                </div>
                            </div>

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
                                        <thead className="bg-[#1A1D1F] text-[#8B8D90] border-b border-[#45474A]">
                                            <tr>
                                                <th className="p-2 text-left">Cant.</th>
                                                <th className="p-2 text-left">Ancho</th>
                                                <th className="p-2 text-left">Alto</th>
                                                <th className="p-2 text-left">Material</th>
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
                                                        <Input
                                                            value={line.material}
                                                            onChange={(e) => handleLineChange(idx, 'material', e.target.value)}
                                                            disabled={!isEditing}
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
                                                <tr><td colSpan={5} className="p-8 text-center text-[#8B8D90] italic">No hay líneas definidas</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 3: DOCS & ACTIONS */}
                        <div className="w-full xl:w-[25%] flex flex-col gap-6">
                            <div className="bg-[#323438] p-5 rounded-xl border border-[#45474A] shadow-sm">
                                <h4 className="font-bold text-white mb-4 flex items-center">
                                    <UploadCloud className="w-4 h-4 mr-2 text-purple-400" /> Documentación
                                </h4>

                                {(['PRESUPUESTO', 'PEDIDO_ACEPTADO'] as DocType[]).map(type => {
                                    const doc = getDoc(type);
                                    const exists = !!doc;
                                    return (
                                        <div key={type} className="mb-4 p-3 rounded-lg border border-[#45474A] bg-[#1A1D1F]/50">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-[#B5B8BA]">{DOC_LABELS[type]}</span>
                                                {exists
                                                    ? <Badge className="bg-[#14CC7F]/20 text-[#14CC7F] border-0 text-[10px]">OK</Badge>
                                                    : <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[10px]">PENDIENTE</Badge>
                                                }
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                ref={el => fileInputsRef.current[type] = el}
                                                onChange={(e) => e.target.files?.[0] && handleDocUpload(type, e.target.files[0])}
                                            />
                                            <div className="flex gap-2">
                                                {exists ? (
                                                    <Button variant="outline" size="sm" className="w-full border-[#45474A] text-[#B5B8BA]" onClick={() => window.open(doc.url, '_blank')}>
                                                        Ver PDF
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="w-full border-dashed border-[#6E6F71] text-[#8B8D90] hover:text-white"
                                                        onClick={() => triggerFileSelect(type)}
                                                        disabled={!order.id || savingDoc === type}
                                                    >
                                                        {savingDoc === type ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3 mr-2" />}
                                                        Subir
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};
