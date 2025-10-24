import type { Task } from "@/types";
import {
  buildMapsSearchUrl,
  extractCoordinates,
  formatLocationLabel,
  isGoogleMapsUrl,
  isHttpUrl,
} from "@/utils/maps";

type TaskLike = Partial<Task> | Record<string, unknown>;

export type ResolvedTaskLocation = {
  rawLabel: string | null;
  normalizedLabel: string | null;
  coordinates: { lat: number; lng: number } | null;
  url: string | null;
  source: string | null;
};

const EMPTY_LOCATION: ResolvedTaskLocation = {
  rawLabel: null,
  normalizedLabel: null,
  coordinates: null,
  url: null,
  source: null,
};

const FIELD_PRIORITY = [
  "location",
  "direccion",
  "dirección",
  "address",
  "ubicacion",
  "ubicación",
  "site",
  "obra",
  "client",
  "cliente",
];

const PLACEHOLDER_VALUES = new Set([
  "na",
  "n",
  "pendiente",
  "pendientedefinir",
  "pendienteubicacion",
  "sindireccion",
  "sinubicacion",
  "sinubicacionexacta",
  "sindatos",
  "sininfo",
  "pordefinir",
  "porconfirmar",
  "tbd",
  "null",
  "undefined",
  "porasignar",
  "porasignarse",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeKey = (key: string): string =>
  key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const sanitizeCandidate = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw =
    typeof value === "number"
      ? Number.isFinite(value)
        ? String(value)
        : null
      : typeof value === "string"
      ? value
      : null;

  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = normalizeKey(trimmed);
  if (!normalized || PLACEHOLDER_VALUES.has(normalized)) {
    return null;
  }

  return trimmed;
};

const findRecordMatch = (
  record: Record<string, unknown> | null | undefined,
  key: string
): { key: string; value: string } | null => {
  if (!record) return null;
  const target = normalizeKey(key);

  for (const [recordKey, value] of Object.entries(record)) {
    if (normalizeKey(recordKey) !== target) continue;
    const sanitized = sanitizeCandidate(value);
    if (!sanitized) continue;
    return { key: recordKey, value: sanitized };
  }

  return null;
};

const toCoordinates = (value: string | null): { lat: number; lng: number } | null => {
  if (!value) return null;
  const [latRaw, lngRaw] = value.split(",").map((part) => part.trim());
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const determineUrl = (rawLabel: string, normalizedLabel: string | null): string | null => {
  if (isHttpUrl(rawLabel) || isGoogleMapsUrl(rawLabel)) {
    return rawLabel;
  }
  if (normalizedLabel) {
    return buildMapsSearchUrl(normalizedLabel);
  }
  return null;
};

export const resolveTaskLocation = (
  task: TaskLike | null | undefined
): ResolvedTaskLocation => {
  if (!isRecord(task)) {
    return EMPTY_LOCATION;
  }

  const taskRecord = task as Record<string, unknown>;
  const dataCandidate = (taskRecord as { data?: unknown }).data;
  const dataRecord = isRecord(dataCandidate) ? dataCandidate : null;

  const recordSources: Array<{ record: Record<string, unknown> | null; prefix: string }> = [
    { record: taskRecord, prefix: "task" },
    { record: dataRecord, prefix: "task.data" },
  ];

  for (const field of FIELD_PRIORITY) {
    for (const { record, prefix } of recordSources) {
      const match = findRecordMatch(record, field);
      if (!match) continue;

      const rawLabel = match.value;
      const coordinatesString = extractCoordinates(rawLabel);
      const coordinates = toCoordinates(coordinatesString);

      const normalizedLabel = (() => {
        if (isHttpUrl(rawLabel) || isGoogleMapsUrl(rawLabel)) {
          return coordinatesString ?? rawLabel;
        }
        const formatted = formatLocationLabel(rawLabel);
        return formatted.length ? formatted : null;
      })();

      return {
        rawLabel,
        normalizedLabel,
        coordinates,
        url: determineUrl(rawLabel, normalizedLabel),
        source: `${prefix}.${match.key}`,
      };
    }
  }

  return EMPTY_LOCATION;
};

export const normalizeTaskLocation = (
  task: Task | TaskLike | null | undefined
): string => {
  const resolved = resolveTaskLocation(task);
  return resolved.normalizedLabel ?? "";
};
