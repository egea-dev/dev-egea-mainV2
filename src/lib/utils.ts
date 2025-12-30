import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const shellBackground =
  "bg-background bg-[radial-gradient(1100px_circle_at_12%_-10%,_hsl(var(--primary)/0.18),_transparent_55%),radial-gradient(900px_circle_at_90%_0%,_hsl(var(--primary)/0.08),_transparent_50%)]";
export const innerWrapperClasses = "w-full px-4 py-6 sm:px-6 lg:px-8";
export const chromePanel =
  "space-y-6 rounded-2xl border border-border/60 bg-card p-5 shadow-sm shadow-black/5";
export const panelCard =
  "rounded-2xl border border-border/60 bg-card/95 shadow-sm shadow-black/5";
