import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, RefreshCcw, Send } from "lucide-react";
import { useAdminData } from "@/hooks/use-admin-data";
import {
  useOnlineUsers,
  useCommunicationLogs,
  useSendMessage,
  useUserMessages,
  useUnreadMessageCount,
  useResendWhatsApp,
  useRealtimePresence,
  useRealtimeMessages,
  type CommunicationLog,
} from "@/hooks/use-communications";
import type { Profile } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
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
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "US";
};

export default function CommunicationManagement() {
  const { users: rawUsers = [] } = useAdminData();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [logPage, setLogPage] = useState(0);
  const [logsAccumulator, setLogsAccumulator] = useState<CommunicationLog[]>([]);

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
  const {
    data: messages = [],
    isLoading: loadingMessages,
  } = useUserMessages(selectedUserId ?? undefined);
  const { data: unreadCount = 0 } = useUnreadMessageCount(selectedUserId ?? undefined);

  const sendMessage = useSendMessage();
  const resendWhatsApp = useResendWhatsApp();

  useRealtimePresence();
  useRealtimeMessages(selectedUserId ?? undefined);

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
  }, [selectedUserId]);

  useEffect(() => {
    if (resultPage !== logPage) return;
    if (logPage === 0) {
      if (loadingLogs) return;
      setLogsAccumulator(pageLogs);
      return;
    }
    if (pageLogs.length === 0) return;
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

  const sortedMessages = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);

  const onlineCount = useMemo(
    () => users.filter((user) => user.isOnline).length,
    [users]
  );

  const handleSendMessage = async () => {
    if (!selectedUser || !messageDraft.trim()) return;
    try {
      await sendMessage.mutateAsync({
        toProfileId: selectedUser.id,
        message: messageDraft.trim(),
      });
      setMessageDraft("");
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  if (emptyDirectory) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Comunicaciones internas
            </CardTitle>
            <CardDescription>
              Aún no hay perfiles cargados en el directorio. Añade operarios/administradores para iniciar conversaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ve a <span className="font-medium text-foreground">Usuarios</span> para crear o importar perfiles, y luego regresa aquí para gestionar los mensajes.
          </CardContent>
        </Card>
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
      await resendWhatsApp.mutateAsync({
        profileId: selectedUser.id,
        message: defaultWhatsAppMessage,
      });
    } catch (error) {
      console.error("Error resending WhatsApp", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Gestion de comunicaciones</h2>
          <p className="text-sm text-muted-foreground">
            Monitoriza la actividad de los operarios y envia recordatorios personalizados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{onlineCount} online</Badge>
          <Badge variant="outline">{users.length} usuarios</Badge>
          {selectedUser && unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} mensajes sin leer</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Listado de usuarios</CardTitle>
            <CardDescription>
              Selecciona un usuario para revisar sus comunicaciones recientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar por nombre o correo"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <div className="rounded-lg border">
              <ScrollArea className="max-h-[460px]">
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
                  <div className="divide-y">
                    {sortedUsers.map((user) => {
                      const isSelected = user.id === selectedUserId;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                          className={cn(
                            "w-full cursor-pointer p-4 text-left transition-colors",
                            isSelected ? "bg-accent" : "hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
                              <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.email ?? "Sin correo registrado"}
                              </p>
                            </div>
                            <Badge variant={user.isOnline ? "default" : "outline"}>
                              {user.isOnline ? "En linea" : "Offline"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {user.lastSeen
                              ? `Ultimo visto: ${formatRelativeTime(user.lastSeen)}`
                              : "Sin actividad reciente"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                {selectedUser ? selectedUser.full_name : "Selecciona un usuario"}
              </CardTitle>
              <CardDescription>
                {selectedUser
                  ? "Resumen de estado, contacto y mensajes directos."
                  : "Elige un usuario en el listado para ver sus detalles."}
              </CardDescription>
            </CardHeader>
            {selectedUser ? (
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <div className="flex items-center gap-2 font-medium">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          selectedUser.isOnline ? "bg-emerald-500" : "bg-muted-foreground/60"
                        )}
                      />
                      {selectedUser.isOnline ? "En linea" : "Fuera de linea"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.lastSeen
                        ? `Ultimo visto: ${formatRelativeTime(selectedUser.lastSeen)}`
                        : "Sin actividad registrada"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto</Label>
                    <p className="font-medium">{selectedUser.phone ?? "Sin telefono registrado"}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.email ?? "Sin correo registrado"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <p className="font-medium capitalize">{selectedUser.role}</p>
                    {selectedUser.status && (
                      <p className="text-xs text-muted-foreground">Estado: {selectedUser.status}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Mensajes sin leer</Label>
                    <p className="font-medium">{unreadCount}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendWhatsApp}
                    disabled={!selectedUser.phone || resendWhatsApp.isPending}
                  >
                    {resendWhatsApp.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="mr-2 h-4 w-4" />
                    )}
                    Reenviar WhatsApp
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Mensajes recientes</Label>
                    {loadingMessages && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="rounded-lg border bg-muted/40">
                    <ScrollArea className="max-h-[260px] p-3">
                      {!sortedMessages.length ? (
                        <p className="text-sm text-muted-foreground">
                          No hay mensajes registrados con este usuario.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {sortedMessages.map((message) => {
                            const incoming = message.from_profile_id === selectedUser.id;
                            return (
                              <div
                                key={message.id}
                                className={cn("flex", incoming ? "justify-start" : "justify-end")}
                              >
                                <div
                                  className={cn(
                                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                                    incoming
                                      ? "bg-background text-foreground shadow-sm"
                                      : "bg-primary text-primary-foreground"
                                  )}
                                >
                                  <p>{message.message}</p>
                                  <span
                                    className={cn(
                                      "mt-1 block text-[11px]",
                                      incoming ? "text-muted-foreground" : "text-primary-foreground/70"
                                    )}
                                  >
                                    {formatRelativeTime(message.created_at)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communication-message">Enviar mensaje directo</Label>
                  <Textarea
                    id="communication-message"
                    placeholder="Escribe un mensaje para el operario..."
                    rows={3}
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageDraft.trim() || sendMessage.isPending}
                    >
                      {sendMessage.isPending ? (
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Historial de comunicaciones</CardTitle>
              <CardDescription>
                {selectedUser
                  ? `Eventos vinculados a ${selectedUser.full_name}.`
                  : "Selecciona un usuario para consultar su historial."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isInitialLogLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultando historial...
                </div>
              ) : !displayedLogs.length ? (
                <p className="text-sm text-muted-foreground">
                  No hay registros de comunicaciones para este usuario.
                </p>
              ) : (
                <>
                  <ScrollArea className="max-h-[340px] pr-2">
                    <div className="space-y-3">
                      {displayedLogs.map((log) => (
                        <div key={log.id} className="space-y-2 rounded-lg border bg-card/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="capitalize">
                              {log.type ?? "evento"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(log.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{log.subject ?? "Sin asunto"}</p>
                          <p className="text-sm text-muted-foreground">{truncate(log.message)}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Destino: {log.recipient ?? "No indicado"}</span>
                            <span className="font-medium uppercase">
                              {log.status ?? "sin estado"}
                            </span>
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
                          "Cargar más"
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
