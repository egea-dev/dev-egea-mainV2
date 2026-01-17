import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="text-center space-y-8 p-8">
        <div className="flex justify-center">
          <img
            src="/logo-placeholder.png"
            alt="EGEA Main Control"
            className="h-20 w-auto"
          />
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-primary uppercase tracking-wide">
          Main Control
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground">
          Sistema de gestión de recursos y planificación de producción
        </p>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Iniciar Sesión
        </Button>
        <p className="text-sm text-muted-foreground pt-4">
          Hecho con ❤️ por Hacchi
        </p>
      </div>
    </div>
  );
}
