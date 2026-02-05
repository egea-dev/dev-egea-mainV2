import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { supabaseProductivity } from '@/integrations/supabase';
import { QrCode, Camera, ArrowRight, Clock, CheckCircle, Printer, Package, AlertTriangle, AlertOctagon, FileText, History, ListFilter, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PageShell from '@/components/layout/PageShell';
import QRScanner from '@/components/shared/QRScanner';
import { RoleBasedRender } from '@/components/shared/RoleBasedRender';
import { MobileAlert, AlertType } from '@/components/shared/MobileAlert';
import { IncidentReportButton } from '@/components/incidents/IncidentReportButton';
import { IncidentReportModal } from '@/components/incidents/IncidentReportModal';
import { toast } from 'sonner';
import { printHtmlToIframe } from '@/utils/print';
import { parseQRCode, validateQRWithLines, extractOrderNumber } from '@/lib/qr-utils';
import { summarizeMaterials } from '@/lib/materials';
import { cn } from "@/lib/utils";
import { ScannerButton } from '@/features/scanner/components/ScannerButton';
import { ScannerModal } from '@/features/scanner/components/ScannerModal';
import { useOrientation, useDeviceType } from '@/hooks/useOrientation';
import { sortWorkOrdersByPriority, daysToDueDate, getUrgencyBadge } from '@/services/priority-service';
import ProductionCalendar from '@/features/production/components/ProductionCalendar';

function escapeZpl(str: string): string {
  if (!str) return "";
  return str.replace(/_/g, " ").replace(/\\/g, "\\\\").replace(/\^/g, " ").replace(/~/g, " ");
}

const getDueBadge = (order: Order) => {
  if (!order.due_date) {
    return { label: 'Sin fecha', badge: 'text-muted-foreground' };
  }
  const days = Math.ceil((new Date(order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return { label: 'Vencido', badge: 'text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-3 py-0.5 text-xs font-bold' };
  if (days <= 2) return { label: `${days} dias`, badge: 'text-[hsl(var(--warning))] bg-warning/10 border border-warning/20 rounded-full px-3 py-0.5 text-xs font-bold' };
  return { label: `${days} dias`, badge: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-0.5 text-xs font-bold' };
};

type GlobalProductionPolling = typeof globalThis & {
  __productionPollingOwner?: string | null;
};

const globalProductionPolling = globalThis as GlobalProductionPolling;

// Tipos simplificados
interface Order {
  id: string;
  order_number: string;
  admin_code?: string | null;
  customer_name: string;
  status: string;
  fabric?: string;
  color?: string;
  quantity_total?: number;
  packages_count?: number | null;
  commercial_order_id?: string | null;
  region?: string;
  due_date?: string | null;
  created_at?: string | null;
  process_start_at?: string | null;
  sla_days?: number;
  delivery_address?: string | null;
  _is_canarias_urgent?: boolean;
  _is_grouped_material?: boolean;
  _priority_level?: 'critical' | 'warning' | 'material' | 'normal';
  _priority_score?: number;
  contact_name?: string | null;
  phone?: string | null;
  notes_internal?: string | null;
  qr_payload?: string;
  needs_shipping_validation?: boolean;
  lines?: Array<{
    id: string;
    quantity: number;
    width: number;
    height: number;
    notes?: string;
  }>;
  updated_at?: string | null;
}

const slaConfig: Record<string, number> = {
  // Baleares - 7 días laborables
  'MALLORCA': 7,
  'MENORCA': 7,
  'IBIZA': 7,
  'FORMENTERA': 7,
  'BALEARES': 7,

  // Península - 10 días laborables
  'PENINSULA': 10,

  // Canarias - 20 días laborables
  'CANARIAS': 20,
  'TENERIFE': 20,
  'GRAN_CANARIA': 20,
  'LANZAROTE': 20,
  'FUERTEVENTURA': 20,
  'LA_PALMA': 20,
  'LA_GOMERA': 20,
  'EL_HIERRO': 20,

  'DEFAULT': 10,
};



const renderLinePreview = (order: Order) => {
  if (!order.lines || !order.lines.length) return 'Sin desglose registrado';
  const preview = order.lines.slice(0, 2).map(line => `${line.quantity} x ${line.width}x${line.height}cm`).join('  ·  ');
  const remaining = order.lines.length > 2 ? ` +${order.lines.length - 2}` : '';
  return `${preview}${remaining}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function ProductionPage() {
  const STORAGE_SELECTED_KEY = "production.selectedOrderId";
  const STORAGE_SELECTED_PERSIST_KEY = "production.selectedOrderId.persist";
  const STORAGE_ORDERS_KEY = "production.ordersCache";
  const STORAGE_ACTIVE_TAB_KEY = "production.activeTab";
  const [orders, setOrders] = useState<Order[]>([]);
  const [qrInput, setQrInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [packagesInput, setPackagesInput] = useState<number>(1);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ordersSignatureRef = useRef("");
  const loadInFlightRef = useRef(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollPausedRef = useRef(false);
  const lastLoadAtRef = useRef(0);
  const instanceIdRef = useRef(`prod-${Math.random().toString(36).slice(2)}`);
  const activeQueueRef = useRef<Order[]>([]);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  // Hooks responsive
  const orientation = useOrientation();
  const deviceType = useDeviceType();

  // v3.1.0 - Estado de expansión vertical para móvil
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [printerStatus, setPrinterStatus] = useState<any>('checking');
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem(STORAGE_ACTIVE_TAB_KEY) || "active";
  });

  // Guardar la pestaña activa cuando cambie
  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    const cachedSelected = localStorage.getItem(STORAGE_SELECTED_PERSIST_KEY)
      || sessionStorage.getItem(STORAGE_SELECTED_KEY);
    if (cachedSelected) setSelectedOrderId(cachedSelected);

    const cachedOrders = sessionStorage.getItem(STORAGE_ORDERS_KEY);
    if (cachedOrders && !hasLoaded) {
      try {
        const parsed = JSON.parse(cachedOrders) as Order[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
          setHasLoaded(true);
          setIsLoading(false);
          if (cachedSelected) {
            const cachedMatch = parsed.find((o) => o.id === cachedSelected);
            if (cachedMatch) setScannedOrder(cachedMatch);
          }
        }
      } catch {
        sessionStorage.removeItem(STORAGE_ORDERS_KEY);
      }
    }
  }, [hasLoaded]);

  React.useEffect(() => {
    if (selectedOrderId) {
      sessionStorage.setItem(STORAGE_SELECTED_KEY, selectedOrderId);
      localStorage.setItem(STORAGE_SELECTED_PERSIST_KEY, selectedOrderId);
    } else {
      sessionStorage.removeItem(STORAGE_SELECTED_KEY);
      localStorage.removeItem(STORAGE_SELECTED_PERSIST_KEY);
    }
  }, [selectedOrderId]);

  // Estado para alertas móviles
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const checkPrinterStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('https://192.168.1.236:3003/print', {
        method: 'GET', // El servidor proxy debería responder a GET o simplemente no fallar por timeout
        signal: controller.signal
      }).catch(() => ({ ok: false }));

      clearTimeout(timeoutId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPrinterStatus(response.ok || (response as any).status === 404 ? 'online' : 'offline');
    } catch (e) {
      setPrinterStatus('offline');
    }
  }, []);

  // Zebra Keep-Alive Ping
  useEffect(() => {
    checkPrinterStatus();
    const interval = setInterval(checkPrinterStatus, 30000); // Cada 30 seg
    return () => clearInterval(interval);
  }, [checkPrinterStatus]);

  const showAlert = (type: AlertType, title: string, message: string, onConfirm?: () => void) => {
    setAlertState({
      isOpen: true,
      type,
      title,
      message,
      onConfirm
    });
  };

  const closeAlert = () => {
    if (alertState.onConfirm) alertState.onConfirm();
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  const handleIncidentClick = () => {
    if (!scannedOrder) {
      toast.error('Debes seleccionar o escanear un pedido para reportar una incidencia');
      return;
    }
    setIsIncidentModalOpen(true);
  };

  React.useEffect(() => {
    if (scannedOrder) {
      pollPausedRef.current = true;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    } else {
      pollPausedRef.current = false;
      if (!pollTimeoutRef.current) {
        pollTimeoutRef.current = setTimeout(() => {
          void loadOrders();
        }, 0);
      }
    }
  }, [scannedOrder]);

  // Cargar órdenes al montar
  React.useEffect(() => {
    if (globalProductionPolling.__productionPollingOwner && globalProductionPolling.__productionPollingOwner !== instanceIdRef.current) return;
    globalProductionPolling.__productionPollingOwner = instanceIdRef.current;
    const scheduleNext = (delay: number) => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      pollTimeoutRef.current = setTimeout(() => {
        void loadOrders();
      }, delay);
    };

    const handleVisibility = () => {
      pollPausedRef.current = document.hidden;
      if (document.hidden) {
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
      } else {
        scheduleNext(0);
      }
    };

    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      if (globalProductionPolling.__productionPollingOwner === instanceIdRef.current) {
        globalProductionPolling.__productionPollingOwner = null;
      }
    };
  }, []);

  const loadOrders = async () => {
    if (globalProductionPolling.__productionPollingOwner && globalProductionPolling.__productionPollingOwner !== instanceIdRef.current) return;
    if (pollPausedRef.current) return;
    if (loadInFlightRef.current) return;
    if (isPersisting) return;
    const now = Date.now();
    if (now - lastLoadAtRef.current < 3000) return;
    lastLoadAtRef.current = now;
    loadInFlightRef.current = true;
    const isFirstLoad = !hasLoaded;
    try {
      if (isFirstLoad) setIsLoading(true);
      // Keep logs quiet to avoid noise in production.

      const isMissingRelation = (error: any) => {
        const message = String(error?.message || '');
        return message.includes('does not exist') || message.includes('relation') || message.includes('schema');
      };

      const { data: ordersData, error: ordersError } = await supabaseProductivity
        .from('produccion_work_orders')
        .select('*')
        .order('created_at', { ascending: false });


      if (ordersError) throw ordersError;

      if (ordersData && ordersData.length > 0) {
        let linesData: any[] | null = null;
        try {
          const linesResponse = await supabaseProductivity
            .from('produccion_work_order_lines')
            .select('*')
            .in('work_order_id', ordersData.map((o: any) => o.id));
          linesData = linesResponse.data as any[] | null;
        } catch (lineError) {
          console.warn('Work order lines unavailable:', lineError);
        }

        let commercialOrders: any[] | null = null;
        try {
          const orderNumbers = ordersData
            .map((o: any) => o.order_number)
            .filter(Boolean);
          const adminCodes = ordersData
            .map((o: any) => o.admin_code)
            .filter(Boolean);
          if (orderNumbers.length > 0 || adminCodes.length > 0) {
            const escapedOrders = orderNumbers
              .map((value: any) => `"${String(value).replace(/"/g, '""')}"`)
              .join(',');
            const escapedAdmins = adminCodes
              .map((value: any) => `"${String(value).replace(/"/g, '""')}"`)
              .join(',');
            const orFilters = [
              escapedOrders ? `order_number.in.(${escapedOrders})` : null,
              escapedAdmins ? `admin_code.in.(${escapedAdmins})` : null
            ].filter(Boolean).join(',');
            const { data: commData, error: commError } = await supabaseProductivity
              .from('comercial_orders')
              .select('id, order_number, admin_code, lines, fabric, delivery_region, region')
              .or(orFilters);
            if (commError) {
              console.warn('Commercial orders unavailable:', commError);
            } else {
              commercialOrders = commData as any[] | null;
            }
          }
        } catch (commError) {
          console.warn('Commercial orders lookup failed:', commError);
        }

        const normalizeStatus = (raw?: string) => {
          const normalized = (raw || "").toUpperCase();
          const map: Record<string, string> = {
            'PAGADO': 'PENDIENTE',
            'EN_PROCESO': 'CORTE',
            'EN_CORTE': 'CORTE',
            'EN_CONFECCION': 'CONFECCION',
            'EN_CONTROL_CALIDAD': 'CONTROL_CALIDAD',
            'TERMINADO': 'LISTO_ENVIO'
          };
          return map[normalized] || normalized;
        };

        const ordersWithLines = ordersData.map((order: any) => {
          const commOrder = commercialOrders?.find((c: any) => c.order_number === order.order_number || (order.admin_code && c.admin_code === order.admin_code) || c.admin_code === order.order_number);
          const specs = order.technical_specs || {};
          // Priorizar lineas de comercial, luego JSON, si no, usar la tabla relacional
          const rawLines = (Array.isArray(commOrder?.lines) && commOrder.lines.length > 0)
            ? commOrder.lines
            : (Array.isArray(order.lines) && order.lines.length > 0)
              ? order.lines
              : (linesData?.filter((line: any) => line.work_order_id === order.id) || []);
          const lines = Array.isArray(rawLines) ? rawLines : [];
          const materialLines = [...lines].sort((a: any, b: any) => {
            const left = String(a.material || a.fabric || "").trim().toLowerCase();
            const right = String(b.material || b.fabric || "").trim().toLowerCase();
            return left.localeCompare(right);
          });
          const materialList = summarizeMaterials(materialLines, commOrder?.fabric || specs.fabric || order.fabric || "N/D");

          const colorList = lines.length > 0
            ? lines.map((l: any) => l.color).filter(Boolean).join(", ")
            : (specs.color || order.color || "N/D");

          const fabric = materialList || "N/D";
          const color = colorList || "N/D";

          const region = commOrder?.delivery_region || commOrder?.region || order.region || specs.region || 'PENINSULA';
          const normalizedStatus = normalizeStatus(order.status);
          const dueDate = order.due_date || order.estimated_completion || null;
          const processStartAt = order.process_start_at || order.started_at || null;
          return {
            ...order,
            order_number: order.admin_code || order.order_number || order.work_order_number || order.id,
            admin_code: order.admin_code || null,
            status: normalizedStatus,
            region,
            fabric,
            color,
            quantity_total: order.quantity_total || order.quantity || specs.quantity || 1,
            due_date: dueDate,
            process_start_at: processStartAt,
            commercial_order_id: commOrder?.id || null,
            lines
          };
        });

        const signature = ordersWithLines
          .map((o) => `${o.id}:${o.order_number || ''}:${o.status || ''}:${o.quantity_total || ''}:${o.fabric || ''}:${o.packages_count || ''}:${o.lines?.length || 0}`)
          .sort()
          .join('|');
        if (signature !== ordersSignatureRef.current) {
          setOrders(ordersWithLines);
          ordersSignatureRef.current = signature;
          sessionStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(ordersWithLines));
        }

        const selectedId = selectedOrderId || scannedOrder?.id;
        if (selectedId) {
          const refreshed = ordersWithLines.find((o) => o.id === selectedId);
          if (refreshed) {
            if (!scannedOrder || scannedOrder.id !== refreshed.id || scannedOrder.status !== refreshed.status ||
              scannedOrder.fabric !== refreshed.fabric || scannedOrder.quantity_total !== refreshed.quantity_total ||
              (scannedOrder.lines?.length || 0) !== (refreshed.lines?.length || 0)) {
              setScannedOrder(refreshed);
            }
          }
        }
        // NOTA: No seleccionamos automáticamente ningún pedido.
        // El usuario debe escanear o seleccionar manualmente.
      } else {
        if (orders.length > 0) {
          setOrders([]);
          ordersSignatureRef.current = "";
        }
        sessionStorage.removeItem(STORAGE_ORDERS_KEY);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar ordenes: ' + error.message);
    } finally {
      loadInFlightRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      if (!pollPausedRef.current) {
        pollTimeoutRef.current = setTimeout(() => {
          void loadOrders();
        }, 30000); // Aumentado a 30 segundos para reducir parpadeo
      }
      if (isFirstLoad) {
        setIsLoading(false);
        setHasLoaded(true);
      }
    }
  };

  const activeQueue = useMemo(() => {
    const filtered = orders.filter(order => {
      const activeStatuses = ['PENDIENTE', 'CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'PAGADO', 'EN_PROCESO'];
      return activeStatuses.includes(order.status);
    });

    // v3.1.0 - Aplicar ordenación senior
    const sorted = sortWorkOrdersByPriority(filtered as any);

    if (!isPersisting) {
      activeQueueRef.current = sorted as any;
      return sorted as any;
    }

    return activeQueueRef.current;
  }, [orders, isPersisting]);

  const historyQueue = useMemo(() => {
    return orders
      .filter(order => {
        const historyStatuses = ['TERMINADO', 'LISTO_ENVIO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
        return historyStatuses.includes(order.status);
      })
      .sort((a, b) => {
        const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bDate - aDate; // Más recientes arriba
      });
  }, [orders]);

  const persistOrderUpdate = async (orderId: string, patch: Partial<Order>) => {
    const nextOrders = orders.map(o => o.id === orderId ? { ...o, ...patch } as Order : o);
    setOrders(nextOrders);

    // Sincronización inmediata con caché de sesión para evitar pérdida de memoria al recargar
    sessionStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(nextOrders));

    setScannedOrder(prev => prev && prev.id === orderId ? { ...prev, ...patch } as Order : prev);
    try {
      const payload: any = { ...patch };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseProductivity as any)
        .from('produccion_work_orders')
        .update(payload)
        .eq('id', orderId);

      if (error) throw error;
    } catch (error: any) {
      toast.error('Error sincronizando con Supabase: ' + error.message);
    }
  };

  const handleScan = (code: string) => {
    // Parsear el código QR usando la utilidad centralizada
    const qrData = parseQRCode(code);
    const orderNum = qrData.orderNumber || extractOrderNumber(code);

    const order = orders.find(o => o.order_number === orderNum);

    if (order) {
      // Validar los datos del QR contra la orden de la BD INCLUYENDO el desglose de líneas
      const validation = validateQRWithLines(qrData, {
        order_number: order.order_number,
        customer_name: order.customer_name,
        fabric: order.fabric,
        color: order.color,
        quantity_total: order.quantity_total,
        status: order.status,
        lines: order.lines,  // ← NUEVO: Validar desglose de líneas
      });

      setScannedOrder(order);
      setSelectedOrderId(order.id);
      setCameraActive(false);
      setQrInput('');
      setPackagesInput(order.packages_count || 1);

      // Mostrar alertas según el resultado de la validación
      if (!validation.isValid) {
        showAlert('error', 'QR Inválido', 'El número de orden del QR no coincide con ningún pedido en el sistema.');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        return;
      }

      // Verificar discrepancias en el desglose de líneas
      if (validation.linesDiscrepancies && validation.linesDiscrepancies.length > 0) {
        const linesMessage = validation.linesDiscrepancies.join('\n');
        showAlert(
          'warning',
          '⚠️ Advertencia: Problemas en el desglose',
          `Se detectaron problemas en el desglose de artículos:\n\n${linesMessage}\n\nRevisa el pedido antes de continuar.`
        );
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
      } else if (validation.hasDiscrepancies) {
        // Mostrar advertencia si hay discrepancias en datos técnicos básicos
        const discrepancyMessage = validation.discrepancies.join('\n');
        showAlert(
          'warning',
          'Advertencia: Discrepancias detectadas',
          `Se encontraron diferencias entre el QR y la base de datos:\n\n${discrepancyMessage}\n\nSe usarán los datos de la base de datos.`
        );
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else if (qrData.isLegacyFormat) {
        // Informar si es formato antiguo
        toast.info(`QR en formato antiguo - Datos técnicos cargados desde BD`);
      } else {
        // Éxito total - QR nuevo y validado con desglose correcto
        const linesCount = order.lines?.length || 0;
        toast.success(`✓ Orden ${orderNum} validada (${linesCount} líneas)`);
      }
    } else {
      // Alerta bloqueante para error de escaneo
      showAlert('error', 'Pedido no encontrado', `El código ${orderNum} no existe en el sistema actual.`);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    }
  };

  const startProduction = async () => {
    if (!scannedOrder) return;
    setIsPersisting(true);
    try {
      const sla = slaConfig[scannedOrder.region || 'DEFAULT'] || slaConfig['DEFAULT'];
      const now = new Date();
      const due = new Date();
      due.setDate(now.getDate() + sla);
      const updated = {
        status: 'CORTE',
        sla_days: sla,
        process_start_at: now.toISOString(),
        due_date: due.toISOString()
      };
      await persistOrderUpdate(scannedOrder.id, updated);
      toast.success('Producción iniciada exitosamente');
    } finally {
      setIsPersisting(false);
    }
  };

  const initiateFinish = () => setShowFinishModal(true);

  const printShippingLabel = async () => {
    if (!scannedOrder) return;

    const labelWidth = '60mm';
    const labelHeight = '86mm';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&ecc=H&data=${encodeURIComponent(scannedOrder.qr_payload || scannedOrder.order_number)}`;

    const orderNumber = escapeHtml(scannedOrder.order_number);
    const customerName = escapeHtml(scannedOrder.customer_name || 'Sin cliente');
    const contactName = escapeHtml(scannedOrder.contact_name || '-');
    const deliveryAddress = escapeHtml(scannedOrder.delivery_address || 'Sin dirección');
    const region = escapeHtml(scannedOrder.region || '-');
    const packageCount = escapeHtml(String(packagesInput));
    const totalUnits = escapeHtml(String(scannedOrder.quantity_total || 0));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Etiqueta - ${orderNumber}</title>
          <style>
            @page { size: ${labelWidth} ${labelHeight}; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: ${labelWidth};
              height: ${labelHeight};
              font-family: Arial, sans-serif;
              background: white;
              color: black;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label {
              width: ${labelWidth};
              height: ${labelHeight};
              padding: 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
            .topline { font-size: 2mm; font-weight: 700; letter-spacing: 0.5mm; text-transform: uppercase; margin-bottom: 1mm; }
            .brand { font-size: 4mm; font-weight: 900; text-transform: uppercase; margin-bottom: 0.5mm; }
            .site { font-size: 2mm; color: #333; margin-bottom: 1mm; }
            .badge { background: #111; color: #fff; width: 100%; font-size: 2.5mm; font-weight: 800; text-transform: uppercase; padding: 1mm 0; margin-bottom: 1mm; }
            .order { font-size: 5mm; font-weight: 900; margin-bottom: 1.5mm; }
            .info { width: 100%; border: 0.3mm solid #999; background: #f2f2f2; padding: 2mm; font-size: 2mm; line-height: 1.4; text-align: left; margin-bottom: 2mm; }
            .info-row { margin-bottom: 0.8mm; }
            .info-label { font-weight: 900; text-transform: uppercase; }
            .qr { width: 40mm; height: 40mm; margin: 2mm auto; border: 0.4mm solid #111; display: block; }
            .counts { border: 0.4mm solid #111; font-weight: 900; font-size: 3.5mm; padding: 1.5mm; margin: 1mm 0; text-transform: uppercase; }
            .units { font-size: 2.5mm; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="topline">PRODUCCION</div>
            <div class="brand">DECORACIONES EGEA</div>
            <div class="site">www.decoracionesegea.com</div>
            <div class="badge">ETIQUETA DE ENVIO</div>
            <div class="order">${orderNumber}</div>
            <div class="info">
              <div class="info-row"><span class="info-label">Cliente:</span> ${customerName}</div>
              <div class="info-row"><span class="info-label">Contacto:</span> ${contactName}</div>
              <div class="info-row"><span class="info-label">Dirección:</span> ${deliveryAddress}</div>
              <div class="info-row"><span class="info-label">Región:</span> ${region}</div>
            </div>
            <img class="qr" src="${qrUrl}" alt="QR" />
            <div class="counts">BULTOS: ${packageCount}</div>
            <div class="units">Total Unidades: ${totalUnits}</div>
          </div>
        </body>
      </html>
    `;

    console.log('📄 Generando etiqueta pequeña:', orderNumber);

    try {
      printHtmlToIframe(htmlContent);
      toast.success('Etiqueta 60x86mm generada');
      await confirmProductionFinish();
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('Error al generar etiqueta');
    }
  };



  const printZebraLabel = async () => {
    if (!scannedOrder) return;

    const orderNumber = escapeZpl(scannedOrder.order_number);
    const customer = escapeZpl(scannedOrder.customer_name || 'Sin cliente');
    const contact = escapeZpl(scannedOrder.contact_name || '-');
    const address = escapeZpl(scannedOrder.delivery_address || 'Sin direccion');
    const region = escapeZpl(scannedOrder.region || '-');
    const packages = String(packagesInput);
    const units = String(scannedOrder.quantity_total || 0);
    const qrContent = scannedOrder.qr_payload || scannedOrder.order_number;

    // ZPL para Etiqueta 10x15cm (795x1200 dots @ 203dpi) - RESTAURADO A FOTO 2 (VERSIÓN QR EXTRA GRANDE)
    const zpl = `
^XA
^PW795
^LL1200
^PON
^CI28

^FO50,60^A0N,50,50^FB695,1,0,C^FDPRODUCCIÓN^FS
^FO50,120^A0N,60,60^FB695,1,0,C^FDDECORACIONES EGEA^FS
^FO50,190^A0N,35,35^FB695,1,0,C^FDwww.decoracionesegea.com^FS

^FO50,250^GB695,60,60^FS
^FO50,260^A0N,45,45^FR^FB695,1,0,C^FDETIQUETA DE ENVÍO^FS

^FO50,350^A0N,75,75^FB695,1,0,C^FD${orderNumber}^FS

^FO70,470^A0N,42,42^FDCliente: ${customer}^FS
^FO70,525^A0N,42,42^FDContacto: ${contact}^FS
^FO70,580^A0N,40,40^FB675,2,0,L^FDDirección: ${address}^FS
^FO70,665^A0N,42,42^FDRegión: ${region}^FS

^FO320,740^BQN,2,6^FDQA,${qrContent}^FS

^FO50,1050^A0N,60,60^FB695,1,0,C^FDBULTOS: ${packages}^FS
^FO50,1125^A0N,50,50^FB695,1,0,C^FDTotal Unidades: ${units}^FS

^XZ`;

    console.log('🦓 Enviando ZPL al servidor proxy en Raspberry Pi (HTTPS)');
    console.log('📍 URL:', 'https://192.168.1.236:3003/print');
    console.log('📦 Tamaño ZPL:', zpl.length, 'bytes');

    try {
      // Enviar al servidor proxy HTTPS en Raspberry Pi (puerto 3003)
      const response = await fetch('https://192.168.1.236:3003/print', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: zpl
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        throw new Error(error.error || 'Error al imprimir');
      }

      const result = await response.json();
      console.log('✅ Resultado:', result);

      toast.success('Etiqueta enviada a impresora Zebra');
    } catch (error: any) {
      console.error('💥 Error completo:', error);
      console.error('💥 Error name:', error.name);
      console.error('💥 Error message:', error.message);

      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error('No se puede conectar al servidor de impresión. Verifica que estés en la misma red WiFi.');
      } else {
        toast.error(`Error: ${error.message || 'No se pudo conectar con la impresora'}`);
      }
    }
  };

  const printA4Document = async () => {
    if (!scannedOrder) return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scannedOrder.qr_payload || scannedOrder.order_number)}`;
    const orderNumber = escapeHtml(scannedOrder.order_number);
    const customerName = escapeHtml(scannedOrder.customer_name || 'Sin cliente');
    const contactName = escapeHtml(scannedOrder.contact_name || '-');
    const deliveryAddress = escapeHtml(scannedOrder.delivery_address || 'Sin dirección');
    const region = escapeHtml(scannedOrder.region || '-');
    const packageCount = escapeHtml(String(packagesInput));
    const totalUnits = escapeHtml(String(scannedOrder.quantity_total || 0));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Albarán - ${orderNumber}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #000; background: #fff; }
            .document { max-width: 170mm; margin: 0 auto; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10mm; margin-bottom: 10mm; }
            .company { font-size: 24pt; font-weight: 900; margin-bottom: 5mm; }
            .doc-type { font-size: 18pt; font-weight: 700; background: #000; color: #fff; padding: 3mm; }
            .order-number { font-size: 32pt; font-weight: 900; text-align: center; margin: 10mm 0; }
            .section { margin-bottom: 8mm; }
            .section-title { font-size: 12pt; font-weight: 700; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 3mm; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
            .info-item { margin-bottom: 3mm; }
            .info-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #666; }
            .info-value { font-size: 11pt; margin-top: 1mm; }
            .qr-section { text-align: center; margin: 10mm 0; }
            .qr-section img { width: 100mm; height: 100mm; border: 2px solid #000; }
            .summary { background: #f5f5f5; border: 2px solid #000; padding: 5mm; margin-top: 10mm; }
            .summary-row { display: flex; justify-content: space-between; font-size: 14pt; font-weight: 700; margin-bottom: 3mm; }
            .footer { text-align: center; margin-top: 15mm; font-size: 9pt; color: #666; }
          </style>
        </head>
        <body>
          <div class="document">
            <div class="header">
              <div class="company">DECORACIONES EGEA</div>
              <div>www.decoracionesegea.com</div>
              <div class="doc-type">ALBARÁN DE ENVÍO</div>
            </div>

            <div class="order-number">${orderNumber}</div>

            <div class="section">
              <div class="section-title">Datos del Cliente</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Cliente</div>
                  <div class="info-value">${customerName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Contacto</div>
                  <div class="info-value">${contactName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Dirección de Entrega</div>
                  <div class="info-value">${deliveryAddress}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Región</div>
                  <div class="info-value">${region}</div>
                </div>
              </div>
            </div>

            <div class="qr-section">
              <img src="${qrUrl}" alt="Código QR" />
            </div>

            <div class="summary">
              <div class="summary-row">
                <span>Total Bultos:</span>
                <span>${packageCount}</span>
              </div>
              <div class="summary-row">
                <span>Total Unidades:</span>
                <span>${totalUnits}</span>
              </div>
            </div>

            <div class="footer">
              Documento generado automáticamente - ${new Date().toLocaleString('es-ES')}
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('📄 Generando albarán A4:', orderNumber);

    try {
      printHtmlToIframe(htmlContent);
      toast.success('Albarán A4 generado');
      await confirmProductionFinish();
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('Error al generar albarán');
    }
  };

  const confirmProductionFinish = async () => {
    if (!scannedOrder) return;
    setIsPersisting(true);
    try {
      const diffDays = scannedOrder.due_date
        ? Math.ceil((new Date(scannedOrder.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      const needsValidation = diffDays <= 2;
      await persistOrderUpdate(scannedOrder.id, {
        status: 'LISTO_ENVIO',
        packages_count: packagesInput,
        needs_shipping_validation: needsValidation
      });

      // Sincronizar con comercial_orders (PTE_ENVIO)
      // Buscamos tanto por ID como por número de pedido para asegurar que "siga el proceso de venta"
      if (scannedOrder.commercial_order_id || scannedOrder.order_number) {
        console.log('🔄 Sincronizando con comercial_orders:', scannedOrder.order_number);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = (supabaseProductivity as any).from('comercial_orders').update({ status: 'PTE_ENVIO' });

        if (scannedOrder.commercial_order_id) {
          await query.eq('id', scannedOrder.commercial_order_id);
        } else {
          await query.eq('order_number', scannedOrder.order_number);
        }

        console.log('✅ Estado comercial sincronizado');
      }

      toast.success('Producción finalizada. Orden lista para envío');
      setShowFinishModal(false);

      // Auto-continuidad: Buscar el siguiente pedido en la cola de producción
      const nextInQueue = activeQueue.find(o => o.id !== scannedOrder.id);

      if (nextInQueue) {
        setScannedOrder(nextInQueue);
        setSelectedOrderId(nextInQueue.id);
        setPackagesInput(nextInQueue.packages_count || 1);
        toast.info(`Siguiente pedido cargado: ${nextInQueue.order_number}`);
      } else {
        setScannedOrder(null);
      }
    } finally {
      setIsPersisting(false);
    }
  };

  return (
    <PageShell
      title="Producción y Corte"
      description="Control de fabricación y corte de material"
      className="space-y-0"
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full border border-border">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              printerStatus === 'online' ? "bg-emerald-500" :
                printerStatus === 'offline' ? "bg-red-500" : "bg-amber-500"
            )} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Zebra {printerStatus === 'online' ? 'OK' : printerStatus === 'offline' ? 'Error' : '...'}
            </span>
          </div>
          <div className="flex gap-2">
            {scannedOrder && (
              <IncidentReportButton
                onClick={handleIncidentClick}
                size="sm"
              />
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 relative">
        {/* ESCÁNER RESPONSIVE CON BOTÓN CTA */}
        <RoleBasedRender hideForRoles={['admin', 'manager']}>
          <div className="w-full">
            {/* Scanner Button */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="text-foreground font-bold">Escaneo de Producción</h3>
              </div>

              <ScannerButton
                onActivate={() => setScannerModalOpen(true)}
                isActive={scannerModalOpen}
                size={deviceType === 'mobile' ? 'mobile' : deviceType === 'tablet' ? 'tablet' : 'desktop'}
                fullWidth
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              />

              {/* Input Manual Debajo */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="O introduce código manualmente..."
                  className="flex-1 bg-muted/40 border border-border rounded-lg px-4 py-3 text-base text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary outline-none"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)}
                />
                <button
                  onClick={() => handleScan(qrInput)}
                  className="px-5 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-semibold flex items-center justify-center min-w-[60px]"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </RoleBasedRender>

        {/* Scanner Modal */}
        <ScannerModal
          isOpen={scannerModalOpen}
          onClose={() => setScannerModalOpen(false)}
          onScan={(code) => {
            handleScan(code);
            setScannerModalOpen(false);
          }}
          title="Escanear Pedido en Producción"
        />

        {/* CONTENEDOR DE COLA Y DETALLE - LADO A LADO EN DESKTOP */}
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* COLA DE PRODUCCIÓN */}
          <div className="w-full lg:w-[450px] shrink-0 flex flex-col gap-4">
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              // Limpiar selección al cambiar de pestaña para evitar "ghost selection"
              setScannedOrder(null);
              setSelectedOrderId(null);
            }} className="w-full">
              <div className="p-1 mb-4">
                <TabsList className="grid w-full grid-cols-2 bg-transparent">
                  <TabsTrigger
                    value="active"
                    className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground py-2.5 rounded-lg flex items-center justify-center gap-2 h-11"
                  >
                    <ListFilter className="w-4 h-4" />
                    Activos ({activeQueue.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground py-2.5 rounded-lg flex items-center justify-center gap-2 h-11"
                  >
                    <History className="w-4 h-4" />
                    Historial
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="active" className="m-0 focus-visible:ring-0">
                <div className="flex flex-col min-h-[500px]">
                  <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-widest mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-primary" />
                    Cola de producción activa
                  </h3>
                  {isLoading && <div className="text-sm text-muted-foreground py-4">Cargando órdenes...</div>}
                  {!isLoading && activeQueue.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center opacity-40 py-12">
                      <CheckCircle className="w-12 h-12 mb-3" />
                      <p className="text-sm font-medium">Todo al día</p>
                      <p className="text-xs uppercase tracking-tighter">No hay pedidos pendientes</p>
                    </div>
                  )}
                  {!isLoading && activeQueue.length > 0 && (
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-2">
                      {activeQueue.map((order: any) => {
                        const isSelected = scannedOrder?.id === order.id;
                        const isExpanded = expandedOrderId === order.id;
                        const dueInfo = getDueBadge(order);

                        // Determinar clase de borde según requerimiento v3.1.0
                        let borderClass = "";
                        const level = order._priority_level;
                        const isKiosk = deviceType === 'tablet' || deviceType === 'desktop'; // Permitir parpadeo en escritorio para mejor visibilidad

                        if (level === 'critical') borderClass = isKiosk ? "blink-priority-urgent" : "border-priority-urgent";
                        else if (level === 'warning') borderClass = isKiosk ? "blink-priority-canarias" : "border-priority-canarias";
                        else if (level === 'material') borderClass = isKiosk ? "blink-priority-material" : "border-priority-material";

                        return (
                          <div key={order.id} className="order-expandable-container">
                            <button
                              onClick={() => {
                                if (deviceType === 'mobile') {
                                  setExpandedOrderId(isExpanded ? null : order.id);
                                }
                                setScannedOrder(order);
                                setSelectedOrderId(order.id);
                                setPackagesInput(order.packages_count || 1);
                              }}
                              className={cn(
                                "w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                                isSelected ? "bg-primary/10 border-primary/50" : "bg-card border-border hover:border-primary/30",
                                borderClass
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono font-bold text-sm tracking-tight ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                      {order.order_number}
                                    </span>
                                    {order._is_canarias_urgent && (
                                      <span className="px-2 py-0.5 bg-orange-600/20 border border-orange-500/50 rounded text-[10px] font-bold text-orange-300 flex items-center gap-1">
                                        CANARIAS
                                      </span>
                                    )}
                                    {order._is_grouped_material && (
                                      <span className="px-2 py-0.5 bg-emerald-600/20 border border-emerald-500/50 rounded text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                                        AGRUPADO
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {daysToDueDate(order.due_date) !== 999 && (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getUrgencyBadge(daysToDueDate(order.due_date)!).color}`}>
                                        {getUrgencyBadge(daysToDueDate(order.due_date)!).label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                  <div className={dueInfo.badge}>{dueInfo.label}</div>
                                  {order.due_date && daysToDueDate(order.due_date) !== 999 && (
                                    <div className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1 bg-muted rounded border border-border min-w-[65px] text-center">
                                      <span className="text-sm block leading-none">{daysToDueDate(order.due_date)}</span>
                                      DÍAS
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-foreground text-base leading-tight">
                                  {order.customer_name}
                                </p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Package className="w-3 h-3" /> {order.quantity_total} uds
                                  </span>
                                  <span className="opacity-50">•</span>
                                  <span>{order.fabric}</span>
                                </div>
                              </div>
                            </button>

                            {/* Expansión Vertical (Solo Móvil) */}
                            {deviceType === 'mobile' && (
                              <div className={cn("order-details-expanded", isExpanded && "show")}>
                                <div className="bg-muted border border-border rounded-xl p-4 mt-2 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{order.status}</span>
                                    <div className="flex gap-2">
                                      {['PENDIENTE', 'CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD'].includes(order.status) && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); initiateFinish(); }}
                                          className="p-2 bg-emerald-600 text-white rounded-lg"
                                        >
                                          <CheckCircle className="w-5 h-5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); printZebraLabel(); }}
                                        className="p-2 bg-primary text-primary-foreground rounded-lg"
                                      >
                                        <Printer className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Info Detallada */}
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-card p-2 rounded border border-border">
                                      <p className="text-[10px] text-muted-foreground">Material</p>
                                      <p className="font-bold text-foreground truncate">{order.fabric}</p>
                                    </div>
                                    <div className="bg-card p-2 rounded border border-border">
                                      <p className="text-[10px] text-muted-foreground">Total Uds</p>
                                      <p className="font-bold text-foreground">{order.quantity_total}</p>
                                    </div>
                                  </div>

                                  {/* Desglose resumido */}
                                  <div className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded italic">
                                    {renderLinePreview(order)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="m-0 focus-visible:ring-0">
                <div className="flex flex-col min-h-[500px]">
                  <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-widest mb-4 flex items-center">
                    <History className="w-4 h-4 mr-2 text-emerald-500" />
                    Historial de pedidos finalizados
                  </h3>
                  {!isLoading && historyQueue.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center opacity-40 py-12">
                      <p className="text-sm font-medium">Historial vacío</p>
                    </div>
                  )}
                  {!isLoading && historyQueue.length > 0 && (
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-2">
                      {historyQueue.map((order) => {
                        const isSelected = scannedOrder?.id === order.id;
                        return (
                          <button
                            key={order.id}
                            onClick={() => {
                              setScannedOrder(order);
                              setSelectedOrderId(order.id);
                              setPackagesInput(order.packages_count || 1);
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-card border-border hover:border-border/80 opacity-75 hover:opacity-100'
                              }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono font-bold text-sm text-muted-foreground">
                                {order.order_number}
                              </span>
                              <div className={cn(
                                "text-[10px] rounded-full px-2 py-0.5 font-bold uppercase border",
                                order.status === 'ENVIADO' ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
                                  order.status === 'ENTREGADO' ? "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30" :
                                    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              )}>
                                {order.status}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-foreground text-sm">
                                {order.customer_name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Finalizado: {order.updated_at ? new Date(order.updated_at).toLocaleString() : '---'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="flex-1">
            {scannedOrder ? (
              <div className="bg-card border border-border rounded-2xl h-full flex flex-col">
                <div className="border-b border-border p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{scannedOrder.order_number}</h2>
                      <p className="text-sm text-muted-foreground">{scannedOrder.customer_name || 'Cliente Nuevo'}</p>
                    </div>
                    <span className="text-sm px-3 py-1 bg-muted text-foreground rounded-full">{scannedOrder.status}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Protocolo de revisión detallado */}
                  {['CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <div className="bg-warning/10 border border-warning/30 p-5 rounded-xl flex items-start gap-4">
                      <AlertOctagon className="w-8 h-8 text-[hsl(var(--warning))] shrink-0 mt-1" />
                      <div className="text-sm">
                        <h4 className="font-bold text-[hsl(var(--warning))] uppercase mb-2 tracking-wide text-lg">PROTOCOLO DE REVISIÓN</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li>• Atención: revisa que <strong>color y medidas</strong> coincidan con la orden.</li>
                          <li>• Introduce el número correcto de bultos al finalizar.</li>
                          <li>• Valida e imprime las etiquetas correspondientes.</li>
                          <li>• Si la impresión falla, usa el botón <strong>REIMPRIMIR</strong>.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Información de producción */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/30 p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Material</p>
                      <p className="font-bold text-foreground">{scannedOrder.fabric || 'Sin especificar'}</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Total Uds</p>
                      <p className="font-bold text-foreground">{scannedOrder.quantity_total || 0}</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Bultos</p>
                      <p className="font-bold text-foreground">{scannedOrder.packages_count || 'Por definir'}</p>
                    </div>
                  </div>

                  {/* Modal de finalización */}
                  {showFinishModal && (
                    <div className="py-2 mt-4">
                      <h3 className="text-indigo-400 font-bold text-lg mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2" />
                        Generación de Bultos
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Indica el número total de bultos generados. Esta información se imprimirá en la etiqueta.
                      </p>
                      <div className="flex flex-col lg:flex-row items-center gap-6 py-4">
                        <div className="production-stepper flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPackagesInput((prev) => Math.max(1, (prev || 1) - 1))}
                            className="h-12 w-12 rounded-xl border border-border bg-transparent text-foreground text-2xl font-bold hover:bg-muted transition"
                            aria-label="Reducir bultos"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={packagesInput}
                            onChange={(e) => setPackagesInput(parseInt(e.target.value) || 1)}
                            className="w-24 sm:w-28 bg-transparent border border-border rounded-xl p-3 text-center text-2xl font-bold text-foreground focus:ring-2 focus:ring-primary outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setPackagesInput((prev) => (prev || 1) + 1)}
                            className="h-12 w-12 rounded-xl border border-border bg-transparent text-foreground text-2xl font-bold hover:bg-muted transition"
                            aria-label="Aumentar bultos"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex-1 w-full min-w-0">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button
                              onClick={printShippingLabel}
                              disabled={isPersisting}
                              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-[11px] uppercase"
                            >
                              <Printer className="w-4 h-4 mr-2 hidden sm:block" />
                              PDF
                            </button>
                            <button
                              onClick={() => {
                                // 1. Lanzamos a imprimir inmediatamente (sin esperar al servidor)
                                printZebraLabel();
                                // 2. Al mismo tiempo mostramos la advertencia
                                showAlert(
                                  'success',
                                  'ETIQUETA IMPRESA',
                                  '¿Se ha impreso la etiqueta correctamente? Pulsa Aceptar para finalizar el pedido y pasar al siguiente paso.',
                                  confirmProductionFinish
                                );
                              }}
                              disabled={isPersisting}
                              className="w-full py-4 bg-[#FF6B35] hover:bg-[#FF8555] text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-[11px] uppercase"
                            >
                              <Printer className="w-4 h-4 mr-2 hidden sm:block" />
                              Etiqueta
                            </button>
                            <button
                              onClick={printA4Document}
                              disabled={isPersisting}
                              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-[11px] uppercase"
                            >
                              <FileText className="w-4 h-4 mr-2 hidden sm:block" />
                              A4
                            </button>
                            <button
                              onClick={() => {
                                showAlert(
                                  'warning',
                                  'VALIDAR SIN ETIQUETAS',
                                  '¡ATENCIÓN! Vas a finalizar el pedido SIN imprimir etiquetas físicas. ¿Estás seguro? Utiliza esta opción solo si la impresora falla.',
                                  confirmProductionFinish
                                );
                              }}
                              disabled={isPersisting}
                              className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-[11px] uppercase shadow-lg shadow-amber-900/20"
                            >
                              <CheckCircle className="w-4 h-4 mr-2 hidden sm:block" />
                              Validar
                            </button>
                          </div>
                          {/* Mensaje de ayuda para errores de impresión */}
                          <p className="text-[10px] text-[#8B8D90] text-center mt-3 italic">
                            Si Zebra da error de "Timeout", verifica el papel o la Raspberry.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabla de desglose */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium">Cant.</th>
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium">Medidas</th>
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {scannedOrder.lines && scannedOrder.lines.length > 0 ? (
                          scannedOrder.lines.map((line, idx) => (
                            <tr key={line.id || `${scannedOrder.id}-${idx}`}>
                              <td className="px-4 py-2 font-bold text-foreground">{line.quantity}</td>
                              <td className="px-4 py-2 text-muted-foreground">{line.width} x {line.height}</td>
                              <td className="px-4 py-2 italic text-muted-foreground">{line.notes || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                              Sin desglose registrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="p-6 border-t border-border">
                  {scannedOrder.status === 'PENDIENTE' && (
                    <button
                      onClick={startProduction}
                      disabled={isPersisting}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl flex items-center justify-center transition disabled:opacity-50"
                    >
                      <Clock className="w-6 h-6 mr-2" />
                      INICIAR PRODUCCIÓN
                    </button>
                  )}

                  {['CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD'].includes(scannedOrder.status) && !showFinishModal && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={initiateFinish}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl flex items-center justify-center transition gap-2 shadow-lg shadow-emerald-900/20"
                      >
                        <CheckCircle className="w-6 h-6 flex-shrink-0" />
                        <span>FINALIZAR (A ENVÍO)</span>
                      </button>

                      <button
                        onClick={() => {
                          showAlert(
                            'warning',
                            'FINALIZAR SIN ETIQUETAS',
                            '¿Confirmas finalizar el pedido SIN imprimir etiquetas físicas? Usa esta opción si la Zebra no responde.',
                            confirmProductionFinish
                          );
                        }}
                        className="w-full py-3 bg-warning/10 hover:bg-warning/20 text-[hsl(var(--warning))] font-bold text-sm rounded-xl flex items-center justify-center transition border border-warning/30"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        OMITIR IMPRESIÓN Y FINALIZAR
                      </button>
                    </div>
                  )}

                  {scannedOrder.status === 'LISTO_ENVIO' && (
                    <div className="flex gap-2">
                      <button
                        onClick={printShippingLabel}
                        className="flex-1 py-3 px-3 bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm rounded-lg flex items-center justify-center transition gap-2"
                      >
                        <Printer className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Reimprimir</span>
                      </button>
                      <button
                        onClick={printZebraLabel}
                        className="flex-1 py-3 px-3 bg-primary text-primary-foreground font-semibold text-sm rounded-lg flex items-center justify-center transition gap-2"
                      >
                        <Printer className="w-4 h-4 flex-shrink-0" />
                      </button>
                      <div className="flex-[2] py-3 px-3 bg-muted text-emerald-500 rounded-lg font-semibold text-xs sm:text-sm text-center border border-emerald-500/30 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Listo ({scannedOrder.packages_count} Bultos)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20 p-12">
                <QrCode className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Escanea un código para ver detalles</p>
                <p className="text-sm text-center max-w-md mt-2">
                  Usa el escáner de la izquierda o selecciona una orden de la lista para comenzar.
                </p>
              </div>
            )}
          </div>
        </div>

        <MobileAlert
          isOpen={alertState.isOpen}
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          onConfirm={closeAlert}
        />

        {scannedOrder && (
          <IncidentReportModal
            isOpen={isIncidentModalOpen}
            onClose={() => setIsIncidentModalOpen(false)}
            orderId={scannedOrder.id}
            orderNumber={scannedOrder.order_number}
          />
        )}
      </div>
    </PageShell >
  );
}

export default ProductionPage;
