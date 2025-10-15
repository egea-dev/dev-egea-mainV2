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
      pendiente: "bg-white hover:bg-muted/20 border-l-4 border-l-gray-300 animate-pulse text-black",
      incidente:
        "bg-destructive/20 hover:bg-destructive/30 border-l-4 border-l-destructive/70 animate-pulse text-black",
      arreglo:
        "bg-sky-200 hover:bg-sky-300 border-l-4 border-l-sky-500/70 animate-pulse text-black",
      reposicion:
        "bg-amber-200 hover:bg-amber-300 border-l-4 border-l-amber-500/70 animate-pulse text-black",
      urgente:
        "bg-red-500/70 hover:bg-red-500 border-l-4 border-l-red-700 animate-pulse text-black",
    };

    return tones[normalized] ?? null;
  };

  const resolveCellDisplay = (raw: unknown) => {
    if (raw === null || raw === undefined || raw === "") {
      return { content: "-", className: "text-muted-foreground" };
    }

    if (typeof raw === "number") {
      return { content: raw, className: "" };
    }

    if (raw instanceof Date) {
      return { content: raw.toLocaleString("es-ES"), className: "" };
    }

    if (typeof raw === "object") {
      return { content: JSON.stringify(raw), className: "font-mono text-xs" };
    }

    let text = String(raw).trim();
    const classes: string[] = [];

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

    applyMarker("**", "**", "font-semibold text-foreground");
    applyMarker("##", "##", "text-xl");
    applyMarker("!!", "!!", "uppercase tracking-wide");

    return { content: text, className: classes.join(" ") };
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b shadow-sm" style={headerStyle}>
        <div className="mx-auto flex w-[98%] flex-wrap items-center justify-between gap-4 py-6">
          <h1 className={cn("text-3xl font-semibold tracking-tight", headerTextClass)}>
            {screen.name || "Pantalla"}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                headerTextClass || "text-muted-foreground",
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className={cn("h-4 w-4", headerTextClass && "text-white")} />
                  <span>Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className={cn("h-4 w-4", headerTextClass && "text-white")} />
                  <span>Sin conexion</span>
                </>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefreshing}
              className={cn(headerTextClass && "text-white hover:text-white/80")}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[98%] py-8">
        {resolvedDataList.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center rounded-lg border bg-card text-muted-foreground">
            No hay datos para mostrar todavia.
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-6 py-3">
              <span className="text-sm text-muted-foreground">
                {totalRecords} registro{totalRecords === 1 ? "" : "s"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    {displayColumns.map((column) => (
                      <TableHead key={column.key} className="whitespace-nowrap">
                        {column.label}
                      </TableHead>
                    ))}
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Seguimiento</TableHead>
                    <TableHead className="whitespace-nowrap">Actualizado</TableHead>
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
                          rowTone ?? "hover:bg-muted/30",
                          !rowTone && index % 2 === 0 ? "bg-muted/25" : "",
                          "transition-colors",
                        )}
                      >
                        {displayColumns.map((column) => {
                          if (column.key === "__raw__") {
                            return (
                              <TableCell key="__raw__" className="align-top">
                                {item.data && Object.keys(item.data).length > 0 ? (
                                  <pre className="max-h-48 w-full overflow-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-xs font-mono">
                                    {JSON.stringify(item.data, null, 2)}
                                  </pre>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
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
                              className={cn("text-base font-medium", className)}
                            >
                              {content}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <TaskStateBadge state={item.state} size="sm" />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} size="sm" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
