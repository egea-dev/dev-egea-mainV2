import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { startOfMonth, endOfMonth, format } from 'date-fns'

interface Operator {
  id: string
  full_name: string
  status: string
}

interface InstallationData {
  id: string
  start_date: string
  state: string
  site: string | null
  description: string | null
  screen_group: string
  assigned_profiles: Array<{
    id: string
    full_name: string
  }>
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  allDay: boolean
  extendedProps: {
    status: string
    operator_name: string
  }
}

type CalendarMoveEvent = {
  id: string
  start: Date
  extendedProps?: Record<string, unknown>
}

export function useInstallations() {
  const [rows, setRows] = useState<InstallationData[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [selectedOps, setSelectedOps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const planId = 'CURRENT_PLAN_ID'

  const fetchAll = async () => {
    try {
      setLoading(true)
      
      // Obtener operarios
      const { data: operatorsData } = await supabase
        .from('profiles')
        .select('id, full_name, status')
        .in('role', ['responsable', 'operario'])
        .eq('status', 'activo')
        .order('full_name')
      
      setOperators(operatorsData || [])

      // Obtener instalaciones del mes actual
      const currentMonthStart = startOfMonth(new Date())
      const currentMonthEnd = endOfMonth(new Date())
      const startDate = format(currentMonthStart, 'yyyy-MM-dd')
      const endDate = format(currentMonthEnd, 'yyyy-MM-dd')

      const { data: installationsData } = await supabase
        .from('detailed_tasks')
        .select(`
          id,
          start_date,
          state,
          site,
          description,
          screen_group,
          assigned_profiles!inner(
            id,
            full_name
          )
        `)
        .eq('screen_group', 'Instalaciones')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .neq('state', 'terminado')
        .order('start_date', { ascending: true })

      setRows(installationsData || [])
    } catch (error) {
      console.error('Error fetching installations:', error)
    } finally {
      setLoading(false)
    }
  }

  // DnD con UI optimista + persistencia en BD
  const moveEvent = async (event: CalendarMoveEvent) => {
    const id = event.id
    const prev = rows
    const nextDate = event.start.toISOString().split('T')[0]
    
    // Actualización optimista inmediata
    setRows(prev.map(r => r.id === id ? { ...r, start_date: nextDate } : r))

    try {
      // Actualizar en base de datos
      const { error } = await supabase
        .from('screen_data')
        .update({ start_date: nextDate })
        .eq('id', id)
      
      if (error) {
        console.error('Error updating event:', error)
        setRows(prev) // rollback si hay error
        throw error
      }
      
      console.log('Event moved successfully:', { id, newDate: nextDate })
    } catch (error) {
      console.error('Error in moveEvent:', error)
      setRows(prev) // rollback
      throw error
    }
  }

  const createEvent = async (date: Date) => {
    console.log('Create event for date:', date)
    // Implementar según necesidad
  }

  useEffect(() => { 
    fetchAll() 
  }, [])

  // Suscripción Realtime para cambios externos
  useEffect(() => {
    const currentMonthStart = startOfMonth(new Date())
    const currentMonthEnd = endOfMonth(new Date())
    const startDate = format(currentMonthStart, 'yyyy-MM-dd')
    const endDate = format(currentMonthEnd, 'yyyy-MM-dd')

    const ch = supabase
      .channel('public:screen_data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_data',
          filter: `start_date=gte.${startDate}&start_date=lte.${endDate}`
        },
        (payload) => {
          console.log('Realtime change:', payload)
          fetchAll() // Refrescar datos cuando hay cambios externos
        }
      )
      .subscribe()
    
    return () => { 
      supabase.removeChannel(ch) 
    }
  }, [planId])

  const monthEvents = useMemo(() => {
    const filtered = selectedOps.length
      ? rows.filter(r => 
          r.assigned_profiles?.some((profile) => 
            selectedOps.includes(profile.id)
          )
        )
      : rows

    return filtered.map(r => ({
      id: r.id,
      title: r.site || r.description || 'Sin título',
      start: r.start_date,
      allDay: true,
      extendedProps: { 
        status: r.state,
        operator_name: r.assigned_profiles?.map((p) => p.full_name).join(', ') || 'Sin asignar'
      }
    }))
  }, [rows, selectedOps])

  const count = monthEvents.length

  return { 
    monthEvents, 
    operators, 
    selectedOps, 
    setSelectedOps, 
    count, 
    moveEvent, 
    createEvent, 
    planId,
    loading,
    refetch: fetchAll
  }
}
