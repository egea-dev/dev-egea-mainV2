import CommunicationManagement from "@/components/communications/CommunicationManagement";
import { OperatorMessaging } from "@/components/communications/OperatorMessaging";
import { useProfile } from "@/hooks/use-supabase";

export default function CommunicationsPage() {
  const { data: profile } = useProfile();
  const role = profile?.role ?? null;

  if (role === "operario") {
    return (
      <div className="space-y-4 sm:space-y-6">
        <OperatorMessaging />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <CommunicationManagement />
    </div>
  );
}
