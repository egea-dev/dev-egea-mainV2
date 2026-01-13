import React, { useMemo, useState } from 'react';
import { supabaseProductivity } from '@/integrations/supabase';
import { QrCode, Camera, ArrowRight, Clock, CheckCircle, Printer, Package, AlertTriangle, AlertOctagon, FileText } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import QRScanner from '@/components/common/QRScanner';
import { RoleBasedRender } from '@/components/common/RoleBasedRender';
import { MobileAlert, AlertType } from '@/components/common/MobileAlert';
import { IncidentReportButton } from '@/components/incidents/IncidentReportButton';
import { IncidentReportModal } from '@/components/incidents/IncidentReportModal';
import { toast } from 'sonner';
import { printHtmlToIframe } from '@/utils/print';

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

// Tipos simplificados
interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  fabric?: string;
  color?: string;
  quantity_total?: number;
  packages_count?: number | null;
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
}

const slaConfig: Record<string, number> = {
  'MALLORCA': 7,
  'MENORCA': 10,
  'IBIZA': 10,
  'FORMENTERA': 12,
  'PENINSULA': 14,
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [qrInput, setQrInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [packagesInput, setPackagesInput] = useState<number>(1);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

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

  // Cargar órdenes al montar
  React.useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Cargando órdenes de producción...');

      const { data: ordersData, error: ordersError } = await supabaseProductivity
        .from('produccion_work_orders')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📦 Órdenes recibidas:', ordersData);
      console.log('❌ Error:', ordersError);

      if (ordersError) throw ordersError;

      if (ordersData && ordersData.length > 0) {
        const { data: linesData } = await supabaseProductivity
          .from('produccion_work_order_lines')
          .select('*')
          .in('work_order_id', ordersData.map((o: any) => o.id));

        console.log('📏 Líneas recibidas:', linesData);

        const ordersWithLines = ordersData.map((order: any) => {
          const specs = order.technical_specs || {};
          return {
            ...order,
            fabric: specs.fabric || 'Estándar',
            color: specs.color || 'N/D',
            quantity_total: specs.quantity || 1, // Fallback if not in column
            lines: linesData?.filter((line: any) => line.work_order_id === order.id) || []
          };
        });

        console.log('✅ Órdenes procesadas:', ordersWithLines);
        setOrders(ordersWithLines);
      } else {
        console.log('⚠️ No hay órdenes en la base de datos');
        setOrders([]);
      }
    } catch (error: any) {
      console.error('💥 Error loading orders:', error);
      toast.error('Error al cargar órdenes: ' + error.message);
      setOrders([]); // Asegurar que se setee aunque haya error
    } finally {
      setIsLoading(false);
    }
  };

  const productionQueue = useMemo(() => {
    return orders
      .filter(order => ['EN_PROCESO', 'PAGADO', 'PENDIENTE', 'CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'LISTO_ENVIO'].includes(order.status))
      .sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return aDate - bDate;
      });
  }, [orders]);

  const persistOrderUpdate = async (orderId: string, patch: Partial<Order>) => {
    setOrders((prev: Order[]) => prev.map(o => o.id === orderId ? { ...o, ...patch } as Order : o));
    setScannedOrder(prev => prev && prev.id === orderId ? { ...prev, ...patch } as Order : prev);
    try {
      // @ts-ignore
      const { error } = await supabaseProductivity.from('produccion_work_orders').update(patch).eq('id', orderId);
      if (error) throw error;
      await loadOrders();
    } catch (error: any) {
      toast.error('Error sincronizando con Supabase: ' + error.message);
    }
  };

  const handleScan = (code: string) => {
    const orderNum = code.includes('|') ? code.split('|')[0] : code;
    const order = orders.find(o => o.order_number === orderNum);
    if (order) {
      setScannedOrder(order);
      setCameraActive(false);
      setQrInput('');
      setPackagesInput(order.packages_count || 1);
      // Solo toast para éxito, no interrumpe flujo
      toast.success(`Orden ${orderNum} cargada`);
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
      setScannedOrder(null);
    } finally {
      setIsPersisting(false);
    }
  };

  const initiateFinish = () => setShowFinishModal(true);

  const printShippingLabel = async () => {
    if (!scannedOrder) return;

    const labelWidth = '60mm';
    const labelHeight = '86mm';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(scannedOrder.qr_payload || scannedOrder.order_number)}`;

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
            .qr { width: 28mm; height: 28mm; margin: 1mm 0; border: 0.4mm solid #111; }
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

^FO60,460^A0N,40,40^FDCliente: ${customer}^FS
^FO60,515^A0N,40,40^FDContacto: ${contact}^FS
^FO60,570^A0N,38,38^FB695,2,0,L^FDDirección: ${address}^FS
^FO60,650^A0N,40,40^FDRegión: ${region}^FS

^FO247,730^BQN,2,8^FDQA,${qrContent}^FS

^FO50,1040^A0N,55,55^FB695,1,0,C^FDBULTOS: ${packages}^FS
^FO50,1110^A0N,45,45^FB695,1,0,C^FDTotal Unidades: ${units}^FS

^XZ
    `;

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
      <div className="flex flex-col gap-2 relative">
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

        {/* COLA DE PRODUCCIÓN - DEBAJO */}
        <div className="w-full lg:flex-1">
          <div className="bg-[#1A1D21] border border-[#2A2D31] rounded-lg p-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#FF6B35]" />
                <h3 className="text-white font-bold text-sm">Cola de producción</h3>
              </div>
              <span className="text-xs text-[#B5B8BA] bg-[#2A2D31] px-2 py-1 rounded-full">{productionQueue.length} activos</span>
            </div>
            {isLoading && <div className="text-sm text-[#B5B8BA] py-4">Cargando órdenes...</div>}
            {!isLoading && productionQueue.length === 0 && (
              <div className="text-sm text-[#B5B8BA] py-4">No hay órdenes pendientes.</div>
            )}
            {!isLoading && productionQueue.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {productionQueue.slice(0, 10).map((order) => {
                  const due = getDueBadge(order);
                  const isSelected = scannedOrder?.id === order.id;
                  const progressWidth = order.status === 'PENDIENTE' ? 0 :
                    order.status === 'CORTE' ? 25 :
                      order.status === 'CONFECCION' ? 50 :
                        order.status === 'TAPICERIA' ? 75 :
                          order.status === 'CONTROL_CALIDAD' ? 90 :
                            order.status === 'LISTO_ENVIO' ? 100 : 10;

                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        setScannedOrder(order);
                        setPackagesInput(order.packages_count || 1);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition relative overflow-hidden ${isSelected
                        ? 'bg-[#FF6B35]/10 border-[#FF6B35]'
                        : 'bg-[#0D0F11] border-[#2A2D31] hover:border-[#3A3D41]'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-mono font-bold text-sm ${isSelected ? 'text-[#FF6B35]' : 'text-white'}`}>
                          {order.order_number}
                        </span>
                        <span className={due.badge}>{due.label}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs text-[#B5B8BA]">
                        <span className="font-semibold text-white/90">{order.customer_name || 'Cliente Nuevo'}</span>
                        <span className="text-[#8B8D90]">{order.fabric || 'Sin materialSpecified'}</span>
                        <span className="text-[#6E6F71] text-[10px] leading-tight">{renderLinePreview(order)}</span>
                      </div>

                      {/* Cuadro de info adicional (Producción) */}
                      <div className="mt-2 bg-[#1A1D1F]/50 border border-[#2A2D31] rounded-lg p-2">
                        <div className="flex justify-between text-[10px] text-[#6E6F71] uppercase tracking-wide mb-1 font-bold">
                          <span>PRODUCCIÓN</span>
                          <span>{order.due_date ? new Date(order.due_date).toLocaleDateString() : 'SIN FECHA'}</span>
                        </div>
                        <div className="text-[10px] text-[#8B8D90] flex flex-wrap gap-x-2 gap-y-0.5 mb-2">
                          <span>Material: <span className="text-[#B5B8BA]">{order.fabric || 'N/D'}</span></span>
                          <span>Color: <span className="text-[#B5B8BA]">{order.color || 'N/D'}</span></span>
                          <span>Unidades: <span className="text-[#B5B8BA]">{order.quantity_total || 0}</span></span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-[#8B8D90] font-bold">
                            <span>Avance producción</span>
                            <span>{progressWidth}%</span>
                          </div>
                          <div className="w-full bg-[#0D0F11] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-[#FF6B35] transition-all duration-500 shadow-[0_0_8px_rgba(255,107,53,0.3)]"
                              style={{ width: `${progressWidth}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="1"
                        value={packagesInput}
                        onChange={(e) => setPackagesInput(parseInt(e.target.value) || 1)}
                        className="w-32 bg-[#0D0F11] border border-[#2A2D31] rounded-xl p-4 text-center text-2xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={printShippingLabel}
                          disabled={isPersisting}
                          className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-sm"
                        >
                          <Printer className="w-5 h-5 mr-2 flex-shrink-0" />
                          <span className="whitespace-nowrap">Etiqueta PDF</span>
                        </button>
                        <button
                          onClick={printZebraLabel}
                          disabled={isPersisting}
                          className="flex-1 py-4 bg-[#FF6B35] hover:bg-[#FF8555] text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-sm"
                        >
                          <Printer className="w-5 h-5 mr-2 flex-shrink-0" />
                          <span className="whitespace-nowrap">Zebra (Red)</span>
                        </button>
                        <button
                          onClick={printA4Document}
                          disabled={isPersisting}
                          className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center transition disabled:opacity-50 text-sm"
                        >
                          <FileText className="w-5 h-5 mr-2 flex-shrink-0" />
                          <span className="whitespace-nowrap">Albarán A4</span>
                        </button>
                      </div>
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
                        scannedOrder.lines.map((line) => (
                          <tr key={line.id}>
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
    </PageShell>
  );
}

export default ProductionPage;
