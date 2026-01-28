import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Task, Vehicle } from '@/types';
import type { JsonObject, Screen } from '@/integrations/supabase/types';
import { format, isAfter, isBefore, addDays, subDays, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { upsertTask } from '@/lib/upsert-task';

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
      if (profile.status !== undefined) updates.status = profile.status;
      if ('avatar_url' in profile) updates.avatar_url = profile.avatar_url ?? null;

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado.");
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al actualizar';
      toast.error(`Error al actualizar: ${message}`);
    }
  });
};

type ProfileAvailability = {
  start_date: string;
  end_date: string;
  reason?: string | null;
};

type ProfileRow = Profile & {
  user_availability?: ProfileAvailability[] | null;
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch profiles and availability
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, user_availability(*)')
        .order('full_name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      // NOTA: user_workload_stats comentado porque la tabla no existe
      // const { data: stats, error: statsError } = await (supabase as any)
      //   .from('user_workload_stats')
      //   .select('*');
      // if (statsError) {
      //   console.warn('Error fetching workload stats:', statsError);
      // }

      const today = new Date();
      const statsMap = new Map(); // Sin stats por ahora

      return (profiles ?? []).map((profileRow: any) => {
        const row = profileRow as ProfileRow;
        const availability = Array.isArray(row.user_availability) ? row.user_availability : [];
        const onLeave = availability.find((entry) => {
          const start = startOfDay(new Date(entry.start_date));
          const end = startOfDay(new Date(entry.end_date));
          const now = startOfDay(today);
          return (isAfter(now, subDays(start, 1)) && isBefore(now, addDays(end, 1)));
        });
        const status = onLeave?.reason ?? (profileRow.status || 'activo');

        const active_tasks_count = statsMap.get(profileRow.id) || 0;

        return { ...row, status, active_tasks_count } as Profile;
      });
    },
  });
};

export const useVehicles = () => {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').order('name');
      if (error) {
        console.error('Error fetching vehicles:', error);
        return [];
      }
      return (data ?? []) as Vehicle[];
    },
  });
};

// --- GESTIÓN DE TAREAS (Planning) ---

export const useTasksByDate = (date: Date) => {
  const dateString = format(date, 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['tasks', dateString],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detailed_tasks')
        .select('*')
        .lte('start_date', dateString)
        .gte('end_date', dateString);

      if (error) throw error;

      const rows = (data ?? []) as any[];
      const formattedTasks = rows.map((task) => {
        const normalized: Task = {
          ...task,
          site: task.site || task.data?.site || 'N/A',
          description: task.description || task.data?.description || 'N/A',
          responsible: task.responsible_name ? {
            id: task.responsible_profile_id,
            full_name: task.responsible_name,
            status: 'activo'
          } : null,
          assigned_users: Array.isArray(task.assigned_profiles) ? task.assigned_profiles : [],
          assigned_vehicles: Array.isArray(task.assigned_vehicles) ? task.assigned_vehicles : [],
        };

        return normalized;
      });

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

      return formattedTasks;
    },
    enabled: !!date,
  });
};

export const useUpsertTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      task_id_in: string | null;
      screen_id?: string;
      start_date_in: string;
      end_date_in: string;
      site_in: string;
      description_in: string;
      location_in: string;
      responsible_id_in: string | null;
      user_ids: string[];
      vehicle_ids: string[];
      work_site_id_in?: string | null;
      location_metadata_in?: Record<string, unknown>;
    }) => {
      const screenId = variables.screen_id ?? "installations-screen-id";
      await upsertTask(supabase, {
        taskId: variables.task_id_in ?? undefined,
        screenId,
        data: {
          site: variables.site_in,
          description: variables.description_in,
        },
        state: "pendiente",
        status: "pendiente",
        startDate: variables.start_date_in,
        endDate: variables.end_date_in,
        location: variables.location_in,
        locationMetadata:
          variables.location_metadata_in ?? (variables.location_in ? { manual_label: variables.location_in } : {}),
        workSiteId: variables.work_site_id_in ?? null,
        responsibleProfileId: variables.responsible_id_in ?? null,
        assignedTo: null,
        assignedProfiles: variables.user_ids,
        assignedVehicles: variables.vehicle_ids,
      });
      return variables;
    },
    onSuccess: (data) => {
      toast.success(`Tarea ${data.task_id_in ? 'actualizada' : 'creada'} correctamente.`);
      // Invalidar queries para el rango de fechas afectado para refrescar la vista
      let currentDate = new Date(data.start_date_in);
      const endDate = new Date(data.end_date_in);
      while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
        queryClient.invalidateQueries({ queryKey: ['tasks', format(currentDate, 'yyyy-MM-dd')] });
        currentDate = addDays(currentDate, 1);
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error desconocido al guardar la tarea';
      toast.error(`Error al guardar la tarea: ${message}`);
    }
  });
};

export const useUpdateTaskOrder = (date: Date | undefined) => {
  const queryClient = useQueryClient();
  const dateString = date ? format(date, 'yyyy-MM-dd') : '';
  return useMutation({
    mutationFn: async (orderedTasks: Task[]) => {
      const updates = orderedTasks.map((task, index) =>
        supabase.from('screen_data').update({ order: index }).eq('id', task.id)
      );
      const results = await Promise.all(updates);
      results.forEach((res) => { if (res.error) throw res.error; });
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
  const dateString = date ? format(date, 'yyyy-MM-dd') : '';
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
    onError: (error: unknown, variables) => {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al asignar ${variables.type === 'user' ? 'operario' : 'vehículo'}: ${message}`);
    }
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
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al actualizar estado';
      toast.error(`Error al actualizar estado: ${message}`);
    }
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
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['archived_tasks'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al archivar la tarea';
      toast.error(`Error al archivar la tarea: ${message}`);
    }
  });
};

export const useCreateSharedPlan = () => {
  return useMutation({
    mutationFn: async (planDate: Date) => {
      const dateString = format(planDate, 'yyyy-MM-dd');
      const { data, error } = await supabase.from('shared_plans').insert({ plan_date: dateString }).select('access_token').single();
      if (error) throw error;
      return data.access_token;
    },
    onSuccess: (token) => {
      const url = `${window.location.origin}/share/plan/${token}`;
      navigator.clipboard.writeText(url);
      toast.success("Enlace para compartir copiado al portapapeles.");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al crear el enlace';
      toast.error(`Error al crear el enlace: ${message}`);
    }
  });
};


// --- GESTIÓN DE DATOS (DataManagement) ---

export const useScreens = () => {
  return useQuery({
    queryKey: ['screens'],
    queryFn: async () => {
      const { data, error } = await supabase.from("screens").select("*");
      if (error) throw error;
      return (data || []) as Screen[];
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
          .select("id, name, header_color, screen_group, screen_type, template_id, next_screen_id, dashboard_section, dashboard_order, templates(name, fields)")
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
    mutationFn: async (newRowData: JsonObject) => {
      if (!screenId) {
        throw new Error('No se puede crear un registro sin pantalla asociada');
      }

      const { error } = await supabase
        .from('screen_data')
        .insert({
          screen_id: screenId,
          data: newRowData,
          state: 'pendiente'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nuevo registro guardado.");
      queryClient.invalidateQueries({ queryKey: ['screen_data', screenId] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al guardar el nuevo registro';
      toast.error(`Error al guardar el nuevo registro: ${message}`);
    }
  });
};

