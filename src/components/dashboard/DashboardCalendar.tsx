import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { es } from 'date-fns/locale';
import { EventDropArg } from '@fullcalendar/core';

interface DashboardCalendarProps {
  onDateClick?: (date: Date) => void;
  onEventDrop?: (event: { id: string; start: Date; end?: Date; extendedProps: Record<string, unknown> }) => void;
  className?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    state: string;
    screen_group: string;
    task_id: string;
  };
}

export default function DashboardCalendar({ 
  onDateClick, 
  onEventDrop, 
  className = '' 
}: DashboardCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [isLoading, setIsLoading] = useState(true);

  // Detectar tamaño de pantalla para responsive
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Cargar eventos del calendario
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        setIsLoading(true);
        const sixtyDaysAgo = subDays(new Date(), 60);
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

        const { data: tasks, error } = await supabase
          .from("detailed_tasks")
          .select(`
            id,
            start_date,
            end_date,
            state,
            screen_group,
            site,
            description
          `)
          .gte("start_date", sixtyDaysAgo.toISOString())
          .lte("start_date", ninetyDaysFromNow.toISOString())
          .order("start_date", { ascending: true });

        if (error) {
          console.error("Error fetching calendar events:", error);
          return;
        }

        if (tasks) {
          const calendarEvents: CalendarEvent[] = tasks.map((task) => {
            // Determinar color según estado y grupo
            let backgroundColor = '#3b82f6'; // azul por defecto
            let borderColor = '#2563eb';
            const textColor = '#ffffff';

            if (task.screen_group === 'Instalaciones') {
              switch (task.state) {
                case 'urgente':
                  backgroundColor = '#ef4444';
                  borderColor = '#dc2626';
                  break;
                case 'en fabricacion':
                  backgroundColor = '#f97316';
                  borderColor = '#ea580c';
                  break;
                case 'a la espera':
                  backgroundColor = '#06b6d4';
                  borderColor = '#0891b2';
                  break;
                case 'terminado':
                  backgroundColor = '#10b981';
                  borderColor = '#059669';
                  break;
                default:
                  backgroundColor = '#6b7280';
                  borderColor = '#4b5563';
              }
            } else if (task.screen_group === 'Confección') {
              backgroundColor = '#8b5cf6';
              borderColor = '#7c3aed';
            } else if (task.screen_group === 'Tapicería') {
              backgroundColor = '#ec4899';
              borderColor = '#db2777';
            }

            return {
              id: task.id,
              title: `${task.screen_group}: ${task.site || task.description || 'Sin título'}`,
              start: task.start_date,
              end: task.end_date || task.start_date,
              backgroundColor,
              borderColor,
              textColor,
              extendedProps: {
                state: task.state,
                screen_group: task.screen_group,
                task_id: task.id
              }
            };
          });

          setEvents(calendarEvents);
        }
      } catch (error) {
        console.error("Error fetching calendar events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarEvents();
  }, []);

  // Configuración simple - solo un mes
  const initialView = 'dayGridMonth';
  const headerToolbar = {
    left: 'prev,next today',
    center: 'title',
    right: ''
  };

  const handleDateClick = (info: { date: Date }) => {
    if (onDateClick) {
      onDateClick(info.date);
    }
  };

  const handleEventDrop = (info: EventDropArg) => {
    if (onEventDrop) {
      onEventDrop(info.event);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`dashboard-calendar ${className}`}>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={headerToolbar}
        locale={es}
        editable={true}
        droppable={true}
        height="auto"
        events={events}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        eventDidMount={(info) => {
          // Añadir tooltip o información adicional si es necesario
          info.el.setAttribute('title', `${info.event.title}\nEstado: ${info.event.extendedProps.state}`);
        }}
        eventClassNames={(info) => {
          // Clases adicionales para eventos según su estado
          const baseClasses = 'fc-event cursor-pointer hover:opacity-80 transition-opacity';
          const stateClass = `fc-event-${info.event.extendedProps.state}`;
          const groupClass = `fc-event-${info.event.extendedProps.screen_group?.toLowerCase()}`;
          return `${baseClasses} ${stateClass} ${groupClass}`;
        }}
        dayCellClassNames={(info) => {
          // Resaltar fines de semana
          if (!info.date) return '';
          const isWeekend = info.date.getDay() === 0 || info.date.getDay() === 6;
          return isWeekend ? 'fc-day-weekend bg-gray-50 dark:bg-gray-800' : '';
        }}
        dayHeaderClassNames={() => 'fc-day-header font-semibold text-xs'}
        viewClassNames={() => 'fc-view fc-view-responsive'}
      />
    </div>
  );
}