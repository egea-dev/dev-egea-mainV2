import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventDropArg, EventApi } from '@fullcalendar/core'

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

interface InstallationsCalendarProps {
  events: CalendarEvent[]
  onCreate: (date: Date) => void
  onMove: (event: EventApi) => Promise<void>
}

export default function InstallationsCalendar({ events, onCreate, onMove }: InstallationsCalendarProps) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{ left: 'prev,next', center: 'title', right: '' }}
      firstDay={1}
      height="auto"
      editable
      droppable
      events={events}
      eventContent={(arg) => (
        <div className="truncate px-1 py-0.5">
          <span className="text-xs font-medium">{arg.event.title}</span>
          {arg.event.extendedProps?.status && (
            <span className="ml-1 text-[10px] px-1 border rounded bg-white/80">
              {arg.event.extendedProps.status}
            </span>
          )}
        </div>
      )}
      dateClick={(info) => onCreate(info.date)}
      eventDrop={({ event, revert }: EventDropArg) => {
        onMove(event).catch(() => revert())
      }}
      eventDidMount={(info) => {
        if (info.event.extendedProps?.operator_name) {
          info.el.setAttribute('title', `Operario: ${info.event.extendedProps.operator_name}`)
        }
      }}
    />
  )
}
