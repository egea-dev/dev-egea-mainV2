import React, { useState, useEffect, useMemo } from 'react';
import { supabaseProductivity } from '@/integrations/supabase';
import {
  AlertTriangle,
  Truck,
  CheckCircle,
  QrCode,
  Camera,
  ArrowRight,
  Package,
  User,
  FileOutput,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  Copy,
  PauseCircle,
  AlertOctagon,
  History,
  ListFilter,
  Calendar
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PageShell from '@/components/layout/PageShell';
import QRScanner from '@/components/common/QRScanner';
import { RoleBasedRender } from '@/components/common/RoleBasedRender';
import { toast } from 'sonner';
import { printHtmlToIframe } from '@/utils/print';
import { MobileAlert, AlertType } from '@/components/common/MobileAlert';
import { TrackingToggle } from '@/components/shipping/TrackingToggle';
import { IncidentReportButton } from '@/components/incidents/IncidentReportButton';
import { IncidentReportModal } from '@/components/incidents/IncidentReportModal';
import { parseQRCode, validateQRWithLines, extractOrderNumber } from '@/lib/qr-utils';
import { summarizeMaterials } from '@/lib/materials';
import { ScannerButton } from '@/components/scanner/ScannerButton';
import { ScannerModal } from '@/components/scanner/ScannerModal';
import { useOrientation, useDeviceType } from '@/hooks/useOrientation';
import { sortWorkOrdersByPriority, daysToDueDate, getUrgencyBadge } from '@/services/priority-service';
import { cn } from "@/lib/utils";
import ShippingCalendar from '@/components/shipping/ShippingCalendar';

// Tipos
interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  fabric?: string;
  color?: string;
  quantity_total?: number;
  quantity_shipped?: number;
  packages_count?: number | null;
  scanned_packages?: number;
  tracking_number?: string;
  shipping_date?: string;
  process_start_at?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  packaging_type?: string | null;
  needs_shipping_validation?: boolean;
  region?: string;
  delivery_address?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  admin_code?: string | null;
  google_maps_link?: string | null;
  notes_internal?: string | null;
  lines?: Array<{
    id: string;
    quantity: number;
    width: number;
    height: number;
    notes?: string;
    material?: string;
  }>;
  documents?: Array<{
    type: string;
  }>;
  tracking_pending?: boolean;
  _is_canarias_urgent?: boolean;
  _is_grouped_material?: boolean;
  _priority_level?: 'critical' | 'warning' | 'material' | 'normal';
  _priority_score?: number;
}

// Eliminada lÃ³gica de TWELVE_HOURS_MS para que los envÃ­os pasen al historial inmediatamente

const summarizeLines = (order: Order) => {
  if (!order.lines || !order.lines.length) return 'Sin desglose cargado';
  const preview = order.lines.slice(0, 2).map(line => `${line.quantity} x ${line.width}x${line.height}cm`).join('  Â·  ');
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

export default function ShippingScanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [qrInput, setQrInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [scannedPackagesCount, setScannedPackagesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTrackingNow, setHasTrackingNow] = useState(true);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Hooks responsive
  const orientation = useOrientation();
  const deviceType = useDeviceType();

  // Estado para alertas mÃ³viles
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

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      console.log('ðŸ” Cargando Ã³rdenes de envÃ­o...');

      const { data: ordersData, error: ordersError } = await (supabaseProductivity.from('produccion_work_orders') as any)
        .select('*')
        .order('created_at', { ascending: false });

      console.log('ðŸ“¦ Ã“rdenes recibidas:', ordersData?.length || 0, 'registros');
      if (ordersError) console.error('âŒ Error cargando Ã³rdenes:', ordersError);

      if (ordersError) throw ordersError;

      // Fetch lines for these orders
      const { data: linesData, error: linesError } = await supabaseProductivity
        .from('produccion_work_order_lines')
        .select('*')
        .in('work_order_id', ordersData?.map((o: any) => o.id) || []);

      if (linesError) {
        console.warn('Error fetching work order lines:', linesError);
      }

      // Fetch commercial data for region and specific fabric
      const { data: commResp } = await supabaseProductivity
        .from('comercial_orders')
        .select('id, order_number, admin_code, delivery_region, region, lines, fabric')
        .in('order_number', ordersData?.map((o: any) => o.order_number) || []);

      const commercialData = (commResp as any[]) || [];

      const data = ordersData?.map((o: any) => {
        const commOrder = commercialData.find((c: any) => c.order_number === o.order_number || (o.admin_code && c.admin_code === o.admin_code));

        // Priorizar lÃ­neas de la columna JSON, si no, usar la tabla relacional
        const lines = (Array.isArray(o.lines) && o.lines.length > 0)
          ? o.lines
          : (linesData?.filter((l: any) => l.work_order_id === o.id) || []);

        const specs = o.technical_specs || {};
        const materialList = summarizeMaterials(lines, commOrder?.fabric || specs.fabric || o.fabric || "N/D");

        const colorList = lines.length > 0
          ? lines.map((l: any) => l.color).filter(Boolean).join(", ")
          : (specs.color || o.color || "N/D");

        const region = commOrder?.delivery_region || commOrder?.region || o.region || specs.region || 'PENINSULA';

        return {
          ...o,
          lines,
          fabric: materialList || "N/D",
          color: colorList || "N/D",
          region,
          quantity_total: o.quantity_total || specs.quantity || 1
        };
      });
      setOrders(data || []);
    } catch (error: any) {
      console.error('ðŸ’¥ Error loading orders:', error);
      toast.error('Error al cargar Ã³rdenes: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar Ã³rdenes al montar
  useEffect(() => {
    loadOrders();
  }, []);

  const activeShipments = useMemo(() => {
    // Estados que ya NO deben aparecer en expediciones activas
    const archivedStatuses = ['ENVIADO', 'ENTREGADO', 'CANCELADO'];

    // Log para depuraciÃ³n
    console.log('ðŸ“‹ Estados de pedidos cargados:', orders.map(o => ({ order_number: o.order_number, status: o.status })));

    const filtered = orders.filter(o => {
      // Excluir pedidos ya archivados
      if (archivedStatuses.includes(o.status)) return false;

      // Solo mostrar pedidos LISTO_ENVIO (producciÃ³n terminada, listos para escanear)
      return o.status === 'LISTO_ENVIO';
    });

    // APLICAR PRIORIZACIÃ“N DINÃMICA
    return sortWorkOrdersByPriority(filtered as any);
  }, [orders]);

  const historyShipments = useMemo(() => {
    return orders.filter(o => {
      // Solo pedidos ya enviados o entregados van al historial
      // LISTO_ENVIO NO estÃ¡ aquÃ­ porque ahora estÃ¡ en activeShipments
      return o.status === 'ENVIADO' || o.status === 'ENTREGADO';
    });
  }, [orders]);

  const persistOrderUpdate = async (orderId: string, patch: Partial<Order>) => {
    // Actualizar estado local inmediatamente
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o));
    setScannedOrder(prev => prev && prev.id === orderId ? { ...prev, ...patch } : prev);
    if (patch.scanned_packages !== undefined) setScannedPackagesCount(patch.scanned_packages || 0);

    try {
      // Solo enviar campos que existen en produccion_work_orders
      const validFields: Record<string, any> = {};

      // Campos vÃ¡lidos segÃºn el esquema de produccion_work_orders
      const allowedFields = ['status', 'priority', 'notes', 'quality_check_status', 'updated_at'];

      for (const key of allowedFields) {
        if ((patch as any)[key] !== undefined) {
          validFields[key] = (patch as any)[key];
        }
      }

      // Siempre actualizar updated_at
      validFields.updated_at = new Date().toISOString();

      if (Object.keys(validFields).length > 1) { // MÃ¡s que solo updated_at
        const { error } = await supabaseProductivity
          .from('produccion_work_orders')
          .update(validFields as any)
          .eq('id', orderId);

        if (error) {
          console.error('Error actualizando produccion_work_orders:', error);
          throw error;
        }
      }

      // SincronizaciÃ³n con comercial_orders si el estado cambia
      if (patch.status) {
        const order = orders.find(o => o.id === orderId);
        if (order && order.order_number) {
          console.log(`ðŸ”„ Sincronizando estado ${patch.status} con comercial para orden ${order.order_number}`);

          const { error: syncError } = await supabaseProductivity
            .from('comercial_orders')
            .update({ status: patch.status } as any)
            .eq('order_number', order.order_number);

          if (syncError) {
            console.warn("Error sincronizando estado con comercial:", syncError);
          } else {
            console.log(`âœ“ Sincronizado estado ${patch.status} en comercial_orders para ${order.order_number}`);
          }
        }
      }

      await loadOrders();
    } catch (error: any) {
      toast.error('Error sincronizando pedido: ' + error.message);
    }
  };

  const handleScan = async (code: string) => {
    // Parsear el cÃ³digo QR usando la utilidad centralizada
    const qrData = parseQRCode(code);
    const orderNum = qrData.orderNumber || extractOrderNumber(code);

    if (scannedOrder && scannedOrder.order_number === orderNum) {
      const currentCount = scannedOrder.scanned_packages || 0;
      const total = scannedOrder.packages_count || 1;
      if (currentCount < total) {
        const newCount = currentCount + 1;
        setScannedPackagesCount(newCount);
        await persistOrderUpdate(scannedOrder.id, { scanned_packages: newCount });
        toast.success(`Bulto verificado (${newCount}/${total})`, { duration: 900 });
      }
      return;
    }

    if (scannedOrder && scannedOrder.order_number !== orderNum && scannedPackagesCount > 0 && scannedPackagesCount < (scannedOrder.packages_count || 1)) {
      showAlert('error', 'Â¡ALTO!', 'EstÃ¡s escaneando un pedido diferente mientras el actual estÃ¡ incompleto. No mezcles pedidos.', () => { });
      return;
    }

    const order = orders.find(o => o.order_number === orderNum);
    if (order) {
      // Validar los datos del QR contra la orden de la BD INCLUYENDO el desglose de lÃ­neas
      const validation = validateQRWithLines(qrData, {
        order_number: order.order_number,
        customer_name: order.customer_name,
        fabric: order.fabric,
        color: order.color,
        quantity_total: order.quantity_total,
        status: order.status,
        lines: order.lines,  // â† NUEVO: Validar desglose de lÃ­neas
      });

      // Mostrar alertas segÃºn el resultado de la validaciÃ³n
      if (!validation.isValid) {
        showAlert('error', 'QR InvÃ¡lido', 'El nÃºmero de orden del QR no coincide con ningÃºn pedido en el sistema.');
        return;
      }

      // Verificar discrepancias en el desglose de lÃ­neas
      if (validation.linesDiscrepancies && validation.linesDiscrepancies.length > 0) {
        const linesMessage = validation.linesDiscrepancies.join('\n');
        showAlert(
          'warning',
          'âš ï¸ Advertencia: Problemas en el desglose',
          `Se detectaron problemas en el desglose de artÃ­culos:\n\n${linesMessage}\n\nRevisa el pedido antes de continuar.`
        );
      } else if (validation.hasDiscrepancies) {
        const discrepancyMessage = validation.discrepancies.join('\n');
        showAlert(
          'warning',
          'Advertencia: Discrepancias detectadas',
          `Se encontraron diferencias entre el QR y la base de datos:\n\n${discrepancyMessage}\n\nSe usarÃ¡n los datos de la base de datos.`
        );
      } else if (qrData.isLegacyFormat) {
        toast.info(`QR en formato antiguo - Datos tÃ©cnicos cargados desde BD`);
      }

      // Validar que la orden estÃ© lista para envÃ­o
      const validStatuses = ['PTE_ENVIO', 'LISTO_ENVIO', 'ENVIADO'];
      const isValidForShipping = validStatuses.includes(order.status) ||
        (order.status === 'EN_PROCESO' && order.needs_shipping_validation);

      if (!isValidForShipping) {
        toast.error(`Este pedido no estÃ¡ listo para envÃ­o (Estado: ${order.status})`);
        return;
      }
      const isReEntry = (order.scanned_packages || 0) > 0 && (order.scanned_packages || 0) < (order.packages_count || 1);
      if (isReEntry) {
        await persistOrderUpdate(order.id, { scanned_packages: 0 });
      }
      setScannedOrder(order);
      setCameraActive(false);
      setQrInput('');
      setTrackingNumber(order.tracking_number || '');
      setScannedPackagesCount(order.scanned_packages || 0);

      const linesCount = order.lines?.length || 0;
      toast.success(`âœ“ Orden ${orderNum} validada (${linesCount} lÃ­neas)`);
    } else {
      toast.error(`Pedido no encontrado: ${orderNum}`);
    }
  };

  const updateOrderProgress = async (orderId: string, newCount: number) => {
    setScannedPackagesCount(newCount);
    await persistOrderUpdate(orderId, { scanned_packages: newCount });
  };

  const validateShipment = async () => {
    if (!scannedOrder) return;
    const totalPackages = scannedOrder.packages_count || 1;
    const resolvedTracking = hasTrackingNow ? trackingNumber.trim() : '';

    if (scannedPackagesCount < totalPackages) {
      showAlert('warning', 'Pedido Incompleto', `Debes verificar todos los bultos (${scannedPackagesCount}/${totalPackages}) escaneando el QR antes de validar.`);
      return;
    }

    try {
      console.log('ðŸš€ Iniciando validaciÃ³n de envÃ­o para:', scannedOrder.id);

      // Cambiar estado a ENVIADO para que aparezca en historial
      // (ENVIADO indica que ya fue validado y despachado)
      const { data: prodData, error: prodError } = await (supabaseProductivity as any)
        .from('produccion_work_orders')
        .update({
          status: 'ENVIADO',  // Estado final despuÃ©s de validar envÃ­o
          tracking_number: resolvedTracking || null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', scannedOrder.id)
        .select();

      console.log('ðŸ“¤ Resultado update produccion_work_orders:', { prodData, prodError });

      if (prodError) {
        console.error('âŒ Error actualizando produccion_work_orders:', prodError);
        toast.error('Error al actualizar el estado del pedido: ' + prodError.message);
        return;
      }

      // Sincronizar con comercial_orders - aquÃ­ sÃ­ usamos ENVIADO
      if (scannedOrder.order_number) {
        console.log(`ðŸ”„ Sincronizando estado ENVIADO con comercial para orden ${scannedOrder.order_number}`);
        const { data: commData, error: commError } = await (supabaseProductivity as any)
          .from('comercial_orders')
          .update({
            status: 'ENVIADO',
            shipping_notification_pending: true,
            tracking_number: resolvedTracking || null
          } as any)
          .eq('order_number', scannedOrder.order_number)
          .select();

        console.log('ðŸ“¤ Resultado update comercial_orders:', { commData, commError });

        if (commError) {
          console.warn('âš ï¸ Error sincronizando con comercial_orders:', commError);
        } else if (!commData || commData.length === 0) {
          console.log(`â„¹ï¸ No existe pedido comercial con order_number ${scannedOrder.order_number} - sincronizaciÃ³n no aplicable (pedido solo de producciÃ³n)`);
        } else {
          console.log(`âœ“ Sincronizado estado ENVIADO en comercial_orders para ${scannedOrder.order_number}`);
        }

        // Archivar el pedido llamando a la funciÃ³n de base de datos
        console.log(`ðŸ“¦ Archivando pedido ${scannedOrder.order_number}...`);
        const { data: archiveData, error: archiveError } = await (supabaseProductivity as any)
          .rpc('archive_completed_order', {
            p_order_number: scannedOrder.order_number,
            p_shipped_at: new Date().toISOString(),
            p_tracking_number: resolvedTracking || null
          });

        if (archiveError) {
          console.warn('âš ï¸ No se pudo archivar (funciÃ³n RPC puede no existir aÃºn):', archiveError.message);
          // No bloquear el flujo si el archivado falla - puede que la migraciÃ³n no se haya aplicado
        } else {
          console.log(`âœ“ Pedido archivado con ID: ${archiveData}`);
        }
      }

      // Alerta de Ã©xito
      toast.success('âœ“ EnvÃ­o validado correctamente');

      await loadOrders();
      setScannedOrder(null);
    } catch (error: any) {
      console.error('âŒ Error general en validateShipment:', error);
      toast.error('Error al validar envÃ­o: ' + error.message);
    }
  };

  const printManifest = () => {
    if (!scannedOrder) return;
    const logoUrl = '/logo-placeholder.png';
    const safe = (value: string | number | null | undefined) => escapeHtml(String(value ?? '-'));
    const orderNumber = safe(scannedOrder.order_number);
    const adminCode = safe(scannedOrder.admin_code || '---');
    const customerName = safe(scannedOrder.customer_name || 'Sin cliente');
    const contactName = safe(scannedOrder.contact_name || '-');
    const phone = safe(scannedOrder.phone || '-');
    const deliveryAddress = safe(scannedOrder.delivery_address || '-');
    const region = safe(scannedOrder.region || '-');
    const status = safe(scannedOrder.status || '-');
    const fabric = safe(scannedOrder.fabric || '-');
    const color = safe(scannedOrder.color || '-');
    const packageCount = safe(scannedOrder.packages_count || 1);
    const scannedCount = safe(scannedOrder.scanned_packages || 0);
    const totalUnits = safe(scannedOrder.quantity_total || 0);
    const trackingId = safe(trackingNumber || scannedOrder.tracking_number || '-');
    const shippingDate = scannedOrder.shipping_date ? new Date(scannedOrder.shipping_date).toLocaleDateString() : '-';
    const productionStart = scannedOrder.process_start_at ? new Date(scannedOrder.process_start_at).toLocaleDateString() : '-';
    const createdAt = scannedOrder.created_at ? new Date(scannedOrder.created_at).toLocaleDateString() : '-';
    const dueDate = scannedOrder.due_date ? new Date(scannedOrder.due_date).toLocaleDateString() : '-';
    const packagingType = safe(scannedOrder.packaging_type || 'Estandar');
    const today = new Date().toLocaleDateString();
    const linesHtml = (scannedOrder.lines || [])
      .map((line) => {
        const material = safe(line.material || scannedOrder.fabric || '-');
        const size = safe(`${line.width || '-'}x${line.height || '-'}cm`);
        const qty = safe(line.quantity || 0);
        const notes = safe(line.notes || '-');
        return `
          <tr>
            <td>${qty}</td>
            <td>${material}</td>
            <td>${size}</td>
            <td>${notes}</td>
          </tr>
        `;
      })
      .join('');
    const linesTable = linesHtml
      ? `
        <tbody>
          ${linesHtml}
        </tbody>
      `
      : `
        <tbody>
          <tr>
            <td colspan="4" class="empty">Sin desglose registrado</td>
          </tr>
        </tbody>
      `;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Albaran Salida - ${orderNumber}</title>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4; margin: 12mm; }
            body {
              font-family: Arial, sans-serif;
              color: #111;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #111;
              padding-bottom: 6mm;
              margin-bottom: 6mm;
            }
            .logo {
              width: 42mm;
              height: 14mm;
              object-fit: contain;
            }
            .title {
              font-size: 18pt;
              font-weight: 800;
              text-transform: uppercase;
            }
            .meta {
              font-size: 9pt;
              text-align: right;
            }
            .meta div { margin-bottom: 1mm; }
            .section {
              border: 1px solid #d0d0d0;
              padding: 4mm;
              margin-bottom: 5mm;
            }
            .section h3 {
              margin: 0 0 3mm 0;
              font-size: 10pt;
              text-transform: uppercase;
              letter-spacing: 0.6pt;
              color: #333;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2mm 8mm;
              font-size: 9pt;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 6mm;
            }
            .label {
              font-weight: 700;
              color: #444;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9pt;
            }
            th, td {
              border: 1px solid #cfcfcf;
              padding: 2mm;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f3f3;
              text-transform: uppercase;
              letter-spacing: 0.4pt;
            }
            .empty {
              text-align: center;
              font-style: italic;
              color: #666;
            }
            .footer {
              font-size: 8pt;
              text-align: center;
              color: #666;
              margin-top: 6mm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="logo" src="${logoUrl}" alt="Egea" />
            <div>
              <div class="title">Albaran de salida</div>
              <div class="meta">
                <div>Fecha: ${today}</div>
                <div>Pedido: ${orderNumber}</div>
                <div>Ref Admin: ${adminCode}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Datos del cliente</h3>
            <div class="grid">
              <div class="row"><span class="label">Cliente</span><span>${customerName}</span></div>
              <div class="row"><span class="label">Contacto</span><span>${contactName}</span></div>
              <div class="row"><span class="label">Telefono</span><span>${phone}</span></div>
              <div class="row"><span class="label">Region</span><span>${region}</span></div>
              <div class="row" style="grid-column: span 2;"><span class="label">Direccion</span><span>${deliveryAddress}</span></div>
            </div>
          </div>

          <div class="section">
            <h3>Produccion</h3>
            <div class="grid">
              <div class="row"><span class="label">Estado</span><span>${status}</span></div>
              <div class="row"><span class="label">Fecha produccion</span><span>${productionStart}</span></div>
              <div class="row"><span class="label">Creado</span><span>${createdAt}</span></div>
              <div class="row"><span class="label">Entrega estimada</span><span>${dueDate}</span></div>
              <div class="row"><span class="label">Material</span><span>${fabric}</span></div>
              <div class="row"><span class="label">Color</span><span>${color}</span></div>
            </div>
          </div>

          <div class="section">
            <h3>Embalaje</h3>
            <div class="grid">
              <div class="row"><span class="label">Tipo</span><span>${packagingType}</span></div>
              <div class="row"><span class="label">Bultos</span><span>${packageCount}</span></div>
              <div class="row"><span class="label">Escaneados</span><span>${scannedCount}</span></div>
              <div class="row"><span class="label">Total unidades</span><span>${totalUnits}</span></div>
            </div>
          </div>

          <div class="section">
            <h3>Envio</h3>
            <div class="grid">
              <div class="row"><span class="label">Tracking</span><span>${trackingId}</span></div>
              <div class="row"><span class="label">Fecha envio</span><span>${shippingDate}</span></div>
              <div class="row"><span class="label">Destino</span><span>${region}</span></div>
              <div class="row" style="grid-column: span 2;"><span class="label">Direccion</span><span>${deliveryAddress}</span></div>
            </div>
          </div>

          <div class="section">
            <h3>Detalle de piezas</h3>
            <table>
              <thead>
                <tr>
                  <th>Cant</th>
                  <th>Material</th>
                  <th>Medidas</th>
                  <th>Notas</th>
                </tr>
              </thead>
              ${linesTable}
            </table>
          </div>

          <div class="footer">Documento interno de Decoraciones Egea</div>
        </body>
      </html>
    `;
    printHtmlToIframe(htmlContent);
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <PageShell
      title="ExpediciÃ³n y LogÃ­stica"
      description="Control de salidas y gestiÃ³n de envÃ­os"
      className="space-y-0"
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
      <div className="flex flex-col gap-2">
        {/* ESCÃNER RESPONSIVE CON BOTÃ“N CTA */}
        <RoleBasedRender hideForRoles={['admin', 'manager']}>
          <div className="w-full">
            {/* Scanner Button - Reemplaza Ã¡rea de escÃ¡ner estÃ¡tico */}
            <div className="bg-[#323438] border border-[#45474A] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <h3 className="text-white font-bold">Escaneo QR</h3>
              </div>

              <ScannerButton
                onActivate={() => setScannerModalOpen(true)}
                isActive={scannerModalOpen}
                size={deviceType === 'mobile' ? 'mobile' : deviceType === 'tablet' ? 'tablet' : 'desktop'}
                fullWidth
              />

              {/* Input Manual Debajo */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="O introduce cÃ³digo manualmente..."
                  className="flex-1 bg-[#1A1D1F] border border-[#45474A] rounded-lg px-4 py-3 text-base text-white placeholder-[#6E6F71] focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)}
                />
                <button
                  onClick={() => handleScan(qrInput)}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center justify-center min-w-[60px]"
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
          title="Escanear Pedido de EnvÃ­o"
        />

        {/* CONTENEDOR DE COLA Y DETALLE - LADO A LADO EN DESKTOP */}
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* COLA DE ALMACÃ‰N */}
          <div className="w-full lg:w-[450px] shrink-0 flex flex-col gap-4">
            <Tabs defaultValue="active" className="w-full">
              <div className="p-1 mb-4">
                <TabsList className="grid w-full grid-cols-2 bg-transparent">
                  <TabsTrigger
                    value="active"
                    className="data-[state=active]:bg-[#2A2D31] data-[state=active]:text-white text-[#B5B8BA] py-2.5 rounded-lg flex items-center justify-center gap-2 h-11"
                  >
                    <ListFilter className="w-4 h-4" />
                    Expediciones ({activeShipments.length})
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
                <div className="flex flex-col min-h-[500px]">
                  <h3 className="text-[#B5B8BA] font-bold text-xs uppercase tracking-widest mb-4 flex items-center">
                    <Truck className="w-4 h-4 mr-2 text-indigo-400" />
                    Cola de envÃ­os activa
                  </h3>
                  {isLoading && <div className="text-sm text-[#B5B8BA] py-4">Cargando Ã³rdenes...</div>}
                  {!isLoading && activeShipments.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#B5B8BA] text-center opacity-40 py-12">
                      <CheckCircle className="w-12 h-12 mb-3" />
                      <p className="text-sm font-medium">Todo al dÃ­a</p>
                      <p className="text-xs uppercase tracking-tighter">No hay envÃ­os pendientes</p>
                    </div>
                  )}
                  {!isLoading && activeShipments.length > 0 && (
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-2">
                      {activeShipments.map((order: any) => {
                        const isIncomplete = (order.scanned_packages || 0) > 0 && (order.scanned_packages || 0) < (order.packages_count || 1);
                        const isSelected = scannedOrder?.id === order.id;
                        const isExpanded = expandedOrderId === order.id;

                        // v3.1.0 - LÃ³gica de bordes
                        let borderClass = "";
                        const level = order._priority_level;
                        const isKiosk = deviceType === 'tablet' || deviceType === 'desktop';

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
                                setTrackingNumber(order.tracking_number || '');
                                setScannedPackagesCount(order.scanned_packages || 0);
                              }}
                              className={cn(
                                "w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                                isSelected ? "bg-indigo-900/20 border-indigo-500/50" : "bg-[#1A1D1F] border-[#323438] hover:border-[#45474A]",
                                borderClass
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono font-bold text-sm ${isSelected ? 'text-indigo-400' : 'text-[#8B8D90]'}`}>
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
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isIncomplete ? 'bg-amber-600/20 text-amber-500 border border-amber-500/30' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'}`}>
                                      {order.scanned_packages || 0}/{order.packages_count || 1} BULTOS
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                  {order.due_date && (
                                    <div className="text-[10px] font-black uppercase text-[#8B8D90] px-2 py-1 bg-[#1A1D1F] rounded border border-[#323438] min-w-[65px] text-center">
                                      <span className="text-sm block leading-none">{daysToDueDate(order.due_date)}</span>
                                      DÃAS
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-white text-sm">{order.customer_name}</p>
                                <p className="text-[11px] text-[#8B8D90] truncate">{order.fabric}</p>
                              </div>
                            </button>

                            {/* ExpansiÃ³n Vertical (Solo MÃ³vil) */}
                            {deviceType === 'mobile' && (
                              <div className={cn("order-details-expanded", isExpanded && "show")}>
                                <div className="bg-[#323438] border border-[#45474A] rounded-xl p-4 mt-2 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-[#B5B8BA] uppercase font-bold tracking-wider">{order.status}</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); validateShipment(); }}
                                        className="p-2 bg-indigo-600 text-white rounded-lg"
                                      >
                                        <Truck className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); printManifest(); }}
                                        className="p-2 bg-[#2A2D31] text-white rounded-lg border border-[#45474A]"
                                      >
                                        <FileOutput className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-[#1A1D1F] p-2 rounded border border-[#45474A]">
                                      <p className="text-[10px] text-[#B5B8BA]">Material</p>
                                      <p className="font-bold text-white truncate">{order.fabric}</p>
                                    </div>
                                    <div className="bg-[#1A1D1F] p-2 rounded border border-[#45474A]">
                                      <p className="text-[10px] text-[#B5B8BA]">Bultos</p>
                                      <p className="font-bold text-white">{order.scanned_packages || 0}/{order.packages_count || 1}</p>
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-[#B5B8BA] bg-[#1A1D1F]/50 p-2 rounded italic">
                                    {summarizeLines(order)}
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
                <div className="bg-[#323438] border border-[#45474A] rounded-lg p-2 min-h-[500px]">
                  <h3 className="font-bold text-[#8B8D90] mb-3 text-sm uppercase tracking-wider flex items-center justify-between">
                    <span>Historial de EnvÃ­os</span>
                    <span className="bg-[#45474A] text-[#B5B8BA] px-2 py-0.5 rounded-full text-xs">{historyShipments.length}</span>
                  </h3>
                  {!isLoading && historyShipments.length === 0 && (
                    <div className="text-sm text-[#B5B8BA] py-12 text-center opacity-40">Historial vacÃ­o.</div>
                  )}
                  {!isLoading && historyShipments.length > 0 && (
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-2">
                      {historyShipments.slice(0, 20).map((order) => {
                        const isSelected = scannedOrder?.id === order.id;
                        return (
                          <button
                            key={order.id}
                            onClick={() => {
                              setScannedOrder(order);
                              setTrackingNumber(order.tracking_number || '');
                              setScannedPackagesCount(order.scanned_packages || 0);
                            }}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${isSelected
                              ? 'bg-emerald-900/20 border-emerald-500/50'
                              : 'bg-[#1A1D1F] border-[#45474A] opacity-60 hover:opacity-100'
                              }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-mono font-bold text-sm text-[#B5B8BA]">
                                {order.order_number}
                              </span>
                              <span className="text-[10px] bg-[#45474A] text-[#B5B8BA] px-2 py-0.5 rounded-full uppercase font-bold">
                                {order.status}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 text-xs text-[#8B8D90]">
                              <span className="font-semibold">{order.customer_name}</span>
                              <span>Enviado: {order.shipping_date ? new Date(order.shipping_date).toLocaleDateString() : '---'}</span>
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
              <div className="bg-[#323438] h-full rounded-2xl shadow-lg border border-[#45474A] flex flex-col overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-[#45474A] bg-[#1A1D1F]/50 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl md:text-3xl font-bold text-[#FFFFFF] mb-1">{scannedOrder.order_number}</h2>
                    <div className="text-xs text-[#8B8D90] font-mono">
                      Ref Admin: {scannedOrder.admin_code || '---'}
                    </div>
                  </div>
                  <span className="text-sm md:text-lg px-4 py-2 bg-[#45474A] text-white rounded-full">{scannedOrder.status}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 lg:p-6 space-y-4 lg:space-y-6 custom-scrollbar">
                  {/* PROTOCOLO DE REVISIÃ“N */}
                  {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <div className="bg-amber-900/10 border border-amber-500/30 p-5 rounded-xl flex items-start gap-4">
                      <AlertOctagon className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
                      <div className="text-sm">
                        <h4 className="font-bold text-amber-400 uppercase mb-2 tracking-wide text-lg">PROTOCOLO DE REVISIÃ“N</h4>
                        <ul className="space-y-2 text-[#B5B8BA]">
                          <li>Revisa color y medidas antes de continuar.</li>
                          <li>No mezclar pedidos; si cambias se reinicia el conteo.</li>
                          <li>Escanea cada bulto hasta completar el total.</li>
                          <li>Tracking obligatorio antes de liberar envÃ­o.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Datos del cliente */}
                  <div className="bg-[#1A1D1F] rounded-xl border border-[#45474A] p-5 shadow-inner">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-[#FFFFFF] font-bold flex items-center">
                        <User className="w-4 h-4 mr-2 text-indigo-400" />
                        Datos del Cliente
                      </h3>
                      <button
                        onClick={() => copyToClipboard(`${scannedOrder.customer_name}\n${scannedOrder.delivery_address}\n${scannedOrder.phone}`)}
                        className="text-xs text-[#14CC7F] hover:text-white flex items-center"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copiar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-[#8B8D90] text-xs uppercase font-bold">Cliente / RazÃ³n Social</p>
                        <p className="text-[#B5B8BA] font-medium">{scannedOrder.customer_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#8B8D90] text-xs uppercase font-bold">RegiÃ³n</p>
                        <p className="text-[#B5B8BA]">{scannedOrder.region}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#8B8D90] text-xs uppercase font-bold">TelÃ©fono</p>
                        <p className="text-[#B5B8BA]">{scannedOrder.phone || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#8B8D90] text-xs uppercase font-bold">Nombre Contacto</p>
                        <p className="text-[#B5B8BA]">{scannedOrder.contact_name || '---'}</p>
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <p className="text-[#8B8D90] text-xs uppercase font-bold">DirecciÃ³n de Entrega</p>
                        <p className="text-[#B5B8BA]">{scannedOrder.delivery_address || 'Sin direcciÃ³n especificada'}</p>
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <p className="text-[#8B8D90] text-xs uppercase font-bold">UbicaciÃ³n (Maps)</p>
                        {scannedOrder.google_maps_link ? (
                          <a href={scannedOrder.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center truncate">
                            <ExternalLink className="w-3 h-3 mr-1" /> {scannedOrder.google_maps_link}
                          </a>
                        ) : (
                          <span className="text-[#6E6F71] italic">No disponible</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bultos y Unidades */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-transparent bg-transparent md:bg-[#1A1D1F] md:border-[#45474A]">
                      <p className="text-xs text-[#8B8D90] font-bold uppercase mb-1 flex items-center">
                        <Package className="w-3 h-3 mr-1" /> Bultos Totales
                      </p>
                      <p className="font-medium text-[#B5B8BA]">{scannedOrder.packages_count || 1}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-transparent bg-transparent md:bg-[#1A1D1F] md:border-[#45474A]">
                      <p className="text-xs text-[#8B8D90] font-bold uppercase mb-1 flex items-center">
                        <Truck className="w-3 h-3 mr-1" /> Total Uds
                      </p>
                      <p className="font-medium text-[#B5B8BA]">{scannedOrder.quantity_total}</p>
                    </div>
                  </div>

                  {/* Tabla de desglose */}
                  <div className="border border-[#45474A] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1A1D1F] text-[#8B8D90]">
                        <tr>
                          <th className="px-4 py-2 text-left">Cant.</th>
                          <th className="px-4 py-2 text-left">Material / Medidas</th>
                          <th className="px-4 py-2 text-left">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#45474A]">
                        {scannedOrder.lines && scannedOrder.lines.length > 0 ? (
                          scannedOrder.lines.map(line => (
                            <tr key={line.id}>
                              <td className="px-4 py-2 font-bold text-white">{line.quantity}</td>
                              <td className="px-4 py-2 text-[#B5B8BA]">{line.material || scannedOrder.fabric} Â· {line.width}x{line.height}cm</td>
                              <td className="px-4 py-2 text-[#8B8D90] italic">{line.notes || 'â€”'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-[#6E6F71]">Sin desglose registrado</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Notas internas */}
                  {scannedOrder.notes_internal && (
                    <div className="bg-transparent md:bg-[#1A1D1F] border border-transparent md:border-[#45474A] rounded-xl p-4">
                      <p className="text-xs text-[#8B8D90] uppercase font-bold mb-2">Notas internas</p>
                      <p className="text-sm text-[#B5B8BA] whitespace-pre-line">{scannedOrder.notes_internal}</p>
                    </div>
                  )}

                  {/* VerificaciÃ³n de bultos */}
                  {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <div className="bg-transparent md:bg-[#1A1D1F] p-4 rounded-xl border border-transparent md:border-[#45474A]">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-[#FFFFFF] text-sm uppercase">VerificaciÃ³n de Bultos</h4>
                        <span className="font-mono text-[#B5B8BA]">{scannedPackagesCount} / {scannedOrder.packages_count || 1}</span>
                      </div>
                      <div className="w-full bg-[#323438] rounded-full h-4 mb-4">
                        <div
                          className={`h-4 rounded-full transition-all duration-300 ${scannedPackagesCount >= (scannedOrder.packages_count || 1) ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min((scannedPackagesCount / (scannedOrder.packages_count || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-center gap-4">
                        <button onClick={() => updateOrderProgress(scannedOrder.id, Math.max(0, scannedPackagesCount - 1))} className="p-2 hover:bg-[#45474A] rounded-full text-[#8B8D90]">
                          <MinusCircle className="w-6 h-6" />
                        </button>
                        <button onClick={() => updateOrderProgress(scannedOrder.id, (scannedPackagesCount + 1))} className="p-2 hover:bg-[#45474A] rounded-full text-indigo-400">
                          <PlusCircle className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ValidaciÃ³n de salida */}
                  {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-xl mt-4">
                      <h3 className="text-emerald-400 font-bold mb-4 flex items-center">
                        <Truck className="w-5 h-5 mr-2" />
                        ValidaciÃ³n de Salida
                      </h3>
                      <div className="flex flex-col gap-4">
                        {/* Componente Toggle + Input de Tracking */}
                        <div className="bg-[#1A1D1F] p-4 rounded-xl border border-[#45474A]">
                          <TrackingToggle
                            hasTracking={hasTrackingNow}
                            onToggle={setHasTrackingNow}
                            className="mb-4"
                          />

                          {hasTrackingNow && (
                            <div>
                              <label className="text-xs text-[#8B8D90] font-bold uppercase mb-2 block">NÃºmero de Tracking</label>
                              <input
                                type="text"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Escanea o escribe el tracking final..."
                                className="w-full bg-[#323438] border border-[#45474A] rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-mono tracking-wide"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estado ENVIADO */}
                  {scannedOrder.status === 'ENVIADO' && (
                    <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-emerald-400">Enviado</h4>
                          <p className="text-[#8B8D90] text-sm">
                            Tracking: <span className="font-mono text-white">{scannedOrder.tracking_number || 'Sin tracking'}</span>
                          </p>
                        </div>
                      </div>
                      <button onClick={printManifest} className="w-full md:w-auto px-4 py-2 bg-transparent md:bg-[#1A1D1F] border border-[#45474A] rounded-lg text-white hover:bg-[#45474A] flex items-center justify-center">
                        <FileOutput className="w-4 h-4 mr-2" />
                        AlbarÃ¡n
                      </button>
                    </div>
                  )}
                </div>

                {/* Botones de acciÃ³n */}
                <div className="p-6 border-t border-[#45474A] bg-transparent md:bg-[#323438]">
                  {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <button
                      onClick={validateShipment}
                      disabled={scannedPackagesCount < (scannedOrder.packages_count || 1)}
                      className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center transition-all active:scale-95 ${scannedPackagesCount >= (scannedOrder.packages_count || 1)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-[#45474A] text-[#8B8D90] cursor-not-allowed border border-[#6E6F71]'
                        }`}
                    >
                      <Truck className="w-6 h-6 mr-2" />
                      PROCESADO
                    </button>
                  )}

                  {scannedOrder.status === 'ENVIADO' && (
                    <button
                      onClick={() => {
                        setScannedOrder(null);
                        setTrackingNumber('');
                        setScannedPackagesCount(0);
                      }}
                      className="w-full py-3 bg-[#45474A] text-white rounded-xl hover:bg-[#6E6F71] font-medium"
                    >
                      Volver al EscÃ¡ner
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-[#45474A] rounded-2xl flex flex-col items-center justify-center text-[#8B8D90] bg-[#1A1D1F]/50">
                <Truck className="w-16 h-16 mb-4 opacity-30" />
                <h3 className="text-xl font-bold text-[#8B8D90] mb-2">Zona de ExpediciÃ³n</h3>
                <p className="text-[#6E6F71] max-w-md text-center">
                  Selecciona un pedido de la lista o escanea el QR para verificar bultos y procesar la salida.
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


