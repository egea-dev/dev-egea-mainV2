import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import DisplayPage from './Display';

type Screen = {
  id: string;
  name: string;
  refresh_interval_sec: number;
};

export default function GroupDisplayPage() {
  const { groupName } = useParams<{ groupName: string }>();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScreens = async () => {
      if (!groupName) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('screens')
        .select('id, name, refresh_interval_sec')
        .eq('screen_group', groupName)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        toast.error(`Error al cargar el grupo de pantallas: ${error.message}`);
      } else {
        setScreens(data);
      }
      setLoading(false);
    };

    fetchScreens();
  }, [groupName]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando grupo...</div>;
  }
  
  if (screens.length === 0) {
    return <div className="flex h-screen items-center justify-center">No se encontraron pantallas para el grupo "{groupName}".</div>;
  }

  const averageInterval = screens.reduce((acc, screen) => acc + (screen.refresh_interval_sec || 30), 0) / screens.length;

  return (
    <Carousel
      opts={{ loop: true }}
      plugins={[Autoplay({ delay: averageInterval * 1000 })]}
    >
      <CarouselContent>
        {screens.map(screen => (
          <CarouselItem key={screen.id} className="h-screen w-screen">
             <div style={{ transform: 'scale(0.9)', transformOrigin: 'top left', height: '111%', width: '111%' }}>
               {/* Pasa el ID como prop en lugar de depender de la URL */}
               <DisplayPage key={screen.id} screenId={screen.id} />
             </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
