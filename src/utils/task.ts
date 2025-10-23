import type { Task } from "@/types";
import { formatLocationLabel } from "@/utils/maps";

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const normalizeTaskLocation = (task: Task | null | undefined): string => {
  if (!task) return "";

  const candidates: Array<string | null | undefined> = [
    task.location,
    task.data?.location,
    task.data?.address,
    task.data?.direccion,
    task.data?.site,
    task.data?.ubicacion,
    task.site,
  ];

  for (const candidate of candidates) {
    if (isString(candidate)) {
      return formatLocationLabel(candidate);
    }
  }

  return "";
};
