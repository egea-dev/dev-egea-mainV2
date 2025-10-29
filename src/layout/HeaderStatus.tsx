import { useState, useEffect, useMemo } from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ALERT_MANAGER_ROLES = new Set(["admin", "manager", "responsable"]);

type HeaderStatusProps = {
  role?: string | null;
};

export const HeaderStatus = ({ role }: HeaderStatusProps) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const navigate = useNavigate();

  const canManageAlerts = useMemo(() => {
    if (!role) return false;
    return ALERT_MANAGER_ROLES.has(role);
  }, [role]);

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Verificar conexion con Supabase cada 30 segundos
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from("profiles").select("id").limit(1);
        setIsConnected(!error);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!canManageAlerts) {
      setUnreadAlerts(0);
      return;
    }

    let isActive = true;

    const fetchAlerts = async () => {
      try {
        const { count, error } = await supabase
          .from("communication_logs")
          .select("id", { count: "exact", head: true })
          .or("status.eq.pending,status.eq.unread");

        if (!isActive) return;

        if (error) {
          setUnreadAlerts(0);
          return;
        }

        setUnreadAlerts(count ?? 0);
      } catch {
        if (isActive) {
          setUnreadAlerts(0);
        }
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [canManageAlerts]);

  const formattedDate = useMemo(
    () => format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
    [currentTime]
  );
  const formattedTime = useMemo(() => format(currentTime, "HH:mm:ss"), [currentTime]);

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <span className="hidden sm:inline font-medium text-emerald-600 dark:text-emerald-300">
              Conectado
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-destructive" />
            <span className="hidden sm:inline font-medium text-destructive">Desconectado</span>
          </>
        )}
      </div>
      <div className="hidden sm:block capitalize font-medium text-muted-foreground">
        {formattedDate}
      </div>
      {canManageAlerts && (
        <Button
          variant="outline"
          size="sm"
          className="hidden items-center gap-2 rounded-full border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-amber-700 transition-colors hover:bg-amber-500/20 dark:border-amber-300/40 dark:bg-amber-400/15 dark:text-amber-100 md:inline-flex"
          onClick={() => navigate("/admin/communications")}
        >
          <AlertTriangle className="h-4 w-4" />
          Alertas
          <span className="ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-semibold text-white">
            {unreadAlerts}
          </span>
        </Button>
      )}
      <div
        className={cn(
          "font-mono bg-primary text-primary-foreground px-3 py-1.5 rounded-md transition-all duration-300 font-semibold text-base shadow-sm",
          !isConnected && "bg-destructive text-destructive-foreground animate-pulse"
        )}
      >
        {formattedTime}
      </div>
    </div>
  );
};
