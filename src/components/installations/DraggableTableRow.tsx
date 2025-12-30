import React from 'react';
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, MoreHorizontal, User, Car, Edit, Trash2 } from 'lucide-react';
import { Task } from "@/types";
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DraggableTableRowProps = {
  task: Task;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
};

export const DraggableTableRow = ({ task, onEditTask, onDeleteTask }: DraggableTableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const setNodeRef = (node: HTMLTableRowElement | null) => {
    setSortableNodeRef(node);
    setDroppableNodeRef(node);
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;

    const { error } = await supabase.from('screen_data').delete().eq('id', task.id);

    if (error) {
      toast.error('Error al eliminar la tarea');
      console.error(error);
    } else {
      toast.success('Tarea eliminada correctamente');
      if (onDeleteTask) onDeleteTask(task.id);
    }
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isOver && "bg-accent", isDragging && "opacity-50")}
    >
      <TableCell className="w-[50px]">
        <div {...listeners} {...attributes} className="cursor-grab p-2 -m-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="w-[200px]">
        <div className="flex flex-col gap-1 items-start">
          {task.assigned_users.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap bg-muted/60 text-foreground ring-1 ring-border/60"
            >
              <User className="h-4 w-4" />
              {user.full_name}
            </div>
          ))}
        </div>
      </TableCell>
      <TableCell className="w-[180px] font-medium">{task.site}</TableCell>
      <TableCell className="text-muted-foreground">{task.description}</TableCell>
      <TableCell className="w-[150px] text-right">
        <div className="flex flex-col gap-1 items-end">
          {task.assigned_vehicles.map(vehicle => {
            const vehicleBgColor =
              vehicle.type?.toLowerCase().includes('jumper') ? 'bg-muted/60 text-foreground ring-1 ring-border/60' :
              vehicle.type?.toLowerCase().includes('camión') || vehicle.type?.toLowerCase().includes('camion') ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30' :
              'bg-muted/40 text-muted-foreground ring-1 ring-border/60';

            return (
              <div key={vehicle.id} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap", vehicleBgColor)}>
                <Car className="h-4 w-4" />
                {vehicle.name}
              </div>
            );
          })}
        </div>
      </TableCell>
      <TableCell className="w-[100px] text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditTask(task)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Borrar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
