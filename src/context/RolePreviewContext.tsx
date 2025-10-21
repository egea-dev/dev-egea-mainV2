import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppRole } from "@/config/navigation";

type RolePreviewContextValue = {
  previewRole: AppRole | null;
  setPreviewRole: (role: AppRole) => void;
  clearPreview: () => void;
};

const RolePreviewContext = createContext<RolePreviewContextValue | undefined>(undefined);

const STORAGE_KEY = "egea-role-preview";

export const RolePreviewProvider = ({ children }: { children: React.ReactNode }) => {
  const [previewRole, setPreviewRoleState] = useState<AppRole | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPreviewRoleState(JSON.parse(stored) as AppRole);
      } catch (_error) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (previewRole) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(previewRole));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [previewRole]);

  const value = useMemo<RolePreviewContextValue>(
    () => ({
      previewRole,
      setPreviewRole: (role) => setPreviewRoleState(role),
      clearPreview: () => setPreviewRoleState(null),
    }),
    [previewRole]
  );

  return <RolePreviewContext.Provider value={value}>{children}</RolePreviewContext.Provider>;
};

export const useRolePreview = () => {
  const ctx = useContext(RolePreviewContext);
  if (!ctx) {
    throw new Error("useRolePreview must be used within a RolePreviewProvider");
  }
  return ctx;
};
