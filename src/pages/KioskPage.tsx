import React, { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useWorkOrders, useUpdateWorkOrderStatus, WorkOrderStatus } from "@/hooks/use-work-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  CheckCircle2,
  Play,
  Pause,
  AlertTriangle,
  ArrowRight,
  Package,
  History,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDIENTE: { label: "Pendiente", color: "bg-slate-500/10 text-slate-400 border-slate-500/30", icon: Timer },
  CORTE: { label: "Corte", color: "bg-sky-500/10 text-sky-400 border-sky-500/30", icon: Play },
  CONFECCION: { label: "Confeccion", color: "bg-violet-500/10 text-violet-400 border-violet-500/30", icon: Pause },
  TAPICERIA: { label: "Tapiceria", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", icon: Pause },
  CONTROL_CALIDAD: { label: "Calidad", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: AlertTriangle },
  LISTO_ENVIO: { label: "Listo", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

const KioskPage: React.FC = () => {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"scanner" | "list">("scanner");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const { data: workOrders, isLoading } = useWorkOrders();
  const updateStatus = useUpdateWorkOrderStatus();

  const selectedOrder = workOrders?.find((o) => o.id === scannedId || o.order_number === scannedId);

  useEffect(() => {
    if (activeTab === "scanner" && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error("Error clearing scanner", err));
        scannerRef.current = null;
      }
    };
  }, [activeTab]);

  function onScanSuccess(decodedText: string) {
    setScannedId(decodedText);
    toast.success(`Orden detectada: ${decodedText}`);
  }

  function onScanFailure(_error: any) {}

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    if (!selectedOrder) return;

    try {
      await updateStatus.mutateAsync({
        id: selectedOrder.id,
        status: newStatus,
        notes: "Actualizacion desde Kiosco",
      });
      if (newStatus === "LISTO_ENVIO") {
        setScannedId(null);
        toast.info("Orden finalizada");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageShell
      title="Pantallas Kiosko"
      description="Control de planta mediante escaneo y actualizacion de estados."
      actions={
        <div className="flex gap-2">
          <Button
            variant={activeTab === "scanner" ? "default" : "outline"}
            onClick={() => setActiveTab("scanner")}
          >
            <QrCode className="mr-2 h-4 w-4" /> Escaner
          </Button>
          <Button
            variant={activeTab === "list" ? "default" : "outline"}
            onClick={() => setActiveTab("list")}
          >
            <History className="mr-2 h-4 w-4" /> Cola de trabajo
          </Button>
        </div>
      }
    >
      {activeTab === "scanner" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/60 bg-card/80 overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-background/40 py-4">
              <CardTitle className="text-xs font-bold tracking-[0.2em] uppercase flex items-center">
                <QrCode className="w-4 h-4 mr-2 text-primary" /> Camara de reconocimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex items-center justify-center min-h-[300px] bg-black/40">
              <div id="reader" className="w-full h-full"></div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {selectedOrder ? (
              <Card className="border-border/60 bg-card/80">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <Badge className="bg-muted text-muted-foreground border-border/60 mb-2 px-3 py-1 text-[10px] tracking-widest font-bold uppercase">
                        Orden activa
                      </Badge>
                      <h2 className="text-3xl font-bold tracking-tight text-foreground uppercase">
                        {selectedOrder.order_number}
                      </h2>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold tracking-tight border",
                          STATUS_CONFIG[selectedOrder.status]?.color || "bg-muted text-muted-foreground border-border/60"
                        )}
                      >
                        {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-background/40 p-4 rounded-2xl border border-border/60">
                      <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1">
                        Prioridad
                      </p>
                      <p
                        className={cn(
                          "text-lg font-bold",
                          selectedOrder.priority > 0 ? "text-amber-400" : "text-muted-foreground"
                        )}
                      >
                        {selectedOrder.priority === 2
                          ? "Urgente"
                          : selectedOrder.priority === 1
                          ? "Alta"
                          : "Normal"}
                      </p>
                    </div>
                    <div className="bg-background/40 p-4 rounded-2xl border border-border/60">
                      <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1">
                        Fecha inicio
                      </p>
                      <p className="text-lg font-bold text-muted-foreground">
                        {selectedOrder.start_date
                          ? new Date(selectedOrder.start_date).toLocaleDateString()
                          : "--/--/--"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                      const Icon = config.icon;
                      const isCurrent = selectedOrder.status === statusKey;
                      const isDisabled = updateStatus.isPending;

                      return (
                        <Button
                          key={statusKey}
                          disabled={isCurrent || isDisabled}
                          onClick={() => handleStatusChange(statusKey as WorkOrderStatus)}
                          className={cn(
                            "h-20 rounded-2xl flex flex-col items-center justify-center gap-2 border",
                            isCurrent
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-background/40 border-border/60 text-muted-foreground hover:bg-background/60"
                          )}
                        >
                          <Icon className={cn("w-6 h-6", isCurrent ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-[10px] font-black tracking-widest uppercase">
                            {config.label}
                          </span>
                        </Button>
                      );
                    })}
                  </div>

                  <Button variant="ghost" onClick={() => setScannedId(null)} className="w-full mt-6">
                    Cerrar y escanear de nuevo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl p-12 text-center bg-background/40">
                <div className="bg-muted/40 p-8 rounded-full mb-6 ring-1 ring-border/60">
                  <Package className="w-16 h-16 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-muted-foreground mb-2">Esperando orden</h3>
                <p className="text-muted-foreground max-w-sm">
                  Use el escaner de la izquierda para cargar los detalles de la orden.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "list" && (
        <div className="grid grid-cols-1 gap-4">
          {workOrders?.map((order) => (
            <Card
              key={order.id}
              className="border-border/60 bg-card/80 hover:border-primary/30 transition-all cursor-pointer rounded-2xl overflow-hidden"
              onClick={() => {
                setScannedId(order.id);
                setActiveTab("scanner");
              }}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="bg-background/40 p-4 rounded-xl">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black uppercase">{order.order_number}</h4>
                    <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                      {order.status} - Actualizado: {new Date(order.updated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={cn("px-3 py-1 rounded text-xs font-bold border", STATUS_CONFIG[order.status]?.color || "bg-muted text-muted-foreground border-border/60")}>
                    {STATUS_CONFIG[order.status]?.label || order.status}
                  </Badge>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!workOrders || workOrders.length === 0) && (
            <div className="text-center p-12 text-muted-foreground">No hay ordenes en cola actualmente.</div>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default KioskPage;
