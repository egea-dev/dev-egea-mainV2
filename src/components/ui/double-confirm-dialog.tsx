import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface DoubleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  requiredWord?: string;
}

export function DoubleConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "ELIMINAR",
  requiredWord = "ELIMINAR"
}: DoubleConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState(1);

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleSecondConfirm = () => {
    if (inputValue === requiredWord) {
      onConfirm();
      handleClose();
    }
  };

  const handleClose = () => {
    setInputValue("");
    setStep(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta acción es <span className="font-bold text-destructive">irreversible</span>.
            </p>
            <p className="text-sm">
              ¿Estás completamente seguro de que deseas continuar?
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para confirmar, escribe <span className="font-mono font-bold">{requiredWord}</span> en el campo de abajo:
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirm-input">Confirmación</Label>
              <Input
                id="confirm-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={requiredWord}
                autoFocus
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {step === 1 && (
            <Button variant="destructive" onClick={handleFirstConfirm}>
              Continuar
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="destructive"
              onClick={handleSecondConfirm}
              disabled={inputValue !== requiredWord}
            >
              {confirmText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
