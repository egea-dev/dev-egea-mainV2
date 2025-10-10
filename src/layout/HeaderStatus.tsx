import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const HeaderStatus = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Verificar conexión con Supabase cada 30 segundos
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        setIsConnected(!error);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="hidden sm:inline text-green-600 font-medium">Conectado</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="hidden sm:inline text-red-600 font-medium">Desconectado</span>
          </>
        )}
      </div>
      <div className="hidden sm:block capitalize text-foreground font-medium">
        {formattedDate}
      </div>
      <div className={cn(
        "font-mono bg-primary text-primary-foreground px-3 py-1.5 rounded-md transition-all duration-300 font-semibold text-base shadow-sm",
        !isConnected && "bg-red-500 text-white animate-pulse"
      )}>
        {formattedTime}
      </div>
    </div>
  );
};