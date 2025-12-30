import { CalendarDays } from "lucide-react";
import PageShell from "@/components/layout/PageShell";

export default function GlobalCalendarPage() {
  return (
    <PageShell
      title="Calendario Global"
      description="Interconexion de tareas y labores en una vista unificada."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 text-center">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span>Vista general</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Este modulo mostrara la correlacion entre instalaciones, produccion y entregas.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 text-center">
          <h3 className="text-sm font-semibold text-foreground">Proximos pasos</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Sincronizar tareas y hitos.</li>
            <li>Filtrar por area y responsable.</li>
            <li>Exportar vistas por semana.</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
