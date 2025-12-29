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

type DisplayPageProps = {
  screenId?: string;
  fullWidth?: boolean;
  advanceSignal?: number;
};

export default function DisplayPage({
  screenId,
  fullWidth = false,
  advanceSignal,
}: DisplayPageProps) {
  const params = useParams<{ id: string }>();
  const id = screenId || params.id; // Usa la prop si existe; en caso contrario usa el parametro de la URL

  const [screen, setScreen] = useState<Screen | null>(null);
  const [screenData, setScreenData] = useState<ScreenData[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAdvanceSignalRef = useRef<number | undefined>(advanceSignal);

  const loadData = useCallback(async () => {
    try {
      if (!id) return;

      const { data: screenDetails, error: screenError } = await supabase
        .from("screens")
        .select("*, templates(*)")
        .eq("id", id)
        .maybeSingle();

      if (screenError) throw screenError;

      if (!screenDetails) {
        setScreen(null);
        setFields([]);
        setScreenData([]);
        setTotalCount(0);
        setTotalPages(1);
        setIsOnline(false);
        return;
      }

      setScreen(screenDetails);
      if (screenDetails.templates?.fields && Array.isArray(screenDetails.templates.fields)) {
        setFields(screenDetails.templates.fields as Field[]);
      }

      const isDataScreen = screenDetails.screen_type === 'data';
      const stateFilter = screenDetails.screen_type === 'pendiente' ? 'pendiente' : 'acabado';

      // Obtener conteo total para paginacion
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

  useEffect(() => {
    if (advanceSignal === undefined) {
      lastAdvanceSignalRef.current = advanceSignal;
      return;
    }

    if (advanceSignal === lastAdvanceSignalRef.current) {
      return;
    }

    lastAdvanceSignalRef.current = advanceSignal;

    setCurrentPage((prev) => {
      if (totalPages <= 1) {
        return 1;
      }
      return prev >= totalPages ? 1 : prev + 1;
    });
  }, [advanceSignal, totalPages]);

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

  const getRowToneClass = (state: string | null | undefined) => {
    const normalized = (state || '').toLowerCase().trim();

    // Tonos suavizados para dark mode (slate/glass)
    const tones: Record<string, string> = {
      pendiente: 'hover:bg-slate-800/50',
      incidente: 'bg-red-900/10 border-l-4 border-l-red-500 hover:bg-red-900/20',
      arreglo: 'bg-blue-900/10 border-l-4 border-l-blue-500 hover:bg-blue-900/20',
      reposicion: 'bg-amber-900/10 border-l-4 border-l-amber-500 hover:bg-amber-900/20',
      urgente: 'bg-red-950/30 border-l-4 border-l-red-600 hover:bg-red-900/30',
    };

    return tones[normalized] ?? 'hover:bg-slate-800/50';
  };

  const resolveCellDisplay = (raw: unknown) => {
    if (raw === null || raw === undefined || raw === '') {
      return { content: '-', className: 'text-slate-600' };
    }

    if (typeof raw === 'number') {
      return { content: raw, className: 'text-slate-200' };
    }

    if (typeof raw !== 'string') {
      return { content: String(raw), className: 'text-slate-200' };
    }

    let text = raw.trim();
    const classes: string[] = ['text-slate-200'];

    const applyMarker = (start: string, end: string, className: string) => {
      if (text.startsWith(start) && text.endsWith(end) && text.length > start.length + end.length) {
        classes.push(className);
        text = text.slice(start.length, -end.length).trim();
      }
    };

    applyMarker('**', '**', 'font-bold text-white');
    applyMarker('##', '##', 'text-xl font-semibold');
    applyMarker('!!', '!!', 'uppercase tracking-wide text-amber-400');

    return { content: text, className: classes.join(' ') };
  };

  const getStatusBadge = (status: string, state: string) => {
    if (state === 'incidente') return <Badge variant="destructive" className="uppercase tracking-wider">Incidente</Badge>;
    if (state === 'arreglo') return <Badge className="bg-blue-500 text-white uppercase tracking-wider hover:bg-blue-600">En Arreglo</Badge>;
    if (status === 'acabado') return <Badge className="bg-emerald-600 text-white uppercase tracking-wider hover:bg-emerald-700">Completo</Badge>;
    return <Badge variant="outline" className="border-slate-600 text-slate-300 uppercase tracking-wider">Pendiente</Badge>;
  };

  const mainContainerClass = fullWidth
    ? 'w-full px-6 py-8'
    : 'container mx-auto px-6 py-8';

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header Estandarizado */}
      <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-md sticky top-0 z-20">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <Monitor className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {screen.name}
              </h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                {screen.templates?.name || 'VISTA GENERAL'}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "ml-2 border-0 bg-opacity-20",
                isOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full mr-2", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
              {isOnline ? "EN LÍNEA" : "OFFLINE"}
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium text-slate-500">
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-slate-600">Última sincro</span>
              <span className="text-slate-300 font-mono">{lastUpdate.toLocaleTimeString()}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-slate-600">Actualización</span>
              <span className="text-blue-400 font-mono">{screen.refresh_interval_sec || 30}s</span>
            </div>
          </div>
        </div>
      </header>

      <main className={mainContainerClass}>
        {screenData.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
            <Monitor className="h-16 w-16 text-slate-700 mb-4" />
            <div className="text-xl font-medium text-slate-500">No hay datos para mostrar</div>
            <p className="text-sm text-slate-600 mt-2">Esperando registros asociados a esta pantalla...</p>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
            <Table>
              <TableHeader className="bg-slate-950/80">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  {fields.map((field) => (
                    <TableHead key={field.name} className="h-14 font-bold text-slate-300 uppercase tracking-wider text-xs">{field.label}</TableHead>
                  ))}
                  <TableHead className="h-14 font-bold text-slate-300 uppercase tracking-wider text-xs">Estado</TableHead>
                  <TableHead className="h-14 font-bold text-slate-300 uppercase tracking-wider text-xs text-right pr-6">Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screenData.map((entry, index) => {
                  const rowTone = getRowToneClass(entry.state);
                  return (
                    <TableRow
                      key={entry.id}
                      className={cn(
                        'border-slate-800/50 transition-colors',
                        rowTone,
                        !rowTone && index % 2 === 0 ? 'bg-slate-900/30' : ''
                      )}
                    >
                      {fields.map((field) => {
                        const { content, className } = resolveCellDisplay(entry.data?.[field.name]);
                        return (
                          <TableCell key={field.name} className={cn('py-4 text-sm', className)}>
                            {content}
                          </TableCell>
                        );
                      })}
                      <TableCell className="py-4">{getStatusBadge(entry.status, entry.state)}</TableCell>
                      <TableCell className="py-4 text-right pr-6 font-mono text-slate-400 text-xs">
                        {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginacion */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
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
                    className={cn(
                      "w-9 h-9 p-0 font-mono transition-all",
                      currentPage === pageNum
                        ? "bg-slate-100 text-slate-900 hover:bg-white"
                        : "border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
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
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        <div className="text-center text-xs font-medium uppercase tracking-widest text-slate-600 mt-6">
          Mostrando {screenData.length} de {totalCount} registros
        </div>
      </main>
    </div>
  );
}






