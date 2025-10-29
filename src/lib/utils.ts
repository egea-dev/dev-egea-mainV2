import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const shellBackground = "min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-[#0d0f16] dark:via-[#121425] dark:to-[#08080d]";
export const innerWrapperClasses = "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6";
export const chromePanel = "space-y-6 rounded-3xl border border-slate-200/60 bg-white/90 p-4 backdrop-blur dark:border-white/10 dark:bg-[#151724] dark:text-slate-100";
export const panelCard = "rounded-2xl border border-slate-200/70 bg-white/95 dark:border-white/10 dark:bg-[#1e2030]";
