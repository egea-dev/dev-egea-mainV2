import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const id = screenId || params.id;

  const [screen, setScreen] = useState<Screen | null>(null);
  const [screenData, setScreenData] = useState<ScreenData[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 8; // Slightly reduced for larger UI

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAdvanceSignalRef = useRef<number | undefined>(advanceSignal);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        return;
      }

      // Cast to Screen type to avoid 'never' errors
      const typedScreen = screenDetails as unknown as Screen;
      setScreen(typedScreen);

      if (typedScreen.templates?.fields && Array.isArray(typedScreen.templates.fields)) {
        setFields(typedScreen.templates.fields as Field[]);
      }

      const isDataScreen = typedScreen.screen_type === 'data';
      const stateFilter = typedScreen.screen_type === 'pendiente' ? 'pendiente' : 'acabado';

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
          .order("order", { ascending: true })
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
      setTotalPages(Math.ceil((total || 0) / itemsPerPage));
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [id, currentPage]);

  useEffect(() => { // Refresh Interval
    const setupInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const refreshInterval = (screen?.refresh_interval_sec || 30) * 1000;
      intervalRef.current = setInterval(loadData, refreshInterval);
    };
    loadData();
    setupInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [id, screen?.refresh_interval_sec, loadData, currentPage]);

  // Handle Advance Signal (Auto Pagination)
  useEffect(() => {
    if (advanceSignal === undefined) {
      lastAdvanceSignalRef.current = advanceSignal;
      return;
    }
    if (advanceSignal === lastAdvanceSignalRef.current) return;

    lastAdvanceSignalRef.current = advanceSignal;
    setCurrentPage((prev) => (totalPages <= 1 ? 1 : prev >= totalPages ? 1 : prev + 1));
  }, [advanceSignal, totalPages]);


  if (!screen) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#D4AF37] animate-pulse">
          <Monitor className="h-16 w-16 opacity-50" />
          <span className="text-xl font-light uppercase tracking-widest">Conectando Pantalla...</span>
        </div>
      </div>
    );
  }

  const resolveCellDisplay = (raw: unknown) => {
    if (raw === null || raw === undefined || raw === '') return { content: '-', className: 'text-gray-600' };
    let text = String(raw).trim();
    const classes: string[] = ['text-gray-200 font-medium'];

    // Custom formatting markers logic preserved
    if (text.startsWith('**') && text.endsWith('**')) {
      classes.push('font-bold text-white text-lg');
      text = text.slice(2, -2).trim();
    } else if (text.startsWith('##') && text.endsWith('##')) {
      classes.push('text-xl font-black text-[#D4AF37] uppercase');
      text = text.slice(2, -2).trim();
    } else if (text.startsWith('!!') && text.endsWith('!!')) {
      classes.push('uppercase tracking-wider text-emerald-400 font-bold');
      text = text.slice(2, -2).trim();
    }

    return { content: text, className: classes.join(' ') };
  };

  const getStatusBadge = (status: string, state: string) => {
    if (state === 'incidente') return <Badge variant="destructive" className="uppercase tracking-wider font-bold">Incidente</Badge>;
    if (state === 'arreglo') return <Badge className="bg-blue-600 text-white uppercase tracking-wider font-bold">Taller</Badge>;
    if (status === 'acabado') return <Badge className="bg-emerald-600 text-white uppercase tracking-wider font-bold">Finalizado</Badge>;
    return <Badge variant="outline" className="border-gray-600 text-gray-400 uppercase tracking-widest text-[10px]">Pendiente</Badge>;
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col selection:bg-[#D4AF37] selection:text-black">
      {/* HEADER PREMIUM */}
      <header className="px-8 py-6 flex items-center justify-between bg-black border-b border-white/10 shrink-0">
        <div className="flex items-center gap-6">
          <img src="/egea-logo.png" alt="Egea Logo" className="h-12 w-auto object-contain" />
          <div className="flex flex-col border-l border-white/10 pl-6 h-10 justify-center">
            <h1 className="text-2xl font-black tracking-wider text-white uppercase leading-none">
              {screen.name}
            </h1>
            <span className="text-xs text-[#D4AF37] font-bold uppercase tracking-[0.2em] mt-1">
              {screen.templates?.name || 'VISTA GENERAL'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Connection Status & Manual Refresh */}
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white px-3 py-1.5">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></span>
              CONECTADO
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              className="border-white/20 hover:bg-white/10 hover:text-white text-gray-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {/* Last Update & Clock */}
          <div className="text-right flex items-center gap-6 border-l border-white/10 pl-6">
            <div className="hidden xl:block">
              <div className="text-right text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-1">Última Sincro</div>
              <div className="font-mono text-emerald-500 font-bold">{lastUpdate.toLocaleTimeString()}</div>
            </div>
            <div>
              <div className="text-6xl font-mono font-bold tracking-tight leading-none text-white tabular-nums">
                {format(currentTime, "HH:mm")}
              </div>
              <div className="text-lg text-gray-400 font-medium uppercase tracking-widest mt-1 text-right">
                {format(currentTime, "d 'de' MMMM, yyyy", { locale: es })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className={cn(fullWidth ? 'w-full px-8 py-6' : 'container mx-auto px-8 py-6', 'flex-1 overflow-hidden flex flex-col')}>
        {screenData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-[#0A0A0A]">
            <Monitor className="h-20 w-20 text-gray-800 mb-6" />
            <div className="text-2xl font-medium text-gray-600 uppercase tracking-widest">Sin Datos Activos</div>
            <p className="text-sm text-gray-700 mt-2 font-mono">Esperando registros...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">

            {/* Custom Table Header */}
            <div className="bg-[#111] border-b border-white/5 grid gap-4 px-6 py-4 rounded-t-xl items-center"
              style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr) 120px 100px` }}>
              {fields.map((field) => (
                <div key={field.name} className="font-bold text-gray-500 text-xs uppercase tracking-widest truncate">
                  {field.label}
                </div>
              ))}
              <div className="font-bold text-gray-500 text-xs uppercase tracking-widest text-center">Estado</div>
              <div className="font-bold text-gray-500 text-xs uppercase tracking-widest text-right">Hora</div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {screenData.map((entry, index) => {
                const isEven = index % 2 === 0;
                const rowState = entry.state || 'normal';

                let rowStyle = "bg-[#161616] border-l-4 border-l-transparent";
                if (rowState === 'incidente') rowStyle = "bg-red-950/20 border-l-4 border-l-red-600";
                if (rowState === 'arreglo') rowStyle = "bg-blue-950/20 border-l-4 border-l-blue-600";
                if (isEven && rowState === 'normal') rowStyle = "bg-[#1A1D1F] border-l-4 border-l-transparent";

                return (
                  <div key={entry.id}
                    className={cn("grid gap-4 px-6 py-5 rounded-lg items-center transition-all hover:bg-[#222]", rowStyle)}
                    style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr) 120px 100px` }}>

                    {fields.map((field) => {
                      const { content, className } = resolveCellDisplay(entry.data?.[field.name]);
                      return (
                        <div key={field.name} className={cn("text-sm truncate", className)}>
                          {content}
                        </div>
                      );
                    })}

                    <div className="flex justify-center">
                      {getStatusBadge(entry.status, entry.state)}
                    </div>

                    <div className="text-right font-mono text-gray-500 text-xs">
                      {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Pagination Info */}
        <div className="mt-4 flex justify-between items-center px-2 py-2 border-t border-white/5 bg-black">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${screenData.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            Estado del Sistema: {screenData.length > 0 ? 'ACTIVO' : 'ESPERA'}
          </div>

          {totalPages > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <div key={i} className={cn("h-1 w-8 rounded-full transition-all", currentPage === i + 1 ? "bg-[#D4AF37]" : "bg-gray-800")} />
              ))}
            </div>
          )}

          <div className="text-xs font-mono text-gray-700">
            Pág {currentPage} / {totalPages || 1}
          </div>
        </div>
      </main>
    </div>
  );
}






