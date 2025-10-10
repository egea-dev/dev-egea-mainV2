import { Badge } from "@/components/ui/badge";
import { getTaskStateColor, getTaskStateLabel, type TaskState } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Clock, Hammer, Zap } from "lucide-react";

interface TaskStateBadgeProps {
  state: TaskState | string | null | undefined;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "solid" | "minimal";
}

/**
 * Badge para mostrar el estado de una tarea
 * Utiliza el sistema de semáforos centralizado
 */
export function TaskStateBadge({
  state,
  className,
  showIcon = true,
  size = "md",
  variant = "outline"
}: TaskStateBadgeProps) {
  const colorClass = getTaskStateColor(state);
  const label = getTaskStateLabel(state);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const minimalSizeClasses = {
    sm: "text-xs px-1 py-0.5",
    md: "text-xs px-1.5 py-0.5",
    lg: "text-sm px-2 py-1",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  // Seleccionar icono según el estado
  const getIcon = () => {
    if (!showIcon) return null;

    const iconSize = iconSizes[size] || iconSizes.md;
    const props = { size: iconSize, className: "flex-shrink-0", "aria-hidden": true };

    switch (state) {
      case 'urgente':
        return <Zap {...props} />;
      case 'terminado':
        return <CheckCircle {...props} />;
      case 'incidente':
      case 'arreglo':
        return <AlertCircle {...props} />;
      case 'a la espera':
        return <Clock {...props} />;
      case 'en fabricacion':
        return <Hammer {...props} />;
      default:
        return null;
    }
  };

  // Variante "minimal" solo muestra el icono y color sin texto
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-colors duration-200",
          minimalSizeClasses[size],
          colorClass,
          className
        )}
        title={label}
        aria-label={label}
      >
        {getIcon()}
      </div>
    );
  }

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
      {getIcon()}
      <span>{label}</span>
    </Badge>
  );
}
