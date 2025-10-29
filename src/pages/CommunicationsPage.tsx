import CommunicationManagement from "@/components/communications/CommunicationManagement";
import { DirectMessagesChat } from "@/components/communications/DirectMessagesChat";
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(0,400px)] xl:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <CommunicationManagement />
        </div>
        <div id="direct-messages-panel" className="lg:col-span-1">
          <DirectMessagesChat />
        </div>
      </div>
    </div>
  );
}
