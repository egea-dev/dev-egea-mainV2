import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Bell,
  BellOff,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/badges';
import { useAdminData } from '@/hooks/use-admin-data';
import { useProfile } from '@/hooks/use-supabase';
import { 
  useOnlineUsers,
  useUserMessages,
  useUnreadMessageCount,
  useSendMessage,
  useMarkMessagesAsRead,
  useCommunicationLogs,
  useResendWhatsApp,
  useRealtimeMessages,
  useRealtimePresence,
  type OnlineUser,
  type UserMessage
} from '@/hooks/use-communications';
import { supabase } from '@/integrations/supabase/client';

type UserStatus = {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  status: string;
  is_online: boolean;
  last_seen: string;
  has_viewed_plan: boolean;
  unread_count: number;
};

export default function CommunicationManagement() {
  const { data: profile } = useProfile();
  const { users } = useAdminData();
  
  const [selectedUser, setSelectedUser] = useState<UserStatus | null>(null);
  
  const { data: onlineUsers = [], refetch: refetchOnlineUsers } = useOnlineUsers();
  const { data: messages = [], refetch: refetchMessages } = useUserMessages(selectedUser?.id);
  const { data: logs = [], refetch: refetchLogs } = useCommunicationLogs(selectedUser?.id);
  
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkMessagesAsRead();
  const resendWhatsAppMutation = useResendWhatsApp();
  
  // Suscribirse a actualizaciones en tiempo real
  useRealtimeMessages(selectedUser?.id);
  useRealtimePresence();
  
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;
    
    try {
      await sendMessageMutation.mutateAsync({
        toProfileId: selectedUser.profile_id,
        message: messageText.trim(),
      });
      
      setMessageText('');
      setIsMessageDialogOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleResendNotification = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    resendWhatsAppMutation.mutate({
      profileId: userId,
      message: `Hola ${user.full_name}, este es un mensaje de recordatorio sobre tu plan de trabajo.`,
    });
  };

  const handleMarkAsRead = async (userId: string) => {
    const unreadMessages = messages.filter(
      m => m.to_profile_id === userId && !m.is_read
    );
    
    if (unreadMessages.length > 0) {
      await markAsReadMutation.mutateAsync(
        unreadMessages.map(m => m.id)
      );
    }
  };

  const refreshData = () => {
    refetchOnlineUsers();
    refetchMessages();
    refetchLogs();
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} h`;
    return `Hace ${Math.floor(diffMinutes / 1440)} d`;
  };

  // Combinar datos de usuarios con estado online
  const userStatuses: UserStatus[] = users.map(user => {
    const onlineUser = onlineUsers.find(ou => ou.profile_id === user.id);
    const unreadCount = messages.filter(
      m => m.to_profile_id === user.id && !m.is_read
    ).length;
    
    return {
      id: user.id,
      profile_id: user.id,
      full_name: user.full_name,
      email: user.email,
      status: user.status,
      is_online: !!onlineUser,
      last_seen: onlineUser?.last_seen || new Date().toISOString(),
      has_viewed_plan: true, // TODO: Implementar con task_notifications
      unread_count: unreadCount,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestión de Comunicaciones
          </h2>
          <p className="text-muted-foreground">Monitoriza y gestiona las comunicaciones con los operarios</p>
        </div>
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Usuarios con Estado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de Usuarios ({userStatuses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {userStatuses.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedUser?.id === user.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                    )}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          user.is_online ? "bg-green-500" : "bg-gray-400"
                        )} />
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {user.is_online ? (
                              <>
                                <Wifi className="h-3 w-3" />
                                <span>En línea</span>
                              </>
                            ) : (
                              <>
                                <WifiOff className="h-3 w-3" />
                                <span>{formatLastSeen(user.last_seen)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={user.status} size="sm" />
                        {user.has_viewed_plan ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                        {user.unread_count > 0 && (
                          <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {user.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detalles y Acciones del Usuario Seleccionado */}
        <Card className="lg:col-span-2">
          <CardHeader>
            {selectedUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full",
                    selectedUser?.is_online ? "bg-green-500" : "bg-gray-400"
                  )} />
                  <CardTitle className="text-lg">{selectedUser.full_name}</CardTitle>
                  <StatusBadge status={selectedUser.status} />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAsRead(selectedUser?.id || '')}
                    disabled={selectedUser?.unread_count === 0}
                  >
                    Marcar como leído
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsMessageDialogOpen(true)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Enviar Mensaje
                  </Button>
                </div>
              </div>
            ) : (
              <CardTitle className="text-lg text-muted-foreground">
                Selecciona un usuario para ver detalles
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <p className="font-medium">
                      {selectedUser?.is_online ? 'En línea' : `Desconectado (${formatLastSeen(selectedUser?.last_seen || '')})`}
                    </p>
                  </div>
                  <div>
                    <Label>Plan del día</Label>
                    <p className="font-medium">
                      {selectedUser?.has_viewed_plan ? 'Visto ✓' : 'No visto ⚠️'}
                    </p>
                  </div>
                  <div>
                    <Label>Mensajes no leídos</Label>
                    <p className="font-medium">{selectedUser?.unread_count || 0}</p>
                  </div>
                </div>

                <div>
                  <Label>Historial de Mensajes</Label>
                  <ScrollArea className="h-64 mt-2 border rounded-md p-4">
                    {messages.length > 0 ? (
                      <div className="space-y-4">
                        {messages.slice().reverse().map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "flex items-end gap-2",
                              message.from_profile_id === profile?.id ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-xs rounded-lg p-3 text-sm",
                                message.from_profile_id === profile?.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              )}
                            >
                              <p>{message.message}</p>
                              <p className="mt-1 text-xs opacity-70 text-right">
                                {formatLastSeen(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No hay mensajes.
                      </div>
                    )}
                  </ScrollArea>
                </div>
                
                <div>
                  <Label>Historial de Comunicaciones</Label>
                  <div className="mt-2 space-y-2">
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              log.status === 'sent' ? "bg-green-500" : 
                              log.status === 'failed' ? "bg-red-500" : "bg-yellow-500"
                            )} />
                            <div>
                              <div className="text-sm font-medium">
                                {log.action.replace('_', ' ').charAt(0).toUpperCase() + log.action.replace('_', ' ').slice(1)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {log.target || 'Sin destino'} • {formatLastSeen(log.created_at)}
                              </div>
                            </div>
                          </div>
                          {log.status === 'failed' && selectedUser && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendNotification(selectedUser.profile_id)}
                              disabled={resendWhatsAppMutation.isPending}
                            >
                              Reenviar
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                        No hay registros de comunicaciones.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>Selecciona un usuario de la lista para ver y gestionar sus comunicaciones.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para enviar mensaje */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Mensaje</DialogTitle>
            <DialogDescription>
              Envía un mensaje directo al operario seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Para: {selectedUser?.full_name}</Label>
            </div>
            <div>
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSendMessage} 
                disabled={!messageText.trim() || sendMessageMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {sendMessageMutation.isPending ? 'Enviando...' : 'Enviar Mensaje'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}