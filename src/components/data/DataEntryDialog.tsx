import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Screen = {
  id: string;
  name: string;
  template_id: string | null;
};

type Template = {
  id: string;
  name: string;
  fields: Array<{
    name: string;
    type: string;
    required?: boolean;
  }>;
};

type Status = 'pendiente' | 'acabado';
type State = 'normal' | 'incidente' | 'arreglo';

type DataEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export const DataEntryDialog = ({ open, onOpenChange, onSuccess }: DataEntryDialogProps) => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [templates, setTemplates] = useState<Map<string, Template>>(new Map());
  const [selectedScreenId, setSelectedScreenId] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, string | number | Date | null>>({});
  const [status, setStatus] = useState<'pendiente' | 'acabado'>('pendiente');
  const [state, setState] = useState<'normal' | 'incidente' | 'arreglo'>('normal');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadScreensAndTemplates();
    } else {
      resetForm();
    }
  }, [open]);

  const loadScreensAndTemplates = async () => {
    try {
      const { data: screensData, error: screensError } = await supabase
        .from("screens")
        .select("id, name, template_id")
        .eq("is_active", true);

      if (screensError) throw screensError;
      setScreens(screensData || []);

      const { data: templatesData, error: templatesError } = await supabase
        .from("templates")
        .select("*");

      if (templatesError) throw templatesError;

      const templateMap = new Map();
      (templatesData || []).forEach(t => templateMap.set(t.id, t));
      setTemplates(templateMap);
    } catch (error) {
      toast.error("Error al cargar datos");
      console.error(error);
    }
  };

  const resetForm = () => {
    setSelectedScreenId("");
    setFormData({});
    setStatus('pendiente');
    setState('normal');
  };

  const getCurrentTemplate = (): Template | null => {
    const screen = screens.find(s => s.id === selectedScreenId);
    if (!screen?.template_id) return null;
    return templates.get(screen.template_id) || null;
  };

  const handleFieldChange = (fieldName: string, value: string | number | Date | null) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async () => {
    const template = getCurrentTemplate();
    if (!template) {
      toast.error("Selecciona una pantalla con plantilla válida");
      return;
    }

    // Validar campos requeridos
    const missingFields = template.fields
      .filter(f => f.required)
      .filter(f => !formData[f.name] || formData[f.name] === "");

    if (missingFields.length > 0) {
      toast.error(`Completa los campos requeridos: ${missingFields.map(f => f.name).join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("screen_data").insert({
        screen_id: selectedScreenId,
        data: formData,
        state
      });

      if (error) throw error;

      toast.success("Datos creados correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Error al crear datos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const template = getCurrentTemplate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Nuevos Datos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pantalla</Label>
            <Select value={selectedScreenId} onValueChange={setSelectedScreenId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una pantalla" />
              </SelectTrigger>
              <SelectContent>
                {screens.map(screen => (
                  <SelectItem key={screen.id} value={screen.id}>
                    {screen.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {template && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Plantilla: {template.name}</h3>
                <div className="space-y-3">
                  {template.fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label>
                        {field.name}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.type === "select" ? (
                        <Select
                          value={formData[field.name] || ""}
                          onValueChange={(value) => handleFieldChange(field.name, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Selecciona ${field.name}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="option1">Opción 1</SelectItem>
                            <SelectItem value="option2">Opción 2</SelectItem>
                            <SelectItem value="option3">Opción 3</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (field.type === "date" || field.name.toLowerCase() === "fecha") ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData[field.name] && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData[field.name] ? (
                                format(new Date(formData[field.name]), "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData[field.name] ? new Date(formData[field.name]) : undefined}
                              onSelect={(date) => handleFieldChange(field.name, date ? format(date, "yyyy-MM-dd") : "")}
                              initialFocus
                              className="pointer-events-auto"
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                      ) : field.type === "number" ? (
                        <Input
                          type="number"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          placeholder={`Ingresa ${field.name}`}
                        />
                      ) : (
                        <Input
                          type="text"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          placeholder={`Ingresa ${field.name}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold">Estado del Registro</h3>
                
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={status} onValueChange={(v: Status) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="acabado">Acabado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={state} onValueChange={(v: State) => setState(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="incidente">Incidente</SelectItem>
                      <SelectItem value="arreglo">Arreglo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!template || loading}>
              {loading ? "Guardando..." : "Crear Datos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
