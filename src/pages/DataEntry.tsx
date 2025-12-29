import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date";
};

type Screen = {
  id: string;
  name: string;
  templates: {
    fields: Field[];
  } | null;
};

// Corregido: La exportación es `default`
export default function DataEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [formData, setFormData] = useState<Record<string, string | number | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadScreenAndTemplate = useCallback(async () => {
    try {
      const { data: screenData, error: screenError } = await supabase
        .from("screens")
        .select("*, templates(*)")
        .eq("id", id)
        .single();

      if (screenError) throw screenError;

      setScreen(screenData);
      if (screenData.templates?.fields && Array.isArray(screenData.templates.fields)) {
        const templateFields = screenData.templates.fields as Field[];
        setFields(templateFields);
        const initialData: Record<string, string | number | null> = {};
        templateFields.forEach((field: Field) => {
          initialData[field.name] = field.type === "number" ? 0 : "";
        });
        setFormData(initialData);
      }
    } catch (error) {
      toast.error("Error al cargar datos");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadScreenAndTemplate();
  }, [loadScreenAndTemplate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from("screen_data").insert({
        screen_id: id,
        data: formData,
      });

      if (error) throw error;

      toast.success("Datos guardados exitosamente");

      const resetData: Record<string, string | number | null> = {};
      fields.forEach((field) => {
        resetData[field.name] = field.type === "number" ? 0 : "";
      });
      setFormData(resetData);
    } catch (error) {
      toast.error("Error al guardar datos");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (fieldName: string, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1115] text-slate-400">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6"></div>
        <p className="animate-pulse font-medium">Cargando formulario de entrada...</p>
      </div>
    );
  }

  if (!screen || fields.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1115] p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="h-8 w-8 text-slate-500" />
            </div>
            <p className="text-lg font-medium text-white mb-2">Sin Plantilla Activa</p>
            <p className="text-sm text-slate-400 mb-6">
              Esta pantalla no tiene una plantilla de datos asignada para la entrada manual.
            </p>
            <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800" onClick={() => navigate("/admin")}>
              Volver al Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 font-sans selection:bg-blue-500/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6 text-slate-400 hover:text-white pl-0 hover:bg-transparent"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Panel
        </Button>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-slate-800/50 pb-6">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-400" />
              </div>
              {screen.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name} className="text-slate-300 font-medium">{field.label}</Label>
                  {(field.type === "date" || field.name.toLowerCase() === "fecha") ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-slate-700 bg-slate-950/50 text-slate-200 hover:bg-slate-900 hover:text-white",
                            !formData[field.name] && "text-slate-500"
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
                      <PopoverContent className="w-auto p-0 border-slate-800 bg-slate-900" align="start">
                        <Calendar
                          mode="single"
                          selected={formData[field.name] ? new Date(formData[field.name]) : undefined}
                          onSelect={(date) =>
                            handleInputChange(
                              field.name,
                              date ? format(date, "yyyy-MM-dd") : ""
                            )
                          }
                          initialFocus
                          className="pointer-events-auto bg-slate-900 text-slate-200"
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleInputChange(
                          field.name,
                          field.type === "number"
                            ? Number(e.target.value)
                            : e.target.value
                        )
                      }
                      required
                      className="border-slate-700 bg-slate-950/50 text-slate-200 placeholder:text-slate-600 focus-visible:ring-blue-500/50"
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : "Guardar Registro"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}