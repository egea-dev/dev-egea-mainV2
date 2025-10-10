import { UserList } from "@/components/users/UserList";
import { VehicleList } from "@/components/vehicles/VehicleList";
import CommunicationManagement from "@/components/communications/CommunicationManagement";
import { useAdminData } from "@/hooks/use-admin-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Car, MessageSquare } from "lucide-react";

export default function UsersAndVehiclesPage() {
  const { users, vehicles, fetchData } = useAdminData();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Nivel 1: Gestión Principal (Usuarios y Vehículos) */}
      <div className="space-y-4 sm:space-y-6">
        {/* Nivel 1: Gestión Principal (Usuarios y Vehículos) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Gestionar Operarios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[350px]">
                <div className="p-4">
                  <UserList users={users} onUsersUpdate={fetchData} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="h-5 w-5 text-primary" />
                Gestionar Vehículos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[350px]">
                <div className="p-4">
                  <VehicleList vehicles={vehicles} onVehiclesUpdate={fetchData} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                Gestionar Comunicaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommunicationManagement />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}