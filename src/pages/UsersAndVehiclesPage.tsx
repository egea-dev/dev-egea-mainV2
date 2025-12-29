import { UserList } from "@/components/users/UserList";
import { VehicleList } from "@/components/vehicles/VehicleList";
import { useAdminData } from "@/hooks/use-admin-data";

export default function UsersAndVehiclesPage() {
  const { users, vehicles, fetchData } = useAdminData();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
          <UserList users={users} onUsersUpdate={fetchData} />
        </div>

        <div className="rounded-[32px] border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
          <VehicleList vehicles={vehicles} onVehiclesUpdate={fetchData} />
        </div>
      </div>
    </div>
  );
}
