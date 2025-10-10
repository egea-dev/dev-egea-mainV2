import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateDialog } from "./TemplateDialog";
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
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-semibold">Plantillas</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setDialogOpen(true)} size="sm" className="sm:size-default flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {templates.map((template) => (
          <AccordionItem value={template.id} key={template.id}>
            <AccordionTrigger>
              <div className="flex justify-between items-center w-full pr-2 sm:pr-4">
                <div className="flex flex-col items-start flex-1">
                  <span className="text-base sm:text-lg font-semibold truncate w-full">{template.name}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-muted-foreground">{template.template_type}</span>
                    {template.category && (
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="inline-flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap rounded-md text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2 sm:h-9 sm:px-3 cursor-pointer"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Editar</span>
                  </div>
                  <div
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7 sm:h-8 sm:w-8 text-destructive/70 hover:text-destructive cursor-pointer"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-2 pr-2 pb-2">
                <p className="text-sm text-muted-foreground mb-2">
                  {template.fields.length} campos definidos:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  {template.fields.map((field, index) => (
                    <li key={index} className="text-sm">
                      <span className="font-medium">{field.label || field.name}</span> ({field.type})
                    </li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {templates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay plantillas. Crea una nueva para comenzar.
        </div>
      )}

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={handleCloseDialog}
        template={editingTemplate}
        fromTaskData={null}
      />
    </div>
  );
};