import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { JsonValue } from '@/integrations/supabase/types';

export type SystemConfig = {
  id: string;
  key: string;
  value: JsonValue | null;
  description?: string | null;
  category: string;
  created_at: string;
  updated_at: string;
};

export function useSystemConfig() {
  return useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;
      const records = (data ?? []) as SystemConfig[];
      return records;
    },
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: JsonValue | null }) => {
      const { data, error } = await supabase
        .from('system_config')
        .update({ value })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data as SystemConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuración actualizada correctamente');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al actualizar configuración';
      toast.error(message);
    },
  });
}

export function useCreateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Omit<SystemConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('system_config')
        .insert(config)
        .select()
        .single();

      if (error) throw error;
      return data as SystemConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuración creada correctamente');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al crear configuración';
      toast.error(message);
    },
  });
}

export function useDeleteSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from('system_config')
        .delete()
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuración eliminada correctamente');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al eliminar configuración';
      toast.error(message);
    },
  });
}
