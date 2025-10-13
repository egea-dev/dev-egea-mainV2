import React, { useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import { Paper, useTheme } from '@mui/material';
import { Task } from '@/types';

type FullCalendarViewProps = {
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onEventClick: (task: Task) => void;
  onDropOnDate: (date: Date) => void;
};

export const FullCalendarView = ({ tasks, onDateClick, onEventClick, onDropOnDate }: FullCalendarViewProps) => {
  const theme = useTheme();

  const events = tasks.map(task => ({
    id: task.id,
    title: task.site,
    start: task.start_date,
    extendedProps: task,
  }));
  
  return (
    <Paper sx={{ p: 2 }}>
      {/* Estilos globales para FullCalendar se aplican en index.css */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        events={events}
        height="auto"
        selectable={true}
        droppable={true}
        editable={true} // Permite arrastrar eventos dentro del calendario
        dateClick={(info) => onDateClick(info.date)}
        eventClick={(info) => onEventClick(info.event.extendedProps as Task)}
        drop={(info) => {
          info.jsEvent.preventDefault(); // Evita redirecciones
          onDropOnDate(info.date);
        }}
      />
    </Paper>
  );
};
