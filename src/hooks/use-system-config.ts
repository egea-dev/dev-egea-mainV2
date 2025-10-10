import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SystemConfig = {
  id: string;
  key: string;
  value: any;
  description?: string;
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
      return data as SystemConfig[];
    },
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data, error } = await supabase
        .from('system_config')
        .update({ value })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuración actualizada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar configuración');
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuración creada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear configuración');
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
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar configuración');
    },
  });
}
