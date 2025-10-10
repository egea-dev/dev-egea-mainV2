import { useOutletContext } from "react-router-dom";
import { Profile, Vehicle } from "@/types";

type AdminContextType = {
  users: Profile[];
  vehicles: Vehicle[];
  fetchData: () => void;
};

export function useAdminData() {
  return useOutletContext<AdminContextType>();
}
