import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const shellBackground =
  "bg-background bg-[radial-gradient(1100px_circle_at_12%_-10%,_hsl(var(--primary)/0.18),_transparent_55%),radial-gradient(900px_circle_at_90%_0%,_hsl(var(--primary)/0.08),_transparent_50%)]";
export const innerWrapperClasses = "w-full px-2 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6";
export const chromePanel = "space-y-3 sm:space-y-4 lg:space-y-6 rounded-xl lg:rounded-2xl border border-border/60 bg-card p-3 sm:p-4 lg:p-5 shadow-sm shadow-black/5";
export const panelCard = "rounded-xl lg:rounded-2xl border border-border/60 bg-card/95 shadow-sm shadow-black/5";
