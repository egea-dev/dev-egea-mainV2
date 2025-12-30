import { ShieldCheck } from "lucide-react";
import PageShell from "@/components/layout/PageShell";

export default function SlaConfigPage() {
  return (
    <PageShell
      title="Configuracion SLA"
      description="Define umbrales, alertas y reglas de servicio."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 text-center">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Politicas activas</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Configura tiempos de respuesta por etapa y prioridad.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 text-center">
          <h3 className="text-sm font-semibold text-foreground">Sugerencias</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Priorizar clientes estrategicos.</li>
            <li>Definir escalados automaticos.</li>
            <li>Notificar incumplimientos criticos.</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
