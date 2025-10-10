import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-6xl font-bold text-primary mb-4">
          Dynamic Display Sync
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Gestiona pantallas dinámicas con plantillas personalizables
        </p>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Iniciar Sesión
        </Button>
      </div>
    </div>
  );
}
