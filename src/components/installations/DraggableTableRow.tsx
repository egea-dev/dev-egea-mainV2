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
      className={cn(
        "transition-shadow",
        isOver && "bg-accent",
        isDragging && "opacity-50"
      )}
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap bg-blue-50/70 dark:bg-blue-950/20 text-blue-700 dark:text-blue-200 ring-1 ring-blue-500/30"
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
              vehicle.type?.toLowerCase().includes('jumper') ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20' :
              vehicle.type?.toLowerCase().includes('camión') || vehicle.type?.toLowerCase().includes('camion') ? 'bg-yellow-50/50 dark:bg-yellow-950/10 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500/20' :
              'bg-gray-50/50 dark:bg-gray-950/10 text-gray-600 dark:text-gray-400 ring-1 ring-gray-500/20';

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
