import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDirectMessages } from "@/hooks/use-direct-messages";
import { useProfile } from "@/hooks/use-supabase";
import { supabase } from "@/integrations/supabase/client";

interface AdminProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

const ADMIN_ROLES = ["admin", "manager", "responsable"];

export const OperatorMessaging = () => {
  const { data: profile } = useProfile();
  const { sendMessage } = useDirectMessages();

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

  const { data: adminUsers = [], isLoading: loadingAdmins } = useQuery<AdminProfile[]>({
    queryKey: ["operator-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("role", ADMIN_ROLES)
        .eq("status", "activo");

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const activeAdmin = useMemo(() => adminUsers[0] ?? null, [adminUsers]);

  useEffect(() => {
    if (incidentDescription.trim().length > 0 && incidentError) {
      setIncidentError(null);
    }
  }, [incidentDescription, incidentError]);

  const handleToggleDialog = (open: boolean) => {
    setIncidentDialogOpen(open);
    if (!open) {
      setIncidentDescription("");
      setIncidentError(null);
    }
  };

  const handleSubmitIncident = async () => {
    if (!activeAdmin) {
      toast.error("No hay un administrador disponible en este momento.");
      return;
    }

    if (!incidentDescription.trim()) {
      setIncidentError("La descripción de la incidencia es obligatoria.");
      return;
    }

    setIsSubmittingIncident(true);
    try {
      await sendMessage(activeAdmin.id, incidentDescription.trim(), "system", {
        category: "incident",
        status: "pendiente",
        reporter_id: profile?.id ?? null,
        source: "operator_portal",
      });

      toast.success("Incidencia enviada al administrador.");
      handleToggleDialog(false);
    } catch (error) {
      console.error("Error sending incident message", error);
      toast.error("No se pudo enviar la incidencia. Intenta nuevamente.");
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Centro de incidencias</CardTitle>
          <p className="text-sm text-muted-foreground">
            Comunícate con el administrador únicamente para reportar incidencias críticas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingAdmins ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando administrador disponible...
            </div>
          ) : (
            <>
              <Alert className="border-primary/20 bg-primary/5 text-primary">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Canal en desarrollo</AlertTitle>
                <AlertDescription>
                  Estamos desarrollando este módulo. EGEA DeV. Puedes reportar incidencias y recibir respuesta del
                  administrador.
                </AlertDescription>
              </Alert>

              {activeAdmin ? (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-muted bg-muted/30 p-3">
                  <Avatar>
                    <AvatarImage src={activeAdmin.avatar_url ?? undefined} />
                    <AvatarFallback>{activeAdmin.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{activeAdmin.full_name}</p>
                    <p className="text-xs text-muted-foreground">Recibirá tus incidencias.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No se encontraron administradores activos. Intenta de nuevo más tarde.
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => handleToggleDialog(true)} disabled={!activeAdmin}>
                  Reportar incidencia
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={incidentDialogOpen} onOpenChange={handleToggleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar incidencia</DialogTitle>
            <DialogDescription>
              Describe lo ocurrido. El administrador recibirá esta incidencia como un mensaje del sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="incident-description">Descripción *</Label>
              <Textarea
                id="incident-description"
                placeholder="Detalla la incidencia detectada..."
                rows={5}
                value={incidentDescription}
                onChange={(event) => setIncidentDescription(event.target.value)}
                disabled={isSubmittingIncident}
              />
              {incidentError && <p className="text-sm text-destructive">{incidentError}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => handleToggleDialog(false)}
              disabled={isSubmittingIncident}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitIncident} disabled={isSubmittingIncident}>
              {isSubmittingIncident ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                "Enviar incidencia"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
