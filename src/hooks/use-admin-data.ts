import { useOutletContext } from "react-router-dom";
import { Profile, Vehicle } from "@/types";

type AdminContextType = {
  users: Profile[];
  vehicles: Vehicle[];
  fetchData: () => void;
};

const fallbackAdminContext: AdminContextType = {
  users: [],
  vehicles: [],
  fetchData: () => void 0,
};

export function useAdminData(): AdminContextType {
  const context = useOutletContext<AdminContextType | null | undefined>();
  return context ?? fallbackAdminContext;
}
