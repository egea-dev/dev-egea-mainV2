import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  DetailedTask,
  TaskFilters,
  SortOption,
  PaginationOptions,
  TaskFormData,
  Database
} from '@/integrations/supabase/client';

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
      // Primero archivar la tarea
      const { error: archiveError } = await supabase
        .from('archived_tasks')
        .insert({
          id: taskId,
          archived_at: new Date().toISOString(),
          data: {},
          status: 'acabado',
          state: 'terminado',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          location: '',
          responsible_profile_id: null,
          responsible_name: '',
          assigned_users: [],
          assigned_vehicles: []
        });

      if (archiveError) {
        throw archiveError;
      }

      // Si hay next_screen_id, copiar a nueva pantalla
      if (nextScreenId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          await createTask({
            screen_id: nextScreenId,
            data: task.data,
            state: 'pendiente',
            status: 'pendiente',
            start_date: task.start_date,
            end_date: task.end_date,
            location: task.location,
            responsible_profile_id: task.responsible_profile_id,
            assigned_to: task.assigned_to,
            assigned_profiles: task.assigned_profiles?.map((p: { id: string }) => p.id) || [],
            assigned_vehicles: task.assigned_vehicles?.map((v: { id: string }) => v.id) || []
          });
        }
      }

      // Eliminar tarea original
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

  useEffect(() => {
    const fetchDashboardTasks = async () => {
      try {
        setLoading(true);

        // Tareas de Confección (4 más próximas)
        const { data: confeccionData } = await supabase
          .from('detailed_tasks')
          .select('*')
          .eq('screen_group', 'Confección')
          .neq('state', 'terminado')
          .order('is_urgent', { ascending: false })
          .order('start_date', { ascending: true })
          .limit(4);

        // Tareas de Tapicería (4 más próximas)
        const { data: tapiceriaData } = await supabase
          .from('detailed_tasks')
          .select('*')
          .eq('screen_group', 'Tapicería')
          .neq('state', 'terminado')
          .order('is_urgent', { ascending: false })
          .order('start_date', { ascending: true })
          .limit(4);

        // Tareas pendientes de todos los grupos (semáforos)
        const { data: pendingData } = await supabase
          .from('detailed_tasks')
          .select('*')
          .neq('state', 'terminado')
          .order('is_urgent', { ascending: false })
          .order('start_date', { ascending: true })
          .limit(20);

        setConfeccionTasks(confeccionData || []);
        setTapiceriaTasks(tapiceriaData || []);
        setPendingTasks(pendingData || []);
      } catch (err) {
        console.error('Error fetching dashboard tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardTasks();

    // Refrescar cada minuto
    const interval = setInterval(fetchDashboardTasks, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    confeccionTasks,
    tapiceriaTasks,
    pendingTasks,
    loading
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

        setStats(data);
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