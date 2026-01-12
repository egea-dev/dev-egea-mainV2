import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabaseProductivity, supabaseMain } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface IncidentReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId?: string; // Legacy support
    orderNumber?: string;
    // Nuevos props para soporte dual
    system?: 'productivity' | 'main';
    itemId?: string; // ID del pedido o de la tarea
    itemLabel?: string; // Nombre/Título para mostrar (Pedido X o Tarea Y)
}

export function IncidentReportModal({
    isOpen,
    onClose,
    orderId,
    orderNumber,
    system = 'productivity',
    itemId,
    itemLabel
}: IncidentReportModalProps) {
    const [type, setType] = useState<string>('calidad');
    const [priority, setPriority] = useState<string>('media');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Determinar ID y label finales
    const finalItemId = itemId || orderId;
    const finalLabel = itemLabel || orderNumber || '---';

    const handleSubmit = async () => {
        if (!description.trim()) {
            toast.error('Por favor describe la incidencia');
            return;
        }

        if (!finalItemId) {
            toast.error('Error: Identificador de referencia no encontrado');
            return;
        }

        try {
            setIsSubmitting(true);

            const client = system === 'main' ? supabaseMain : supabaseProductivity;
            const refField = system === 'main' ? 'task_id' : 'order_id';

            const insertData = {
                [refField]: finalItemId,
                type,
                priority,
                description,
                status: 'pendiente',
            };

            // @ts-ignore
            const { error } = await client
                .from('incidencias')
                .insert(insertData);

            if (error) throw error;

            toast.success('Incidencia reportada correctamente');
            setDescription('');
            setType('calidad');
            setPriority('media');
            onClose();
        } catch (error: any) {
            console.error('Error reporting incident:', error);
            toast.error('Error al reportar incidencia: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-[#1A1D1F] border-[#45474A] text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        Reportar Incidencia
                    </DialogTitle>
                    <DialogDescription className="text-[#8B8D90]">
                        Reportando problema para: <span className="text-white font-mono font-bold">{finalLabel}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="type" className="text-white">Tipo de Incidencia</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="bg-[#323438] border-[#45474A] text-white">
                                <SelectValue placeholder="Selecciona el tipo" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#323438] border-[#45474A] text-white">
                                <SelectItem value="calidad">Calidad / Defecto</SelectItem>
                                <SelectItem value="rotura">Rotura / Daño</SelectItem>
                                <SelectItem value="falta_material">Falta Material / Stock</SelectItem>
                                <SelectItem value="retraso">Retraso Producción</SelectItem>
                                <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="priority" className="text-white">Prioridad</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger className="bg-[#323438] border-[#45474A] text-white">
                                <SelectValue placeholder="Prioridad" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#323438] border-[#45474A] text-white">
                                <SelectItem value="baja">Baja - Informativa</SelectItem>
                                <SelectItem value="media">Media - Requiere atención</SelectItem>
                                <SelectItem value="alta">Alta - Bloqueante</SelectItem>
                                <SelectItem value="critica">CRÍTICA - Parada producción</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-white">Descripción Detallada</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe qué ha pasado..."
                            className="min-h-[100px] bg-[#323438] border-[#45474A] text-white placeholder:text-[#6E6F71]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="border-[#45474A] text-white hover:bg-[#323438] hover:text-white">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-red-600 hover:bg-red-700 text-white border-none"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Enviar Reporte
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
