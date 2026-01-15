import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Download, Calendar as CalendarIcon, MapPin, User, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getOrderStatusBadge, getOrderStatusLabel } from '@/lib/order-status';
import { getTaskStateColor, getTaskStateLabel } from '@/lib/constants';

interface TaskListViewProps {
    tasks: any[];
    mode: 'commercial' | 'installations';
    className?: string;
}

export const TaskListView = ({ tasks, mode, className }: TaskListViewProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTasks = tasks.filter(task => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();

        if (mode === 'commercial') {
            return (
                (task.customer_company?.toLowerCase() || task.customer_name?.toLowerCase() || '').includes(query) ||
                (task.admin_code?.toLowerCase() || task.order_number?.toLowerCase() || '').includes(query) ||
                (task.status?.toLowerCase() || '').includes(query)
            );
        } else {
            return (
                (task.description?.toLowerCase() || '').includes(query) ||
                (task.data?.site?.toLowerCase() || '').includes(query) ||
                (task.client?.full_name?.toLowerCase() || '').includes(query) ||
                (task.location?.toLowerCase() || '').includes(query) ||
                (task.screen_name?.toLowerCase() || '').includes(query)
            );
        }
    });

    const exportToCSV = () => {
        const headers = mode === 'commercial'
            ? ['Pedido', 'Cliente', 'Estado', 'Fecha Entrega', 'Cantidad']
            : ['Fecha', 'Descripción', 'Estado', 'Ubicación', 'Grupo', 'Vehículos'];

        const rows = filteredTasks.map(task =>
            mode === 'commercial'
                ? [
                    task.admin_code || task.order_number || '',
                    task.customer_company || task.customer_name || '',
                    task.status || '',
                    task.delivery_date || '',
                    task.quantity_total || 0
                ]
                : [
                    task.start_date || '',
                    task.description || task.data?.site || '',
                    task.state || '',
                    task.location || '',
                    task.screen_group || task.screen_name || '',
                    task.assigned_vehicles?.map((v: any) => v.name).join(', ') || ''
                ]
        );

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mode}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const getStatusBadge = (status: string) => {
        if (mode === 'commercial') {
            return (
                <Badge variant="outline" className={cn("border", getOrderStatusBadge(status))}>
                    {getOrderStatusLabel(status).replace(/_/g, ' ')}
                </Badge>
            );
        } else {
            const normalized = status?.toLowerCase() || '';
            return (
                <Badge variant="outline" className={cn("border capitalize", getTaskStateColor(normalized) || 'bg-slate-800 text-slate-400')}>
                    {getTaskStateLabel(normalized)}
                </Badge>
            );
        }
    };

    return (
        <div className={cn("flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300", className)}>
            {/* Header con búsqueda y exportación */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card backdrop-blur-md">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        placeholder={mode === 'commercial' ? "Buscar pedido, cliente..." : "Buscar tarea, sitio..."}
                        className="pl-9 bg-muted/40 border-border/60 text-slate-200 focus:ring-2 focus:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium px-2">
                        {filteredTasks.length} {mode === 'commercial' ? 'registros' : 'tareas'}
                    </span>
                    <Button onClick={exportToCSV} variant="outline" size="sm" className="h-9 border-border/60 hover:bg-muted/60 text-slate-300">
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Tabla */}
            <div className="rounded-xl border border-border/60 bg-card backdrop-blur-sm overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="border-border/60 hover:bg-transparent">
                                {mode === 'commercial' ? (
                                    <>
                                        <TableHead className="text-slate-400 font-medium">Pedido</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Cliente</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Estado</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Fecha Entrega</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Cant.</TableHead>
                                    </>
                                ) : (
                                    <>
                                        <TableHead className="text-slate-400 font-medium">Fecha</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Descripción / Sitio</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Grupo</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Estado</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Vehículos</TableHead>
                                    </>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTasks.length > 0 ? (
                                filteredTasks.map((task) => (
                                    <TableRow key={task.id} className="border-border/60 hover:bg-muted/50 transition-colors">
                                        {mode === 'commercial' ? (
                                            <>
                                                <TableCell className="font-mono text-slate-300 font-medium">{task.admin_code || task.order_number}</TableCell>
                                                <TableCell className="text-slate-300">{task.customer_company || task.customer_name}</TableCell>
                                                <TableCell>{getStatusBadge(task.status)}</TableCell>
                                                <TableCell className="text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarIcon className="w-3.5 h-3.5 opacity-50" />
                                                        {task.delivery_date ? format(new Date(task.delivery_date), 'dd MMM yyyy', { locale: es }) : '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-400 font-mono">{task.quantity_total}</TableCell>
                                            </>
                                        ) : (
                                            <>
                                                <TableCell className="text-slate-300">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarIcon className="w-3.5 h-3.5 opacity-50" />
                                                        {task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy', { locale: es }) :
                                                            <span className="text-amber-500/70 text-xs italic">Sin fecha</span>
                                                        }
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-slate-200 font-medium">{task.description || task.data?.site || 'Sin descripción'}</span>
                                                        {task.location && (
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                                <MapPin className="w-3 h-3" />
                                                                {task.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-muted/60 text-slate-400 text-[10px] border-border/60">
                                                        {task.screen_group || task.screen_name || 'General'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(task.state)}</TableCell>
                                                <TableCell>
                                                    {task.assigned_vehicles && task.assigned_vehicles.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {task.assigned_vehicles.map((v: any, i: number) => (
                                                                <div key={i} className="flex items-center gap-1 text-[10px] text-slate-400 bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                                                                    <Truck className="w-3 h-3 opacity-50" />
                                                                    {v.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">-</span>
                                                    )}
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                        No se encontraron resultados
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};
