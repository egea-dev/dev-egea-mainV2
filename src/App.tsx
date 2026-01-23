import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { PermissionGuardEnhanced } from "./components/PermissionGuardEnhanced";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { RolePreviewProvider } from "./context/RolePreviewContext";

// --- PÁGINAS ---
import IndexPage from "./pages/Index";
import AuthPage from "./pages/Auth";
import AdminPage from "./pages/Admin";
import DisplayPage from "./pages/Display";
import CheckinPage from "./pages/Checkin";
import NotFound from "./pages/NotFound";
import GroupDisplayPage from "./pages/GroupDisplay";
import InstallationsPage from "./pages/Installations";
import UsersAndVehiclesPage from "./pages/UsersAndVehiclesPage";
import CommunicationsPage from "./pages/CommunicationsPage";
import SettingsPage from "./pages/SettingsPage";
import ArchivePage from "./pages/ArchivePage";
import SharedPlanPage from "./pages/SharedPlanPage";
import DataEntryPage from "./pages/DataEntry";
import TemplatesPage from "./pages/TemplatesPage";
import MyTasksPage from "./pages/MyTasksPage";
import WorkdayPage from "./pages/WorkdayPage";
import KioskPage from "./pages/KioskPage";
import WarehousePage from "./pages/WarehousePage";
import { ProductionPage } from "./pages/ProductionPage";
import GlobalCalendarPage from "./pages/GlobalCalendarPage";
import ManagementPage from "./pages/ManagementPage";
import SlaConfigPage from "./pages/SlaConfigPage";
import SystemLogPage from "./pages/SystemLogPage";
import ShippingScanPage from "./pages/ShippingScanPage";
import ExpedicionesPage from "./pages/ExpedicionesPage";
import KioskDisplayPage from "./pages/KioskDisplayPage";
import PlantBoardPage from "./pages/PlantBoardPage";
import ShippingBoardPage from "./pages/ShippingBoardPage";
import OperatorProfilePage from "./pages/OperatorProfilePage";
import IncidentsPage from "./pages/IncidentsPage";

// --- LAYOUTS Y COMPONENTES PRINCIPALES ---
import AdminLayout from "./pages/AdminLayout";
import CommercialPage from "./pages/CommercialPage";
import { DataManagement } from "./components/data/DataManagement";
import { ScreenList } from "./components/screens/ScreenList";
import ScreenDisplay from "./pages/ScreenDisplay";
import { TemplateList } from "./components/templates/TemplateList";
import PermissionsMatrixPage from "./pages/PermissionsMatrixPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RolePreviewProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<IndexPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/share/plan/:token" element={<SharedPlanPage />} />
            <Route path="/kiosk" element={<KioskDisplayPage />} />
            <Route path="/kiosk/board" element={<PlantBoardPage />} />
            <Route path="/kiosk/shipping" element={<ShippingBoardPage />} />
            <Route path="/display/:id" element={<DisplayPage />} />
            <Route path="/group/:groupName" element={<GroupDisplayPage />} />
            <Route path="/screen/:screenId" element={<ScreenDisplay />} />
            <Route path="/checkin/:token" element={<CheckinPage />} />
            <Route path="/mis-tareas/:token" element={<MyTasksPage />} />

            {/* Rutas de Usuario/Operario */}
            <Route path="/user" element={<AuthGuard><AdminLayout /></AuthGuard>}>
              <Route index element={<Navigate to="/user/workday" replace />} />
              <Route path="workday" element={<WorkdayPage />} />
              <Route path="profile" element={<OperatorProfilePage />} />
            </Route>

            <Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
              <Route index element={<PermissionGuardEnhanced resource="admin" action="view"><AdminPage /></PermissionGuardEnhanced>} />
              <Route path="installations" element={
                <PermissionGuardEnhanced resource="installations" action="view">
                  <InstallationsPage />
                </PermissionGuardEnhanced>
              } />
              <Route path="comercial" element={
                <PermissionGuardEnhanced resource="comercial" action="view">
                  <CommercialPage />
                </PermissionGuardEnhanced>
              } />
              <Route
                path="users"
                element={
                  <PermissionGuardEnhanced resource="users" action="view">
                    <UsersAndVehiclesPage />
                  </PermissionGuardEnhanced>
                }
              />
              <Route
                path="communications"
                element={
                  <PermissionGuardEnhanced resource="communications" action="view">
                    <CommunicationsPage />
                  </PermissionGuardEnhanced>
                }
              />
              <Route path="calendario-global" element={
                <PermissionGuardEnhanced resource="calendario-global" action="view">
                  <GlobalCalendarPage />
                </PermissionGuardEnhanced>
              } />
              <Route path="gestion" element={
                <PermissionGuardEnhanced resource="gestion" action="view">
                  <ManagementPage />
                </PermissionGuardEnhanced>
              } />
              <Route path="workday" element={
                <PermissionGuardEnhanced resource="dashboard" action="view">
                  <WorkdayPage />
                </PermissionGuardEnhanced>
              } />
              <Route path="settings" element={<PermissionGuardEnhanced resource="settings" action="view"><SettingsPage /></PermissionGuardEnhanced>} />
              <Route path="permissions-matrix" element={<PermissionGuardEnhanced resource="matrix" action="view"><PermissionsMatrixPage /></PermissionGuardEnhanced>} />
              <Route path="sla-config" element={<PermissionGuardEnhanced resource="sla-config" action="view"><SlaConfigPage /></PermissionGuardEnhanced>} />
              <Route path="system-log" element={<PermissionGuardEnhanced resource="system-log" action="view"><SystemLogPage /></PermissionGuardEnhanced>} />
              <Route path="archive" element={<PermissionGuardEnhanced resource="admin" action="view"><ArchivePage /></PermissionGuardEnhanced>} />
              <Route path="data" element={<PermissionGuardEnhanced resource="admin" action="view"><DataManagement /></PermissionGuardEnhanced>} />
              <Route path="screens" element={<PermissionGuardEnhanced resource="admin" action="view"><ScreenList /></PermissionGuardEnhanced>} />
              <Route path="templates" element={<PermissionGuardEnhanced resource="admin" action="view"><TemplateList /></PermissionGuardEnhanced>} />
              <Route path="produccion" element={
                <PermissionGuardEnhanced resource="produccion" action="view">
                  <ProductionPage />
                </PermissionGuardEnhanced>
              } />
              <Route path="kiosk" element={
                <PermissionGuardEnhanced resource="kiosk" action="view">
                  <KioskPage />
                </PermissionGuardEnhanced>
              } />
              <Route path="almacen" element={
                <PermissionGuardEnhanced resource="almacen" action="view">
                  <WarehousePage />
                </PermissionGuardEnhanced>
              } />
              <Route path="envios" element={
                <PermissionGuardEnhanced resource="envios" action="view">
                  <ShippingScanPage />
                </PermissionGuardEnhanced>
              } />
              <Route path="expediciones" element={
                <PermissionGuardEnhanced resource="envios" action="view">
                  <ExpedicionesPage />
                </PermissionGuardEnhanced>
              } />
              <Route path="incidencias" element={
                <PermissionGuardEnhanced resource="admin" action="view">
                  <IncidentsPage />
                </PermissionGuardEnhanced>
              } />
            </Route>

            <Route path="/data-entry/:id" element={<AuthGuard><DataEntryPage /></AuthGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RolePreviewProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
