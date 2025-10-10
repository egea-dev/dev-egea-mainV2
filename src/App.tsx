import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { PermissionGuardEnhanced } from "./components/PermissionGuardEnhanced";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

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
import SettingsPage from "./pages/SettingsPage";
import ArchivePage from "./pages/ArchivePage";
import SharedPlanPage from "./pages/SharedPlanPage";
import DataEntryPage from "./pages/DataEntry";
import TemplatesPage from "./pages/TemplatesPage";
import MyTasksPage from "./pages/MyTasksPage";

// --- LAYOUTS Y COMPONENTES PRINCIPALES ---
import AdminLayout from "./pages/AdminLayout"; // CORRECCIÓN DEFINITIVA: Importación nombrada
import { DataManagement } from "./components/data/DataManagement";
import { ScreenList } from "./components/screens/ScreenList";
import { TemplateList } from "./components/templates/TemplateList";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<IndexPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/share/plan/:token" element={<SharedPlanPage />} />
          <Route path="/display/:id" element={<DisplayPage />} />
          <Route path="/group/:groupName" element={<GroupDisplayPage />} />
          <Route path="/checkin/:token" element={<CheckinPage />} />
          <Route path="/mis-tareas/:token" element={<MyTasksPage />} />

          {/* Rutas Protegidas del Panel de Administración */}
          <Route path="/admin" element={<AuthGuard><PermissionGuardEnhanced resource="dashboard" action="view"><AdminLayout /></PermissionGuardEnhanced></AuthGuard>}>
            <Route index element={<PermissionGuardEnhanced resource="admin" action="view"><AdminPage /></PermissionGuardEnhanced>} />
            <Route path="installations" element={<InstallationsPage />} />
            <Route path="users" element={<UsersAndVehiclesPage />} />
            <Route path="settings" element={<PermissionGuardEnhanced resource="admin" action="view"><SettingsPage /></PermissionGuardEnhanced>} />
            <Route path="archive" element={<PermissionGuardEnhanced resource="admin" action="view"><ArchivePage /></PermissionGuardEnhanced>} />
            <Route path="data" element={<PermissionGuardEnhanced resource="admin" action="view"><DataManagement /></PermissionGuardEnhanced>} />
            <Route path="screens" element={<PermissionGuardEnhanced resource="admin" action="view"><ScreenList /></PermissionGuardEnhanced>} />
            <Route path="templates" element={<PermissionGuardEnhanced resource="admin" action="view"><TemplatesPage /></PermissionGuardEnhanced>} />
          </Route>
          
          <Route path="/data-entry/:id" element={<AuthGuard><DataEntryPage /></AuthGuard>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;