import { ClipboardList } from "lucide-react";
import PageShell from "@/components/layout/PageShell";

export default function ManagementPage() {
  return (
    <PageShell
      title="Gestion"
      description="Panel operativo para supervision y coordinacion."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 md:col-span-2 text-center">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <ClipboardList className="h-5 w-5 text-primary" />
            <span>Resumen operativo</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Aqui se consolidaran indicadores de cumplimiento, riesgos y bloqueos.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 text-center">
          <h3 className="text-sm font-semibold text-foreground">Acciones clave</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Asignar prioridades.</li>
            <li>Validar dependencias.</li>
            <li>Coordinar recursos.</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
