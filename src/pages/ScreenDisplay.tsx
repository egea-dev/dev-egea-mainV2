import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScreenData, useScreens } from "@/hooks/use-supabase";
import { TaskStateBadge, StatusBadge } from "@/components/badges";
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PreparedColumn = {
  key: string;
  label: string;
  source: "data" | "row";
};

const ScreenDisplay = () => {
  const { screenId: routeScreenId } = useParams<{ screenId: string }>();
  const navigate = useNavigate();
  const screenId = routeScreenId ?? null;

  const {
    data: screenInfo,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useScreenData(screenId);

  const { data: allScreens = [] } = useScreens();
  const isOnline = !isError;

  const screen = screenInfo?.screen ?? null;
  const dataList = screenInfo?.dataList;
  const templateFields = screenInfo?.templateFields;

  const resolvedDataList = useMemo(
    () => (Array.isArray(dataList) ? dataList : []),
    [dataList],
  );

  const dataColumns = useMemo<PreparedColumn[]>(() => {
    const template = Array.isArray(templateFields) ? templateFields : [];
    if (template.length > 0) {
      return template.map((field) => ({
        key: field.name,
        label: field.label || field.name,
        source: "data" as const,
      }));
    }

    const keys = new Set<string>();
    resolvedDataList.forEach((item) => {
      if (item?.data) {
        Object.keys(item.data).forEach((key) => keys.add(key));
      }
    });

    return Array.from(keys).map((key) => ({
      key,
      label: key,
      source: "data" as const,
    }));
  }, [templateFields, resolvedDataList]);

  const rowLevelColumns = useMemo<PreparedColumn[]>(() => {
    const candidates: Array<{ key: string; label: string }> = [
      { key: "location", label: "Ubicacion" },
      { key: "start_date", label: "Inicio" },
      { key: "end_date", label: "Fin" },
      { key: "order", label: "Orden" },
      { key: "responsible_profile_id", label: "Responsable" },
    ];

    return candidates
      .filter(({ key }) =>
        resolvedDataList.some((item) => {
          const value = (item as Record<string, unknown>)?.[key];
          return value !== null && value !== undefined && value !== "";
        }),
      )
      .filter(({ key }) => !dataColumns.some((column) => column.key === key))
      .map(({ key, label }) => ({
        key: String(key),
        label,
        source: "row" as const,
      }));
  }, [resolvedDataList, dataColumns]);

  const displayColumns = useMemo<PreparedColumn[]>(() => {
    const combined = [...rowLevelColumns, ...dataColumns];
    if (combined.length > 0) {
      return combined;
    }
    return [
      {
        key: "__raw__",
        label: "Datos",
        source: "row" as const,
      },
    ];
  }, [rowLevelColumns, dataColumns]);

  const isRefreshing = isFetching && !isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Cargando pantalla...</p>
      </div>
    );
  }

  if (isError || !screenId || !screen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">No se encontro la pantalla solicitada.</p>
        <Button variant="outline" onClick={() => navigate("/admin/screens")}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const headerStyle = screen.header_color
    ? { backgroundColor: screen.header_color }
    : undefined;
  const headerTextClass = screen.header_color ? "text-white" : "";

  const totalRecords = resolvedDataList.length;

  const getRowToneClass = (state: string | null | undefined) => {
    const normalized = (state || "").toLowerCase().trim();

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
    if (raw === null || raw === undefined || raw === "") {
      return { content: "-", className: "text-slate-600" };
    }

    if (typeof raw === "number") {
      return { content: raw, className: "text-slate-200" };
    }

    if (raw instanceof Date) {
      return { content: raw.toLocaleString("es-ES"), className: "text-slate-300" };
    }

    if (typeof raw === "object") {
      return { content: JSON.stringify(raw), className: "font-mono text-xs text-slate-400" };
    }

    let text = String(raw).trim();
    const classes: string[] = ["text-slate-200"];

    const applyMarker = (start: string, end: string, className: string) => {
      if (
        text.startsWith(start) &&
        text.endsWith(end) &&
        text.length > start.length + end.length
      ) {
        classes.push(className);
        text = text.slice(start.length, -end.length).trim();
      }
    };

    applyMarker("**", "**", "font-bold text-white");
    applyMarker("##", "##", "text-xl font-semibold");
    applyMarker("!!", "!!", "uppercase tracking-wide text-amber-400");

    return { content: text, className: classes.join(" ") };
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white font-sans selection:bg-blue-500/30">
      <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-md sticky top-0 z-20">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <Loader2 className={cn("h-6 w-6 text-blue-400", isRefreshing ? "animate-spin" : "")} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {screen.name || "Pantalla de Datos"}
              </h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                VISUALIZACIÓN DETALLADA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={cn(
                "flex items-center gap-2 text-xs font-medium uppercase tracking-wider",
                isOnline ? "text-emerald-500" : "text-red-500",
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4" />
                  <span>Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Sin conexión</span>
                </>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefreshing}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Actualizar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/screens")}
              className="text-slate-500 hover:text-white"
            >
              Volver
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8">
        {resolvedDataList.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
            <p className="text-xl font-medium text-slate-500">No hay datos para mostrar</p>
            <p className="text-sm text-slate-600 mt-2">Los registros aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3 bg-slate-950/30">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
                {totalRecords} registro{totalRecords === 1 ? "" : "s"} encontrados
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-slate-950/80">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    {displayColumns.map((column) => (
                      <TableHead key={column.key} className="h-14 font-bold text-slate-300 uppercase tracking-wider text-xs whitespace-nowrap">
                        {column.label}
                      </TableHead>
                    ))}
                    <TableHead className="h-14 font-bold text-slate-300 uppercase tracking-wider text-xs whitespace-nowrap">Estado</TableHead>
                    <TableHead className="h-14 font-bold text-slate-300 uppercase tracking-wider text-xs whitespace-nowrap">Seguimiento</TableHead>
                    <TableHead className="h-14 font-bold text-slate-300 uppercase tracking-wider text-xs whitespace-nowrap">Actualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedDataList.map((item, index) => {
                    const rowTone = getRowToneClass(
                      (item as { state?: string | null | undefined }).state,
                    );

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          'border-slate-800/50 transition-colors',
                          rowTone,
                          !rowTone && index % 2 === 0 ? "bg-slate-900/30" : "",
                        )}
                      >
                        {displayColumns.map((column) => {
                          if (column.key === "__raw__") {
                            return (
                              <TableCell key="__raw__" className="align-top py-4">
                                {item.data && Object.keys(item.data).length > 0 ? (
                                  <pre className="max-h-48 w-full overflow-auto whitespace-pre-wrap rounded-md bg-black/50 p-3 text-xs font-mono text-slate-400 border border-slate-800">
                                    {JSON.stringify(item.data, null, 2)}
                                  </pre>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </TableCell>
                            );
                          }

                          const rawValue =
                            column.source === "data"
                              ? item.data?.[column.key]
                              : (item as Record<string, unknown>)[column.key];

                          const { content, className } = resolveCellDisplay(rawValue);

                          return (
                            <TableCell
                              key={column.key}
                              className={cn("text-sm py-4", className)}
                            >
                              {content}
                            </TableCell>
                          );
                        })}
                        <TableCell className="py-4">
                          <TaskStateBadge state={item.state} size="sm" />
                        </TableCell>
                        <TableCell className="py-4">
                          <StatusBadge status={item.status} size="sm" />
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs text-slate-400">
                          {item.updated_at
                            ? new Date(item.updated_at).toLocaleString("es-ES")
                            : new Date(item.created_at).toLocaleString("es-ES")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScreenDisplay;
