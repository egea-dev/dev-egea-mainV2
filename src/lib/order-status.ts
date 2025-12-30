import type { OrderStatus } from "@/types/commercial";

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
  PENDIENTE_PAGO: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  PAGADO: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  EN_PROCESO: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  PTE_ENVIO: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  ENVIADO: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  ENTREGADO: "bg-emerald-600/15 text-emerald-300 border-emerald-600/40",
  CANCELADO: "bg-red-500/15 text-red-300 border-red-500/40",
};

export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "text-amber-400",
  PAGADO: "text-emerald-400",
  EN_PROCESO: "text-violet-400",
  PTE_ENVIO: "text-orange-400",
  ENVIADO: "text-slate-300",
  ENTREGADO: "text-emerald-400",
  CANCELADO: "text-red-400",
};

