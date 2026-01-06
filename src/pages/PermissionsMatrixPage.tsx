import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X, Minus } from 'lucide-react';

const permissionsData = [
    { resource: 'dashboard', label: 'Dashboard Principal', admin: 'CRUD', manager: 'CRUD', responsable: 'View, Create, Edit', operario: 'View', production: 'View', shipping: 'View', warehouse: 'View', comercial: 'View' },
    { resource: 'installations', label: 'Instalaciones', admin: 'CRUD', manager: 'CRUD', responsable: 'CRU (No Delete)', operario: 'View', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'comercial', label: 'Comercial', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'View', comercial: 'CRUD' },
    { resource: 'production', label: 'Producción', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'CRUD', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'warehouse', label: 'Almacén', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'CRUD', comercial: 'No Access' },
    { resource: 'envios', label: 'Envíos', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'View', shipping: 'CRUD', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'users', label: 'Usuarios', admin: 'CRUD', manager: 'CRU (No Delete)', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'vehicles', label: 'Vehículos', admin: 'CRUD', manager: 'CRUD', responsable: 'CRU (No Delete)', operario: 'View', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'screens', label: 'Pantallas', admin: 'CRUD', manager: 'CRUD', responsable: 'View, Create, Edit', operario: 'View', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'templates', label: 'Plantillas', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'data', label: 'Gestión de Datos', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'archive', label: 'Historial', admin: 'CRUD', manager: 'Read (No Create/Delete)', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'settings', label: 'Configuración', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'calendario-global', label: 'Calendario Global', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'View', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'kiosk', label: 'Kiosko', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'matrix', label: 'Matriz de Permisos', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'sla-config', label: 'Configuración SLA', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'communications', label: 'Comunicaciones', admin: 'CRUD', manager: 'CRUD', responsable: 'View, Create, Edit', operario: 'DESHABILITADO', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'system-log', label: 'Logs del Sistema', admin: 'CRUD', manager: 'View Only', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
];

const PermissionCell = ({ value }: { value: string }) => {
    if (value === 'CRUD') return <Badge className="bg-green-600">Total (CRUD)</Badge>;
    if (value === 'View') return <Badge variant="outline" className="border-blue-500 text-blue-500">Solo Ver</Badge>;
    if (value === 'No Access') return <Badge variant="destructive" className="opacity-50">Sin Acceso</Badge>;
    if (value === 'DESHABILITADO') return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500">En Desarrollo</Badge>;

    return <Badge variant="secondary">{value}</Badge>;
};

export default function PermissionsMatrixPage() {
    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Matriz de Permisos del Sistema</CardTitle>
                    <CardDescription>
                        Visualización detallada de los niveles de acceso por rol y recurso.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Recurso</TableHead>
                                    <TableHead className="text-center font-bold text-purple-600">Admin</TableHead>
                                    <TableHead className="text-center font-bold text-blue-600">Manager</TableHead>
                                    <TableHead className="text-center font-bold text-green-600">Responsable</TableHead>
                                    <TableHead className="text-center font-bold text-gray-600">Operario</TableHead>
                                    <TableHead className="text-center font-bold text-orange-600">Production</TableHead>
                                    <TableHead className="text-center font-bold text-cyan-600">Shipping</TableHead>
                                    <TableHead className="text-center font-bold text-amber-600">Warehouse</TableHead>
                                    <TableHead className="text-center font-bold text-pink-600">Comercial</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissionsData.map((row) => (
                                    <TableRow key={row.resource}>
                                        <TableCell className="font-medium">
                                            <div>{row.label}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{row.resource}</div>
                                        </TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.admin} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.manager} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.responsable} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.operario} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.production} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.shipping} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.warehouse} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.comercial} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-purple-600">Admin</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Acceso total al sistema. Puede gestionar todos los recursos, usuarios, configuraciones y ver logs. Es el único que puede gestionar permisos avanzados.
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-blue-600">Manager</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Alta capacidad de gestión. Puede supervisar operaciones globales, gestionar recursos y configuraciones. Restricción principal: no puede eliminar usuarios ni borrar historial crítico.
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-green-600">Responsable</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Enfoque operativo. Gestiona el día a día: instalaciones, asignación de vehículos y tareas. Puede ver usuarios para coordinar, pero no gestionarlos administrativamente.
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-gray-600">Operario</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Usuario final. Acceso limitado a "Mis Tareas", visualización de estado y calendario. Interfaz simplificada para uso en campo.
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-orange-600">Production</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Especializado en producción. Gestión completa del módulo de producción (CRUD) y visualización de envíos. Enfocado en el proceso productivo.
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-cyan-600">Shipping</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Especializado en envíos. Gestión completa del módulo de envíos (CRUD). Responsable de la logística de salida y entregas.
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-amber-600">Warehouse</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Especializado en almacén. Gestión completa del inventario (CRUD) y visualización de pedidos comerciales. Control de stock y movimientos.
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-pink-600">Comercial</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Especializado en ventas. Gestión completa de pedidos comerciales (CRUD). Enfocado en la relación con clientes y generación de pedidos.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
