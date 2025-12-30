import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { DatePicker } from '@/components/ui/date-picker'; // Usaremos Input type="date" en su lugar
import {
  FileText,
  Calendar,
  Search,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  Archive
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
    .filter((profile): profile is ArchivedTaskParticipant => profile !== null);
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
    .filter((vehicle): vehicle is ArchivedTaskVehicle => vehicle !== null);
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

// Componente simple para gráfico de barras (puedes reemplazar con Recharts)
interface ChartData {
  month: string;
  Instalaciones: number;
  Confección: number;
  Tapicería: number;
  Otros: number;
}

const ArchiveChart = ({ data }: { data: ArchivedTaskRecord[] }) => {
  const chartData = useMemo(() => {
    const monthlyData = data.reduce<Record<string, ChartData>>((acc, task) => {
      const archivedAt = task.archived_at ? dayjs(task.archived_at) : null;
      const month = archivedAt?.isValid() ? archivedAt.format('YYYY-MM') : 'Sin fecha';
      const group = task.screen_group || 'Sin grupo';

      if (!acc[month]) {
        acc[month] = { month, Instalaciones: 0, Confección: 0, Tapicería: 0, Otros: 0 };
      }

      if (group.includes('Instalacion')) acc[month].Instalaciones++;
      else if (group.includes('Confeccion')) acc[month].Confección++;
      else if (group.includes('Tapiceria')) acc[month].Tapicería++;
      else acc[month].Otros++;

      return acc;
    }, {});

    return Object.values(monthlyData).slice(-12); // Últimos 12 meses
  }, [data]);

  const maxValue = Math.max(...chartData.map((d: ChartData) => d.Instalaciones + d.Confección + d.Tapicería + d.Otros), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Tareas Archivadas por Mes</h3>
      <div className="space-y-2">
        {chartData.map((item: ChartData) => {
          const total = item.Instalaciones + item.Confección + item.Tapicería + item.Otros;
          const percentage = (total / maxValue) * 100;

          return (
            <div key={item.month} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{dayjs(item.month).format('MMM YYYY')}</span>
                <span className="font-medium">{total} tareas</span>
              </div>
              <div className="flex gap-1 h-6">
                <div
                  className="bg-red-500 rounded-sm flex items-center justify-center text-xs text-white"
                  style={{ width: `${(item.Instalaciones / total) * 100}%` }}
                  title={`Instalaciones: ${item.Instalaciones}`}
                >
                  {item.Instalaciones > 0 && item.Instalaciones}
                </div>
                <div
                  className="bg-purple-500 rounded-sm flex items-center justify-center text-xs text-white"
                  style={{ width: `${(item.Confección / total) * 100}%` }}
                  title={`Confección: ${item.Confección}`}
                >
                  {item.Confección > 0 && item.Confección}
                </div>
                <div
                  className="bg-yellow-500 rounded-sm flex items-center justify-center text-xs text-white"
                  style={{ width: `${(item.Tapicería / total) * 100}%` }}
                  title={`Tapicería: ${item.Tapicería}`}
                >
                  {item.Tapicería > 0 && item.Tapicería}
                </div>
                <div
                  className="bg-gray-500 rounded-sm flex items-center justify-center text-xs text-white"
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
      <div className="flex gap-4 text-xs text-muted-foreground">
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
          <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
          <span>Otros</span>
        </div>
      </div>
    </div>
  );
};

export default function ArchivePage() {
  const { data: tasks = [], isLoading } = useArchivedTasks();
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Filtrar tareas
  const filteredTasks = useMemo<ArchivedTaskRecord[]>(() => {
    return tasks.filter((task) => {
      const dataRecord = (task.data ?? {}) as Record<string, unknown>;
      const site = typeof dataRecord.site === 'string' ? dataRecord.site : '';
      const client = typeof dataRecord.client === 'string' ? dataRecord.client : '';
      const address = typeof dataRecord.address === 'string' ? dataRecord.address : '';
      const description = typeof dataRecord.description === 'string' ? dataRecord.description : '';
      const responsibleName = task.responsible_name ?? '';

      // Búsqueda de texto libre
      const searchMatch = !searchTerm ||
        site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        responsibleName.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por grupo
      const groupMatch = groupFilter === "all" ||
        (groupFilter === "ungrouped" && !task.screen_group) ||
        task.screen_group === groupFilter;

      // Filtro por estado
      const stateMatch = stateFilter === "all" || task.state === stateFilter;

      // Filtro por rango de fechas
      const archivedAt = task.archived_at ? dayjs(task.archived_at) : null;
      const dateMatch = (!dateFrom || (archivedAt?.isValid() ? archivedAt.isAfter(dayjs(dateFrom)) : false)) &&
        (!dateTo || (archivedAt?.isValid() ? archivedAt.isBefore(dayjs(dateTo).add(1, 'day')) : false));

      return searchMatch && groupMatch && stateMatch && dateMatch;
    });
  }, [tasks, searchTerm, groupFilter, stateFilter, dateFrom, dateTo]);

  // Paginación
  const indexOfLastTask = currentPage * itemsPerPage;
  const indexOfFirstTask = indexOfLastTask - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = [
      'Archivado', 'Sitio', 'Cliente', 'Dirección', 'Descripción',
      'Responsable', 'Operarios', 'Vehículos', 'Estado', 'Grupo'
    ];

    const csvData = filteredTasks.map((task) => {
      const dataRecord = (task.data ?? {}) as Record<string, unknown>;
      const archivedAt = task.archived_at ? dayjs(task.archived_at) : null;
      const assignedUsers = normalizeArchivedUsers(task.assigned_users);
      const assignedVehicles = normalizeArchivedVehicles(task.assigned_vehicles);

      return [
        archivedAt?.isValid() ? archivedAt.format('DD/MM/YYYY HH:mm') : '',
        typeof dataRecord.site === 'string' ? dataRecord.site : '',
        typeof dataRecord.client === 'string' ? dataRecord.client : '',
        typeof dataRecord.address === 'string' ? dataRecord.address : '',
        typeof dataRecord.description === 'string' ? dataRecord.description : '',
        task.responsible_name ?? '',
        assignedUsers.map((user) => user.full_name).join('; '),
        assignedVehicles.map((vehicle) => vehicle.name).join('; '),
        task.state ?? '',
        task.screen_group ?? ''
      ];
    });

    const csv = [headers, ...csvData].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `archived_tasks_${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  // Obtener grupos únicos
  const uniqueGroups = Array.from(
    new Set(
      tasks
        .map((task) => task.screen_group)
        .filter((group): group is string => typeof group === "string" && group.trim().length > 0)
    )
  );

  if (isLoading) {
    return <div className="text-center py-8">Cargando historial...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Archive className="h-8 w-8" />
            Historial de Tareas
          </h1>
          <p className="text-slate-400 mt-1">Consulta y descarga el histórico de tareas completadas.</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2 border-border/60 hover:bg-muted/60 hover:text-white">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Gráfico */}
      <Card className="bg-card border-border/60 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5" />
            Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ArchiveChart data={tasks} />
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="bg-card border-border/60 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-slate-300">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sitio, cliente, dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted/40 border-border/60 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-slate-300">Grupo</label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="bg-muted/40 border-border/60 text-white">
                  <SelectValue placeholder="Todos los grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los grupos</SelectItem>
                  <SelectItem value="ungrouped">Sin grupo</SelectItem>
                  {uniqueGroups.map(group => (
                    <SelectItem key={group} value={group as string}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-slate-300">Estado</label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="bg-muted/40 border-border/60 text-white">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="terminado">Terminado</SelectItem>
                  <SelectItem value="incidente">Incidente</SelectItem>
                  <SelectItem value="arreglo">Arreglo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-slate-300">Rango de fechas</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Desde"
                  className="bg-muted/40 border-border/60 text-white"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Hasta"
                  className="bg-muted/40 border-border/60 text-white"
                />
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mt-4">
            Mostrando {currentTasks.length} de {filteredTasks.length} tareas archivadas
          </div>
        </CardContent>
      </Card>

      {/* Tabla de resultados */}
      <Card className="bg-card border-border/60 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Tareas Archivadas</CardTitle>
          <CardDescription className="text-slate-400">
            Aquí se muestran todas las tareas que han sido completadas o archivadas manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-muted/60">
                  <TableHead className="text-slate-400">Archivado</TableHead>
                  <TableHead className="text-slate-400">Periodo</TableHead>
                  <TableHead className="text-slate-400">Sitio</TableHead>
                  <TableHead className="text-slate-400">Descripción</TableHead>
                  <TableHead className="text-slate-400">Responsable</TableHead>
                  <TableHead className="text-slate-400">Operarios</TableHead>
                  <TableHead className="text-slate-400">Vehículos</TableHead>
                  <TableHead className="text-slate-400">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTasks.map((task) => {
                  const dataRecord = (task.data ?? {}) as Record<string, unknown>;
                  const archivedAt = task.archived_at ? dayjs(task.archived_at) : null;
                  const startDate = task.start_date ? dayjs(task.start_date) : null;
                  const endDate = task.end_date ? dayjs(task.end_date) : null;
                  const assignedUsers = normalizeArchivedUsers(task.assigned_users);
                  const assignedVehicles = normalizeArchivedVehicles(task.assigned_vehicles);
                  const siteLabel = typeof dataRecord.site === 'string' ? dataRecord.site : 'N/A';
                  const descriptionLabel = typeof dataRecord.description === 'string' ? dataRecord.description : 'Sin descripción';

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {archivedAt?.isValid() ? archivedAt.format('DD/MM/YYYY HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {startDate?.isValid() && endDate?.isValid() ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{startDate.format('DD/MM')} - {endDate.format('DD/MM/YY')}</span>
                          </div>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">{siteLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {descriptionLabel}
                      </TableCell>
                      <TableCell>{task.responsible_name ?? 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {assignedUsers.length > 0 ? (
                            assignedUsers.map((user) => (
                              <StatusBadge key={user.id} status={user.status ?? 'activo'} size="sm" showDot />
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {assignedVehicles.length > 0 ? (
                            assignedVehicles.map((vehicle) => (
                              <VehicleBadge key={vehicle.id} name={vehicle.name} type={vehicle.type ?? undefined} size="sm" />
                            ))
                          ) : task.vehicle_type ? (
                            <VehicleBadge name={task.vehicle_type} type={task.vehicle_type} size="sm" />
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TaskStateBadge state={task.state ?? 'terminado'} size="sm" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>

          {filteredTasks.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">No se encontraron tareas</h3>
              <p className="mt-1 text-sm">
                {searchTerm || groupFilter !== "all" || stateFilter !== "all" || dateFrom || dateTo
                  ? "Intenta ajustar los filtros para ver resultados."
                  : "Las tareas completadas aparecerán aquí automáticamente."
                }
              </p>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

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
        </CardContent>
      </Card>
    </div>
  );
};
