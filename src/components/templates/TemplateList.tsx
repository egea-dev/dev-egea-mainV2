import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateDialog } from "./TemplateDialog";
import { TemplateImportDialog } from "./TemplateImportDialog";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date";
};

type Template = {
  id: string;
  name: string;
  template_type: string;
  category?: string;
  fields: Field[];
};

export const TemplateList = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as Template[]);
    } catch (error) {
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta plantilla?")) return;

    try {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Plantilla eliminada");
      loadTemplates();
    } catch (error) {
      toast.error("Error al eliminar plantilla");
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted/60 p-2 text-primary border border-border/60">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Configuración</p>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">Plantillas de Datos</h2>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="sm:size-default flex-1 sm:flex-none border-border/60 bg-card text-foreground hover:bg-muted/60"
            onClick={() => setImportDialogOpen(true)}
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            className="sm:size-default flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card backdrop-blur-sm p-1">
        <Accordion type="single" collapsible className="w-full space-y-1">
          {templates.map((template) => (
            <AccordionItem value={template.id} key={template.id} className="border-b-0">
              <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-muted/60 rounded-xl group transition-all data-[state=open]:bg-muted/60">
                <div className="flex justify-between items-center w-full pr-2 sm:pr-4">
                  <div className="flex flex-col items-start flex-1 text-left">
                    <span className="text-base sm:text-lg font-bold text-slate-200 group-hover:text-white transition-colors">{template.name}</span>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-xs sm:text-sm text-slate-500 font-mono">{template.template_type}</span>
                      {template.category && (
                        <Badge variant="secondary" className="text-[10px] bg-muted/60 text-slate-300 pointer-events-none">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 opacity-50 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <div
                      className="inline-flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap rounded-md text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-border/60 bg-muted/40 hover:bg-muted/60 text-slate-200 h-8 px-2 sm:h-9 sm:px-3 cursor-pointer"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </div>
                    <div
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-red-950/30 border border-transparent hover:border-red-900/50 h-7 w-7 sm:h-8 sm:w-8 text-slate-600 hover:text-red-500 cursor-pointer"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="pl-2 pr-2 pb-2 pt-2 border-t border-border/60 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                    {template.fields.length} campos definidos:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {template.fields.map((field, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border/60 text-sm">
                        <span className="font-medium text-slate-300">{field.label || field.name}</span>
                        <span className="text-xs text-slate-500 bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">{field.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {templates.length === 0 && (
          <div className="text-center py-16 text-slate-500 border-2 border-dashed border-border/60 rounded-xl m-4">
            <p>No hay plantillas creadas. Define la primera para comenzar a capturar datos.</p>
          </div>
        )}
      </div>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={handleCloseDialog}
        template={editingTemplate}
        fromTaskData={null}
      />

      <TemplateImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={() => {
          setImportDialogOpen(false);
          loadTemplates();
        }}
      />
    </div>
  );
};
