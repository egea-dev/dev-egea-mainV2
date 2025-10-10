import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface UserSession {
  id: string;
  profile_id: string;
  last_seen: string;
  is_online: boolean;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
}

export interface UserMessage {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  message: string;
  message_type: 'text' | 'system' | 'notification';
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface CommunicationLog {
  id: string;
  profile_id: string;
  action: string;
  target?: string;
  content?: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface OnlineUser {
  profile_id: string;
  full_name: string;
  email: string;
  status: string;
  last_seen: string;
}

// Hook para rastrear presencia del usuario actual
export const useUserPresence = (profileId?: string) => {
  const [isOnline, setIsOnline] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profileId) return;

    const updatePresence = async () => {
      try {
        await supabase.rpc('update_user_session', {
          user_profile_id: profileId,
          user_agent_param: navigator.userAgent,
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Actualizar presencia inmediatamente
    updatePresence();

    // Configurar intervalo para actualizar presencia cada 2 minutos
    const interval = setInterval(updatePresence, 2 * 60 * 1000);

    // Manejar eventos de visibilidad
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    };

    // Manejar eventos de conexión
    const handleOnline = () => {
      setIsOnline(true);
      updatePresence();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Limpiar al desmontar
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Marcar como offline al cerrar
      supabase.rpc('mark_user_offline', { user_profile_id: profileId });
    };
  }, [profileId]);

  return isOnline;
};

// Hook para obtener usuarios online
export const useOnlineUsers = () => {
  return useQuery({
    queryKey: ['online-users'],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          profile_id,
          last_seen,
          profiles (
            full_name,
            email,
            status
          )
        `)
        .eq('is_online', true)
        .gt('last_seen', fiveMinutesAgo);

      if (error) {
        // Si es un error de RLS, puede que el usuario no sea admin.
        // Devolvemos un array vacío para no romper la UI.
        if (error.code === '42501') { 
          console.warn('Error de RLS al obtener usuarios online. El usuario podría no ser admin.');
          return [];
        }
        throw error;
      }

      return (data || []).map(item => ({
        profile_id: item.profile_id,
        full_name: item.profiles.full_name,
        email: item.profiles.email,
        status: item.profiles.status,
        last_seen: item.last_seen,
      })) as OnlineUser[];
    },
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
};

// Hook para mensajes entre usuarios
export const useUserMessages = (userId?: string) => {
  return useQuery({
    queryKey: ['user-messages', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_messages')
        .select(`
          *,
          from_profile:profiles!user_messages_from_profile_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          to_profile:profiles!user_messages_to_profile_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .or(`(from_profile_id.eq.${userId},to_profile_id.eq.${userId})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (UserMessage & {
        from_profile: any;
        to_profile: any;
      })[];
    },
    enabled: !!userId,
  });
};

// Hook para contar mensajes no leídos
export const useUnreadMessageCount = (userId?: string) => {
  return useQuery({
    queryKey: ['unread-messages', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { data, error } = await supabase.rpc('get_unread_message_count', {
        user_profile_id: userId,
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!userId,
  });
};

// Hook para enviar mensajes
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      toProfileId,
      message,
      messageType = 'text',
    }: {
      toProfileId: string;
      message: string;
      messageType?: 'text' | 'system' | 'notification';
    }) => {
      // Obtener el usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Obtener el perfil del usuario actual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('user_messages')
        .insert({
          from_profile_id: profile.id,
          to_profile_id: toProfileId,
          message,
          message_type: messageType,
        })
        .select(`
          *,
          from_profile:profiles!user_messages_from_profile_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          to_profile:profiles!user_messages_to_profile_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      toast.success('Mensaje enviado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al enviar mensaje: ' + error.message);
    },
  });
};

// Hook para marcar mensajes como leídos
export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .from('user_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in('id', messageIds);

      if (error) throw error;
      return messageIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    },
  });
};

// Hook para logs de comunicaciones
export const useCommunicationLogs = (profileId?: string) => {
  return useQuery({
    queryKey: ['communication-logs', profileId],
    queryFn: async () => {
      let query = supabase
        .from('communication_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CommunicationLog[];
    },
  });
};

// Hook para reenviar notificaciones WhatsApp
export const useResendWhatsApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, message }: { profileId: string; message: string }) => {
      // Obtener información del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', profileId)
        .single();

      if (!profile || !profile.phone) {
        throw new Error('Usuario no tiene teléfono configurado');
      }

      // Llamar a la Edge Function
      const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          to: profile.phone,
          message,
          tasks: [], // Sin tareas para mensajes ad-hoc
        },
      });

      if (error) throw error;

      // Registrar en logs
      await supabase.from('communication_logs').insert({
        profile_id: profileId,
        action: 'whatsapp_resent',
        target: profile.phone,
        content: message,
        status: 'sent',
        metadata: { resent_at: new Date().toISOString() },
      });

      return { profileId, message };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
      toast.success('Notificación WhatsApp reenviada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al reenviar WhatsApp: ' + error.message);
    },
  });
};

// Hook para suscribirse a mensajes en tiempo real
export const useRealtimeMessages = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_messages',
          filter: `to_profile_id=eq.${userId}`,
        },
        (payload) => {
          // Refrescar mensajes cuando haya cambios
          queryClient.invalidateQueries({ queryKey: ['user-messages', userId] });
          queryClient.invalidateQueries({ queryKey: ['unread-messages', userId] });
          
          // Mostrar notificación para nuevos mensajes
          if (payload.eventType === 'INSERT' && !payload.new.is_read) {
            toast.info('Nuevo mensaje recibido');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};

// Hook para suscribirse a presencia de usuarios
export const useRealtimePresence = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions',
        },
        () => {
          // Refrescar lista de usuarios online cuando haya cambios
          queryClient.invalidateQueries({ queryKey: ['online-users'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};