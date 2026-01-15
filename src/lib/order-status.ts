import type { OrderStatus } from "@/types/commercial";

const ORDER_STATUS_ALIASES: Record<string, OrderStatus> = {
  EN_PRODUCCION: "EN_PROCESO",
  LISTO_ENVIO: "PTE_ENVIO",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "PENDIENTE_PAGO",
  "PAGADO",
  "EN_PROCESO",
  "PTE_ENVIO",
  "ENVIADO",
  "ENTREGADO",
];

export const isTerminalOrderStatus = (status: OrderStatus) =>
  status === "CANCELADO" || status === "ENTREGADO";

export const resolveOrderStatus = (status?: string | null): OrderStatus | null => {
  if (!status) return null;
  const normalized = status.trim().toUpperCase();
  if (normalized in ORDER_STATUS_ALIASES) {
    return ORDER_STATUS_ALIASES[normalized];
  }
  return ORDER_STATUS_FLOW.includes(normalized as OrderStatus) || normalized === "CANCELADO"
    ? (normalized as OrderStatus)
    : null;
};

export const getOrderStatusBadge = (status?: string | null) => {
  const resolved = resolveOrderStatus(status);
  return resolved ? ORDER_STATUS_BADGES[resolved] : "bg-muted/50 text-muted-foreground border-border/60";
};

export const getOrderStatusLabel = (status?: string | null) => {
  const resolved = resolveOrderStatus(status);
  return resolved ? ORDER_STATUS_LABELS[resolved] : status || "Estado desconocido";
};

export const getOrderStatusText = (status?: string | null) => {
  const resolved = resolveOrderStatus(status);
  return resolved ? ORDER_STATUS_TEXT[resolved] : "text-muted-foreground";
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGADO: "Pagado",
  EN_PROCESO: "En proceso",
  PTE_ENVIO: "Pendiente envio",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const ORDER_STATUS_BADGES: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "bg-slate-300/20 text-slate-100 border-slate-300/50",
  PAGADO: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  EN_PROCESO: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  PTE_ENVIO: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  ENVIADO: "bg-emerald-400/15 text-emerald-300 border-emerald-400/40",
  ENTREGADO: "bg-emerald-600/15 text-emerald-300 border-emerald-600/40",
  CANCELADO: "bg-red-500/15 text-red-300 border-red-500/40",
};

export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "text-slate-300",
  PAGADO: "text-emerald-400",
  EN_PROCESO: "text-amber-400",
  PTE_ENVIO: "text-blue-400",
  ENVIADO: "text-emerald-300",
  ENTREGADO: "text-emerald-400",
  CANCELADO: "text-red-400",
};
