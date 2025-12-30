import { TemplateList } from "@/components/templates/TemplateList";
import PageShell from "@/components/layout/PageShell";

export default function TemplatesPage() {
  return (
    <PageShell
      title="Plantillas"
      description="Biblioteca de plantillas para estandarizar procesos."
    >
      <TemplateList />
    </PageShell>
  );
}
