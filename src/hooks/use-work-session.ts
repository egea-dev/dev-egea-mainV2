import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, differenceInMilliseconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { SessionLocation, Task, WorkSession } from '@/types';
import { normalizeTaskLocation } from '@/utils/task';

type ManualLocation = SessionLocation;

type StartSessionOptions = {
  taskId?: string | null;
  manualLocation?: ManualLocation | null;
  metadata?: Record<string, unknown>;
  taskLocation?: string | null;
};

type EndSessionOptions = {
  sessionId?: string;
  manualLocation?: ManualLocation | null;
  status?: string;
  metadata?: Record<string, unknown>;
  taskLocation?: string | null;
};

type UseWorkSessionParams = {
  profileId?: string | null;
  taskId?: string | null;
  task?: Task | null;
};

const sessionQueryKey = (profileId?: string | null) => ['work-session', profileId];

const asLocationPayload = (input?: ManualLocation | null): Record<string, unknown> | null => {
  if (!input || Number.isNaN(input.lat) || Number.isNaN(input.lng)) return null;
  return {
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy ?? null,
    note: input.note ?? null,
    source: input.source ?? 'manual',
    collected_at: input.collected_at ?? new Date().toISOString(),
  };
};

const requestManualLocation = (): Record<string, unknown> | null => {
  if (typeof window === 'undefined') return null;
  const response = window.prompt('Introduce tus coordenadas como lat,lng', '');
  if (!response) return null;

  const [latRaw, lngRaw] = response.split(',').map((part) => part.trim());
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    toast.warning('Coordenadas manuales invalidas; se registro la sesion sin ubicacion.');
    return null;
  }

  return asLocationPayload({
    lat,
    lng,
    source: 'manual',
    note: 'manual-entry',
  });
};

const asLocationLabelPayload = (label: string): Record<string, unknown> => ({
  label,
  source: 'task',
  collected_at: new Date().toISOString(),
});

const resolveLocation = async (
  manual?: ManualLocation | null,
  fallbackLabel?: string | null
): Promise<Record<string, unknown> | null> => {
  if (manual) {
    return asLocationPayload({ ...manual, source: manual.source ?? 'manual' });
  }

  const fallbackPayload = typeof fallbackLabel === 'string' && fallbackLabel.trim().length > 0
    ? asLocationLabelPayload(fallbackLabel)
    : null;

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return fallbackPayload ?? requestManualLocation();
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          source: 'geolocation',
          collected_at: new Date(position.timestamp || Date.now()).toISOString(),
        });
      },
      () => {
        if (fallbackPayload) {
          resolve(fallbackPayload);
          return;
        }
        resolve(requestManualLocation());
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60_000 }
    );
  });
};

const collectDeviceInfo = (): Record<string, unknown> => {
  if (typeof navigator === 'undefined') {
    return {};
  }

  const { userAgent, platform, language, vendor, onLine } = navigator;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const screenInfo =
    typeof window !== 'undefined' && window.screen
      ? { width: window.screen.width, height: window.screen.height }
      : null;

  return {
    userAgent,
    platform,
    language,
    vendor,
    onLine,
    timezone,
    screen: screenInfo,
  };
};

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
};

export const useWorkSession = ({ profileId, taskId, task }: UseWorkSessionParams = {}) => {
  const queryClient = useQueryClient();
  const taskLocation = useMemo(() => normalizeTaskLocation(task), [task]);

  const sessionQuery = useQuery<WorkSession | null>({
    queryKey: sessionQueryKey(profileId),
    enabled: Boolean(profileId),
    staleTime: 15_000,
    refetchInterval: (query) => (query.state.data && (query.state.data as any).status === 'active' ? 30_000 : false),
    queryFn: async () => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('profile_id', profileId)
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      const session = Array.isArray(data) ? (data[0] as WorkSession | undefined) : null;
      return session ?? null;
    },
  });

  const sessionData = sessionQuery.data ?? null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sessionData || sessionData.status !== 'active') return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [sessionData]);

  const durationMs = useMemo(() => {
    const session = sessionData;
    if (!session) return 0;
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date(now);
    return differenceInMilliseconds(end, start);
  }, [sessionData, now]);

  const durationLabel = useMemo(() => formatDuration(durationMs), [durationMs]);

  const stateLabel = useMemo(() => {
    const session = sessionData;
    if (!session) return 'Sin sesion activa';
    if (session.status === 'active') return 'En turno';
    if (session.status === 'completed') return 'Realizado';
    return session.status || 'Sesion sin estado';
  }, [sessionData]);

  const lastEventLabel = useMemo(() => {
    const session = sessionData;
    if (!session) return 'Sin registros';
    if (session.status === 'active') {
      return `Iniciada ${formatDistanceToNow(new Date(session.started_at), { addSuffix: true, locale: es })}`;
    }
    if (session.ended_at) {
      return `Finalizada ${formatDistanceToNow(new Date(session.ended_at), { addSuffix: true, locale: es })}`;
    }
    return 'Sesion sin informacion de cierre';
  }, [sessionData]);

  const invalidateRelatedQueries = useCallback(() => {
    if (profileId) {
      queryClient.invalidateQueries({ queryKey: sessionQueryKey(profileId) });
    }
    queryClient.invalidateQueries({ queryKey: ['work_sessions'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false });
  }, [profileId, queryClient]);

  const startMutation = useMutation({
    mutationFn: async (options: StartSessionOptions = {}) => {
      if (!profileId) throw new Error('Perfil no disponible');

      const locationPayload = await resolveLocation(
        options.manualLocation,
        options.taskLocation ?? taskLocation
      );
      const deviceInfo = collectDeviceInfo();

      const { data, error } = await supabase.rpc('start_work_session', {
        p_profile_id: profileId,
        p_task_id: options.taskId ?? taskId ?? null,
        p_start_location: locationPayload,
        p_device_info: Object.keys(deviceInfo).length ? deviceInfo : null,
        p_metadata: options.metadata ?? null,
      });

      if (error) throw error;
      const session = Array.isArray(data) ? (data[0] as WorkSession | undefined) : null;
      return session ?? null;
    },
    onSuccess: () => {
      toast.success('Sesion iniciada');
      invalidateRelatedQueries();
    },
    onError: (error: unknown) => {
      console.error('Error starting work session', error);
      toast.error('No se pudo iniciar la sesion');
    },
  });

  const endMutation = useMutation({
    mutationFn: async (options: EndSessionOptions = {}) => {
      const sessionId = options.sessionId ?? sessionData?.id;
      if (!sessionId) throw new Error('No hay sesion activa para cerrar');

      const locationPayload = await resolveLocation(
        options.manualLocation,
        options.taskLocation ?? taskLocation
      );

      const { data, error } = await supabase.rpc('end_work_session', {
        p_session_id: sessionId,
        p_profile_id: profileId ?? null,
        p_end_location: locationPayload,
        p_status: options.status ?? 'completed',
        p_metadata: options.metadata ?? null,
      });

      if (error) throw error;
      return data as WorkSession;
    },
    onSuccess: () => {
      toast.success('Sesion finalizada');
      invalidateRelatedQueries();
    },
    onError: (error: unknown) => {
      console.error('Error ending work session', error);
      toast.error('No se pudo finalizar la sesion');
    },
  });

  const startSession = useCallback(
    (options?: StartSessionOptions) => startMutation.mutateAsync(options),
    [startMutation]
  );

  const endSession = useCallback(
    (options?: EndSessionOptions) => endMutation.mutateAsync(options),
    [endMutation]
  );

  return {
    session: sessionData,
    isLoading: sessionQuery.isLoading,
    isFetching: sessionQuery.isFetching,
    startSession,
    endSession,
    isStarting: startMutation.isPending,
    isEnding: endMutation.isPending,
    durationLabel,
    stateLabel,
    lastEventLabel,
    isActive: sessionData?.status === 'active',
    error: sessionQuery.error ?? startMutation.error ?? endMutation.error ?? null,
    refetch: sessionQuery.refetch,
  };
};
