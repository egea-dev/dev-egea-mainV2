import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Copy } from "lucide-react";

type TemplateFieldPreview = {
  name: string;
  label: string;
  type: "text" | "number" | "date";
};

type TemplateRecord = {
  id: string;
  name: string;
  template_type: string;
  category?: string | null;
  fields: TemplateFieldPreview[];
};

type TaskDataRecord = {
  client?: string | null;
  screen_group?: string | null;
  data?: Record<string, unknown> | null;
};

type TemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  template?: TemplateRecord | null;
  fromTaskData?: TaskDataRecord;
};

const inferFieldType = (value: unknown): TemplateFieldPreview["type"] => {
  if (typeof value === "number") return "number";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "text";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || !Number.isNaN(Date.parse(trimmed))) {
      return "date";
    }
    return "text";
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return "date";
  }
  return "text";
};

const normalizeFieldName = (label: string, used: Set<string>): string => {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'campo';

  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  used.add(candidate);
  return candidate;
};

const buildFieldsFromTask = (taskData?: TaskDataRecord): TemplateFieldPreview[] => {
  if (!taskData?.data) return [];

  const entries = Object.entries(taskData.data).filter(([, value]) => value !== null && value !== undefined);
  if (!entries.length) return [];

  const usedNames = new Set<string>();
  return entries.map(([rawKey, value]) => {
    const label = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
    const name = normalizeFieldName(rawKey, usedNames);
    const type = inferFieldType(value);
    return { name, label, type };
  });
};

export const TemplateDialog = ({ open, onOpenChange, onClose, template, fromTaskData }: TemplateDialogProps) => {
  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [category, setCategory] = useState("");
  const [fields, setFields] = useState<TemplateFieldPreview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setTemplateType(template.template_type);
        setCategory(template.category || "");
        setFields(template.fields);
      } else if (fromTaskData) {
        const clientLabel = typeof fromTaskData.client === 'string' ? fromTaskData.client : 'tarea';
        const group = typeof fromTaskData.screen_group === 'string' ? fromTaskData.screen_group : 'general';
        setName(`Plantilla basada en ${clientLabel}`);
        setTemplateType(group);
        setCategory(group);

        const derivedFields = buildFieldsFromTask(fromTaskData);
        if (derivedFields.length > 0) {
          setFields(derivedFields);
        } else {
          setFields([{ name: "", label: "", type: "text" }]);
        }
      } else {
        setName("");
        setTemplateType("");
        setCategory("");
        setFields([{ name: "", label: "", type: "text" }]);
      }
    }
  }, [open, template, fromTaskData]);

  const addField = () => {
    setFields([...fields, { name: "", label: "", type: "text" }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof TemplateFieldPreview, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones mejoradas
    if (!name.trim()) {
      toast.error("El nombre de la plantilla es obligatorio.");
      return;
    }

    if (!templateType.trim()) {
      toast.error("El tipo de plantilla es obligatorio.");
      return;
    }

    // Validar que los nombres de campos sean únicos y válidos
    const validFields = fields.filter(f => f.name.trim() && f.label.trim());
    const fieldNames = validFields.map(f => f.name.trim());
    const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    
    if (duplicateNames.length > 0) {
      toast.error(`Los nombres de campo deben ser únicos. Duplicados: ${duplicateNames.join(', ')}`);
      return;
    }

    // Validar formato de nombres (sin espacios, caracteres especiales)
    const invalidNames = fieldNames.filter(name => !/^[a-z_][a-z0-9_]*$/.test(name));
    if (invalidNames.length > 0) {
      toast.error(`Nombres de campo inválidos (solo minúsculas, guiones bajos y números): ${invalidNames.join(', ')}`);
      return;
    }

    if (validFields.length === 0) {
      toast.error("Debes definir al menos un campo completo (Nombre y Etiqueta).");
      return;
    }

    setLoading(true);

    try {
      const templateData = {
        name: name.trim(),
        template_type: templateType.trim(),
        category: category.trim() || null,
        fields: validFields,
        created_at: template ? undefined : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Guardando plantilla:', templateData);

      if (template) {
        const { error } = await supabase
          .from("templates")
          .update(templateData)
          .eq("id", template.id);

        if (error) {
          throw error;
        }

        toast.success("Plantilla actualizada correctamente");
      } else {
        const { error } = await supabase
          .from("templates")
          .insert(templateData);

        if (error) {
          throw error;
        }

        toast.success("Plantilla creada correctamente");
      }

      onClose();
    } catch (error: unknown) {
      console.error("Error saving template:", error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al guardar la plantilla: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Plantilla" : "Nueva Plantilla"}</DialogTitle>
          <DialogDescription>
            Define la estructura de datos para tus pantallas. Asegúrate de que cada campo tenga un nombre y etiqueta únicos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Plantilla</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Parte de Confección"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo (Agrupador)</Label>
              <Input
                id="type"
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                placeholder="Ej: confeccion, logistica"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instalaciones">Instalaciones</SelectItem>
                  <SelectItem value="confeccion">Confección</SelectItem>
                  <SelectItem value="tapiceria">Tapicería</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Campos</Label>
              <Button type="button" size="sm" variant="outline" onClick={addField}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Campo
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-2 items-start md:items-end p-4 border rounded-lg bg-muted/50">
                <div className="flex-1 w-full space-y-2">
                  <Label htmlFor={`field-name-${index}`}>Nombre del Campo (ID)</Label>
                  <Input
                    id={`field-name-${index}`}
                    value={field.name}
                    onChange={(e) => updateField(index, "name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    onBlur={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                      if (value && !/^[a-z_]/.test(value)) {
                        updateField(index, "name", 'field_' + value);
                      } else {
                        updateField(index, "name", value);
                      }
                    }}
                    placeholder="ej: producto_id (sin espacios)"
                  />
                </div>
                <div className="flex-1 w-full space-y-2">
                  <Label htmlFor={`field-label-${index}`}>Etiqueta (Visible)</Label>
                  <Input
                    id={`field-label-${index}`}
                    value={field.label}
                    onChange={(e) => updateField(index, "label", e.target.value)}
                    placeholder="Ej: Nombre del Producto"
                  />
                </div>
                <div className="w-full md:w-40 space-y-2">
                  <Label htmlFor={`field-type-${index}`}>Tipo de Dato</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value: "text" | "number" | "date") => updateField(index, "type", value)}
                  >
                    <SelectTrigger id={`field-type-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="date">Fecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => removeField(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Plantilla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
