import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Monitor } from 'lucide-react';
import DisplayPage from './Display';

type Screen = {
  id: string;
  name: string;
  refresh_interval_sec: number | null;
  header_color?: string | null;
  screen_group?: string | null;
};

const normalizeGroupName = (value: string | null | undefined) =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export default function GroupDisplayPage() {
  const { groupName } = useParams<{ groupName: string }>();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [advanceSignals, setAdvanceSignals] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownScreensRef = useRef<Record<string, boolean>>({});

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerAdvance = useCallback((screenId: string) => {
    setAdvanceSignals((prev) => ({
      ...prev,
      [screenId]: (prev[screenId] ?? 0) + 1,
    }));
  }, []);

  const scheduleNextSlide = useCallback(
    (api: CarouselApi | null, currentScreens: Screen[]) => {
      if (!api || currentScreens.length === 0) {
        clearTimer();
        return;
      }

      const selectedIndex = api.selectedScrollSnap();
      const currentScreen = currentScreens[selectedIndex];
      if (currentScreen) {
        if (shownScreensRef.current[currentScreen.id]) {
          triggerAdvance(currentScreen.id);
        } else {
          shownScreensRef.current[currentScreen.id] = true;
        }
      }

      const rawDelay = currentScreen?.refresh_interval_sec ?? 30;
      const delayMs = Math.max(rawDelay || 30, 5) * 1000;

      clearTimer();
      timerRef.current = setTimeout(() => {
        api.scrollNext();
      }, delayMs);
    },
    [clearTimer, triggerAdvance],
  );

  useEffect(() => {
    const fetchScreens = async () => {
      if (!groupName) return;
      setLoading(true);

      const normalizedGroup = normalizeGroupName(decodeURIComponent(groupName));

      const { data, error } = await supabase
        .from('screens')
        .select('id, name, refresh_interval_sec, header_color, screen_group')
        .eq('is_active', true)
        .not('screen_group', 'is', null)
        .order('name');

      if (error) {
        console.error("Error loading group screens:", error);
        const message = error.message ?? 'Error desconocido al cargar pantallas';
        toast.error(`Error al cargar el grupo de pantallas: ${message}`);
        setScreens([]);
      } else {
        const matchingScreens = (data || []).filter((screen) => {
          return normalizeGroupName(screen.screen_group) === normalizedGroup;
        });

        setScreens(matchingScreens);
        shownScreensRef.current = {};
        setAdvanceSignals({});
        if (matchingScreens.length === 0) {
          console.warn(
            `No se encontraron pantallas para el grupo "${groupName}". Verifica que el nombre coincide exactamente.`
          );
        }
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
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0f1115] text-slate-400">
        <Monitor className="h-16 w-16 mb-4 opacity-20" />
        <div className="text-xl font-medium">No se especificó un grupo visual.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0f1115] text-slate-400">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6"></div>
        <div className="text-xl font-medium animate-pulse">Cargando visualización de grupo...</div>
      </div>
    );
  }

  if (screens.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0f1115] text-slate-400">
        <Monitor className="h-16 w-16 mb-4 text-amber-500/50" />
        <div className="text-xl font-medium text-white">Grupo "{groupName}" sin pantallas activas</div>
        <p className="text-slate-600 mt-2">Verifique la configuración en el Panel de Admin.</p>
      </div>
    );
  }

  return (
    <Carousel
      opts={{ loop: true }}
      setApi={setCarouselApi}
    >
      <CarouselContent>
        {screens.map((screen) => (
          <CarouselItem key={screen.id} className="h-screen w-screen">
            <div className="flex h-full w-full items-center justify-center bg-background">
              <div className="h-full w-full">
                <DisplayPage
                  screenId={screen.id}
                  fullWidth
                  advanceSignal={advanceSignals[screen.id]}
                />
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}


