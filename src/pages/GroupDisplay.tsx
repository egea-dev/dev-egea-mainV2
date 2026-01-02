import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Monitor } from 'lucide-react';
import ScreenDisplay from './ScreenDisplay';

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
  const [countdown, setCountdown] = useState(30);
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      setCurrentScreenIndex(selectedIndex);
      const currentScreen = currentScreens[selectedIndex];

      if (currentScreen) {
        if (shownScreensRef.current[currentScreen.id]) {
          triggerAdvance(currentScreen.id);
        } else {
          shownScreensRef.current[currentScreen.id] = true;
        }
      }

      const rawDelay = currentScreen?.refresh_interval_sec ?? 30;
      const delaySeconds = Math.max(rawDelay || 30, 5);
      const delayMs = delaySeconds * 1000;

      // Reset countdown
      setCountdown(delaySeconds);

      // Clear existing countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return delaySeconds;
          }
          return prev - 1;
        });
      }, 1000);

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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [clearTimer]);

  if (!groupName) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0F1113] text-slate-400">
        <div className="bg-[#1A1D1F] border border-white/10 rounded-2xl p-12 max-w-md text-center shadow-2xl">
          <Monitor className="h-20 w-20 mb-6 mx-auto text-gray-600" />
          <div className="text-2xl font-bold text-white mb-2">Sin Grupo Especificado</div>
          <div className="text-sm text-gray-500">No se especificó un grupo visual para mostrar.</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0F1113]">
        <div className="bg-[#1A1D1F] border border-white/10 rounded-2xl p-12 max-w-md text-center shadow-2xl">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
            <Monitor className="absolute inset-0 m-auto h-10 w-10 text-emerald-500/50" />
          </div>
          <div className="text-xl font-bold text-white mb-2 animate-pulse">Cargando Grupo</div>
          <div className="text-sm text-gray-500">"{decodeURIComponent(groupName)}"</div>
        </div>
      </div>
    );
  }

  if (screens.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0F1113]">
        <div className="bg-[#1A1D1F] border border-amber-500/20 rounded-2xl p-12 max-w-lg text-center shadow-2xl">
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Monitor className="h-12 w-12 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-white mb-3">Grupo Sin Pantallas</div>
          <div className="text-lg text-amber-400 mb-4">"{decodeURIComponent(groupName)}"</div>
          <div className="text-sm text-gray-500 mb-6">
            No hay pantallas activas configuradas para este grupo.
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-left">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Solución:</div>
            <ul className="text-sm text-slate-500 space-y-1">
              <li>• Verifica la configuración en el Panel de Admin</li>
              <li>• Asegúrate de que las pantallas estén activas</li>
              <li>• Comprueba que el nombre del grupo coincida exactamente</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Carousel
      opts={{ loop: true }}
      setApi={setCarouselApi}
      className="h-screen w-screen"
    >
      <CarouselContent>
        {screens.map((screen, index) => (
          <CarouselItem key={screen.id} className="h-screen w-screen">
            <ScreenDisplay
              screenId={screen.id}
              groupMode={true}
              countdown={index === currentScreenIndex ? countdown : null}
              currentScreen={index + 1}
              totalScreens={screens.length}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}


