import React, { useMemo, useRef, useState } from 'react';
import { supabaseProductivity } from '@/integrations/supabase';
import { QrCode, Camera, ArrowRight, Clock, CheckCircle, Printer, Package, AlertTriangle, AlertOctagon, FileText, History, ListFilter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PageShell from '@/components/layout/PageShell';
import QRScanner from '@/components/common/QRScanner';
import { RoleBasedRender } from '@/components/common/RoleBasedRender';
import { MobileAlert, AlertType } from '@/components/common/MobileAlert';
import { IncidentReportButton } from '@/components/incidents/IncidentReportButton';
import { IncidentReportModal } from '@/components/incidents/IncidentReportModal';
import { toast } from 'sonner';
import { printHtmlToIframe } from '@/utils/print';
import { parseQRCode, validateQRWithLines, extractOrderNumber } from '@/lib/qr-utils';
import { summarizeMaterials } from '@/lib/materials';

function escapeZpl(str: string): string {
  if (!str) return "";
  return str.replace(/_/g, " ").replace(/\\/g, "\\\\").replace(/\^/g, " ").replace(/~/g, " ");
}

const getDueBadge = (order: Order) => {
  if (!order.due_date) {
    return { label: 'Sin fecha', badge: 'text-[#B5B8BA]' };
  }
  const days = Math.ceil((new Date(order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return { label: 'Vencido', badge: 'text-red-300 bg-red-900/30 border border-red-500/30 rounded-full px-3 py-0.5 text-xs font-bold' };
  if (days <= 2) return { label: `${days} días`, badge: 'text-amber-300 bg-amber-900/30 border border-amber-500/30 rounded-full px-3 py-0.5 text-xs font-bold' };
  return { label: `${days} días`, badge: 'text-emerald-300 bg-emerald-900/20 border border-emerald-500/30 rounded-full px-3 py-0.5 text-xs font-bold' };
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
  // Baleares - 7 días
  'MALLORCA': 7,
  'MENORCA': 7,        // CORREGIDO: era 10
  'IBIZA': 7,          // CORREGIDO: era 10
  'FORMENTERA': 7,     // CORREGIDO: era 12
  'BALEARES': 7,

  // Península - 10 días
  'PENINSULA': 10,     // CORREGIDO: era 14

  // Canarias - 15 días
  'CANARIAS': 15,
  'TENERIFE': 15,
  'GRAN_CANARIA': 15,
  'LANZAROTE': 15,
  'FUERTEVENTURA': 15,
  'LA_PALMA': 15,
  'LA_GOMERA': 15,
  'EL_HIERRO': 15,

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [qrInput, setQrInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
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
              .select('id, order_number, admin_code, lines, fabric')
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

          const normalizedStatus = normalizeStatus(order.status);
          const dueDate = order.due_date || order.estimated_completion || null;
          const processStartAt = order.process_start_at || order.started_at || null;
          return {
            ...order,
            order_number: order.order_number || order.work_order_number || order.id,
            status: normalizedStatus,
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
        }, 10000);
      }
      if (isFirstLoad) {
        setIsLoading(false);
        setHasLoaded(true);
      }
    }
  };

  const activeQueue = useMemo(() => {
    const nextQueue = orders
      .filter(order => {
        const activeStatuses = ['PENDIENTE', 'CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'PAGADO', 'EN_PROCESO'];
        return activeStatuses.includes(order.status);
      })
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : Infinity;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : Infinity;
        return aDate - bDate;
      });

    if (!isPersisting) {
      activeQueueRef.current = nextQueue;
      return nextQueue;
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
    setOrders((prev: Order[]) => prev.map(o => o.id === orderId ? { ...o, ...patch } as Order : o));
    setScannedOrder(prev => prev && prev.id === orderId ? { ...prev, ...patch } as Order : prev);
    try {
      const payload: any = { ...patch };

      // @ts-ignore
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

    // ZPL para Etiqueta 10x15cm (795x1200 dots @ 203dpi)
    const zpl = `
^XA
^CI28
^CF0,30
^FO50,50^GB700,1110,3^FS
^FO220,115^A0N,50,50^FDPRODUCCIÓN^FS
^FO130,175^A0N,60,60^FDDECORACIONES EGEA^FS
^FO50,240^A0N,30,30^FB695,1,0,C^FDwww.decoracionesegea.com^FS
^FO0,260^GB800,0,3^FS
^FO210,310^GB380,60,60^FS
^FO230,320^A0N,40,40^FR^FDETIQUETA DE ENVÍO^FS
^FO0,410^GB800,0,3^FS
^FO150,440^A0N,100,100^FD${orderNumber}^FS
^FO50,580^A0N,30,30^FDCliente: ${customer}^FS
^FO50,620^A0N,30,30^FDContacto: ${contact}^FS
^FO50,660^A0N,30,30^FDDirección: ${address}^FS
^FO50,710^A0N,30,30^FDRegión: ${region}^FS
^FO247,730^BQN,2,8^FDQA,${qrContent}^FS
^FO320,1030^A0N,40,40^FDBULTOS: ${packages}^FS
^FO270,1075^A0N,30,30^FDTotal Unidades: ${units}^FS
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
      await confirmProductionFinish();
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
      if (scannedOrder.commercial_order_id) {
        console.log('🔄 Sincronizando con comercial_orders:', scannedOrder.commercial_order_id);
        const { error: commError } = await supabaseProductivity
          .from('comercial_orders')
          .update({ status: 'PTE_ENVIO' })
          .eq('id', scannedOrder.commercial_order_id);

        if (commError) {
          console.warn('⚠️ No se pudo actualizar el estado en comercial_orders:', commError);
        } else {
          console.log('✅ Estado comercial actualizado a PTE_ENVIO');
        }
      }

      toast.success('Producción finalizada. Orden lista para envío');
      setShowFinishModal(false);
      setScannedOrder(null);
    } finally {
      setIsPersisting(false);
    }
  };

  return (
    <PageShell
      title="Producción y Corte"
      description="Control de fabricación y corte de material"
      actions={
        <div className="flex gap-2">
          {scannedOrder && (
            <IncidentReportButton
              onClick={handleIncidentClick}
              size="sm"
            />
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-6 relative">
        {/* ESCÁNER - PANTALLA COMPLETA */}
        <RoleBasedRender hideForRoles={['admin', 'manager']}>
          <div className="w-full">
            {/* Escáner */}
            <div className="bg-[#1A1D21] border border-[#2A2D31] rounded-lg p-2">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-5 h-5 text-[#FF6B35]" />
                <h3 className="text-white font-bold">Escáner de producción</h3>
              </div>
              {!cameraActive ? (
                <button
                  onClick={() => setCameraActive(true)}
                  className="w-full aspect-[3/4] min-h-[600px] bg-[#0D0F11] rounded-lg border-2 border-dashed border-[#2A2D31] flex flex-col items-center justify-center gap-3 text-[#B5B8BA] hover:text-white hover:border-[#FF6B35]/40 transition"
                >
                  <Camera className="w-16 h-16" />
                  <span className="text-lg font-semibold">Activar cámara</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <QRScanner onScan={handleScan} onClose={() => setCameraActive(false)} />
                  <button
                    onClick={() => setCameraActive(false)}
                    className="w-full py-3 bg-[#2A2D31] text-white rounded-lg hover:bg-[#3A3D41] transition font-medium"
                  >
                    Cerrar cámara
                  </button>
                </div>
              )}
            </div>

            {/* Input Manual Debajo */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Código del pedido o escanea QR..."
                className="flex-1 bg-[#0D0F11] border border-[#2A2D31] rounded-lg px-4 py-3 text-base text-white placeholder-[#6E6F71] focus:ring-2 focus:ring-[#FF6B35] outline-none"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)}
              />
              <button
                onClick={() => handleScan(qrInput)}
                className="px-5 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF8555] transition font-semibold flex items-center justify-center min-w-[60px]"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </RoleBasedRender>

        {/* CONTENEDOR DE COLA Y DETALLE - LADO A LADO EN DESKTOP */}
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* COLA DE PRODUCCIÓN */}
          <div className="w-full lg:w-[450px] shrink-0 flex flex-col gap-4">
            <Tabs defaultValue="active" className="w-full">
              <div className="bg-[#1A1D21] border border-[#2A2D31] rounded-xl p-1 mb-4">
                <TabsList className="grid w-full grid-cols-2 bg-transparent">
                  <TabsTrigger
                    value="active"
                    className="data-[state=active]:bg-[#2A2D31] data-[state=active]:text-white text-[#B5B8BA] py-2.5 rounded-lg flex items-center justify-center gap-2 h-11"
                  >
                    <ListFilter className="w-4 h-4" />
                    Activos ({activeQueue.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-[#2A2D31] data-[state=active]:text-white text-[#B5B8BA] py-2.5 rounded-lg flex items-center justify-center gap-2 h-11"
                  >
                    <History className="w-4 h-4" />
                    Historial
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="active" className="m-0 focus-visible:ring-0">
                <div className="bg-[#1A1D21] border border-[#2A2D31] rounded-2xl p-4 flex flex-col min-h-[500px]">
                  <h3 className="text-[#B5B8BA] font-bold text-xs uppercase tracking-widest mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-indigo-400" />
                    Cola de producción activa
                  </h3>
                  {isLoading && <div className="text-sm text-[#B5B8BA] py-4">Cargando órdenes...</div>}
                  {!isLoading && activeQueue.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#B5B8BA] text-center opacity-40 py-12">
                      <CheckCircle className="w-12 h-12 mb-3" />
                      <p className="text-sm font-medium">Todo al día</p>
                      <p className="text-xs uppercase tracking-tighter">No hay pedidos pendientes</p>
                    </div>
                  )}
                  {!isLoading && activeQueue.length > 0 && (
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-2">
                      {activeQueue.map((order) => {
                        const isSelected = scannedOrder?.id === order.id;
                        const dueInfo = getDueBadge(order);
                        return (
                          <button
                            key={order.id}
                            onClick={() => {
                              setScannedOrder(order);
                              setSelectedOrderId(order.id);
                              setPackagesInput(order.packages_count || 1);
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${isSelected
                              ? 'bg-indigo-900/10 border-indigo-500/50 ring-1 ring-indigo-500/20'
                              : 'bg-[#0D0F11] border-[#2A2D31] hover:border-[#3A3D41] hover:bg-[#121417]'
                              }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className={`font-mono font-bold text-sm tracking-tight ${isSelected ? 'text-indigo-400' : 'text-[#B5B8BA]'}`}>
                                {order.order_number}
                              </span>
                              <div className={dueInfo.badge}>{dueInfo.label}</div>
                            </div>
                            <div className="space-y-2">
                              <p className="font-bold text-white text-base leading-tight">
                                {order.customer_name}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#B5B8BA]">
                                <span className="flex items-center gap-1">
                                  <Package className="w-3 h-3" /> {order.quantity_total} uds
                                </span>
                                <span className="opacity-50">•</span>
                                <span>{order.fabric}</span>
                              </div>
                              <div className="mt-2">
                                <div className="flex justify-between text-[10px] text-[#B5B8BA] transition-all mb-1">
                                  <span className="uppercase font-bold tracking-wider">{order.status}</span>
                                  <span>{Math.round((['CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'LISTO_ENVIO'].indexOf(order.status) + 1) / 5 * 100)}%</span>
                                </div>
                                <div className="w-full bg-[#0D0F11] border border-[#2A2D31] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
                                    style={{ width: `${(['CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'LISTO_ENVIO'].indexOf(order.status) + 1) / 5 * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="m-0 focus-visible:ring-0">
                <div className="bg-[#1A1D21] border border-[#2A2D31] rounded-2xl p-4 flex flex-col min-h-[500px]">
                  <h3 className="text-[#B5B8BA] font-bold text-xs uppercase tracking-widest mb-4 flex items-center">
                    <History className="w-4 h-4 mr-2 text-emerald-400" />
                    Historial de pedidos finalizados
                  </h3>
                  {!isLoading && historyQueue.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#B5B8BA] text-center opacity-40 py-12">
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
                              ? 'bg-emerald-900/10 border-emerald-500/50 ring-1 ring-emerald-500/20'
                              : 'bg-[#0D0F11] border-[#2A2D31] hover:border-[#3A3D41] opacity-75 hover:opacity-100'
                              }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono font-bold text-sm text-[#B5B8BA]">
                                {order.order_number}
                              </span>
                              <div className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 font-bold uppercase">
                                {order.status}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-white text-sm">
                                {order.customer_name}
                              </p>
                              <p className="text-[10px] text-[#B5B8BA]">
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
              <div className="bg-[#1A1D21] border border-[#2A2D31] rounded-2xl h-full flex flex-col">
                <div className="border-b border-[#2A2D31] p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{scannedOrder.order_number}</h2>
                      <p className="text-sm text-[#B5B8BA]">{scannedOrder.customer_name || 'Cliente Nuevo'}</p>
                    </div>
                    <span className="text-sm px-3 py-1 bg-[#2A2D31] text-white rounded-full">{scannedOrder.status}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Protocolo de revisión detallado */}
                  {['CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <div className="bg-amber-900/10 border border-amber-500/30 p-5 rounded-xl flex items-start gap-4">
                      <AlertOctagon className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
                      <div className="text-sm">
                        <h4 className="font-bold text-amber-400 uppercase mb-2 tracking-wide text-lg">PROTOCOLO DE REVISIÓN</h4>
                        <ul className="space-y-2 text-[#B5B8BA]">
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
                    <div className="bg-[#0D0F11] p-3 rounded-lg border border-[#2A2D31]">
                      <p className="text-xs text-[#B5B8BA]">Material</p>
                      <p className="font-bold text-white">{scannedOrder.fabric || 'Sin especificar'}</p>
                    </div>
                    <div className="bg-[#0D0F11] p-3 rounded-lg border border-[#2A2D31]">
                      <p className="text-xs text-[#B5B8BA]">Total Uds</p>
                      <p className="font-bold text-white">{scannedOrder.quantity_total || 0}</p>
                    </div>
                    <div className="bg-[#0D0F11] p-3 rounded-lg border border-[#2A2D31]">
                      <p className="text-xs text-[#B5B8BA]">Bultos</p>
                      <p className="font-bold text-white">{scannedOrder.packages_count || 'Por definir'}</p>
                    </div>
                  </div>

                  {/* Modal de finalización */}
                  {showFinishModal && (
                    <div className="bg-indigo-900/20 border border-indigo-500/50 p-6 rounded-xl">
                      <h3 className="text-indigo-400 font-bold text-lg mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2" />
                        Generación de Bultos
                      </h3>
                      <p className="text-[#B5B8BA] text-sm mb-4">
                        Indica el número total de bultos generados. Esta información se imprimirá en la etiqueta.
                      </p>
                      <div className="flex flex-col lg:flex-row items-stretch gap-4">
                        <div className="production-stepper flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPackagesInput((prev) => Math.max(1, (prev || 1) - 1))}
                            className="h-12 w-12 rounded-xl border border-[#2A2D31] bg-transparent text-white text-2xl font-bold hover:bg-transparent transition"
                            aria-label="Reducir bultos"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={packagesInput}
                            onChange={(e) => setPackagesInput(parseInt(e.target.value) || 1)}
                            className="w-24 sm:w-28 bg-transparent border border-[#2A2D31] rounded-xl p-3 text-center text-2xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setPackagesInput((prev) => (prev || 1) + 1)}
                            className="h-12 w-12 rounded-xl border border-[#2A2D31] bg-transparent text-white text-2xl font-bold hover:bg-transparent transition"
                            aria-label="Aumentar bultos"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <button
                            onClick={printShippingLabel}
                            disabled={isPersisting}
                            className="production-action-button w-full py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-sm"
                          >
                            <Printer className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span className="hidden sm:inline">PDF</span>
                            <span className="sm:hidden">PDF</span>
                          </button>
                          <button
                            onClick={printZebraLabel}
                            disabled={isPersisting}
                            className="production-action-button w-full py-3 sm:py-4 bg-[#FF6B35] hover:bg-[#FF8555] text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-sm"
                          >
                            <Printer className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span className="hidden sm:inline">Zebra</span>
                            <span className="sm:hidden">Zebra</span>
                          </button>
                          <button
                            onClick={printA4Document}
                            disabled={isPersisting}
                            className="production-action-button w-full py-3 sm:py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-sm"
                          >
                            <FileText className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span className="hidden sm:inline">A4</span>
                            <span className="sm:hidden">A4</span>
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
                            className="production-action-button w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-sm shadow-lg shadow-amber-900/20"
                          >
                            <CheckCircle className="w-6 h-6 mr-2 flex-shrink-0" />
                            <span>VALIDAR (SIN IMPRIMIR)</span>
                          </button>
                        </div>
                        {/* Mensaje de ayuda para errores de impresión */}
                        <p className="text-[10px] text-[#8B8D90] text-center mt-2 italic">
                          Si Zebra da error de "Timeout", verifica que el papel no esté atascado y que la Raspberry esté encendida.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tabla de desglose */}
                  <div className="border border-[#2A2D31] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0D0F11]">
                        <tr>
                          <th className="px-4 py-2 text-left text-[#B5B8BA] font-medium">Cant.</th>
                          <th className="px-4 py-2 text-left text-[#B5B8BA] font-medium">Medidas</th>
                          <th className="px-4 py-2 text-left text-[#B5B8BA] font-medium">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2D31]">
                        {scannedOrder.lines && scannedOrder.lines.length > 0 ? (
                          scannedOrder.lines.map((line, idx) => (
                            <tr key={line.id || `${scannedOrder.id}-${idx}`}>
                              <td className="px-4 py-2 font-bold text-white">{line.quantity}</td>
                              <td className="px-4 py-2 text-[#B5B8BA]">{line.width} x {line.height}</td>
                              <td className="px-4 py-2 italic text-[#B5B8BA]">{line.notes || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-[#B5B8BA]">
                              Sin desglose registrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="p-6 border-t border-[#2A2D31]">
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
                    <button
                      onClick={initiateFinish}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base rounded-lg flex items-center justify-center transition gap-2"
                    >
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="whitespace-nowrap">Finalizar (A Envío)</span>
                    </button>
                  )}

                  {scannedOrder.status === 'LISTO_ENVIO' && (
                    <div className="flex gap-2">
                      <button
                        onClick={printShippingLabel}
                        className="flex-1 py-3 px-3 bg-[#2A2D31] hover:bg-[#3A3D41] text-white font-semibold text-sm rounded-lg flex items-center justify-center transition gap-2"
                      >
                        <Printer className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Reimprimir</span>
                      </button>
                      <button
                        onClick={printZebraLabel}
                        className="flex-1 py-3 px-3 bg-[#FF6B35] hover:bg-[#FF8555] text-white font-semibold text-sm rounded-lg flex items-center justify-center transition gap-2"
                      >
                        <Printer className="w-4 h-4 flex-shrink-0" />
                      </button>
                      <div className="flex-[2] py-3 px-3 bg-[#0D0F11] text-emerald-400 rounded-lg font-semibold text-xs sm:text-sm text-center border border-emerald-500/30 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Listo ({scannedOrder.packages_count} Bultos)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-[#2A2D31] rounded-2xl flex flex-col items-center justify-center text-[#B5B8BA] bg-[#0D0F11] p-12">
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
    </PageShell>
  );
}

export default ProductionPage;
