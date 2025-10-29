import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, RefreshCcw, Send } from "lucide-react";
import { useAdminData } from "@/hooks/use-admin-data";
import {
  useOnlineUsers,
  useCommunicationLogs,
  useResendWhatsApp,
  useRealtimePresence,
  type CommunicationLog,
} from "@/hooks/use-communications";
import type { Profile } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ListedUser = Profile & {
  isOnline: boolean;
  lastSeen: string | null;
};

const MS_IN_MINUTE = 60 * 1000;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;

const defaultWhatsAppMessage =
  "Hola, este es un recordatorio de tus tareas pendientes. Si necesitas ayuda, responde a este mensaje.";

const directMessagePlaceholder = "Escribe un mensaje para el operario...";

const statusPillBase =
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium";

const statusPillVariants = {
  success:
    "border-emerald-300/60 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200",
  neutral:
    "border-border bg-muted/60 text-muted-foreground dark:bg-muted/30 dark:text-foreground",
  alert:
    "border-rose-300/60 bg-rose-500/10 text-rose-600 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-200",
} as const;

const pluralize = (count: number, singular: string, plural: string) => {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
};

const formatRelativeTime = (timestamp?: string | null) => {
  if (!timestamp) return "Sin actividad reciente";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Sin actividad reciente";

  const diff = Date.now() - date.getTime();
  if (diff < 0) return "En el futuro";
  if (diff < MS_IN_MINUTE) return "Hace instantes";

  if (diff < MS_IN_HOUR) {
    const minutes = Math.floor(diff / MS_IN_MINUTE);
    return `Hace ${minutes} min`;
  }

  if (diff < MS_IN_DAY) {
    const hours = Math.floor(diff / MS_IN_HOUR);
    return `Hace ${hours} h`;
  }

  return date.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
};

const truncate = (value: string | null, limit = 160) => {
  if (!value) return "Sin descripcion disponible";
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
};

const getInitials = (value: string) => {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "US"
  );
};

export default function CommunicationManagement() {
  const { users: rawUsers = [] } = useAdminData();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [logPage, setLogPage] = useState(0);
  const [logsAccumulator, setLogsAccumulator] = useState<CommunicationLog[]>([]);
  const [directMessage, setDirectMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"resend" | "direct" | null>(null);

  const {
    data: onlineUsers = [],
    isLoading: loadingOnlineUsers,
  } = useOnlineUsers();

  const {
    data: logsResult,
    isLoading: loadingLogs,
    isFetching: fetchingLogs,
  } = useCommunicationLogs({
    profileId: selectedUserId ?? undefined,
    page: logPage,
    limit: 25,
  });

  const pageLogs = logsResult?.logs ?? [];
  const hasMoreLogs = logsResult?.hasMore ?? false;
  const resultPage = logsResult?.page ?? logPage;
  const isInitialLogLoading = loadingLogs && logPage === 0;
  const displayedLogs = logsAccumulator;
  const resendWhatsApp = useResendWhatsApp();

  useRealtimePresence();

  const onlineMap = useMemo(() => {
    const map = new Map<string, { last_seen: string }>();
    onlineUsers.forEach((user) => {
      map.set(user.profile_id, { last_seen: user.last_seen });
    });
    return map;
  }, [onlineUsers]);

  const users: ListedUser[] = useMemo(() => {
    return rawUsers.map((user) => {
      const session = onlineMap.get(user.id);
      return {
        ...user,
        isOnline: Boolean(session),
        lastSeen: session?.last_seen ?? null,
      };
    });
  }, [rawUsers, onlineMap]);

  const emptyDirectory = users.length === 0;

  const sortedUsers = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    return users
      .filter((user) => {
        if (!normalizedTerm) return true;
        const haystack = `${user.full_name} ${user.email ?? ""}`.toLowerCase();
        return haystack.includes(normalizedTerm);
      })
      .sort((a, b) => {
        if (a.isOnline === b.isOnline) {
          return a.full_name.localeCompare(b.full_name);
        }
        return a.isOnline ? -1 : 1;
      });
  }, [users, searchTerm]);

  useEffect(() => {
    if (!sortedUsers.length) {
      setSelectedUserId(null);
      return;
    }
    if (!selectedUserId || !sortedUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(sortedUsers[0]?.id ?? null);
    }
  }, [sortedUsers, selectedUserId]);

  useEffect(() => {
    setLogPage(0);
    setLogsAccumulator([]);
    setDirectMessage("");
  }, [selectedUserId]);

  useEffect(() => {
    if (resultPage !== logPage) return;
    if (logPage === 0) {
      if (loadingLogs) return;
      setLogsAccumulator(pageLogs);
      return;
    }
    if (!pageLogs.length) return;
    setLogsAccumulator((previous) => {
      const map = new Map<string, CommunicationLog>();
      previous.forEach((log) => map.set(log.id, log));
      pageLogs.forEach((log) => map.set(log.id, log));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [pageLogs, logPage, loadingLogs, resultPage]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const onlineCount = useMemo(() => users.filter((user) => user.isOnline).length, [users]);

  const unreadMessageCount = useMemo(
    () =>
      logsAccumulator.reduce((count, log) => {
        const normalizedStatus = log.status ? log.status.toLowerCase() : null;
        if (!normalizedStatus) return count;
        return normalizedStatus === "pending" || normalizedStatus === "unread" ? count + 1 : count;
      }, 0),
    [logsAccumulator]
  );

  const isSendingResend = resendWhatsApp.isPending && pendingAction === "resend";
  const isSendingDirectMessage = resendWhatsApp.isPending && pendingAction === "direct";
  const isRefreshingLogs = fetchingLogs && logPage === 0;

  const onlineLabel = useMemo(
    () => pluralize(onlineCount, "online", "online"),
    [onlineCount]
  );

  const usersLabel = useMemo(
    () => pluralize(users.length, "usuario", "usuarios"),
    [users.length]
  );

  const unreadLabel = useMemo(
    () => pluralize(unreadMessageCount, "mensaje sin leer", "mensajes sin leer"),
    [unreadMessageCount]
  );

  if (emptyDirectory) {
      return (
        <div className="rounded-3xl border border-border bg-card p-6 lg:p-8">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Gestion de comunicaciones</h2>
            <p className="text-sm text-muted-foreground">
              Monitoriza la actividad de los operarios y envia recordatorios personalizados.
            </p>
          </div>
        <Card className="rounded-3xl border border-dashed border-border/70 bg-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                Comunicaciones internas
              </CardTitle>
              <CardDescription>
                Aun no hay perfiles cargados en el directorio. Anade operarios o administradores para iniciar
                conversaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ve a <span className="font-medium text-foreground">Usuarios</span> para crear o importar perfiles y luego
              regresa aqui para gestionar los mensajes.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleLoadMoreLogs = () => {
    if (!hasMoreLogs || fetchingLogs) return;
    setLogPage((previous) => previous + 1);
  };

  const handleResendWhatsApp = async () => {
    if (!selectedUser) return;
    try {
      setPendingAction("resend");
      await resendWhatsApp.mutateAsync({
        profileId: selectedUser.id,
        message: defaultWhatsAppMessage,
      });
    } catch (error) {
      console.error("Error resending WhatsApp", error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSendDirectMessage = async () => {
    if (!selectedUser) return;
    const trimmedMessage = directMessage.trim();
    if (!trimmedMessage) return;

    try {
      setPendingAction("direct");
      await resendWhatsApp.mutateAsync({
        profileId: selectedUser.id,
        message: trimmedMessage,
      });
      setDirectMessage("");
    } catch (error) {
      console.error("Error sending direct message", error);
    } finally {
      setPendingAction(null);
    }
  };

    return (
      <div className="rounded-3xl border border-border bg-card p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Gestion de comunicaciones</h2>
          <p className="text-sm text-muted-foreground">
            Monitoriza la actividad de los operarios y envia recordatorios personalizados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(statusPillBase, statusPillVariants.success)}>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {onlineLabel}
          </span>
          <span className={cn(statusPillBase, statusPillVariants.neutral)}>{usersLabel}</span>
          <span
            className={cn(
              statusPillBase,
              unreadMessageCount > 0 ? statusPillVariants.alert : statusPillVariants.neutral
            )}
          >
            {unreadLabel}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:auto-rows-[1fr] lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-1 lg:h-full">
        <div className="flex h-full min-h-[600px] flex-col rounded-3xl border border-border bg-muted/60 p-4 dark:bg-muted/30">
            <div className="mb-4 space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Listado de usuarios</h3>
              <p className="text-xs text-muted-foreground">
                Selecciona un usuario para revisar sus comunicaciones recientes.
              </p>
            </div>
            <Input
              placeholder="Buscar por nombre o correo"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="rounded-2xl border-border bg-card focus-visible:ring-primary/30"
            />
            <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
              <ScrollArea className="h-[480px] max-h-[480px]">
                {loadingOnlineUsers && (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando presencia...
                  </div>
                )}
                {!sortedUsers.length ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    No hay usuarios disponibles con el filtro actual.
                  </p>
                  ) : (
                  <div className="divide-y divide-slate-200">
                    {sortedUsers.map((user) => {
                      const isSelected = user.id === selectedUserId;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                          className="w-full text-left"
                        >
                          <div
                            className={cn(
                              "space-y-2 bg-card px-3 py-2 transition-colors",
                              isSelected
                                ? "bg-primary/10 dark:bg-primary/20"
                                : "hover:bg-muted/70 dark:hover:bg-muted/40"
                            )}
                          >
                            <div className="flex flex-wrap items-start gap-2">
                              <Avatar className="h-10 w-10 shrink-0 border border-border">
                                <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
                                <AvatarFallback className="text-sm font-semibold">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1 space-y-2">
                                <p className="text-sm font-semibold leading-snug text-foreground break-words">
                                  {user.full_name}
                                </p>
                                <p className="text-xs font-medium capitalize text-muted-foreground">
                                  {user.role ?? "Sin rol"}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                                    Estado: {user.status ?? "sin definir"}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded-full px-2.5 py-0.5",
                                      user.isOnline
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {user.isOnline ? "En linea" : "Fuera de linea"}
                                  </span>
                                </div>
                                <div className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                                  <span className="break-words">Email: {user.email ?? "Sin correo registrado"}</span>
                                  <span>Telefono: {user.phone ?? "No disponible"}</span>
                                  {user.whatsapp && <span>WhatsApp: {user.whatsapp}</span>}
                                  {user.public_url && <span>Perfil: {user.public_url}</span>}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {user.lastSeen
                                    ? `Ultima actividad ${formatRelativeTime(user.lastSeen)}`
                                    : "Sin actividad registrada"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1 lg:h-full">
          <Card className="rounded-3xl border border-border">
            {selectedUser ? (
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={selectedUser.avatar_url ?? undefined} alt={selectedUser.full_name} />
                      <AvatarFallback className="text-lg font-semibold">
                        {getInitials(selectedUser.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Usuario</p>
                      <h3 className="text-xl font-semibold text-foreground">{selectedUser.full_name}</h3>
                      <p className="text-sm text-muted-foreground break-words">
                        {selectedUser.email ?? "Sin correo registrado"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                      selectedUser.isOnline
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        selectedUser.isOnline
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/50 dark:bg-muted-foreground/60"
                      )}
                    />
                    {selectedUser.isOnline ? "En linea" : "Fuera de linea"}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Estado</Label>
                    <p className="text-sm font-medium text-foreground">
                      {selectedUser.isOnline ? "En linea" : "Fuera de linea"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.lastSeen
                        ? `Ultima actividad ${formatRelativeTime(selectedUser.lastSeen)}`
                        : "Sin actividad registrada"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Contacto</Label>
                    <p className="text-sm font-medium text-foreground">
                      {selectedUser.phone ?? "Sin telefono registrado"}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      {selectedUser.email ?? "Sin correo registrado"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Rol</Label>
                    <p className="text-sm font-medium text-foreground capitalize">{selectedUser.role}</p>
                    {selectedUser.status && (
                      <p className="text-xs text-muted-foreground">Estado: {selectedUser.status}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendWhatsApp}
                    disabled={!selectedUser.phone || isSendingResend}
                    className="rounded-full border-border bg-card text-foreground hover:bg-muted"
                  >
                    {isSendingResend ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="mr-2 h-4 w-4" />
                    )}
                    Reenviar WhatsApp
                  </Button>
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-muted/60 p-4 dark:bg-muted/30">
                  <Label className="text-sm font-medium text-foreground">Enviar mensaje directo</Label>
                  <Textarea
                    placeholder={directMessagePlaceholder}
                    value={directMessage}
                    onChange={(event) => setDirectMessage(event.target.value)}
                    disabled={isSendingDirectMessage}
                    className="min-h-[120px] resize-none rounded-2xl border-border bg-background"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSendDirectMessage}
                      disabled={!directMessage.trim() || isSendingDirectMessage}
                      className="rounded-full bg-primary/90 px-5 text-sm font-medium text-primary-foreground hover:bg-primary"
                    >
                      {isSendingDirectMessage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Enviar mensaje
                    </Button>
                  </div>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-6 text-sm text-muted-foreground">
                Selecciona un usuario para ver su informacion.
              </CardContent>
            )}
          </Card>

          <Card className="rounded-3xl border border-border">
            <CardHeader className="border-b border-border/60 pb-4 dark:border-border/40">
              <CardTitle className="text-lg text-foreground">Historial de comunicaciones</CardTitle>
              <CardDescription>
                {selectedUser
                  ? `Eventos vinculados a ${selectedUser.full_name}.`
                  : "Selecciona un usuario para consultar su historial."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isInitialLogLoading || isRefreshingLogs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isInitialLogLoading ? "Consultando historial..." : "Actualizando historial..."}
                </div>
              ) : !displayedLogs.length ? (
                <p className="text-sm text-muted-foreground">
                  No hay registros de comunicaciones para este usuario.
                </p>
              ) : (
                <>
                  <ScrollArea className="max-h-[360px] pr-2">
                    <div className="space-y-3">
                      {displayedLogs.map((log) => (
                        <div key={log.id} className="space-y-2 rounded-2xl border border-border bg-muted/60 p-4 dark:bg-muted/30">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="capitalize">
                              {log.type ?? "evento"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(log.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{log.subject ?? "Sin asunto"}</p>
                          <p className="text-sm text-muted-foreground">{truncate(log.message)}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Destino: {log.recipient ?? "No indicado"}</span>
                            <span className="font-medium uppercase">{log.status ?? "sin estado"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {hasMoreLogs && (
                    <div className="mt-3 flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadMoreLogs}
                        disabled={fetchingLogs}
                      >
                        {fetchingLogs ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cargando...
                          </>
                        ) : (
                          "Cargar mas"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
