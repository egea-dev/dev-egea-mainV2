import React from 'react';
import { DraggableTableRow } from "./DraggableTableRow";
import { Task } from '@/types';
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";

type DailyTaskTableProps = {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onRefresh?: () => void;
};

export const DailyTaskTable = ({ tasks, onEditTask, onRefresh }: DailyTaskTableProps) => {
  if (tasks.length === 0) {
    return (
      <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center text-muted-foreground h-[400px] flex flex-col justify-center items-center">
        <h3 className="text-lg font-semibold">No hay tareas programadas.</h3>
        <p className="mt-1 text-sm">Arrastra un usuario o vehículo aquí para crear una tarea.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead className="w-[200px]">Usuarios</TableHead>
          <TableHead className="w-[180px]">Sitio de Trabajo</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead className="w-[150px] text-right">Vehículos</TableHead>
          <TableHead className="w-[100px] text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <DraggableTableRow
            key={task.id}
            task={task}
            onEditTask={onEditTask}
            onDeleteTask={onRefresh}
          />
        ))}
      </TableBody>
    </Table>
  );
};