import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  DetailedTask,
  TaskFilters,
  SortOption,
  PaginationOptions,
  TaskFormData,
  Database
} from '@/integrations/supabase/client';

type TemplateFieldDefinition = {
  name?: string | null;
  label?: string | null;
  type?: string | null;
};

export type DashboardTemplateFieldMap = Record<string, TemplateFieldDefinition[]>;

interface UseDetailedTasksOptions {
  filters?: TaskFilters;
  sort?: SortOption;
  pagination?: PaginationOptions;
  autoRefresh?: boolean;
}

export function useDetailedTasks(options: UseDetailedTasksOptions = {}) {
  const [tasks, setTasks] = useState<DetailedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const {
    filters = {},
    sort = { field: 'start_date', direction: 'asc' },
    pagination = { page: 1, pageSize: 25 },
    autoRefresh = false
  } = options;

  const buildQuery = () => {
    let query = supabase
      .from('detailed_tasks')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters.state && filters.state.length > 0) {
      query = query.in('state', filters.state);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.screen_group && filters.screen_group.length > 0) {
      query = query.in('screen_group', filters.screen_group);
    }

    if (filters.responsible_profile_id && filters.responsible_profile_id.length > 0) {
      query = query.in('responsible_profile_id', filters.responsible_profile_id);
    }

    if (filters.date_from) {
      query = query.gte('start_date', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('start_date', filters.date_to);
    }

    if (filters.search) {
      query = query.or(`client.ilike.%${filters.search}%,address.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Aplicar ordenamiento
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });

    // Aplicar paginación
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;
    query = query.range(from, to);

    return query;
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const query = buildQuery();
      const { data, error, count: totalCount } = await query;

      if (error) {
        throw error;
      }

      setTasks(data || []);
      setCount(totalCount || 0);
    } catch (err) {
      console.error('Error fetching detailed tasks:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: TaskFormData) => {
    try {
      const { data, error } = await supabase.rpc('upsert_task', {
        p_screen_id: taskData.screen_id,
        p_data: taskData.data || {},
        p_state: taskData.state || 'pendiente',
        p_status: taskData.status || 'pendiente',
        p_start_date: taskData.start_date,
        p_end_date: taskData.end_date,
        p_location: taskData.location,
        p_responsible_profile_id: taskData.responsible_profile_id,
        p_assigned_to: taskData.assigned_to,
        p_assigned_profiles: taskData.assigned_profiles || [],
        p_assigned_vehicles: taskData.assigned_vehicles || []
      });

      if (error) {
        throw error;
      }

      // Refrescar la lista
      await fetchTasks();
      return data;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const updateTask = async (taskId: string, taskData: TaskFormData) => {
    try {
      const { data, error } = await supabase.rpc('upsert_task', {
        p_task_id: taskId,
        p_screen_id: taskData.screen_id,
        p_data: taskData.data || {},
        p_state: taskData.state || 'pendiente',
        p_status: taskData.status || 'pendiente',
        p_start_date: taskData.start_date,
        p_end_date: taskData.end_date,
        p_location: taskData.location,
        p_responsible_profile_id: taskData.responsible_profile_id,
        p_assigned_to: taskData.assigned_to,
        p_assigned_profiles: taskData.assigned_profiles || [],
        p_assigned_vehicles: taskData.assigned_vehicles || []
      });

      if (error) {
        throw error;
      }

      // Refrescar la lista
      await fetchTasks();
      return data;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('screen_data')
        .delete()
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      // Refrescar la lista
      await fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const completeTask = async (taskId: string, nextScreenId?: string) => {
    try {
      // Intentar obtener la tarea desde el estado local (vista detailed_tasks)
      let task = tasks.find(t => t.id === taskId) as any | undefined;

      // Si no está en memoria, obtenerla desde la vista
      if (!task) {
        const { data, error } = await supabase
          .from('detailed_tasks')
          .select('*')
          .eq('id', taskId)
          .single();
        if (error) throw error;
        task = data as any;
      }

      // Preparar asignaciones para el archivado
      const assignedUsers = Array.isArray(task?.assigned_profiles)
        ? task.assigned_profiles.map((p: any) => ({ id: p.id, full_name: p.full_name, email: p.email }))
        : [];
      const assignedVehicles = Array.isArray(task?.assigned_vehicles)
        ? task.assigned_vehicles.map((v: any) => ({ id: v.id, name: v.name, type: v.type }))
        : [];

      // Archivar la tarea con datos reales
      const { error: archiveError } = await supabase
        .from('archived_tasks')
        .insert({
          archived_at: new Date().toISOString(),
          data: task?.data || {},
          status: 'acabado',
          state: 'terminado',
          start_date: task?.start_date || null,
          end_date: task?.end_date || null,
          location: task?.location || null,
          responsible_profile_id: task?.responsible_profile_id || null,
          responsible_name: task?.responsible_name || null,
          assigned_users: assignedUsers,
          assigned_vehicles: assignedVehicles,
        });

      if (archiveError) {
        throw archiveError;
      }

      // Si hay next_screen_id, copiar a nueva pantalla con estado reiniciado
      if (nextScreenId && task) {
        await createTask({
          screen_id: nextScreenId,
          data: task.data || {},
          state: 'pendiente',
          status: 'pendiente',
          start_date: task.start_date || null,
          end_date: task.end_date || null,
          location: task.location || null,
          responsible_profile_id: task.responsible_profile_id || null,
          assigned_to: task.assigned_to || null,
          assigned_profiles: Array.isArray(task.assigned_profiles) ? task.assigned_profiles.map((p: any) => p.id) : [],
          assigned_vehicles: Array.isArray(task.assigned_vehicles) ? task.assigned_vehicles.map((v: any) => v.id) : [],
        });
      }

      // Eliminar tarea original de la tabla principal
      await deleteTask(taskId);
    } catch (err) {
      console.error('Error completing task:', err);
      throw err;
    }
  };

  const generateCheckinToken = async (taskId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_checkin_token', {
        p_task_id: taskId
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error generating checkin token:', err);
      throw err;
    }
  };

  // Fetch inicial
  useEffect(() => {
    fetchTasks();
  }, [filters, sort, pagination]);

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTasks();
    }, 30000); // Refrescar cada 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, filters, sort, pagination]);

  return {
    tasks,
    loading,
    error,
    count,
    totalPages: Math.ceil(count / pagination.pageSize),
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    generateCheckinToken
  };
}

// Hook específico para tareas del dashboard
export function useDashboardTasks() {
  const [confeccionTasks, setConfeccionTasks] = useState<DetailedTask[]>([]);
  const [tapiceriaTasks, setTapiceriaTasks] = useState<DetailedTask[]>([]);
  const [pendingTasks, setPendingTasks] = useState<DetailedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateFieldsByScreen, setTemplateFieldsByScreen] = useState<DashboardTemplateFieldMap>({});

  const fetchDashboardTasks = useCallback(async () => {
    try {
      setLoading(true);

      const { data: dashboardScreens, error: dashboardError } = await supabase
        .from('screens')
        .select('id, dashboard_section, dashboard_order, template_id')
        .eq('is_active', true)
        .in('dashboard_section', ['confeccion', 'tapiceria', 'pendientes']);

      if (dashboardError) throw dashboardError;

      const templateIds = new Set<string>();
      (dashboardScreens ?? []).forEach((screen) => {
        if (screen.template_id) {
          templateIds.add(screen.template_id);
        }
      });

      let templateMapById = new Map<string, TemplateFieldDefinition[]>();
      if (templateIds.size > 0) {
        const { data: templatesData, error: templatesError } = await supabase
          .from('templates')
          .select('id, fields')
          .in('id', Array.from(templateIds));

        if (templatesError) throw templatesError;

        templateMapById = new Map(
          (templatesData ?? []).map((template) => {
            const fields = Array.isArray(template.fields) ? template.fields : [];
            return [template.id, fields as TemplateFieldDefinition[]];
          })
        );
      }

      const templateFieldsMapByScreen: DashboardTemplateFieldMap = {};

      const sectionMap: Record<'confeccion' | 'tapiceria' | 'pendientes', string[]> = {
        confeccion: [],
        tapiceria: [],
        pendientes: [],
      };

      (dashboardScreens ?? []).forEach((screen) => {
        const section = screen.dashboard_section as 'confeccion' | 'tapiceria' | 'pendientes' | null;
        if (section && sectionMap[section]) {
          sectionMap[section].push(screen.id);
        }

        const fields = screen.template_id ? (templateMapById.get(screen.template_id) ?? []) : [];
        templateFieldsMapByScreen[screen.id] = fields;
      });

      setTemplateFieldsByScreen(templateFieldsMapByScreen);

      const fetchSectionTasks = async (
        section: 'confeccion' | 'tapiceria' | 'pendientes',
        fallbackGroups: string[],
        limit: number | null
      ) => {
        let query = supabase
          .from('detailed_tasks')
          .select('*')
          .neq('state', 'terminado')
          .order('is_urgent', { ascending: false })
          .order('start_date', { ascending: true, nullsFirst: true });

        const screenIds = sectionMap[section];
        if (screenIds.length > 0) {
          query = query.in('screen_id', screenIds);
        } else if (fallbackGroups.length > 0) {
          query = query.in('screen_group', fallbackGroups);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      };

      const [confeccionData, tapiceriaData, pendingData] = await Promise.all([
        fetchSectionTasks('confeccion', ['Confección', 'Confeccion'], 4),
        fetchSectionTasks('tapiceria', ['Tapicería', 'Tapiceria'], 4),
        fetchSectionTasks('pendientes', [], null),
      ]);

      setConfeccionTasks(confeccionData);
      setTapiceriaTasks(tapiceriaData);
      setPendingTasks(pendingData);
    } catch (err) {
      console.error('Error fetching dashboard tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardTasks();
    const interval = setInterval(fetchDashboardTasks, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardTasks]);

  return {
    confeccionTasks,
    tapiceriaTasks,
    pendingTasks,
    loading,
    templateFieldsByScreen,
    refresh: fetchDashboardTasks,
  };
}

// Hook para estadísticas del dashboard
export function useDashboardStats(dateFrom?: string, dateTo?: string) {
  const [stats, setStats] = useState<Database['public']['Functions']['get_dashboard_stats']['Returns'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_dashboard_stats', {
          p_date_from: dateFrom,
          p_date_to: dateTo
        });

        if (error) {
          throw error;
        }

        const normalized: Database['public']['Functions']['get_dashboard_stats']['Returns'] | null = Array.isArray(data)
          ? (data[0] ?? null)
          : (data as Database['public']['Functions']['get_dashboard_stats']['Returns'] | null);
        setStats(normalized);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refrescar cada 5 minutos
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, [dateFrom, dateTo]);

  return { stats, loading };
}
