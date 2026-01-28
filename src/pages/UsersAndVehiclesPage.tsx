import { UserList } from "@/components/users/UserList";
import { VehicleList } from "@/components/vehicles/VehicleList";
import { useAdminData } from "@/hooks/use-admin-data";
import PageShell from "@/components/layout/PageShell";

export default function UsersAndVehiclesPage() {
  const { users, vehicles, fetchData } = useAdminData();

  return (
    <PageShell
      title="Usuarios"
      description="Gestion de usuarios y flota disponible."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <UserList users={users} onUsersUpdate={fetchData} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <VehicleList vehicles={vehicles} onVehiclesUpdate={fetchData} />
        </div>
      </div>
    </PageShell>
  );
}
