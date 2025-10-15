import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Vehicle, Task } from '@/types';
import dayjs from 'dayjs';
import { toast } from 'sonner';

// --- GESTIÓN DE PERFILES, USUARIOS Y VEHÍCULOS ---

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profileData, error } = await supabase.from('profiles').select('*').eq('auth_user_id', user.id).single();
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('No profile found for user');
          return null;
        }
        // Si hay un error 500 o cualquier otro, devolver null en lugar de lanzar error
        console.error('Error fetching profile:', error);
        return null;
      }
      return profileData as Profile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Deshabilitar reintentos para evitar bucles infinitos
    retryDelay: 1000,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Partial<Profile> & { id: string }) => {
      const updates: Record<string, unknown> = {};
      if (profile.full_name !== undefined) updates.full_name = profile.full_name;
      if (profile.phone !== undefined) updates.phone = profile.phone;
      if (profile.role !== undefined) updates.role = profile.role;
      if ('avatar_url' in profile) updates.avatar_url = profile.avatar_url ?? null;

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado.");
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(`Error al actualizar: ${error.message}`)
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*, user_availability(*)').order('full_name');
      if (error) throw error;
      const today = dayjs();
      return (data as Profile[]).map(p => {
        const availability = p.user_availability || [];
        const onLeave = availability.find(a => today.isAfter(dayjs(a.start_date).subtract(1, 'day')) && today.isBefore(dayjs(a.end_date).add(1, 'day')));
        const status = onLeave ? onLeave.reason : 'activo';
        return { ...p, status } as Profile;
      });
    },
  });
};

export const useVehicles = () => {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').order('name');
      if (error) throw error;
      return data as Vehicle[];
    },
  });
};

// --- GESTIÓN DE TAREAS (Planning) ---

export const useTasksByDate = (date: Date) => {
    const dateString = dayjs(date).format('YYYY-MM-DD');
    return useQuery({
        queryKey: ['tasks', dateString],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('screen_data')
                .select(`
                    *,
                    responsible:responsible_profile_id(id, full_name, status),
                    assigned_users:task_profiles(profiles(id, full_name, status)),
                    assigned_vehicles:task_vehicles(vehicles(id, name, type))
                `)
                .lte('start_date', dateString)
                .gte('end_date', dateString)
                .order('order');

            if (error) throw error;
            
            type RawTask = Partial<Task> & {
                assigned_users?: Array<{ profiles: Profile }>;
                assigned_vehicles?: Array<{ vehicles: Vehicle }>;
            };

            const formattedTasks = (data as any[] || []).map((task: any) => ({
                ...task,
                site: task.data?.site || 'N/A',
                description: task.data?.description || 'N/A',
                assigned_users: (task.assigned_users || []).map((tp) => tp.profiles).filter(Boolean),
                assigned_vehicles: (task.assigned_vehicles || []).map((tv) => tv.vehicles).filter(Boolean),
            }));

            // Ordenar: primero urgentes, luego por fecha de finalización más próxima
            formattedTasks.sort((a, b) => {
                // Urgentes primero
                if (a.state === 'urgente' && b.state !== 'urgente') return -1;
                if (a.state !== 'urgente' && b.state === 'urgente') return 1;

                // Luego por fecha de finalización
                const dateA = new Date(a.end_date || '9999-12-31');
                const dateB = new Date(b.end_date || '9999-12-31');
                return dateA.getTime() - dateB.getTime();
            });

            return formattedTasks as Task[];
        },
        enabled: !!date,
    });
};

export const useUpsertTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { task_id_in: string | null; start_date_in: string; end_date_in: string; site_in: string; description_in: string; location_in: string; responsible_id_in: string | null; user_ids: string[]; vehicle_ids: string[]; }) => {
      const { error } = await supabase.rpc('upsert_task', {
        p_task_id: variables.task_id_in,
        p_screen_id: 'installations-screen-id', // This needs to be determined - placeholder for now
        p_data: {
          site: variables.site_in,
          description: variables.description_in,
        },
        p_state: 'pendiente',
        p_status: 'pendiente',
        p_start_date: variables.start_date_in,
        p_end_date: variables.end_date_in,
        p_location: variables.location_in,
        p_responsible_profile_id: variables.responsible_id_in,
        p_assigned_to: null,
        p_assigned_profiles: variables.user_ids,
        p_assigned_vehicles: variables.vehicle_ids,
      });
      if (error) throw error;
      return variables;
    },
    onSuccess: (data) => {
      toast.success(`Tarea ${data.task_id_in ? 'actualizada' : 'creada'} correctamente.`);
      // Invalidar queries para el rango de fechas afectado para refrescar la vista
      let currentDate = dayjs(data.start_date_in);
      const endDate = dayjs(data.end_date_in);
      while(currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        queryClient.invalidateQueries({ queryKey: ['tasks', currentDate.format('YYYY-MM-DD')] });
        currentDate = currentDate.add(1, 'day');
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
    },
    onError: (error) => toast.error(`Error al guardar la tarea: ${error.message}`)
  });
};

export const useUpdateTaskOrder = (date: Date | undefined) => {
    const queryClient = useQueryClient();
    const dateString = dayjs(date).format('YYYY-MM-DD');
    return useMutation({
        mutationFn: async (orderedTasks: Task[]) => {
            const updates = orderedTasks.map((task, index) => 
                supabase.from('screen_data').update({ order: index }).eq('id', task.id)
            );
            const results = await Promise.all(updates);
            results.forEach(res => { if(res.error) throw res.error });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', dateString] });
            toast.success('Orden de tareas actualizado.');
        },
        onError: () => toast.error('No se pudo actualizar el orden.')
    });
};

export const useAssignToTask = (date: Date | undefined) => {
    const queryClient = useQueryClient();
    const dateString = dayjs(date).format('YYYY-MM-DD');
    return useMutation({
        mutationFn: async ({ taskId, itemId, type }: { taskId: string, itemId: string, type: 'user' | 'vehicle' }) => {
            let result;
            if (type === 'user') {
                result = await supabase.from('task_profiles').upsert({ task_id: taskId, profile_id: itemId });
            } else {
                result = await supabase.from('task_vehicles').upsert({ task_id: taskId, vehicle_id: itemId });
            }
            // Ignorar error de duplicado (23505), que es esperado si ya existe la asignación.
            if (result.error && result.error.code !== '23505') throw result.error;
            return { type };
        },
        onSuccess: ({ type }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', dateString] });
            toast.success(`${type === 'user' ? 'Operario' : 'Vehículo'} asignado.`);
        },
        onError: (error: Error, variables) => toast.error(`Error al asignar ${variables.type === 'user' ? 'operario' : 'vehículo'}: ${error.message}`)
    });
};

export const useUpdateTaskState = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ taskId, state }: { taskId: string, state: Task['state'] }) => {
            const { error } = await supabase.from('screen_data').update({ state }).eq('id', taskId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Estado de la tarea actualizado.");
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
        },
        onError: (error) => toast.error(`Error al actualizar estado: ${error.message}`)
    });
};

export const useArchiveTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase.rpc('archive_task', { task_id_to_archive: taskId });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Tarea archivada correctamente.");
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['archived_tasks'] });
        },
        onError: (error) => toast.error(`Error al archivar la tarea: ${error.message}`)
    });
};

export const useCreateSharedPlan = () => {
    return useMutation({
        mutationFn: async (planDate: Date) => {
            const dateString = dayjs(planDate).format('YYYY-MM-DD');
            const { data, error } = await supabase.from('shared_plans').insert({ plan_date: dateString }).select('access_token').single();
            if (error) throw error;
            return data.access_token;
        },
        onSuccess: (token) => {
            const url = `${window.location.origin}/share/plan/${token}`;
            navigator.clipboard.writeText(url);
            toast.success("Enlace para compartir copiado al portapapeles.");
        },
        onError: (error) => toast.error(`Error al crear el enlace: ${error.message}`)
    });
};


// --- GESTIÓN DE DATOS (DataManagement) ---

export const useScreens = () => {
  return useQuery({
    queryKey: ['screens'],
    queryFn: async () => {
      const { data, error } = await supabase.from("screens").select("*");
      if (error) throw error;
      return data || [];
    },
  });
};

export const useScreenData = (screenId: string | null) => {
  return useQuery({
    queryKey: ['screen_data', screenId],
    queryFn: async () => {
      if (!screenId) {
        return { dataList: [], templateFields: [], screen: null };
      }

      const [
        { data: screen, error: screenError },
        { data: dataRows, error: dataError },
      ] = await Promise.all([
        supabase
          .from("screens")
          .select("id, name, header_color, screen_group, screen_type, template_id, next_screen_id, templates(name, fields)")
          .eq("id", screenId)
          .maybeSingle(),
        supabase
          .from("screen_data")
          .select("*")
          .eq("screen_id", screenId)
          .order("created_at", { ascending: false }),
      ]);

      if (screenError) throw screenError;
      if (dataError) throw dataError;

      const templateFields = Array.isArray(screen?.templates?.fields)
        ? screen.templates.fields
        : [];

      return {
        dataList: dataRows || [],
        templateFields,
        screen,
      };
    },
    enabled: !!screenId,
  });
};

export const useUpdateScreenData = (screenId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, updateData }: { itemId: string, updateData: Partial<Task> }) => {
      const { error } = await supabase.from("screen_data").update(updateData).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro actualizado.");
      queryClient.invalidateQueries({ queryKey: ['screen_data', screenId] });
    },
    onError: () => toast.error("Error al actualizar el registro.")
  });
};

export const useDeleteScreenData = (screenId: string | null) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("screen_data").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Registro eliminado.");
            queryClient.invalidateQueries({ queryKey: ['screen_data', screenId] });
        },
        onError: () => toast.error("Error al eliminar el registro.")
    });
};

export const useCreateScreenData = (screenId: string | null) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newRowData: Record<string, string | number | null>) => {
            const { error } = await supabase.from("screen_data").insert({ screen_id: screenId, data: newRowData, state: 'pendiente' });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Nuevo registro guardado.");
            queryClient.invalidateQueries({ queryKey: ['screen_data', screenId] });
        },
        onError: () => toast.error("Error al guardar el nuevo registro.")
    });
};
