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
  TrendingUp
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

const useArchivedTasks = () => {
  return useQuery({
    queryKey: ['archived_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('archived_tasks')
        .select('*')
        .order('archived_at', { ascending: false });
      if (error) throw error;
      return data;
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

const ArchiveChart = ({ data }: { data: any[] }) => {
  const chartData = useMemo(() => {
    const monthlyData = data.reduce((acc, task) => {
      const month = dayjs(task.archived_at).format('YYYY-MM');
      const group = task.screen_group || 'Sin grupo';
      
      if (!acc[month]) {
        acc[month] = { month, Instalaciones: 0, Confección: 0, Tapicería: 0, Otros: 0 };
      }
      
      if (group.includes('Instalacion')) acc[month].Instalaciones++;
      else if (group.includes('Confeccion')) acc[month].Confección++;
      else if (group.includes('Tapiceria')) acc[month].Tapicería++;
      else acc[month].Otros++;
      
      return acc;
    }, {} as Record<string, ChartData>);
    
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
  const filteredTasks = useMemo(() => {
    return tasks.filter((task: any) => {
      // Búsqueda de texto libre
      const searchMatch = !searchTerm ||
        (task.data?.site || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.data?.client || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.data?.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.data?.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.responsible_name || "").toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por grupo
      const groupMatch = groupFilter === "all" ||
        (groupFilter === "ungrouped" && !task.screen_group) ||
        task.screen_group === groupFilter;

      // Filtro por estado
      const stateMatch = stateFilter === "all" || task.state === stateFilter;

      // Filtro por rango de fechas
      const taskDate = dayjs(task.archived_at);
      const dateMatch = (!dateFrom || taskDate.isAfter(dayjs(dateFrom))) &&
                      (!dateTo || taskDate.isBefore(dayjs(dateTo).add(1, 'day')));

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
    
    const csvData = filteredTasks.map((task: any) => [
      dayjs(task.archived_at).format('DD/MM/YYYY HH:mm'),
      task.data?.site || '',
      task.data?.client || '',
      task.data?.address || '',
      task.data?.description || '',
      task.responsible_name || '',
      task.assigned_users?.map((u: any) => u.full_name).join('; ') || '',
      task.assigned_vehicles?.map((v: any) => v.name).join('; ') || '',
      task.state || '',
      task.screen_group || ''
    ]);

    const csv = [headers, ...csvData].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `archived_tasks_${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  // Obtener grupos únicos
  const uniqueGroups = Array.from(new Set(tasks.map((task: any) => task.screen_group).filter(Boolean)));

  if (isLoading) {
    return <div className="text-center py-8">Cargando historial...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Historial de Tareas</h1>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ArchiveChart data={tasks} />
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sitio, cliente, dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Grupo</label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">Rango de fechas</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Desde"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Hasta"
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
      <Card>
        <CardHeader>
          <CardTitle>Tareas Archivadas</CardTitle>
          <CardDescription>
            Aquí se muestran todas las tareas que han sido completadas o archivadas manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivado</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Sitio</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Operarios</TableHead>
                  <TableHead>Vehículos</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTasks.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {dayjs(task.archived_at).format('DD/MM/YYYY HH:mm')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {task.start_date && task.end_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{dayjs(task.start_date).format('DD/MM')} - {dayjs(task.end_date).format('DD/MM/YY')}</span>
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">{task.data?.site || 'N/A'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {task.data?.description || 'Sin descripción'}
                    </TableCell>
                    <TableCell>{task.responsible_name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {task.assigned_users?.map((user: any) => (
                          <StatusBadge key={user.id} status={user.status} size="sm" showDot />
                        ))}
                        {(!task.assigned_users || task.assigned_users.length === 0) && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {task.assigned_vehicles?.map((vehicle: any) => (
                          <VehicleBadge key={vehicle.id} name={vehicle.name} type={vehicle.type} size="sm" />
                        ))}
                        {(!task.assigned_vehicles || task.assigned_vehicles.length === 0) && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TaskStateBadge state={task.state} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
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