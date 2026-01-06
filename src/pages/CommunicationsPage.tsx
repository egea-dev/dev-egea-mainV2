import PageShell from "@/components/layout/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Construction, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CommunicationsPage() {
  return (
    <PageShell
      title="Comunicaciones"
      description="Sistema de mensajería y notificaciones del equipo"
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Construction className="h-10 w-10 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Módulo en Desarrollo</CardTitle>
            <CardDescription className="text-base">
              El sistema de comunicaciones está siendo rediseñado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <MessageCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-700">Temporalmente Deshabilitado</AlertTitle>
              <AlertDescription className="text-yellow-600/90">
                Este módulo ha sido deshabilitado temporalmente mientras implementamos
                mejoras en el sistema de roles y permisos. Estará disponible próximamente
                con nuevas funcionalidades.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Funcionalidades Planificadas
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Mensajería por Rol</p>
                    <p className="text-xs text-muted-foreground">
                      Envío de mensajes segmentados según roles de usuario
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Notificaciones Push</p>
                    <p className="text-xs text-muted-foreground">
                      Alertas en tiempo real para eventos importantes
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Historial de Mensajes</p>
                    <p className="text-xs text-muted-foreground">
                      Registro completo de comunicaciones del equipo
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Integración con Tareas</p>
                    <p className="text-xs text-muted-foreground">
                      Comunicación contextual vinculada a instalaciones y pedidos
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Fecha estimada de lanzamiento: <strong className="text-foreground">Versión 2.1.0</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
