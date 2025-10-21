import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDirectMessages } from "@/hooks/use-direct-messages";
import { useProfile } from "@/hooks/use-supabase";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

interface AdminProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

const ADMIN_ROLES = ["admin", "manager", "responsable"];

export const OperatorMessaging = () => {
  const { data: profile } = useProfile();
  const [message, setMessage] = useState("");

  const {
    conversations,
    currentConversation,
    sendMessage,
    fetchConversation,
    setSelectedUserId,
    selectedUserId,
    loading,
  } = useDirectMessages();

  const { data: adminUsers = [], isLoading: loadingAdmins } = useQuery<AdminProfile[]>({
    queryKey: ["operator-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("role", ADMIN_ROLES)
        .eq("status", "activo");

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const adminIds = useMemo(() => adminUsers.map((admin) => admin.id), [adminUsers]);

  const activeAdmin = useMemo(() => {
    if (!adminUsers.length) return null;
    const explicit = selectedUserId && adminUsers.find((admin) => admin.id === selectedUserId);
    return explicit ?? adminUsers[0] ?? null;
  }, [adminUsers, selectedUserId]);

  const allowedConversations = useMemo(
    () => conversations.filter((conversation) => adminIds.includes(conversation.user_id)),
    [conversations, adminIds]
  );

  useEffect(() => {
    if (!adminIds.length) return;
    const target = selectedUserId && adminIds.includes(selectedUserId) ? selectedUserId : adminIds[0];
    if (!target) return;
    if (target !== selectedUserId) {
      setSelectedUserId(target);
    }
    fetchConversation(target);
  }, [adminIds, selectedUserId, setSelectedUserId, fetchConversation]);

  const handleSubmit = async () => {
    if (!activeAdmin || !message.trim()) return;
    await sendMessage(activeAdmin.id, message);
    setMessage("");
    fetchConversation(activeAdmin.id);
  };

  const currentMessages = useMemo(() => {
    if (!activeAdmin) return [];
    return currentConversation.filter(
      (entry) => entry.sender_id === activeAdmin.id || entry.recipient_id === activeAdmin.id
    );
  }, [currentConversation, activeAdmin]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Centro de mensajes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Solo puedes comunicarte con el administrador. Las respuestas apareceran en este buzon.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingAdmins ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando administrador disponible...
            </div>
          ) : !activeAdmin ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No se encontraron administradores activos. Intenta de nuevo mas tarde.
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={activeAdmin.avatar_url ?? undefined} />
                <AvatarFallback>{activeAdmin.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{activeAdmin.full_name}</p>
                {allowedConversations.some((c) => c.user_id === activeAdmin.id) && (
                  <Badge variant="secondary" className="text-xs">
                    Conversacion activa
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="rounded-md border bg-card">
            <ScrollArea className="h-64 px-4 py-3">
              {!activeAdmin ? (
                <p className="text-sm text-muted-foreground">
                  Esperando a que haya un administrador disponible.
                </p>
              ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando mensajes...
                </div>
              ) : currentMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay mensajes todavia. Escribe para iniciar la conversacion.
                </p>
              ) : (
                <div className="space-y-3">
                  {currentMessages.map((entry) => {
                    const outgoing = entry.sender_id === profile?.id;
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex flex-col",
                          outgoing ? "items-end text-right" : "items-start text-left"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                            outgoing ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                          )}
                        >
                          <p>{entry.content}</p>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {dayjs(entry.created_at).format("DD/MM HH:mm")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Escribe tu mensaje para el administrador..."
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={!activeAdmin}
            />
            <Button
              className="gap-2"
              onClick={handleSubmit}
              disabled={!activeAdmin || !message.trim()}
            >
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
