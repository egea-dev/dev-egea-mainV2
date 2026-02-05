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
import QRScanner from '@/components/shared/QRScanner';
import { RoleBasedRender } from '@/components/shared/RoleBasedRender';
import { toast } from 'sonner';
import { printHtmlToIframe } from '@/utils/print';
import { MobileAlert, AlertType } from '@/components/shared/MobileAlert';
import { TrackingToggle } from '@/features/logistics/components/TrackingToggle';
import { IncidentReportButton } from '@/components/incidents/IncidentReportButton';
import { IncidentReportModal } from '@/components/incidents/IncidentReportModal';
import { parseQRCode, validateQRWithLines, extractOrderNumber } from '@/lib/qr-utils';
import { summarizeMaterials } from '@/lib/materials';
import { ScannerButton } from '@/features/scanner/components/ScannerButton';
import { ScannerModal } from '@/features/scanner/components/ScannerModal';
import { useOrientation, useDeviceType } from '@/hooks/useOrientation';
import { sortWorkOrdersByPriority, daysToDueDate, getUrgencyBadge } from '@/services/priority-service';
import { cn } from "@/lib/utils";
import ShippingCalendar from '@/features/logistics/components/ShippingCalendar';

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

// Eliminada lógica de TWELVE_HOURS_MS para que los envíos pasen al historial inmediatamente

const summarizeLines = (order: Order) => {
  if (!order.lines || !order.lines.length) return 'Sin desglose cargado';
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

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Cargando órdenes de envío...');

      const { data: ordersData, error: ordersError } = await (supabaseProductivity.from('produccion_work_orders') as any)
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📦 Órdenes recibidas:', ordersData?.length || 0, 'registros');
      if (ordersError) console.error('❌ Error cargando órdenes:', ordersError);

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

        // Priorizar líneas de la columna JSON, si no, usar la tabla relacional
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
      console.error('💥 Error loading orders:', error);
      toast.error('Error al cargar órdenes: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar órdenes al montar
  useEffect(() => {
    loadOrders();
  }, []);

  const activeShipments = useMemo(() => {
    // Estados que ya NO deben aparecer en expediciones activas
    const archivedStatuses = ['ENVIADO', 'ENTREGADO', 'CANCELADO'];

    // Log para depuración
    console.log('📋 Estados de pedidos cargados:', orders.map(o => ({ order_number: o.order_number, status: o.status })));

    const filtered = orders.filter(o => {
      // Excluir pedidos ya archivados
      if (archivedStatuses.includes(o.status)) return false;

      // Solo mostrar pedidos LISTO_ENVIO (producción terminada, listos para escanear)
      return o.status === 'LISTO_ENVIO';
    });

    // APLICAR PRIORIZACIÓN DINÁMICA
    return sortWorkOrdersByPriority(filtered as any);
  }, [orders]);

  const historyShipments = useMemo(() => {
    return orders.filter(o => {
      // Solo pedidos ya enviados o entregados van al historial
      // LISTO_ENVIO NO está aquí porque ahora está en activeShipments
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

      // Campos válidos según el esquema de produccion_work_orders
      const allowedFields = ['status', 'priority', 'notes', 'quality_check_status', 'updated_at'];

      for (const key of allowedFields) {
        if ((patch as any)[key] !== undefined) {
          validFields[key] = (patch as any)[key];
        }
      }

      // Siempre actualizar updated_at
      validFields.updated_at = new Date().toISOString();

      if (Object.keys(validFields).length > 1) { // Más que solo updated_at
        // @ts-ignore
        const { error } = await supabaseProductivity
          .from('produccion_work_orders')
          .update(validFields as any)
          .eq('id', orderId);

        if (error) {
          console.error('Error actualizando produccion_work_orders:', error);
          throw error;
        }
      }

      // Sincronización con comercial_orders si el estado cambia
      if (patch.status) {
        const order = orders.find(o => o.id === orderId);
        if (order && order.order_number) {
          console.log(`🔄 Sincronizando estado ${patch.status} con comercial para orden ${order.order_number}`);

          // @ts-ignore
          const { error: syncError } = await supabaseProductivity
            .from('comercial_orders')
            .update({ status: patch.status } as any)
            .eq('order_number', order.order_number);

          if (syncError) {
            console.warn("Error sincronizando estado con comercial:", syncError);
          } else {
            console.log(`✓ Sincronizado estado ${patch.status} en comercial_orders para ${order.order_number}`);
          }
        }
      }

      await loadOrders();
    } catch (error: any) {
      toast.error('Error sincronizando pedido: ' + error.message);
    }
  };

  const handleScan = async (code: string) => {
    // Parsear el código QR usando la utilidad centralizada
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
      showAlert('error', '¡ALTO!', 'Estás escaneando un pedido diferente mientras el actual está incompleto. No mezcles pedidos.', () => { });
      return;
    }

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

      // Mostrar alertas según el resultado de la validación
      if (!validation.isValid) {
        showAlert('error', 'QR Inválido', 'El número de orden del QR no coincide con ningún pedido en el sistema.');
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
      } else if (validation.hasDiscrepancies) {
        const discrepancyMessage = validation.discrepancies.join('\n');
        showAlert(
          'warning',
          'Advertencia: Discrepancias detectadas',
          `Se encontraron diferencias entre el QR y la base de datos:\n\n${discrepancyMessage}\n\nSe usarán los datos de la base de datos.`
        );
      } else if (qrData.isLegacyFormat) {
        toast.info(`QR en formato antiguo - Datos técnicos cargados desde BD`);
      }

      // Validar que la orden esté lista para envío
      const validStatuses = ['PTE_ENVIO', 'LISTO_ENVIO', 'ENVIADO'];
      const isValidForShipping = validStatuses.includes(order.status) ||
        (order.status === 'EN_PROCESO' && order.needs_shipping_validation);

      if (!isValidForShipping) {
        toast.error(`Este pedido no está listo para envío (Estado: ${order.status})`);
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
      toast.success(`✓ Orden ${orderNum} validada (${linesCount} líneas)`);
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
      console.log('🚀 Iniciando validación de envío para:', scannedOrder.id);

      // Cambiar estado a ENVIADO para que aparezca en historial
      // (ENVIADO indica que ya fue validado y despachado)
      const { data: prodData, error: prodError } = await (supabaseProductivity as any)
        .from('produccion_work_orders')
        .update({
          status: 'ENVIADO',  // Estado final después de validar envío
          tracking_number: resolvedTracking || null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', scannedOrder.id)
        .select();

      console.log('📊 Resultado update produccion_work_orders:', { prodData, prodError });

      if (prodError) {
        console.error('❌ Error actualizando produccion_work_orders:', prodError);
        toast.error('Error al actualizar el estado del pedido: ' + prodError.message);
        return;
      }

      // Sincronizar con comercial_orders - aquí sí usamos ENVIADO
      if (scannedOrder.order_number) {
        console.log(`🔄 Sincronizando estado ENVIADO con comercial para orden ${scannedOrder.order_number}`);
        const { data: commData, error: commError } = await (supabaseProductivity as any)
          .from('comercial_orders')
          .update({
            status: 'ENVIADO',
            shipping_notification_pending: true,
            tracking_number: resolvedTracking || null
          } as any)
          .eq('order_number', scannedOrder.order_number)
          .select();

        console.log('📊 Resultado update comercial_orders:', { commData, commError });

        if (commError) {
          console.warn('⚠️ Error sincronizando con comercial_orders:', commError);
        } else if (!commData || commData.length === 0) {
          console.log(`ℹ️ No existe pedido comercial con order_number ${scannedOrder.order_number} - sincronización no aplicable (pedido solo de producción)`);
        } else {
          console.log(`✓ Sincronizado estado ENVIADO en comercial_orders para ${scannedOrder.order_number}`);
        }

        // Archivar el pedido llamando a la función de base de datos
        console.log(`📦 Archivando pedido ${scannedOrder.order_number}...`);
        const { data: archiveData, error: archiveError } = await (supabaseProductivity as any)
          .rpc('archive_completed_order', {
            p_order_number: scannedOrder.order_number,
            p_shipped_at: new Date().toISOString(),
            p_tracking_number: resolvedTracking || null
          });

        if (archiveError) {
          console.warn('⚠️ No se pudo archivar (función RPC puede no existir aún):', archiveError.message);
          // No bloquear el flujo si el archivado falla - puede que la migración no se haya aplicado
        } else {
          console.log(`✓ Pedido archivado con ID: ${archiveData}`);
        }
      }

      // Alerta de éxito
      toast.success('✓ Envío validado correctamente');

      await loadOrders();
      setScannedOrder(null);
    } catch (error: any) {
      console.error('❌ Error general en validateShipment:', error);
      toast.error('Error al validar envío: ' + error.message);
    }
  };

  const printManifest = () => {
    if (!scannedOrder) return;
    const logoUrl = '/egea-logo.png';
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
      title="Expedición y Logística"
      description="Control de salidas y gestión de envíos"
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
        {/* ESCÁNER RESPONSIVE CON BOTÓN CTA */}
        <RoleBasedRender hideForRoles={['admin', 'manager']}>
          <div className="w-full">
            {/* Scanner Button - Reemplaza área de escáner estático */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="text-foreground font-bold">Escaneo QR</h3>
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
          title="Escanear Pedido de Envío"
        />

        {/* CONTENEDOR DE COLA Y DETALLE - LADO A LADO EN DESKTOP */}
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* COLA DE ALMACÉN */}
          <div className="w-full lg:w-[450px] shrink-0 flex flex-col gap-4">
            <Tabs defaultValue="active" className="w-full">
              <div className="p-1 mb-4">
                <TabsList className="grid w-full grid-cols-2 bg-transparent">
                  <TabsTrigger
                    value="active"
                    className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground py-2.5 rounded-lg flex items-center justify-center gap-2 h-11"
                  >
                    <ListFilter className="w-4 h-4" />
                    Expediciones ({activeShipments.length})
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
                    <Truck className="w-4 h-4 mr-2 text-primary" />
                    Cola de envíos activa
                  </h3>
                  {isLoading && <div className="text-sm text-muted-foreground py-4">Cargando órdenes...</div>}
                  {!isLoading && activeShipments.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center opacity-40 py-12">
                      <CheckCircle className="w-12 h-12 mb-3" />
                      <p className="text-sm font-medium">Todo al día</p>
                      <p className="text-xs uppercase tracking-tighter">No hay envíos pendientes</p>
                    </div>
                  )}
                  {!isLoading && activeShipments.length > 0 && (
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-2">
                      {activeShipments.map((order: any) => {
                        const isIncomplete = (order.scanned_packages || 0) > 0 && (order.scanned_packages || 0) < (order.packages_count || 1);
                        const isSelected = scannedOrder?.id === order.id;
                        const isExpanded = expandedOrderId === order.id;

                        // v3.1.0 - Logica de bordes
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
                                isSelected ? "bg-primary/10 border-primary/50" : "bg-card border-border hover:border-primary/30",
                                borderClass
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono font-bold text-sm ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
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
                                    <div className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1 bg-muted rounded border border-border min-w-[65px] text-center">
                                      <span className="text-sm block leading-none">{daysToDueDate(order.due_date)}</span>
                                      DÍAS
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-foreground text-sm">{order.customer_name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{order.fabric}</p>
                              </div>
                            </button>

                            {/* Expansion Vertical (Solo Movil) */}
                            {deviceType === 'mobile' && (
                              <div className={cn("order-details-expanded", isExpanded && "show")}>
                                <div className="bg-muted border border-border rounded-xl p-4 mt-2 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{order.status}</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); validateShipment(); }}
                                        className="p-2 bg-indigo-600 text-white rounded-lg"
                                      >
                                        <Truck className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); printManifest(); }}
                                        className="p-2 bg-muted text-foreground rounded-lg border border-border"
                                      >
                                        <FileOutput className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-muted p-2 rounded border border-border">
                                      <p className="text-[10px] text-muted-foreground">Material</p>
                                      <p className="font-bold text-foreground truncate">{order.fabric}</p>
                                    </div>
                                    <div className="bg-muted p-2 rounded border border-border">
                                      <p className="text-[10px] text-muted-foreground">Bultos</p>
                                      <p className="font-bold text-foreground">{order.scanned_packages || 0}/{order.packages_count || 1}</p>
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded italic">
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
                <div className="bg-muted border border-border rounded-lg p-2 min-h-[500px]">
                  <h3 className="font-bold text-muted-foreground mb-3 text-sm uppercase tracking-wider flex items-center justify-between">
                    <span>Historial de Envíos</span>
                    <span className="bg-muted-foreground/10 text-muted-foreground px-2 py-0.5 rounded-full text-xs">{historyShipments.length}</span>
                  </h3>
                  {!isLoading && historyShipments.length === 0 && (
                    <div className="text-sm text-muted-foreground py-12 text-center opacity-40">Historial vacío.</div>
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
                              ? 'bg-emerald-500/10 border-emerald-500/50'
                              : 'bg-card border-border opacity-60 hover:opacity-100'
                              }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-mono font-bold text-sm text-muted-foreground">
                                {order.order_number}
                              </span>
                              <span className="text-[10px] bg-muted-foreground/10 text-muted-foreground px-2 py-0.5 rounded-full uppercase font-bold">
                                {order.status}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
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
              <div className="bg-card h-full rounded-2xl shadow-lg border border-border flex flex-col overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-border bg-muted/30 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl md:text-3xl font-bold text-foreground mb-1">{scannedOrder.order_number}</h2>
                    <div className="text-xs text-muted-foreground font-mono">
                      Ref Admin: {scannedOrder.admin_code || '---'}
                    </div>
                  </div>
                  <span className="text-sm md:text-lg px-4 py-2 bg-muted text-foreground rounded-full">{scannedOrder.status}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 lg:p-6 space-y-4 lg:space-y-6 custom-scrollbar">
                  {/* PROTOCOLO DE REVISIÓN */}
                  {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <div className="bg-warning/10 border border-warning/30 p-5 rounded-xl flex items-start gap-4">
                      <AlertOctagon className="w-8 h-8 text-[hsl(var(--warning))] shrink-0 mt-1" />
                      <div className="text-sm">
                        <h4 className="font-bold text-[hsl(var(--warning))] uppercase mb-2 tracking-wide text-lg">PROTOCOLO DE REVISIÓN</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li>Revisa color y medidas antes de continuar.</li>
                          <li>No mezclar pedidos; si cambias se reinicia el conteo.</li>
                          <li>Escanea cada bulto hasta completar el total.</li>
                          <li>Tracking obligatorio antes de liberar envío.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Datos del cliente */}
                  <div className="bg-muted/30 rounded-xl border border-border p-5 shadow-inner">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-foreground font-bold flex items-center">
                        <User className="w-4 h-4 mr-2 text-primary" />
                        Datos del Cliente
                      </h3>
                      <button
                        onClick={() => copyToClipboard(`${scannedOrder.customer_name}\n${scannedOrder.delivery_address}\n${scannedOrder.phone}`)}
                        className="text-xs text-emerald-500 hover:text-emerald-600 flex items-center"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copiar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs uppercase font-bold">Cliente / Razón Social</p>
                        <p className="text-foreground font-medium">{scannedOrder.customer_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs uppercase font-bold">Región</p>
                        <p className="text-foreground">{scannedOrder.region}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs uppercase font-bold">Teléfono</p>
                        <p className="text-foreground">{scannedOrder.phone || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs uppercase font-bold">Nombre Contacto</p>
                        <p className="text-foreground">{scannedOrder.contact_name || '---'}</p>
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <p className="text-muted-foreground text-xs uppercase font-bold">Dirección de Entrega</p>
                        <p className="text-foreground">{scannedOrder.delivery_address || 'Sin dirección especificada'}</p>
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <p className="text-muted-foreground text-xs uppercase font-bold">Ubicación (Maps)</p>
                        {scannedOrder.google_maps_link ? (
                          <a href={scannedOrder.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 flex items-center truncate">
                            <ExternalLink className="w-3 h-3 mr-1" /> {scannedOrder.google_maps_link}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">No disponible</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bultos y Unidades */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-transparent bg-transparent md:bg-muted md:border-border">
                      <p className="text-xs text-muted-foreground font-bold uppercase mb-1 flex items-center">
                        <Package className="w-3 h-3 mr-1" /> Bultos Totales
                      </p>
                      <p className="font-medium text-foreground">{scannedOrder.packages_count || 1}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-transparent bg-transparent md:bg-muted md:border-border">
                      <p className="text-xs text-muted-foreground font-bold uppercase mb-1 flex items-center">
                        <Truck className="w-3 h-3 mr-1" /> Total Uds
                      </p>
                      <p className="font-medium text-foreground">{scannedOrder.quantity_total}</p>
                    </div>
                  </div>

                  {/* Tabla de desglose */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-left">Cant.</th>
                          <th className="px-4 py-2 text-left">Material / Medidas</th>
                          <th className="px-4 py-2 text-left">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {scannedOrder.lines && scannedOrder.lines.length > 0 ? (
                          scannedOrder.lines.map(line => (
                            <tr key={line.id}>
                              <td className="px-4 py-2 font-bold text-foreground">{line.quantity}</td>
                              <td className="px-4 py-2 text-foreground/80">{line.material || scannedOrder.fabric} · {line.width}x{line.height}cm</td>
                              <td className="px-4 py-2 text-muted-foreground italic">{line.notes || '—'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Sin desglose registrado</td>
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

                  {/* Verificación de bultos */}
                  {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <div className="bg-muted/30 p-4 rounded-xl border border-border">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-foreground text-sm uppercase">Verificación de Bultos</h4>
                        <span className="font-mono text-muted-foreground">{scannedPackagesCount} / {scannedOrder.packages_count || 1}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-4 mb-4">
                        <div
                          className={`h-4 rounded-full transition-all duration-300 ${scannedPackagesCount >= (scannedOrder.packages_count || 1) ? 'bg-emerald-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min((scannedPackagesCount / (scannedOrder.packages_count || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-center gap-4">
                        <button onClick={() => updateOrderProgress(scannedOrder.id, Math.max(0, scannedPackagesCount - 1))} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                          <MinusCircle className="w-6 h-6" />
                        </button>
                        <button onClick={() => updateOrderProgress(scannedOrder.id, (scannedPackagesCount + 1))} className="p-2 hover:bg-muted rounded-full text-primary">
                          <PlusCircle className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Validación de salida */}
                  {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-xl mt-4">
                      <h3 className="text-emerald-600 font-bold mb-4 flex items-center">
                        <Truck className="w-5 h-5 mr-2" />
                        Validación de Salida
                      </h3>
                      <div className="flex flex-col gap-4">
                        {/* Componente Toggle + Input de Tracking */}
                        <div className="bg-card p-4 rounded-xl border border-border">
                          <TrackingToggle
                            hasTracking={hasTrackingNow}
                            onToggle={setHasTrackingNow}
                            className="mb-4"
                          />

                          {hasTrackingNow && (
                            <div>
                              <label className="text-xs text-muted-foreground font-bold uppercase mb-2 block">Número de Tracking</label>
                              <input
                                type="text"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Escanea o escribe el tracking final..."
                                className="w-full bg-muted border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-mono tracking-wide"
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
                      <button onClick={printManifest} className="w-full md:w-auto px-4 py-2 bg-transparent border border-border rounded-lg text-foreground hover:bg-muted flex items-center justify-center">
                        <FileOutput className="w-4 h-4 mr-2" />
                        Albaran
                      </button>
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="p-6 border-t border-border bg-muted/20">
                  {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                    <button
                      onClick={validateShipment}
                      disabled={scannedPackagesCount < (scannedOrder.packages_count || 1)}
                      className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center transition-all active:scale-95 ${scannedPackagesCount >= (scannedOrder.packages_count || 1)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
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
                      className="w-full py-3 bg-muted text-foreground border border-border rounded-xl hover:bg-muted/80 font-medium"
                    >
                      Volver al Escáner
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20 p-12">
                <Truck className="w-16 h-16 mb-4 opacity-30" />
                <h3 className="text-xl font-bold text-muted-foreground mb-2">Zona de Expedición</h3>
                <p className="text-muted-foreground/60 max-w-md text-center">
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


