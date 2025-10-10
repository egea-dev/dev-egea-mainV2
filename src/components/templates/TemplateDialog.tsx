import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Copy } from "lucide-react";

type Template = {
  id: string;
  name: string;
  template_type: string;
  fields: Field[];
};

type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date";
};

type TemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  template?: Template | null;
  fromTaskData?: any; // Para crear plantilla desde tarea existente
};

export const TemplateDialog = ({ open, onOpenChange, onClose, template, fromTaskData }: TemplateDialogProps) => {
  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [category, setCategory] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setTemplateType(template.template_type);
        setCategory(template.category || "");
        setFields(template.fields);
      } else if (fromTaskData) {
        // Crear plantilla desde datos de tarea existente
        setName(`Plantilla basada en ${fromTaskData.client || 'tarea'}`);
        setTemplateType(fromTaskData.screen_group || "general");
        setCategory(fromTaskData.screen_group || "general");
        
        // Extraer campos del JSON data
        const taskFields: Field[] = [];
        if (fromTaskData.data) {
          Object.entries(fromTaskData.data).forEach(([key, value]) => {
            if (key && value) {
              taskFields.push({
                name: key.toLowerCase().replace(/\s+/g, '_'),
                label: key.charAt(0).toUpperCase() + key.slice(1),
                type: typeof value === 'number' ? 'number' :
                      typeof value === 'string' && value.includes('-') ? 'date' : 'text'
              });
            }
          });
        }
        
        // Añadir campos estándar si no existen
        const standardFields = ['cliente', 'direccion', 'descripcion', 'notas'];
        standardFields.forEach(field => {
          if (!taskFields.find(f => f.name === field)) {
            taskFields.push({
              name: field,
              label: field.charAt(0).toUpperCase() + field.slice(1),
              type: field === 'notas' ? 'text' : 'text'
            });
          }
        });
        
        setFields(taskFields.length > 0 ? taskFields : [{ name: "", label: "", type: "text" }]);
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

  const updateField = (index: number, key: keyof Field, value: string) => {
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
        const { error, data } = await supabase
          .from("templates")
          .update(templateData)
          .eq("id", template.id)
          .select()
          .single();
        
        if (error) {
          console.error('Error actualizando plantilla:', error);
          throw error;
        }
        
        console.log('Plantilla actualizada:', data);
        toast.success("Plantilla actualizada correctamente");
      } else {
        const { error, data } = await supabase
          .from("templates")
          .insert(templateData)
          .select()
          .single();
        
        if (error) {
          console.error('Error creando plantilla:', error);
          throw error;
        }
        
        console.log('Plantilla creada:', data);
        toast.success("Plantilla creada correctamente");
      }

      onClose();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(`Error al guardar la plantilla: ${error.message || 'Error desconocido'}`);
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