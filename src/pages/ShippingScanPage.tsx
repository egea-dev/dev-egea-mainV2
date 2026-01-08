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
  AlertOctagon
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import QRScanner from '@/components/common/QRScanner';
import { toast } from 'sonner';
import { printHtmlToIframe } from '@/utils/print';

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
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const summarizeLines = (order: Order) => {
  if (!order.lines || !order.lines.length) return 'Sin desglose cargado';
  const preview = order.lines.slice(0, 2).map(line => `${line.quantity} x ${line.width}x${line.height}cm`).join('  ·  ');
  const remaining = order.lines.length > 2 ? ` +${order.lines.length - 2}` : '';
  return `${preview}${remaining}`;
};

const isRecentShipment = (order: Order) => {
  if (order.status !== 'ENVIADO' || !order.shipping_date) return false;
  const shippedAt = new Date(order.shipping_date).getTime();
  return !Number.isNaN(shippedAt) && (Date.now() - shippedAt) < TWELVE_HOURS_MS;
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
  const [trackingNumber, setTrackingNumber] = useState('');
  const [scannedPackagesCount, setScannedPackagesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar órdenes al montar
  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (scannedOrder) {
      setScannedPackagesCount(scannedOrder.scanned_packages || 0);
      setTrackingNumber(scannedOrder.tracking_number || '');
    }
  }, [scannedOrder]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Cargando órdenes de envío...');

      const { data, error } = await supabaseProductivity
        .from('produccion_work_orders')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📦 Órdenes recibidas:', data);
      console.log('❌ Error:', error);

      if (error) throw error;
      const parsed = (data || []).map((o: any) => ({
        ...o,
        fabric: o.technical_specs?.fabric || o.fabric || 'Estándar',
        color: o.technical_specs?.color || o.color || 'N/D',
        quantity_total: o.technical_specs?.quantity || o.quantity_total || 1
      }));
      setOrders(parsed);
    } catch (error: any) {
      console.error('💥 Error loading orders:', error);
      toast.error('Error al cargar órdenes: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingOrders = useMemo(() => {
    console.log('🔍 Filtrando órdenes para envío...');
    console.log('Total órdenes:', orders.length);

    const filtered = orders.filter(
      o => {
        const isReady = o.status === 'PTE_ENVIO' ||
          o.status === 'LISTO_ENVIO' ||
          (o.status === 'EN_PROCESO' && o.needs_shipping_validation) ||
          isRecentShipment(o);

        if (isReady) {
          console.log(`✅ Orden ${o.order_number} lista para envío (${o.status})`);
        }

        return isReady;
      }
    );

    console.log('Órdenes listas para envío:', filtered.length);
    return filtered;
  }, [orders]);

  const persistOrderUpdate = async (orderId: string, patch: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o));
    setScannedOrder(prev => prev && prev.id === orderId ? { ...prev, ...patch } : prev);
    if (patch.scanned_packages !== undefined) setScannedPackagesCount(patch.scanned_packages || 0);
    try {
      // @ts-ignore
      const { error } = await supabaseProductivity.from('produccion_work_orders').update(patch).eq('id', orderId);
      if (error) throw error;
      await loadOrders();
    } catch (error: any) {
      toast.error('Error sincronizando pedido: ' + error.message);
    }
  };

  const handleScan = async (code: string) => {
    const orderNum = code.includes('|') ? code.split('|')[0] : code;

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
      alert("⛔ ¡ALTO! Estás escaneando un pedido diferente mientras el actual está incompleto.\\n\\nNo mezcles pedidos. Termina el actual o sal manualmente para pausarlo.");
      return;
    }

    const order = orders.find(o => o.order_number === orderNum);
    if (order) {
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
      toast.success(`Orden ${orderNum} cargada`);
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

    if (scannedPackagesCount < totalPackages) {
      alert(`Debes verificar todos los bultos (${scannedPackagesCount}/${totalPackages}) escaneando el QR.`);
      return;
    }

    if (!trackingNumber.trim()) {
      alert('El número de tracking es OBLIGATORIO para validar la salida.');
      return;
    }

    const updatedOrder: Partial<Order> = {
      status: 'ENVIADO',
      quantity_shipped: scannedOrder.quantity_total,
      needs_shipping_validation: false,
      tracking_number: trackingNumber,
      shipping_date: new Date().toISOString()
    };

    await persistOrderUpdate(scannedOrder.id, updatedOrder);
    toast.success(`Salida validada. Tracking: ${trackingNumber}`);
    setScannedOrder(null);
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
    <PageShell title="Expedición y Logística" description="Control de salidas y gestión de envíos">
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4">
        {/* COLUMNA IZQUIERDA - Escáner y Cola */}
        <div className="lg:w-[280px] flex flex-col gap-2">
          {/* Escáner */}
          <div className="bg-[#323438] border border-[#45474A] rounded-xl p-3 lg:p-5">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-indigo-400" />
              <h3 className="text-white font-bold">Egea QR Cam</h3>
            </div>
            {!cameraActive ? (
              <button
                onClick={() => setCameraActive(true)}
                className="w-full aspect-video bg-[#1A1D1F] rounded-xl border border-dashed border-[#45474A] flex flex-col items-center justify-center gap-2 text-[#B5B8BA] hover:text-white hover:border-indigo-500/40 transition"
              >
                <Camera className="w-10 h-10" />
                <span className="text-sm font-medium">Activar cámara</span>
              </button>
            ) : (
              <div className="space-y-3">
                <QRScanner onScan={handleScan} onClose={() => setCameraActive(false)} />
                <button
                  onClick={() => setCameraActive(false)}
                  className="w-full py-2 bg-[#45474A] text-white rounded-lg hover:bg-[#6E6F71] transition"
                >
                  Cerrar cámara
                </button>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                placeholder="Escaneo manual / Ref..."
                className="flex-1 bg-[#1A1D1F] border border-[#45474A] rounded-lg px-4 py-3 text-sm text-white placeholder-[#6E6F71] focus:ring-2 focus:ring-indigo-500 outline-none"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)}
              />
              <button
                onClick={() => handleScan(qrInput)}
                className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cola de Almacén */}
          <div className="bg-[#323438] border border-[#45474A] rounded-xl p-3">
            <h3 className="font-bold text-[#8B8D90] mb-3 text-sm uppercase tracking-wider flex items-center justify-between">
              <span>Cola de Almacén</span>
              <span className="bg-[#45474A] text-[#B5B8BA] px-2 py-0.5 rounded-full text-xs">{pendingOrders.length}</span>
            </h3>
            {isLoading && <div className="text-sm text-[#B5B8BA] py-4">Cargando órdenes...</div>}
            {!isLoading && pendingOrders.length === 0 && (
              <div className="text-sm text-[#B5B8BA] py-4">No hay pedidos pendientes.</div>
            )}
            {!isLoading && pendingOrders.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {pendingOrders.slice(0, 10).map((order) => {
                  const isIncomplete = (order.scanned_packages || 0) > 0 && (order.scanned_packages || 0) < (order.packages_count || 1);
                  const isSelected = scannedOrder?.id === order.id;
                  const recentlyShipped = isRecentShipment(order);
                  return (
                    <button
                      key={order.id}
                      onClick={() => {
                        setScannedOrder(order);
                        setTrackingNumber(order.tracking_number || '');
                        setScannedPackagesCount(order.scanned_packages || 0);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all group relative overflow-hidden ${isSelected
                        ? 'bg-indigo-900/20 border-indigo-500/50'
                        : isIncomplete
                          ? 'bg-amber-900/10 border-amber-500/50'
                          : recentlyShipped
                            ? 'bg-emerald-900/10 border-emerald-500/40'
                            : 'bg-[#1A1D1F] border-[#45474A] hover:border-[#6E6F71]'
                        }`}
                    >
                      {order.status === 'ENVIADO' && !isSelected && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center text-center px-4 z-20">
                          <div className="text-sm text-white">
                            <p className="font-bold uppercase tracking-wider">Escanea el QR para comenzar la revisión</p>
                            <p className="text-xs text-white/70 mt-1">Aunque ya esté enviado, debes escanear para habilitar la pantalla de salida.</p>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-mono font-bold text-sm ${isSelected ? 'text-indigo-300' : 'text-[#B5B8BA]'}`}>
                          {order.order_number}
                        </span>
                        {order.needs_shipping_validation && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
                        {isIncomplete && !isSelected && <PauseCircle className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-[#8B8D90]">
                        <span className="group-hover:text-[#B5B8BA] font-semibold">{order.customer_name}</span>
                        <span className="text-[#B5B8BA]">{order.fabric || 'Sin material'} · {summarizeLines(order)}</span>
                        {recentlyShipped && (
                          <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wide">Enviado · se oculta en 12h</span>
                        )}
                        {order.notes_internal && (
                          <span className="text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {order.notes_internal.slice(0, 60)}{order.notes_internal.length > 60 ? '…' : ''}
                          </span>
                        )}
                        <span>
                          {isIncomplete ? (
                            <span className="text-amber-500 font-bold">{order.scanned_packages}/{order.packages_count}</span>
                          ) : (
                            <span>{order.packages_count || 1} bultos</span>
                          )}
                        </span>

                        {/* Cuadro de avance de producción (Consistencia) */}
                        <div className="mt-2 bg-[#0F1113] border border-[#45474A]/60 rounded-lg p-2">
                          <div className="flex justify-between text-[10px] text-[#6E6F71] uppercase tracking-wide mb-1 font-bold">
                            <span>PRODUCCIÓN</span>
                            <span>{order.shipping_date ? new Date(order.shipping_date).toLocaleDateString() : '---'}</span>
                          </div>
                          <div className="text-[10px] text-[#8B8D90] flex flex-wrap gap-x-2 gap-y-0.5 mb-2">
                            <span>Material: <span className="text-[#B5B8BA]">{order.fabric || 'N/D'}</span></span>
                            <span>Color: <span className="text-[#B5B8BA]">{order.color || 'N/D'}</span></span>
                            <span>Unidades: <span className="text-[#B5B8BA]">{order.quantity_total || 0}</span></span>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-[#8B8D90] font-bold mb-1">
                              <span>Avance producción</span>
                              <span>100%</span>
                            </div>
                            <div className="w-full bg-[#323438] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: '100%' }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
                {/* PROTOCOLO DE REVISIÓN */}
                {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                  <div className="bg-amber-900/10 border border-amber-500/30 p-5 rounded-xl flex items-start gap-4">
                    <AlertOctagon className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
                    <div className="text-sm">
                      <h4 className="font-bold text-amber-400 uppercase mb-2 tracking-wide text-lg">PROTOCOLO DE REVISIÓN</h4>
                      <ul className="space-y-2 text-[#B5B8BA]">
                        <li>Revisa color y medidas antes de continuar.</li>
                        <li>No mezclar pedidos; si cambias se reinicia el conteo.</li>
                        <li>Escanea cada bulto hasta completar el total.</li>
                        <li>Tracking obligatorio antes de liberar envío.</li>
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
                      <p className="text-[#8B8D90] text-xs uppercase font-bold">Cliente / Razón Social</p>
                      <p className="text-[#B5B8BA] font-medium">{scannedOrder.customer_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[#8B8D90] text-xs uppercase font-bold">Región</p>
                      <p className="text-[#B5B8BA]">{scannedOrder.region}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[#8B8D90] text-xs uppercase font-bold">Teléfono</p>
                      <p className="text-[#B5B8BA]">{scannedOrder.phone || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[#8B8D90] text-xs uppercase font-bold">Nombre Contacto</p>
                      <p className="text-[#B5B8BA]">{scannedOrder.contact_name || '---'}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <p className="text-[#8B8D90] text-xs uppercase font-bold">Dirección de Entrega</p>
                      <p className="text-[#B5B8BA]">{scannedOrder.delivery_address || 'Sin dirección especificada'}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <p className="text-[#8B8D90] text-xs uppercase font-bold">Ubicación (Maps)</p>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1A1D1F] rounded-lg border border-[#45474A]">
                    <p className="text-xs text-[#8B8D90] font-bold uppercase mb-1 flex items-center">
                      <Package className="w-3 h-3 mr-1" /> Bultos Totales
                    </p>
                    <p className="font-medium text-[#B5B8BA]">{scannedOrder.packages_count || 1}</p>
                  </div>
                  <div className="p-4 bg-[#1A1D1F] rounded-lg border border-[#45474A]">
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
                            <td className="px-4 py-2 text-[#B5B8BA]">{line.material || scannedOrder.fabric} · {line.width}x{line.height}cm</td>
                            <td className="px-4 py-2 text-[#8B8D90] italic">{line.notes || '—'}</td>
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
                  <div className="bg-[#1A1D1F] border border-[#45474A] rounded-xl p-4">
                    <p className="text-xs text-[#8B8D90] uppercase font-bold mb-2">Notas internas</p>
                    <p className="text-sm text-[#B5B8BA] whitespace-pre-line">{scannedOrder.notes_internal}</p>
                  </div>
                )}

                {/* Verificación de bultos */}
                {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                  <div className="bg-[#1A1D1F] p-4 rounded-xl border border-[#45474A]">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-[#FFFFFF] text-sm uppercase">Verificación de Bultos</h4>
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

                {/* Validación de salida */}
                {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                  <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-xl mt-4">
                    <h3 className="text-emerald-400 font-bold mb-4 flex items-center">
                      <Truck className="w-5 h-5 mr-2" />
                      Validación de Salida
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8B8D90] uppercase mb-2">
                          Número de Tracking <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full bg-[#1A1D1F] border border-[#45474A] text-white p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-lg tracking-wide placeholder-[#6E6F71]"
                          placeholder="Escanea o escribe el ID de envío..."
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Estado ENVIADO */}
                {scannedOrder.status === 'ENVIADO' && (
                  <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-emerald-400">Enviado</h4>
                        <p className="text-[#8B8D90] text-sm">
                          Tracking: <span className="font-mono text-white">{scannedOrder.tracking_number}</span>
                        </p>
                      </div>
                    </div>
                    <button onClick={printManifest} className="px-4 py-2 bg-[#1A1D1F] border border-[#45474A] rounded-lg text-white hover:bg-[#45474A] flex items-center">
                      <FileOutput className="w-4 h-4 mr-2" />
                      Albarán
                    </button>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="p-6 border-t border-[#45474A] bg-[#323438]">
                {['PTE_ENVIO', 'LISTO_ENVIO', 'EN_PROCESO'].includes(scannedOrder.status) && (
                  <button
                    onClick={validateShipment}
                    disabled={!trackingNumber || scannedPackagesCount < (scannedOrder.packages_count || 1)}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center transition-all active:scale-95 ${trackingNumber && scannedPackagesCount >= (scannedOrder.packages_count || 1)
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-[#45474A] text-[#8B8D90] cursor-not-allowed border border-[#6E6F71]'
                      }`}
                  >
                    <Truck className="w-6 h-6 mr-2" />
                    CONFIRMAR ENVÍO
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
                    Volver al Escáner
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-[#45474A] rounded-2xl flex flex-col items-center justify-center text-[#8B8D90] bg-[#1A1D1F]/50">
              <Truck className="w-16 h-16 mb-4 opacity-30" />
              <h3 className="text-xl font-bold text-[#8B8D90] mb-2">Zona de Expedición</h3>
              <p className="text-[#6E6F71] max-w-md text-center">
                Selecciona un pedido de la lista o escanea el QR para verificar bultos y procesar la salida.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
