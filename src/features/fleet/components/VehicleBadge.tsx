import { Badge } from "@/components/ui/badge";
import { getVehicleTypeColor, VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Truck } from "lucide-react";

interface VehicleBadgeProps {
  name: string;
  type?: string | null;
  licensePlate?: string | null;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "solid";
}

/**
 * Badge para mostrar vehículos con su tipo
 * Utiliza el sistema de colores centralizado
 */
export function VehicleBadge({
  name,
  type,
  licensePlate,
  className,
  showIcon = true,
  size = "md",
  variant = "outline"
}: VehicleBadgeProps) {
  const colorClass = getVehicleTypeColor(type);
  const typeLabel = type ? (VEHICLE_TYPE_LABELS[type.toLowerCase()] || type) : '';

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const variantClasses = {
    default: "",
    outline: "border",
    solid: "border-0"
  };

  return (
    <Badge
      variant={variant === "solid" ? "default" : "outline"}
      className={cn(
        colorClass,
        sizeClasses[size],
        "font-medium rounded-md inline-flex items-center gap-1.5 transition-colors duration-200",
        variantClasses[variant],
        className
      )}
    >
      {showIcon && (
        <Truck
          className="flex-shrink-0"
          size={iconSizes[size]}
          aria-hidden="true"
        />
      )}
      <div className="flex flex-col text-left">
        <span className="truncate">{name}</span>
        {licensePlate && (
          <span className="text-[10px] opacity-80 font-mono tracking-wider leading-none mt-0.5">
            {licensePlate}
          </span>
        )}
      </div>
      {typeLabel && size === "lg" && (
        <span className="opacity-70 text-xs">({typeLabel})</span>
      )}
    </Badge>
  );
}
