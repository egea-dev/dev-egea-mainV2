import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TaskActionVariant = "primary" | "outline-success" | "outline-warning" | "neutral";

export type TaskActionConfig = {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: TaskActionVariant;
};

interface TaskActionButtonsProps {
  actions: TaskActionConfig[];
  className?: string;
}

const variantStyles: Record<TaskActionVariant, string> = {
  primary: "",
  "outline-success": "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
  "outline-warning": "border-amber-200 text-amber-600 hover:bg-amber-50",
  neutral: "",
};

export const TaskActionButtons = ({ actions, className }: TaskActionButtonsProps) => {
  if (!actions.length) return null;

  return (
    <div className={cn("grid w-full max-w-2xl gap-2 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {actions.map((action) => {
        const variant = action.variant ?? "neutral";
        const isOutline = variant === "outline-success" || variant === "outline-warning";
        return (
          <Button
            key={action.id}
            variant={isOutline ? "outline" : "default"}
            className={cn(
              "w-full justify-center gap-2",
              isOutline ? variantStyles[variant] : null
            )}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
          >
            {action.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              action.icon ?? null
            )}
            <span>{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
};
