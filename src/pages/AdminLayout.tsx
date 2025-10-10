import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useUsers, useVehicles } from "@/hooks/use-supabase";
function AdminLayout() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles();

  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  if (isLoadingUsers || isLoadingVehicles) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <Outlet context={{ users, vehicles, fetchData }} />
    </Layout>
  );
};

export default AdminLayout;