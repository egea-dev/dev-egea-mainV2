import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { CompactLayout } from "@/components/Layout";
import { useUsers, useVehicles, useProfile } from "@/hooks/use-supabase";
import { getNavItemsForRole } from "@/config/navigation";
import { useRolePreview } from "@/context/RolePreviewContext";
function AdminLayout() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const { previewRole } = useRolePreview();

  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const effectiveRole = previewRole ?? profile?.role ?? 'operario';
  const navItems = getNavItemsForRole(effectiveRole);
  const useCompactLayout = effectiveRole !== 'admin' && effectiveRole !== 'manager';
  const isLoading = isLoadingUsers || isLoadingVehicles || isLoadingProfile;

  useEffect(() => {
    // Modificado: Ahora redirige si estamos en raiz O en la ruta antigua 'workday'
    if (isLoading || (location.pathname !== '/admin' && location.pathname !== '/admin/workday')) {
      return;
    }

    if (!useCompactLayout) {
      return;
    }

    navigate('/admin/installations', { replace: true });
  }, [isLoading, useCompactLayout, location.pathname, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (useCompactLayout) {
    return (
      <CompactLayout profile={profile} navItems={navItems}>
        <Outlet context={{ users, vehicles, fetchData }} />
      </CompactLayout>
    );
  }

  return (
    <Layout profile={profile} navItems={navItems}>
      <Outlet context={{ users, vehicles, fetchData }} />
    </Layout>
  );
};

export default AdminLayout;
