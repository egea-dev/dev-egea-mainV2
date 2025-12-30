import { ScrollText } from "lucide-react";
import PageShell from "@/components/layout/PageShell";

export default function SystemLogPage() {
  return (
    <PageShell
      title="Log total del sistema"
      description="Revision centralizada de eventos y auditorias."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 text-center">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <ScrollText className="h-5 w-5 text-primary" />
            <span>Eventos recientes</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Este modulo mostrara trazas, cambios criticos y alertas del sistema.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 text-center">
          <h3 className="text-sm font-semibold text-foreground">Filtros sugeridos</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Accesos administrativos.</li>
            <li>Cambios de configuracion.</li>
            <li>Errores de integracion.</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
