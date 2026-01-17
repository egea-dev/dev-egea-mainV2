import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { supabase, supabaseProductivity } from '@/integrations/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Calendar,
  Search,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  Archive,
  Package,
  Clock,
  Truck
} from 'lucide-react';
import dayjs from 'dayjs';
import { TaskStateBadge, StatusBadge, VehicleBadge } from '@/components/badges';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ArchivedTaskParticipant = {
  id: string;
  full_name: string;
  email?: string | null;
  role?: string | null;
  status?: string | null;
};

type ArchivedTaskVehicle = {
  id: string;
  name: string;
  type?: string | null;
};

type ArchivedTaskRecord = {
  id: string;
  archived_at: string;
  screen_group: string | null;
  state: string | null;
  data: Record<string, unknown> | null;
  responsible_name: string | null;
  assigned_users?: unknown;
  assigned_vehicles?: unknown;
  vehicle_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type ArchivedWorkOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  updated_at: string;
  notes: string | null;
  technical_specs?: any;
};

const normalizeArchivedUsers = (value: unknown): ArchivedTaskParticipant[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : null;
      const fullName = typeof record.full_name === 'string' ? record.full_name : null;
      if (!id || !fullName) return null;
      return {
        id,
        full_name: fullName,
        email: typeof record.email === 'string' ? record.email : null,
        role: typeof record.role === 'string' ? record.role : null,
        status: typeof record.status === 'string' ? record.status : null,
      };
    })
    .filter(Boolean) as ArchivedTaskParticipant[];
};

const normalizeArchivedVehicles = (value: unknown): ArchivedTaskVehicle[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : null;
      const name = typeof record.name === 'string' ? record.name : null;
      if (!id || !name) return null;
      return {
        id,
        name,
        type: typeof record.type === 'string' ? record.type : null,
      };
    })
    .filter(Boolean) as ArchivedTaskVehicle[];
};

const useArchivedTasks = () => {
  return useQuery<ArchivedTaskRecord[]>({
    queryKey: ['archived_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('archived_tasks')
        .select('*')
        .order('archived_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArchivedTaskRecord[];
    },
  });
};

const useArchivedWorkOrders = () => {
  return useQuery<ArchivedWorkOrder[]>({
    queryKey: ['archived_work_orders'],
    queryFn: async () => {
      const { data, error } = await supabaseProductivity
        .from('produccion_work_orders')
        .select('*')
        .in('status', ['LISTO_ENVIO', 'ENVIADO', 'ENTREGADO'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.technical_specs?.customer_name || o.order_number,
        status: o.status,
        updated_at: o.updated_at,
        notes: o.notes,
        technical_specs: o.technical_specs
      }));
    },
  });
};

// Componente simple para gráfico de barras
interface ChartData {
  month: string;
  Instalaciones: number;
  Confección: number;
  Tapicería: number;
  Producción: number;
  Otros: number;
}

const ArchiveChart = ({ tasks, orders }: { tasks: ArchivedTaskRecord[], orders: ArchivedWorkOrder[] }) => {
  const chartData = useMemo(() => {
    const monthlyData: Record<string, ChartData> = {};

    tasks.forEach(task => {
      const archivedAt = task.archived_at ? dayjs(task.archived_at) : null;
      const month = archivedAt?.isValid() ? archivedAt.format('YYYY-MM') : 'Sin fecha';
      const group = task.screen_group || 'Sin grupo';

      if (!monthlyData[month]) {
        monthlyData[month] = { month, Instalaciones: 0, Confección: 0, Tapicería: 0, Producción: 0, Otros: 0 };
      }

      if (group.includes('Instalacion')) monthlyData[month].Instalaciones++;
      else if (group.includes('Confeccion')) monthlyData[month].Confección++;
      else if (group.includes('Tapiceria')) monthlyData[month].Tapicería++;
      else monthlyData[month].Otros++;
    });

    orders.forEach(order => {
      const updatedAt = order.updated_at ? dayjs(order.updated_at) : null;
      const month = updatedAt?.isValid() ? updatedAt.format('YYYY-MM') : 'Sin fecha';

      if (!monthlyData[month]) {
        monthlyData[month] = { month, Instalaciones: 0, Confección: 0, Tapicería: 0, Producción: 0, Otros: 0 };
      }
      monthlyData[month].Producción++;
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [tasks, orders]);

  const maxValue = Math.max(...chartData.map((d: ChartData) => d.Instalaciones + d.Confección + d.Tapicería + d.Producción + d.Otros), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Actividad Archivada por Mes</h3>
      <div className="space-y-4">
        {chartData.map((item: ChartData) => {
          const total = item.Instalaciones + item.Confección + item.Tapicería + item.Producción + item.Otros;

          return (
            <div key={item.month} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{dayjs(item.month).format('MMM YYYY')}</span>
                <span className="font-medium">{total} registros</span>
              </div>
              <div className="flex gap-1 h-6">
                <div
                  className="bg-red-500 rounded-sm flex items-center justify-center text-[10px] text-white"
                  style={{ width: `${(item.Instalaciones / total) * 100}%` }}
                  title={`Instalaciones: ${item.Instalaciones}`}
                >
                  {item.Instalaciones > 0 && item.Instalaciones}
                </div>
                <div
                  className="bg-purple-500 rounded-sm flex items-center justify-center text-[10px] text-white"
                  style={{ width: `${(item.Confección / total) * 100}%` }}
                  title={`Confección: ${item.Confección}`}
                >
                  {item.Confección > 0 && item.Confección}
                </div>
                <div
                  className="bg-yellow-500 rounded-sm flex items-center justify-center text-[10px] text-white"
                  style={{ width: `${(item.Tapicería / total) * 100}%` }}
                  title={`Tapicería: ${item.Tapicería}`}
                >
                  {item.Tapicería > 0 && item.Tapicería}
                </div>
                <div
                  className="bg-blue-600 rounded-sm flex items-center justify-center text-[10px] text-white"
                  style={{ width: `${(item.Producción / total) * 100}%` }}
                  title={`Producción: ${item.Producción}`}
                >
                  {item.Producción > 0 && item.Producción}
                </div>
                <div
                  className="bg-gray-500 rounded-sm flex items-center justify-center text-[10px] text-white"
                  style={{ width: `${(item.Otros / total) * 100}%` }}
                  title={`Otros: ${item.Otros}`}
                >
                  {item.Otros > 0 && item.Otros}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          <span>Instalaciones</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
          <span>Confección</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
          <span>Tapicería</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          <span>Producción</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
          <span>Otros</span>
        </div>
      </div>
    </div>
  );
};

export default function ArchivePage() {
  const { data: tasks = [], isLoading: tasksLoading } = useArchivedTasks();
  const { data: workOrders = [], isLoading: ordersLoading } = useArchivedWorkOrders();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("tasks");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Filtrar tareas
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const dataRecord = (task.data ?? {}) as Record<string, unknown>;
      const site = typeof dataRecord.site === 'string' ? dataRecord.site : '';
      const client = typeof dataRecord.client === 'string' ? dataRecord.client : '';
      const description = typeof dataRecord.description === 'string' ? dataRecord.description : '';
      const responsibleName = task.responsible_name ?? '';

      const searchMatch = !searchTerm ||
        site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        responsibleName.toLowerCase().includes(searchTerm.toLowerCase());

      const groupMatch = groupFilter === "all" || task.screen_group === groupFilter;
      const stateMatch = stateFilter === "all" || task.state === stateFilter;

      const archivedAt = task.archived_at ? dayjs(task.archived_at) : null;
      const dateMatch = (!dateFrom || (archivedAt?.isAfter(dayjs(dateFrom)) ?? false)) &&
        (!dateTo || (archivedAt?.isBefore(dayjs(dateTo).add(1, 'day')) ?? false));

      return searchMatch && groupMatch && stateMatch && dateMatch;
    });
  }, [tasks, searchTerm, groupFilter, stateFilter, dateFrom, dateTo]);

  // Filtrar pedidos
  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      const searchMatch = !searchTerm ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const stateMatch = stateFilter === "all" || order.status === stateFilter;

      const updatedAt = order.updated_at ? dayjs(order.updated_at) : null;
      const dateMatch = (!dateFrom || (updatedAt?.isAfter(dayjs(dateFrom)) ?? false)) &&
        (!dateTo || (updatedAt?.isBefore(dayjs(dateTo).add(1, 'day')) ?? false));

      return searchMatch && stateMatch && dateMatch;
    });
  }, [workOrders, searchTerm, stateFilter, dateFrom, dateTo]);

  const currentData = activeTab === "tasks" ? filteredTasks : filteredOrders;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const currentItems = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    let headers: string[] = [];
    let csvData: any[][] = [];

    if (activeTab === "tasks") {
      headers = ['Archivado', 'Sitio', 'Cliente', 'Descripción', 'Responsable', 'Estado', 'Grupo'];
      csvData = filteredTasks.map(t => {
        const d = (t.data ?? {}) as Record<string, any>;
        return [
          dayjs(t.archived_at).format('DD/MM/YYYY HH:mm'),
          d.site || '',
          d.client || '',
          d.description || '',
          t.responsible_name || '',
          t.state || '',
          t.screen_group || ''
        ];
      });
    } else {
      headers = ['Finalizado', 'Nº Pedido', 'Cliente', 'Estado', 'Notas'];
      csvData = filteredOrders.map(o => [
        dayjs(o.updated_at).format('DD/MM/YYYY HH:mm'),
        o.order_number,
        o.customer_name,
        o.status,
        o.notes || ''
      ]);
    }

    const csvContent = [headers, ...csvData].map(e => e.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `historial_${activeTab}_${dayjs().format('YYYYMMDD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueGroups = Array.from(new Set(tasks.map(t => t.screen_group).filter(Boolean)));
  const uniqueOrderStatuses = Array.from(new Set(workOrders.map(o => o.status)));

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Archive className="h-8 w-8" />
            Historial de Operaciones
          </h1>
          <p className="text-slate-400 mt-1">Consulta el histórico de tareas y pedidos de producción.</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2 border-border/60 hover:bg-muted/60 hover:text-white">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card className="bg-card border-border/60 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5" />
            Estadísticas Globales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(tasksLoading || ordersLoading) ? (
            <div className="h-48 flex items-center justify-center text-slate-500">Calculando estadísticas...</div>
          ) : (
            <ArchiveChart tasks={tasks} orders={workOrders} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 bg-card border-border/60 h-fit sticky top-24">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block text-slate-300">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Referencia, cliente..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10 bg-muted/40 border-border/60 text-white"
                />
              </div>
            </div>

            {activeTab === "tasks" && (
              <div className="space-y-2">
                <label className="text-sm font-medium mb-1 block text-slate-300">Grupo</label>
                <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="bg-muted/40 border-border/60 text-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    {uniqueGroups.map(g => <SelectItem key={g} value={g as string}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block text-slate-300">Estado</label>
              <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="bg-muted/40 border-border/60 text-white">
                  <SelectValue placeholder="Cualquiera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cualquier estado</SelectItem>
                  {activeTab === "tasks" ? (
                    <>
                      <SelectItem value="terminado">Terminado</SelectItem>
                      <SelectItem value="incidente">Incidente</SelectItem>
                      <SelectItem value="arreglo">Arreglo</SelectItem>
                    </>
                  ) : (
                    uniqueOrderStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block text-slate-300">Rango de Fechas</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-muted/40 border-border/60" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-muted/40 border-border/60" />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }} className="w-full">
            <TabsList className="bg-muted/40 border border-border/60">
              <TabsTrigger value="tasks" className="gap-2">
                <FileText className="h-4 w-4" /> Tareas
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <Package className="h-4 w-4" /> Pedidos
              </TabsTrigger>
            </TabsList>

            <Card className="mt-4 bg-card border border-border/60 overflow-hidden shadow-xl">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    {activeTab === "tasks" ? (
                      <TableRow className="border-border/60">
                        <TableHead className="text-slate-400">Archivado</TableHead>
                        <TableHead className="text-slate-400">Sitio / Cliente</TableHead>
                        <TableHead className="text-slate-400">Descripción</TableHead>
                        <TableHead className="text-slate-400">Responsable</TableHead>
                        <TableHead className="text-slate-400">Estado</TableHead>
                      </TableRow>
                    ) : (
                      <TableRow className="border-border/60">
                        <TableHead className="text-slate-400">Finalizado</TableHead>
                        <TableHead className="text-slate-400">Nº Pedido</TableHead>
                        <TableHead className="text-slate-400">Cliente</TableHead>
                        <TableHead className="text-slate-400">Notas</TableHead>
                        <TableHead className="text-slate-400">Estado</TableHead>
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {tasksLoading || ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-24 text-slate-500 animate-pulse">Cargando registros...</TableCell>
                      </TableRow>
                    ) : currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-24 text-muted-foreground">
                          <Archive className="mx-auto h-12 w-12 opacity-20 mb-4" />
                          <p>No se han encontrado registros</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((item: any) => (
                        <TableRow key={item.id} className="border-border/40 hover:bg-muted/40 transition-colors">
                          {activeTab === "tasks" ? (
                            <>
                              <TableCell className="text-xs text-muted-foreground">
                                {dayjs(item.archived_at).format('DD/MM/YYYY HH:mm')}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-slate-200">{item.data?.site || 'N/A'}</div>
                                <div className="text-[10px] text-slate-500">{item.data?.client || 'Cliente Final'}</div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-400 max-w-xs">{item.data?.description || '-'}</TableCell>
                              <TableCell className="text-sm text-slate-300">{item.responsible_name || '-'}</TableCell>
                              <TableCell><TaskStateBadge state={item.state} size="sm" /></TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs text-muted-foreground">
                                {dayjs(item.updated_at).format('DD/MM/YYYY HH:mm')}
                              </TableCell>
                              <TableCell className="font-medium text-blue-400">{item.order_number}</TableCell>
                              <TableCell className="text-slate-200">{item.customer_name}</TableCell>
                              <TableCell className="text-sm text-slate-500 max-w-xs truncate">{item.notes || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={
                                  item.status === 'ENTREGADO' ? "bg-emerald-500/10 text-emerald-500" :
                                    item.status === 'ENVIADO' ? "bg-blue-500/10 text-blue-500" :
                                      ""
                                }>
                                  {item.status}
                                </Badge>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>

            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-sm text-slate-500 px-4">Página {currentPage} de {totalPages}</span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
