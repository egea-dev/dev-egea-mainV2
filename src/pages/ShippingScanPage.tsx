import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle,
  Copy,
  ExternalLink,
  FileOutput,
  MinusCircle,
  PauseCircle,
  PlusCircle,
  QrCode,
  Truck,
  User,
} from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import QRScanner from "@/components/common/QRScanner";
import { useOrders } from "@/hooks/use-orders";
import { supabaseProductivity } from "@/integrations/supabase/dual-client";
import type { Order } from "@/types/commercial";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const summarizeLines = (order: Order) => {
  if (!order.lines?.length) return "Sin desglose cargado";
  const preview = order.lines
    .slice(0, 2)
    .map((line) => `${line.quantity} x ${line.width}x${line.height}cm`)
    .join(" · ");
  const remaining = order.lines.length > 2 ? ` +${order.lines.length - 2}` : "";
  return `${preview}${remaining}`;
};

const isRecentShipment = (order: Order) => {
  if (order.status !== "ENVIADO" || !order.shipping_date) return false;
  const shippedAt = new Date(order.shipping_date).getTime();
  return !Number.isNaN(shippedAt) && Date.now() - shippedAt < TWELVE_HOURS_MS;
};

const resolvePackagesTotal = (order: Order) =>
  order.packages_count || Math.max(order.lines?.length || 0, 1);

export default function ShippingScanPage() {
  const { data: orders = [], isLoading, refetch } = useOrders();
  const [qrInput, setQrInput] = useState("");
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerFullScreen, setScannerFullScreen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [scannedPackagesCount, setScannedPackagesCount] = useState(0);

  const pendingOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status === "PTE_ENVIO" ||
        (order.status === "EN_PROCESO" && order.needs_shipping_validation) ||
        isRecentShipment(order)
    );
  }, [orders]);

  useEffect(() => {
    if (scannedOrder) {
      setScannedPackagesCount(scannedOrder.scanned_packages || 0);
      setTrackingNumber(scannedOrder.tracking_number || "");
    } else {
      setScannedPackagesCount(0);
      setTrackingNumber("");
    }
  }, [scannedOrder]);

  const persistOrderUpdate = async (orderId: string, patch: Partial<Order>) => {
    setScannedOrder((prev) => (prev && prev.id === orderId ? { ...prev, ...patch } : prev));
    if (patch.scanned_packages !== undefined) {
      setScannedPackagesCount(patch.scanned_packages || 0);
    }

    const { error } = await supabaseProductivity
      .from("comercial_orders")
      .update(patch)
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order:", error);
      toast.error("No se pudo sincronizar el pedido.");
      return;
    }

    await refetch();
  };

  const handleScan = async (code: string) => {
    const raw = code.trim();
    if (!raw) return;

    const orderNum = raw.includes("|") ? raw.split("|")[0] : raw;

    if (
      scannedOrder &&
      scannedOrder.order_number !== orderNum &&
      scannedPackagesCount > 0 &&
      scannedPackagesCount < resolvePackagesTotal(scannedOrder)
    ) {
      alert(
        "ALTO: estas escaneando un pedido distinto mientras el actual esta incompleto.\n\nFinaliza el pedido actual o sal manualmente para pausarlo."
      );
      return;
    }

    if (scannedOrder && scannedOrder.order_number === orderNum) {
      const total = resolvePackagesTotal(scannedOrder);
      if (scannedPackagesCount < total) {
        const newCount = scannedPackagesCount + 1;
        await persistOrderUpdate(scannedOrder.id, { scanned_packages: newCount });
        toast.success(`Bulto verificado (${newCount}/${total})`, { duration: 900 });
      } else {
        toast.info("Todos los bultos ya estan verificados.");
      }
      setQrInput("");
      return;
    }

    const order = orders.find((o) => o.order_number === orderNum);
    if (!order) {
      toast.error(`Pedido no encontrado: ${orderNum}`);
      return;
    }

    const validStatus =
      order.status === "PTE_ENVIO" ||
      (order.status === "EN_PROCESO" && order.needs_shipping_validation) ||
      order.status === "ENVIADO";

    if (!validStatus) {
      toast.error(`Pedido no listo para envio (estado: ${order.status})`);
      return;
    }

    const isReEntry =
      (order.scanned_packages || 0) > 0 &&
      (order.scanned_packages || 0) < resolvePackagesTotal(order);

    if (isReEntry) {
      await persistOrderUpdate(order.id, { scanned_packages: 0 });
    }

    setScannedOrder(order);
    setCameraActive(false);
    setScannerFullScreen(false);
    setQrInput("");
  };

  const updateOrderProgress = async (orderId: string, newCount: number) => {
    await persistOrderUpdate(orderId, { scanned_packages: newCount });
  };

  const validateShipment = async () => {
    if (!scannedOrder) return;
    const totalPackages = resolvePackagesTotal(scannedOrder);

    if (scannedPackagesCount < totalPackages) {
      alert(`Debes verificar todos los bultos (${scannedPackagesCount}/${totalPackages}) antes de validar.`);
      return;
    }

    if (!trackingNumber.trim()) {
      alert("El numero de tracking es obligatorio para validar la salida.");
      return;
    }

    await persistOrderUpdate(scannedOrder.id, {
      status: "ENVIADO",
      quantity_shipped: scannedOrder.quantity_total,
      needs_shipping_validation: false,
      tracking_number: trackingNumber.trim(),
      shipping_date: new Date().toISOString(),
    });

    toast.success("Salida validada correctamente.");
  };

  const printManifest = () => {
    if (!scannedOrder) return;
    const hasPresupuesto = scannedOrder.documents?.some((d) => d.type === "PRESUPUESTO") ? "SI" : "NO";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Albaran Salida - ${scannedOrder.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #222; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; }
            .meta { text-align: right; font-size: 14px; }
            .box { border: 1px solid #ccc; padding: 16px; margin-bottom: 18px; background: #f6f6f6; }
            .box h3 { margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 6px; font-size: 12px; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
            .label { font-weight: bold; color: #444; }
            .tracking-box { font-size: 18px; font-weight: bold; padding: 18px; border: 2px dashed #222; text-align: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">ALBARAN DE SALIDA</div>
            <div class="meta">
              <div>Egea</div>
              <div>Fecha: ${new Date().toLocaleDateString()}</div>
              <div>Ref: ${scannedOrder.order_number}</div>
              <div><b>Ref Admin: ${scannedOrder.admin_code || "---"}</b></div>
            </div>
          </div>
          <div class="box">
            <h3>Datos de entrega</h3>
            <div class="row"><span class="label">Cliente:</span> ${scannedOrder.customer_name}</div>
            <div class="row"><span class="label">Contacto:</span> ${scannedOrder.contact_name || "-"}</div>
            <div class="row"><span class="label">Telefono:</span> ${scannedOrder.phone || "-"}</div>
            <div class="row"><span class="label">Direccion:</span> ${scannedOrder.delivery_address || "-"}</div>
            <div class="row"><span class="label">Destino:</span> ${scannedOrder.delivery_region || scannedOrder.region || "-"}</div>
          </div>
          <div class="box">
            <h3>Detalles de almacen</h3>
            <div class="row"><span class="label">Total unidades:</span> ${scannedOrder.quantity_total}</div>
            <div class="row"><span class="label">Numero bultos:</span> ${resolvePackagesTotal(scannedOrder)}</div>
            <div class="row"><span class="label">Material:</span> ${scannedOrder.fabric || "-"}</div>
            <div class="row"><span class="label">Presupuesto adjunto:</span> ${hasPresupuesto}</div>
          </div>
          <div class="tracking-box">
            TRACKING ID: ${trackingNumber || scannedOrder.tracking_number || "-"}
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Datos copiados.");
  };

  const totalPackages = scannedOrder ? resolvePackagesTotal(scannedOrder) : 0;
  const progress = totalPackages > 0 ? (scannedPackagesCount / totalPackages) * 100 : 0;

  return (
    <PageShell title="Envios" description="Control de salidas, validacion y tracking de bultos.">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col gap-4 lg:w-[360px]">
          <Card className="border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Escaner de envios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cameraActive ? (
                <div className="space-y-3">
                  <QRScanner
                    onScan={handleScan}
                    onClose={() => {
                      setCameraActive(false);
                      setScannerFullScreen(false);
                    }}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setScannerFullScreen(true)}
                  >
                    Pantalla completa
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCameraActive(true)}
                  className="w-full aspect-video bg-muted/50 rounded-xl border border-dashed border-border/70 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
                >
                  <Camera className="h-10 w-10" />
                  <span className="text-sm font-medium">Activar camara</span>
                </button>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Escaneo manual / Ref..."
                  value={qrInput}
                  onChange={(event) => setQrInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleScan(qrInput)}
                  className="bg-muted/40"
                />
                <Button onClick={() => handleScan(qrInput)} className="shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Cola de envios
              </CardTitle>
              <Badge variant="secondary">{pendingOrders.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading && <div className="text-sm text-muted-foreground">Cargando pedidos...</div>}
              {!isLoading && pendingOrders.length === 0 && (
                <div className="text-sm text-muted-foreground">No hay pedidos pendientes.</div>
              )}
              {pendingOrders.map((order) => {
                const isIncomplete =
                  (order.scanned_packages || 0) > 0 &&
                  (order.scanned_packages || 0) < resolvePackagesTotal(order);
                const isSelected = scannedOrder?.id === order.id;
                const recentlyShipped = isRecentShipment(order);

                return (
                  <button
                    key={order.id}
                    onClick={() => {
                      setScannedOrder(order);
                      setTrackingNumber(order.tracking_number || "");
                      setScannedPackagesCount(order.scanned_packages || 0);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/60 bg-muted/30 hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("font-mono text-xs", isSelected ? "text-primary" : "text-muted-foreground")}>
                        {order.order_number}
                      </span>
                      {order.needs_shipping_validation && (
                        <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
                      )}
                      {isIncomplete && !isSelected && (
                        <PauseCircle className="h-4 w-4 text-orange-400" />
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{order.customer_name}</p>
                      <p>
                        {order.fabric || "Sin material"} · {summarizeLines(order)}
                      </p>
                      {recentlyShipped && (
                        <p className="text-[10px] text-emerald-400 uppercase font-semibold">
                          Enviado · se oculta en 12h
                        </p>
                      )}
                      {order.internal_notes && (
                        <p className="text-[10px] text-amber-300">
                          {order.internal_notes.slice(0, 60)}
                          {order.internal_notes.length > 60 ? "..." : ""}
                        </p>
                      )}
                      <p>
                        {isIncomplete ? (
                          <span className="text-orange-400 font-semibold">
                            {order.scanned_packages}/{resolvePackagesTotal(order)}
                          </span>
                        ) : (
                          <span>{resolvePackagesTotal(order)} bultos</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          {scannedOrder ? (
            <Card className="border-border/60 bg-card h-full">
              <CardHeader className="border-b border-border/60">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{scannedOrder.order_number}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Ref Admin: {scannedOrder.admin_code || "---"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {scannedOrder.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-4 w-4" />
                    {scannedOrder.customer_name}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 py-6">
                {["PTE_ENVIO", "EN_PROCESO"].includes(scannedOrder.status) && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-start gap-3 text-sm text-amber-200">
                      <AlertTriangle className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="font-semibold uppercase">Protocolo de revision</p>
                        <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
                          <li>Revisa color y medidas antes de continuar.</li>
                          <li>No mezcles pedidos; termina el actual.</li>
                          <li>Escanea cada bulto hasta completar el total.</li>
                          <li>Tracking obligatorio antes de liberar envio.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Datos del cliente</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          `${scannedOrder.customer_name}\n${scannedOrder.delivery_address || ""}\n${scannedOrder.phone || ""}`
                        )
                      }
                    >
                      <Copy className="h-3 w-3 mr-2" /> Copiar
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Region</p>
                      <p className="text-foreground">{scannedOrder.delivery_region || scannedOrder.region || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Telefono</p>
                      <p className="text-foreground">{scannedOrder.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Contacto</p>
                      <p className="text-foreground">{scannedOrder.contact_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Direccion</p>
                      <p className="text-foreground">{scannedOrder.delivery_address || "-"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase text-muted-foreground">Maps</p>
                      {scannedOrder.delivery_location_url ? (
                        <a
                          href={scannedOrder.delivery_location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {scannedOrder.delivery_location_url}
                        </a>
                      ) : (
                        <p className="text-muted-foreground">No disponible</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <Truck className="h-3 w-3" /> Bultos totales
                    </p>
                    <p className="text-sm text-foreground">{totalPackages}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <Truck className="h-3 w-3" /> Total unidades
                    </p>
                    <p className="text-sm text-foreground">{scannedOrder.quantity_total}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Cant.</th>
                        <th className="px-4 py-2 text-left">Material / Medidas</th>
                        <th className="px-4 py-2 text-left">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(scannedOrder.lines || []).map((line, idx) => (
                        <tr key={`${line.material}-${idx}`}>
                          <td className="px-4 py-2 font-semibold text-foreground">{line.quantity}</td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {line.material || scannedOrder.fabric} · {line.width}x{line.height}cm
                          </td>
                          <td className="px-4 py-2 text-muted-foreground italic">{line.notes || "-"}</td>
                        </tr>
                      ))}
                      {(!scannedOrder.lines || scannedOrder.lines.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                            Sin desglose registrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {scannedOrder.internal_notes && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Notas internas</p>
                    <p className="text-sm text-foreground mt-2 whitespace-pre-line">
                      {scannedOrder.internal_notes}
                    </p>
                  </div>
                )}

                {["PTE_ENVIO", "EN_PROCESO"].includes(scannedOrder.status) && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Verificacion de bultos</span>
                      <span className="font-mono text-foreground">
                        {scannedPackagesCount} / {totalPackages}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          scannedPackagesCount >= totalPackages ? "bg-emerald-500" : "bg-orange-500"
                        )}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateOrderProgress(scannedOrder.id, Math.max(0, scannedPackagesCount - 1))}
                      >
                        <MinusCircle className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          updateOrderProgress(scannedOrder.id, Math.min(scannedPackagesCount + 1, totalPackages))
                        }
                      >
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {["PTE_ENVIO", "EN_PROCESO"].includes(scannedOrder.status) && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Validacion de salida
                    </h3>
                    <div>
                      <label className="text-xs uppercase text-muted-foreground">
                        Numero de tracking <span className="text-red-400">*</span>
                      </label>
                      <Input
                        value={trackingNumber}
                        onChange={(event) => setTrackingNumber(event.target.value)}
                        placeholder="Escanea o escribe el ID de envio..."
                        className="mt-2 bg-muted/40 font-mono"
                      />
                    </div>
                  </div>
                )}

                {scannedOrder.status === "ENVIADO" && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-200">Enviado</p>
                        <p className="text-xs text-emerald-100/80 font-mono">
                          Tracking: {scannedOrder.tracking_number}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={printManifest}>
                      <FileOutput className="h-4 w-4 mr-2" /> Albaran
                    </Button>
                  </div>
                )}
              </CardContent>

              <div className="border-t border-border/60 p-4">
                {["PTE_ENVIO", "EN_PROCESO"].includes(scannedOrder.status) && (
                  <Button
                    className="w-full h-12 text-base"
                    onClick={validateShipment}
                    disabled={!trackingNumber || scannedPackagesCount < totalPackages}
                  >
                    <Truck className="h-5 w-5 mr-2" />
                    Confirmar envio
                  </Button>
                )}
                {scannedOrder.status === "ENVIADO" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setScannedOrder(null);
                      setTrackingNumber("");
                      setScannedPackagesCount(0);
                    }}
                  >
                    Volver al escaner
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card className="border-border/60 bg-card h-full">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <QrCode className="h-16 w-16 opacity-30" />
                <p className="text-sm text-muted-foreground">
                  Escanea un pedido o selecciona uno de la lista para iniciar la validacion.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={scannerFullScreen} onOpenChange={setScannerFullScreen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <div className="space-y-3">
            <QRScanner
              onScan={(value) => {
                handleScan(value);
                setScannerFullScreen(false);
              }}
              onClose={() => setScannerFullScreen(false)}
            />
            <Button variant="outline" className="w-full" onClick={() => setScannerFullScreen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
