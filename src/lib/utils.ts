import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const shellBackground =
  "bg-background bg-[radial-gradient(1100px_circle_at_12%_-10%,_hsl(var(--primary)/0.18),_transparent_55%),radial-gradient(900px_circle_at_90%_0%,_hsl(var(--primary)/0.08),_transparent_50%)]";
export const innerWrapperClasses = "w-full px-1 py-2 sm:px-3 sm:py-3 lg:px-8 lg:py-6";
export const chromePanel = "space-y-2 sm:space-y-3 lg:space-y-6 rounded-lg lg:rounded-2xl border border-border/60 bg-card p-2 sm:p-3 lg:p-5 shadow-sm shadow-black/5";
export const panelCard = "rounded-xl lg:rounded-2xl border border-border/60 bg-card/95 shadow-sm shadow-black/5";
