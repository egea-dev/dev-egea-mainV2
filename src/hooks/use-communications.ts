import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
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

type CommunicationLogRow = Database['public']['Tables']['communication_logs']['Row'];

type CommunicationLogMetadata = Record<string, string | number | boolean | null>;

export interface CommunicationLog {
  id: CommunicationLogRow['id'];
  type: CommunicationLogRow['type'];
  recipient: CommunicationLogRow['recipient'];
  subject: CommunicationLogRow['subject'];
  message: CommunicationLogRow['message'];
  status: CommunicationLogRow['status'];
  sent_at: CommunicationLogRow['sent_at'];
  delivered_at: CommunicationLogRow['delivered_at'];
  error_message: CommunicationLogRow['error_message'];
  metadata: CommunicationLogMetadata;
  created_by: CommunicationLogRow['created_by'];
  created_at: CommunicationLogRow['created_at'];
}

type CommunicationLogQueryResult = {
  logs: CommunicationLog[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

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

// Hook para logs de comunicaciones
type CommunicationLogFilters = {
  profileId?: string | null;
  metadata?: Record<string, string>;
  limit?: number;
  page?: number;
};

export const useCommunicationLogs = (filters: CommunicationLogFilters = {}) => {
  const profileId = filters.profileId ?? undefined;
  const metadataFilter = filters.metadata ?? null;
  const metadataKey = metadataFilter ? JSON.stringify(metadataFilter) : null;
  const page = Math.max(filters.page ?? 0, 0);
  const limit = Math.max(filters.limit ?? 25, 1);
  const from = page * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: ['communication-logs', profileId ?? null, metadataKey, limit, page],
    keepPreviousData: true,
    queryFn: async () => {
      let query = supabase
        .from('communication_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (profileId) {
        const filters = [
          `created_by.eq.${profileId}`,
          `metadata->>profile_id.eq.${profileId}`,
          `metadata->>target_profile_id.eq.${profileId}`,
          `metadata->>user_profile_id.eq.${profileId}`,
        ].join(',');
        query = query.or(filters);
      }

      if (metadataFilter) {
        Object.entries(metadataFilter).forEach(([key, value]) => {
          query = query.eq(`metadata->>${key}`, value);
        });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const rows = (data ?? []) as CommunicationLogRow[];
      const normalizedLogs: CommunicationLog[] = rows.map((row) => ({
        id: row.id,
        type: row.type,
        recipient: row.recipient,
        subject: row.subject,
        message: row.message,
        status: row.status,
        sent_at: row.sent_at,
        delivered_at: row.delivered_at,
        error_message: row.error_message,
        metadata: (row.metadata as CommunicationLogMetadata) ?? {},
        created_by: row.created_by,
        created_at: row.created_at,
      }));

      if (!profileId) {
        const totalCount = typeof count === 'number' ? count : normalizedLogs.length + from;
        const hasMore = typeof count === 'number' ? to + 1 < count : normalizedLogs.length === limit;
        return {
          logs: normalizedLogs,
          total: totalCount,
          page,
          pageSize: limit,
          hasMore,
        };
      }

      const filteredLogs = normalizedLogs.filter((log) => {
        const meta = log.metadata || {};
        const targetProfile =
          meta.profile_id ??
          meta.target_profile_id ??
          meta.user_profile_id ??
          null;
        return (
          log.created_by === profileId ||
          (typeof targetProfile === 'string' && targetProfile === profileId)
        );
      });

      const totalCount =
        typeof count === 'number' ? count : filteredLogs.length + from;
      const hasMore = typeof count === 'number' ? to + 1 < count : filteredLogs.length === limit;

      return {
        logs: filteredLogs,
        total: totalCount,
        page,
        pageSize: limit,
        hasMore,
      };
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let actorProfileId: string | null = null;

      if (currentUser) {
        const { data: actorProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', currentUser.id)
          .single();

        actorProfileId = actorProfile?.id ?? null;
      }

      await supabase.from('communication_logs').insert({
        type: 'whatsapp',
        recipient: profile.phone,
        subject: null,
        message,
        status: 'sent',
        metadata: {
          resent_at: new Date().toISOString(),
          profile_id: profileId,
          action: 'whatsapp_resent',
          target: profile.phone,
        },
        created_by: actorProfileId,
      });

      return { profileId, message };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
      toast.success('Notificación WhatsApp reenviada exitosamente');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al reenviar WhatsApp';
      toast.error(`Error al reenviar WhatsApp: ${message}`);
    },
  });
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
