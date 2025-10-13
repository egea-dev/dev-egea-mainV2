import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardHeader, CardContent, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, User, Car } from 'lucide-react';
import { Task } from '@/types';

type AllTasksTableProps = {
  tasks: Task[];
  onEditTask: (task: Task) => void;
};

export const AllTasksTable = ({ tasks, onEditTask }: AllTasksTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximas Tareas</CardTitle>
        <CardDescription>Todas las tareas programadas a partir de hoy.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Sitio de Trabajo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Asignaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.start_date ? new Date(task.start_date + 'T00:00:00').toLocaleDateString() : 'Sin fecha'}</TableCell>
                  <TableCell className="font-medium">{task.site || (task.data?.site as string | undefined) || 'Sin sitio'}</TableCell>
                  <TableCell className="text-muted-foreground">{task.description || (task.data?.description as string | undefined) || 'Sin descripción'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {task.assigned_users.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-blue-50/70 dark:bg-blue-950/20 text-blue-700 dark:text-blue-200 ring-1 ring-blue-500/30"
                        >
                          <User className="h-4 w-4" />
                          {user.full_name}
                        </div>
                      ))}
                      {task.assigned_vehicles.map(vehicle => {
                        const vehicleBgColor =
                          vehicle.type?.toLowerCase().includes('jumper') ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20' :
                          vehicle.type?.toLowerCase().includes('camión') || vehicle.type?.toLowerCase().includes('camion') ? 'bg-yellow-50/50 dark:bg-yellow-950/10 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500/20' :
                          'bg-gray-50/50 dark:bg-gray-950/10 text-gray-600 dark:text-gray-400 ring-1 ring-gray-500/20';

                        return (
                          <div key={vehicle.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${vehicleBgColor}`}>
                            <Car className="h-4 w-4" />
                            {vehicle.name}
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEditTask(task)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
