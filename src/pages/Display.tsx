import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff, Monitor, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ScreenData = {
  id: string;
  created_at: string;
  data: Record<string, string | number | null>;
  status: 'pendiente' | 'acabado';
  state: 'normal' | 'incidente' | 'arreglo';
};

type Field = {
  name: string;
  label: string;
  type: string;
};

type Screen = {
  id: string;
  name: string;
  refresh_interval_sec: number;
  screen_type: 'pendiente' | 'acabado' | 'data';
  templates: {
    fields: Field[];
    name: string;
  } | null;
};

// Se añade la prop opcional screenId
type DisplayPageProps = {
  screenId?: string;
};

export default function DisplayPage({ screenId }: DisplayPageProps) {
  const params = useParams<{ id: string }>();
  const id = screenId || params.id; // Usa la prop si existe, si no, usa el parámetro de la URL

  const [screen, setScreen] = useState<Screen | null>(null);
  const [screenData, setScreenData] = useState<ScreenData[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 25;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    try {
      if (!id) return;

      const { data: screenDetails, error: screenError } = await supabase
        .from("screens")
        .select("*, templates(*)")
        .eq("id", id)
        .single();

      if (screenError) throw screenError;
      
      setScreen(screenDetails);
      if (screenDetails.templates?.fields && Array.isArray(screenDetails.templates.fields)) {
        setFields(screenDetails.templates.fields as Field[]);
      }

      const isDataScreen = screenDetails.screen_type === 'data';
      const stateFilter = screenDetails.screen_type === 'pendiente' ? 'pendiente' : 'acabado';

      // Obtener conteo total para paginación
      let countQuery = supabase
        .from("screen_data")
        .select("*", { count: "exact", head: true })
        .eq("screen_id", id);

      if (!isDataScreen) {
        countQuery = countQuery.eq("state", stateFilter);
      }

      const { count: total, error: countError } = await countQuery;

      if (countError) throw countError;

      let dataQuery = supabase
        .from("screen_data")
        .select("*")
        .eq("screen_id", id);

      if (!isDataScreen) {
        dataQuery = dataQuery.eq("state", stateFilter);
      }

      if (isDataScreen) {
        dataQuery = dataQuery
          .order("order", { ascending: true, nullsLast: true })
          .order("created_at", { ascending: false });
      } else {
        dataQuery = dataQuery.order("created_at", { ascending: false });
      }

      const { data: dataEntries, error: dataError } = await dataQuery.range(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage - 1
      );

      if (dataError) throw dataError;

      setScreenData((dataEntries || []) as ScreenData[]);
      setTotalCount(total || 0);
      setTotalPages(Math.ceil((total || 0) / itemsPerPage));
      setLastUpdate(new Date());
      setIsOnline(true);
    } catch (error) {
      console.error("Error loading data:", error);
      setIsOnline(false);
    }
  }, [id, currentPage]);
  
  useEffect(() => {
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      const refreshInterval = (screen?.refresh_interval_sec || 30) * 1000;
      intervalRef.current = setInterval(loadData, refreshInterval);
    };

    loadData();
    setupInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id, screen?.refresh_interval_sec, loadData, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  if (!screen) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string, state: string) => {
    if (state === 'incidente') return <Badge className="bg-destructive text-destructive-foreground">Incidente</Badge>;
    if (state === 'arreglo') return <Badge className="bg-blue-500/70 text-white">En Arreglo</Badge>;
    if (status === 'acabado') return <Badge className="bg-green-500/70 text-white">Completo</Badge>;
    return <Badge className="bg-yellow-500/70 text-white">Pendiente</Badge>;
  };

  const getRowClassName = (state: string) => {
    if (state === 'incidente') return 'bg-destructive/10 hover:bg-destructive/20 border-l-4 border-l-destructive';
    if (state === 'arreglo') return 'bg-blue-500/10 hover:bg-blue-500/20 border-l-4 border-l-blue-500';
    return 'hover:bg-muted/30';
  };

  const headerStyle = screen.header_color ? { backgroundColor: screen.header_color, color: '#fff' } : undefined;
  const headerClassName = screen.header_color
    ? 'sticky top-0 z-10 shadow-lg'
    : 'bg-primary text-primary-foreground sticky top-0 z-10 shadow-lg';

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClassName} style={headerStyle}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Monitor className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">{screen.name}</h1>
                <div className="flex items-center gap-3 text-sm opacity-90">
                  <span className="font-semibold">{screen.templates?.name || 'Datos Generales'}</span>
                  <span className="flex items-center gap-1">
                    {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                    {isOnline ? "Conectado" : "Desconectado"}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium">
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </div>
              <div className="opacity-90">
                Próxima en {screen.refresh_interval_sec || 30}s
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-12 py-8">
        {screenData.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-2xl text-muted-foreground">No hay datos para mostrar</div>
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-md overflow-hidden border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {fields.map((field) => (
                    <TableHead key={field.name} className="font-bold text-foreground">{field.label}</TableHead>
                  ))}
                  <TableHead className="font-bold text-foreground">Estado</TableHead>
                  <TableHead className="font-bold text-foreground">Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screenData.map((entry, index) => (
                  <TableRow key={entry.id} className={cn(getRowClassName(entry.state), index % 2 === 0 ? 'bg-muted/25' : '', "transition-colors")}>
                    {fields.map((field) => (
                      <TableCell key={field.name} className="font-medium text-lg">{entry.data[field.name] || "-"}</TableCell>
                    ))}
                    <TableCell>{getStatusBadge(entry.status, entry.state)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
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
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="text-center text-sm text-muted-foreground mt-4">
          Mostrando {screenData.length} de {totalCount} registros
        </div>
      </main>
    </div>
  );
}

