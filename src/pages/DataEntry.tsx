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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!screen || fields.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Esta pantalla no tiene una plantilla asignada.
            </p>
            <Button className="w-full mt-4" onClick={() => navigate("/admin")}>
              Volver al Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Panel
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Entrada de Datos para: {screen.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {(field.type === "date" || field.name.toLowerCase() === "fecha") ? (
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
                          onSelect={(date) =>
                            handleInputChange(
                              field.name,
                              date ? format(date, "yyyy-MM-dd") : ""
                            )
                          }
                          initialFocus
                          className="pointer-events-auto"
                          locale={es}
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
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Guardando..." : "Guardar Datos"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin")}
                >
                  Volver
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}