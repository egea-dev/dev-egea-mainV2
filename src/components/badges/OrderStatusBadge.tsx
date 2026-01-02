import { Badge } from "@/components/ui/badge";
import { getOrderStatusBadge, getOrderStatusLabel } from "@/lib/order-status";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function OrderStatusBadge({
  status,
  className,
  size = "sm",
}: OrderStatusBadgeProps) {
  const resolvedStatus = status || "PENDIENTE_PAGO";
  const label = getOrderStatusLabel(resolvedStatus);
  const colorClass = getOrderStatusBadge(resolvedStatus);

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-3 py-1",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border font-bold uppercase tracking-wide",
        "shadow-sm shadow-black/30",
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {label}
    </Badge>
  );
}
