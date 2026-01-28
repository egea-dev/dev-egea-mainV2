import { Badge } from "@/components/ui/badge";
import { getUserStatusColor, getUserStatusLabel, USER_STATUS_DOT_COLORS, type UserStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: UserStatus | string | null | undefined;
  className?: string;
  showDot?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "solid" | "dot";
}

/**
 * Badge para mostrar el estado de un usuario (activo, vacaciones, baja)
 * Utiliza el sistema de semáforos centralizado
 */
export function StatusBadge({
  status,
  className,
  showDot = false,
  size = "md",
  variant = "outline"
}: StatusBadgeProps) {
  const colorClass = getUserStatusColor(status);
  const dotColorClass = status ? USER_STATUS_DOT_COLORS[status as UserStatus] || 'bg-gray-500' : 'bg-gray-500';
  const label = getUserStatusLabel(status);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  // Variante "dot" muestra solo el punto con el color
  if (variant === "dot") {
    return (
      <div className={cn("flex items-center", className)}>
        <span
          className={cn(
            "rounded-full",
            dotSizes[size],
            dotColorClass
          )}
          aria-label={label}
          title={label}
        />
      </div>
    );
  }

  // Variante "solid" usa estilos sólidos sin borde
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
        "font-medium rounded-md transition-colors duration-200",
        variantClasses[variant],
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "mr-1.5 rounded-full bg-current",
            dotSizes[size]
          )}
          aria-hidden="true"
        />
      )}
      {label}
    </Badge>
  );
}
