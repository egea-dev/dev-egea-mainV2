import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import DisplayPage from './Display';

type Screen = {
  id: string;
  name: string;
  refresh_interval_sec: number | null;
};

export default function GroupDisplayPage() {
  const { groupName } = useParams<{ groupName: string }>();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNextSlide = useCallback(
    (api: CarouselApi | null, currentScreens: Screen[]) => {
      if (!api || currentScreens.length === 0) {
        clearTimer();
        return;
      }

      const selectedIndex = api.selectedScrollSnap();
      const rawDelay = currentScreens[selectedIndex]?.refresh_interval_sec ?? 30;
      const delayMs = Math.max(rawDelay || 30, 5) * 1000;

      clearTimer();
      timerRef.current = setTimeout(() => {
        api.scrollNext();
      }, delayMs);
    },
    [clearTimer],
  );

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
        console.error("Error loading group screens:", error);
        toast.error(`Error al cargar el grupo de pantallas: ${error.message}`);
        setScreens([]);
      } else {
        setScreens(data || []);
      }
      setLoading(false);
    };

    fetchScreens();
  }, [groupName]);

  useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => scheduleNextSlide(carouselApi, screens);
    scheduleNextSlide(carouselApi, screens);

    carouselApi.on('select', handleSelect);
    carouselApi.on('reInit', handleSelect);

    return () => {
      carouselApi.off('select', handleSelect);
      carouselApi.off('reInit', handleSelect);
    };
  }, [carouselApi, screens, scheduleNextSlide]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  if (!groupName) {
    return <div className="flex h-screen items-center justify-center">No se especificó un grupo.</div>;
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando grupo...</div>;
  }
  
  if (screens.length === 0) {
    return <div className="flex h-screen items-center justify-center">No se encontraron pantallas para el grupo "{groupName}".</div>;
  }

  return (
    <Carousel
      opts={{ loop: true }}
      setApi={setCarouselApi}
    >
      <CarouselContent>
        {screens.map(screen => (
          <CarouselItem key={screen.id} className="h-screen w-screen">
             <div style={{ transform: 'scale(0.9)', transformOrigin: 'top left', height: '111%', width: '111%' }}>
               <DisplayPage key={screen.id} screenId={screen.id} />
             </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

