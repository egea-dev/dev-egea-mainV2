import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  DetailedTask,
  TaskFilters,
  SortOption,
  PaginationOptions,
  TaskFormData,
  Database,
  Screen
} from '@/integrations/supabase/client';
import { upsertTask } from '@/lib/upsert-task';

type TemplateFieldDefinition = {
  name?: string | null;
  label?: string | null;
  type?: string | null;
};

export type DashboardTemplateFieldMap = Record<string, TemplateFieldDefinition[]>;

export type DashboardTaskSessionInfo = {
  lastArrival?: string | null;
  lastDeparture?: string | null;
  active: boolean;
};

type AssignedProfileRecord = {
  id: string;
  full_name: string;
  email?: string | null;
};

type AssignedVehicleRecord = {
  id: string;
  name: string;
  type?: string | null;
};

const normalizeAssignedProfiles = (value: unknown): AssignedProfileRecord[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : null;
      const fullName = typeof record.full_name === 'string' ? record.full_name : null;
      if (!id || !fullName) return null;
      return {
        id,
        full_name: fullName,
        email: typeof record.email === 'string' ? record.email : null,
      };
    })
    .filter((profile): profile is AssignedProfileRecord & { email: string | null } => profile !== null);
};

const normalizeAssignedVehicles = (value: unknown): AssignedVehicleRecord[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : null;
      const name = typeof record.name === 'string' ? record.name : null;
      if (!id || !name) return null;
      return {
        id,
        name,
        type: typeof record.type === 'string' ? record.type : null,
      };
    })
    .filter((vehicle): vehicle is AssignedVehicleRecord & { type: string | null } => vehicle !== null);
};

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

  const buildQuery = useCallback(() => {
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
  }, [
    filters.client_id,
    filters.date_from,
    filters.date_to,
    filters.search,
    filters.selectedGroups,
    filters.responsible_profile_id,
    filters.screen_group,
    filters.state,
    filters.status,
    (filters as any).client_id,
    (filters as any).selectedGroups,
    pagination.page,
    pagination.pageSize,
    sort.direction,
    sort.field,
  ]);

  const fetchTasks = useCallback(async () => {
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
  }, [buildQuery]);

  const createTask = async (taskData: TaskFormData) => {
    try {
      const result = await upsertTask(supabase, {
        screenId: taskData.screen_id,
        data: taskData.data || {},
        state: taskData.state || "pendiente",
        status: taskData.status || "pendiente",
        startDate: taskData.start_date ?? null,
        endDate: taskData.end_date ?? null,
        location: taskData.location ?? null,
        locationMetadata: taskData.location_metadata || {},
        workSiteId: taskData.work_site_id ?? null,
        responsibleProfileId: taskData.responsible_profile_id ?? null,
        assignedTo: taskData.assigned_to ?? null,
        assignedProfiles: taskData.assigned_profiles || [],
        assignedVehicles: taskData.assigned_vehicles || []
      });

      await fetchTasks();
      return result;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const updateTask = async (taskId: string, taskData: TaskFormData) => {
    try {
      const result = await upsertTask(supabase, {
        taskId,
        screenId: taskData.screen_id,
        data: taskData.data || {},
        state: taskData.state || "pendiente",
        status: taskData.status || "pendiente",
        startDate: taskData.start_date ?? null,
        endDate: taskData.end_date ?? null,
        location: taskData.location ?? null,
        locationMetadata: taskData.location_metadata || {},
        workSiteId: taskData.work_site_id ?? null,
        responsibleProfileId: taskData.responsible_profile_id ?? null,
        assignedTo: taskData.assigned_to ?? null,
        assignedProfiles: taskData.assigned_profiles || [],
        assignedVehicles: taskData.assigned_vehicles || []
      });

      await fetchTasks();
      return result;
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
      let task = tasks.find((candidate) => candidate.id === taskId);

      // Si no está en memoria, obtenerla desde la vista
      if (!task) {
        const { data, error } = await supabase
          .from('detailed_tasks')
          .select('*')
          .eq('id', taskId)
          .single();
        if (error) throw error;
        task = data as DetailedTask;
      }

      if (!task) {
        throw new Error('No se encontró la tarea a completar');
      }

      // Preparar asignaciones para el archivado
      const assignedUsers = normalizeAssignedProfiles(task.assigned_profiles);
      const assignedVehicles = normalizeAssignedVehicles(task.assigned_vehicles);

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
          location_metadata: (task.location_metadata ?? {}) as TaskFormData['location_metadata'],
          work_site_id: task.work_site_id ?? null,
          responsible_profile_id: task.responsible_profile_id || null,
          assigned_to: task.assigned_to || null,
          assigned_profiles: normalizeAssignedProfiles(task.assigned_profiles).map((profile) => profile.id),
          assigned_vehicles: normalizeAssignedVehicles(task.assigned_vehicles).map((vehicle) => vehicle.id),
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

      return data.slice(0, 3);
    } catch (err) {
      console.error('Error generating checkin token:', err);
      throw err;
    }
  };

  // Fetch inicial
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTasks();
    }, 30000); // Refrescar cada 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, fetchTasks]);

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
  const { data, isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ['dashboard-tasks', 'sections'],
    queryFn: async () => {
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

      const sectionMap: Record<string, string[]> = {
        confeccion: [],
        tapiceria: [],
        pendientes: [],
      };

      (dashboardScreens as any[] || []).forEach((item) => {
        const screen = item as Screen;
        const section = screen.dashboard_section;
        if (section && sectionMap[section]) {
          sectionMap[section].push(screen.id);
        }

        const fields = Array.isArray((screen as any).templates?.fields)
          ? (screen as any).templates.fields
          : [];
        templateFieldsMapByScreen[screen.id] = fields;
      });

      // Grupos que siempre queremos incluir en la sección de pendientes si no hay pantallas específicas
      const PENDING_FALLBACK_GROUPS = ['Instalaciones', 'Instalación', 'Instalacion', 'Tareas Generales', 'Pendientes'];

      const fetchSectionTasks = async (
        section: 'confeccion' | 'tapiceria' | 'pendientes',
        fallbackGroups: string[],
        limit: number | null
      ) => {
        const screenIds = sectionMap[section];
        let finalScreenIds: string[] = [...screenIds];

        // PASO 1: Si necesitamos filtrar por grupos, obtener screen_ids de la tabla screens
        if (section === 'pendientes') {
          const groups = [...fallbackGroups, ...PENDING_FALLBACK_GROUPS];
          if (groups.length > 0) {
            const { data: screensData, error: screensError } = await supabase
              .from('screens')
              .select('id')
              .in('screen_group', groups);

            if (screensError) {
              console.error('[fetchSectionTasks] Error fetching screens:', screensError);
            } else if (screensData) {
              const groupScreenIds = screensData.map(s => s.id);
              // Combinar screen_ids de dashboard_section + screen_ids de grupos
              finalScreenIds = Array.from(new Set([...finalScreenIds, ...groupScreenIds]));
            }
          }
        } else {
          // Para confección/tapicería, si no hay screenIds, buscar por grupos
          if (screenIds.length === 0 && fallbackGroups.length > 0) {
            const { data: screensData, error: screensError } = await supabase
              .from('screens')
              .select('id')
              .in('screen_group', fallbackGroups);

            if (screensError) {
              console.error('[fetchSectionTasks] Error fetching screens:', screensError);
            } else if (screensData) {
              finalScreenIds = screensData.map(s => s.id);
            }
          }
        }

        // PASO 2: Consultar screen_data con los screen_ids obtenidos
        let query = supabase
          .from('detailed_tasks')
          .select('*')
          .order('start_date', { ascending: true, nullsFirst: true });

        // IMPORTANTE: Para pendientes, excluimos tareas terminadas
        // Las tareas pendientes son TODAS las no archivadas, sin importar la fecha
        if (section === 'pendientes') {
          query = query.neq('state', 'terminado');
        } else {
          // Para confección/tapicería, también excluimos terminadas
          query = query.neq('state', 'terminado');
        }

        // Aplicar filtro de screen_ids si tenemos alguno
        if (finalScreenIds.length > 0) {
          query = query.in('screen_id', finalScreenIds);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) {
          console.error('[fetchSectionTasks] Error:', error);
          throw error;
        }

        // Transformar datos: ya vienen desde la vista detailed_tasks
        const transformedData = (data ?? []).map((item: any) => {
          return {
            ...item,
            // Las asignaciones ya vienen agregadas como JSON en la vista detailed_tasks
            assigned_profiles: item.assigned_profiles || [],
            assigned_vehicles: item.assigned_vehicles || []
          };
        });

        console.log(`[fetchSectionTasks] ${section}:`, transformedData.length, 'tasks');
        return transformedData;
      };

      const [confeccionData, tapiceriaData, pendingData] = await Promise.all([
        fetchSectionTasks('confeccion', ['Confección', 'Confeccion'], 3),
        fetchSectionTasks('tapiceria', ['Tapicería', 'Tapiceria'], 3),
        fetchSectionTasks('pendientes', [], null),
      ]);

      const shouldHighlight = (task: DetailedTask) => {
        const state = (task.state ?? '').toLowerCase();
        return state === 'incidente' || state === 'arreglo' || state === 'urgente';
      };

      const buildSectionList = (data: DetailedTask[]) => {
        if (data.length === 0) return data.slice(0, 3);
        const prioritized = data.filter(shouldHighlight);
        if (prioritized.length === data.length) return prioritized.slice(0, 3);
        if (prioritized.length === 0) return data.slice(0, 3);
        const remainder = data.filter((task) => !shouldHighlight(task));
        return [...prioritized, ...remainder].slice(0, 3);
      };

      const confeccionTasks = buildSectionList(confeccionData);
      const tapiceriaTasks = buildSectionList(tapiceriaData);
      const pendingTasks = pendingData;

      const allTasks = [...confeccionData, ...tapiceriaData, ...pendingData];
      const taskIds = Array.from(new Set(allTasks.map((task) => task.id)));

      const sessionInfoByTask: Record<string, DashboardTaskSessionInfo> = {};
      if (taskIds.length > 0) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('work_sessions')
          .select('task_id, status, started_at, ended_at')
          .in('task_id', taskIds)
          .order('started_at', { ascending: false });

        if (sessionsError) throw sessionsError;

        (sessionsData ?? []).forEach((session) => {
          const taskId = session.task_id as string | null;
          if (!taskId || sessionInfoByTask[taskId]) return;
          sessionInfoByTask[taskId] = {
            active: session.status === 'active' && !session.ended_at,
            lastArrival: session.started_at ?? null,
            lastDeparture: session.ended_at ?? null,
          };
        });
      }

      return {
        confeccionTasks,
        tapiceriaTasks,
        pendingTasks,
        templateFieldsByScreen: templateFieldsMapByScreen,
        sessionInfoByTask
      };
    },
    refetchInterval: 60000
  });

  return {
    confeccionTasks: data?.confeccionTasks || [],
    tapiceriaTasks: data?.tapiceriaTasks || [],
    pendingTasks: data?.pendingTasks || [],
    loading,
    templateFieldsByScreen: data?.templateFieldsByScreen || {},
    sessionInfoByTask: data?.sessionInfoByTask || {},
    refresh,
  };
}

// Hook para estadísticas del dashboard
export function useDashboardStats(dateFrom?: string, dateTo?: string) {
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['dashboard-stats', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

      if (error) throw error;

      const normalized: Database['public']['Functions']['get_dashboard_stats']['Returns'] | null = Array.isArray(data)
        ? (data[0] ?? null)
        : (data as Database['public']['Functions']['get_dashboard_stats']['Returns'] | null);
      return normalized;
    },
    refetchInterval: 300000 // 5 minutes
  });

  return { stats, loading };
}


