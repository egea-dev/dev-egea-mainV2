import React, { useState, useEffect } from 'react';
import PageShell from '@/components/layout/PageShell';
import { supabaseProductivity } from '@/integrations/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Incident {
    id: string;
    order_id: string;
    order_number?: string; // Relation
    type: string;
    description: string;
    priority: string;
    status: string;
    created_at: string;
    reported_by_name?: string;
    produccion_work_orders?: { order_number: string }; // Join
}

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pendiente');

    const loadIncidents = async () => {
        try {
            setLoading(true);
            // @ts-ignore
            let query = supabaseProductivity
                .from('incidencias')
                .select(`
          *,
          produccion_work_orders (
            order_number
          )
        `)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // @ts-ignore
            const { data, error } = await query;

            if (error) throw error;

            const formatted = (data || []).map((inc: any) => ({
                ...inc,
                order_number: inc.produccion_work_orders?.order_number || '---'
            }));

            setIncidents(formatted);
        } catch (error: any) {
            console.error('Error loading incidents:', error);
            toast.error('Error al cargar incidencias');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIncidents();
    }, [statusFilter]);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            // @ts-ignore
            const { error } = await supabaseProductivity
                .from('incidencias')
                .update({
                    status: newStatus,
                    resolved_at: newStatus !== 'pendiente' ? new Date().toISOString() : null
                })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Estado actualizado a: ${newStatus.toUpperCase()}`);
            loadIncidents();
        } catch (error: any) {
            toast.error('Error al actualizar estado');
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'critica': return 'bg-red-500/20 text-red-500 border-red-500/50';
            case 'alta': return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
            case 'media': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
            default: return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
        }
    };

    return (
        <PageShell title="Gestión de Incidencias" description="Resolución de problemas de producción y envíos">
            <div className="space-y-4">
                {/* Filtros */}
                <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Estado:</span>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-muted/50 border-border text-foreground">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="pendiente">Pendientes</SelectItem>
                                <SelectItem value="en_revision">En Revisión</SelectItem>
                                <SelectItem value="resuelto">Resueltos</SelectItem>
                                <SelectItem value="desestimado">Desestimados</SelectItem>
                                <SelectItem value="all">Todos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={loadIncidents} variant="outline" className="border-border text-foreground hover:bg-muted">
                        Refrescar
                    </Button>
                </div>

                {/* Tabla */}
                <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Prioridad</TableHead>
                                <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Pedido</TableHead>
                                <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Tipo</TableHead>
                                <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Descripción</TableHead>
                                <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Fecha</TableHead>
                                <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Estado / Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando incidencias...</TableCell>
                                </TableRow>
                            ) : incidents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay incidencias en este estado.</TableCell>
                                </TableRow>
                            ) : (
                                incidents.map((incident) => (
                                    <TableRow key={incident.id} className="border-border hover:bg-muted/30">
                                        <TableCell>
                                            <Badge className={getPriorityColor(incident.priority)}>
                                                {incident.priority.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-foreground font-bold">
                                            {incident.order_number}
                                        </TableCell>
                                        <TableCell className="text-foreground font-medium capitalize">
                                            {incident.type.replace('_', ' ')}
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <p className="text-sm text-foreground/80 truncate" title={incident.description}>
                                                {incident.description}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs font-medium">
                                            {format(new Date(incident.created_at), "d MMM, HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {incident.status !== 'resuelto' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-900/20 text-emerald-500 hover:bg-emerald-900/40 border border-emerald-500/20"
                                                        onClick={() => updateStatus(incident.id, 'resuelto')}
                                                        title="Marcar como Resuelto"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {incident.status !== 'desestimado' && incident.status !== 'resuelto' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-500/20"
                                                        onClick={() => updateStatus(incident.id, 'desestimado')}
                                                        title="Desestimar"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {incident.status === 'resuelto' && (
                                                    <span className="text-emerald-500 text-xs font-medium flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Resuelto
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </PageShell>
    );
}
