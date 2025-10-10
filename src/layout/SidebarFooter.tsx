import { Separator } from "@/components/ui/separator";

const EgeaLogo = () => (
  <svg width="60" height="20" viewBox="0 0 120 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 0H20V40H0V0Z" />
    <path d="M25 0H45V40H25V0Z" />
    <path d="M50 0H70V40H50V0Z" />
    <path d="M75 0H95V40H75V0Z" />
    <path d="M100 0H120V40H100V0Z" />
  </svg>
);

export const SidebarFooter = () => {
  return (
    <div className="mt-auto p-4 space-y-4">
      <Separator />
      <div className="flex flex-col items-center text-center space-y-2">
         <EgeaLogo />
        <div className="text-xs text-muted-foreground">
          <p>Hecho con ❤️ por Hacchi</p>
        </div>
      </div>
    </div>
  );
};