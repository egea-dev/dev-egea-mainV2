import type { SupabaseClient } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type UpsertTaskParams = {
  taskId?: string | null;
  screenId: string;
  data: Record<string, unknown>;
  state?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  locationMetadata?: Record<string, unknown> | null;
  workSiteId?: string | null;
  responsibleProfileId?: string | null;
  assignedTo?: string | null;
  assignedProfiles?: string[];
  assignedVehicles?: string[];
};

export type UpsertTaskResponse = {
  result_task_id: string;
  result_action: "created" | "updated";
};

let rpcAvailable: boolean | null = null;
const missingColumns = new Set<string>();

const isFunctionMissingError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === "PGRST202") return true;
  const message = (error as { message?: string }).message;
  return typeof message === "string" && message.toLowerCase().includes("upsert_task");
};

const extractMissingColumn = (message?: string | null) => {
  if (!message) return null;
  const match = message.match(/'([\w\d_]+)'\s+column/i);
  return match ? match[1] : null;
};

const normalizeRpcResult = (result: unknown, fallbackId: string, fallbackAction: "created" | "updated"): UpsertTaskResponse => {
  if (!result) return { result_task_id: fallbackId, result_action: fallbackAction };
  const record = Array.isArray(result) ? result[0] : (result as Record<string, unknown>);
  if (!record) return { result_task_id: fallbackId, result_action: fallbackAction };
  const id =
    (record.result_task_id as string | undefined) ??
    (record.task_id as string | undefined) ??
    fallbackId;
  const action =
    ((record.result_action as string | undefined) ??
      (record.action as string | undefined) ??
      fallbackAction) === "updated"
      ? "updated"
      : ((record.result_action as string | undefined) ??
          (record.action as string | undefined) ??
          fallbackAction) === "created"
      ? "created"
      : fallbackAction;
  return { result_task_id: id, result_action: action };
};

const getNextOrderForScreen = async (client: SupabaseClient, screenId: string) => {
  const { data, error } = await client
    .from("screen_data")
    .select("order")
    .eq("screen_id", screenId)
    .order("order", { ascending: false, nullsLast: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const currentOrder = data?.order ?? 0;
  return (currentOrder ?? 0) + 1;
};

const syncAssignments = async (
  client: SupabaseClient,
  taskId: string,
  profileIds: string[] = [],
  vehicleIds: string[] = []
) => {
  const { error: deleteProfilesError } = await client.from("task_profiles").delete().eq("task_id", taskId);
  if (deleteProfilesError) throw deleteProfilesError;

  if (profileIds.length) {
    const { error: insertProfilesError } = await client
      .from("task_profiles")
      .insert(profileIds.map((profileId) => ({ task_id: taskId, profile_id: profileId })));
    if (insertProfilesError) throw insertProfilesError;
  }

  const { error: deleteVehiclesError } = await client.from("task_vehicles").delete().eq("task_id", taskId);
  if (deleteVehiclesError) throw deleteVehiclesError;

  if (vehicleIds.length) {
    const { error: insertVehiclesError } = await client
      .from("task_vehicles")
      .insert(vehicleIds.map((vehicleId) => ({ task_id: taskId, vehicle_id: vehicleId })));
    if (insertVehiclesError) throw insertVehiclesError;
  }
};

const generateUuid = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const upsertTaskDirect = async (client: SupabaseClient, params: UpsertTaskParams): Promise<UpsertTaskResponse> => {
  const {
    taskId,
    screenId,
    data,
    state = "pendiente",
    status = "pendiente",
    startDate = null,
    endDate = null,
    location = null,
    locationMetadata = null,
    workSiteId = null,
    responsibleProfileId = null,
    assignedTo = null,
    assignedProfiles = [],
    assignedVehicles = [],
  } = params;

  const normalizedLocationMetadata =
    locationMetadata ?? (location ? { manual_label: location } : {});

  const isUpdate = Boolean(taskId);
  const resolvedTaskId = taskId ?? generateUuid();

  const basePayload: Record<string, Json> = {
    screen_id: screenId,
    data: (data ?? {}) as Json,
    state,
    status,
    start_date: startDate,
    end_date: endDate,
    location,
    location_metadata: (normalizedLocationMetadata ?? {}) as Json,
    work_site_id: workSiteId,
    responsible_profile_id: responsibleProfileId,
    assigned_to: assignedTo,
  };

  let rowPayload: Record<string, Json> = Object.fromEntries(
    Object.entries(basePayload).filter(([key]) => !missingColumns.has(key))
  );

  const attemptUpdate = async (payload: Record<string, Json>) => {
    let current = { ...payload };
    for (let i = 0; i < 3; i++) {
      const { error } = await client.from("screen_data").update(current).eq("id", resolvedTaskId);
      if (!error) return current;
      const missingColumn = extractMissingColumn((error as { message?: string }).message);
      if (missingColumn && missingColumn in current) {
        const { [missingColumn]: _removed, ...rest } = current;
        current = rest;
        missingColumns.add(missingColumn);
        continue;
      }
      throw error;
    }
    return current;
  };

  const attemptInsert = async (payload: Record<string, Json>) => {
    let current = { ...payload };
    for (let i = 0; i < 3; i++) {
      const { error } = await client.from("screen_data").insert(current);
      if (!error) return current;
      const missingColumn = extractMissingColumn((error as { message?: string }).message);
      if (missingColumn && missingColumn in current) {
        const { [missingColumn]: _removed, ...rest } = current;
        current = rest;
        missingColumns.add(missingColumn);
        continue;
      }
      throw error;
    }
    return current;
  };

  if (isUpdate) {
    rowPayload = await attemptUpdate(rowPayload);
  } else {
    const nextOrder = await getNextOrderForScreen(client, screenId);
    const insertPayload: Record<string, Json> = {
      id: resolvedTaskId,
      ...Object.fromEntries(
        Object.entries(basePayload).filter(([key]) => !missingColumns.has(key))
      ),
      order: nextOrder,
    };
    rowPayload = await attemptInsert(insertPayload);
  }

  await syncAssignments(client, resolvedTaskId, assignedProfiles, assignedVehicles);

  return {
    result_task_id: resolvedTaskId,
    result_action: isUpdate ? "updated" : "created",
  };
};

export const upsertTask = async (client: SupabaseClient, params: UpsertTaskParams): Promise<UpsertTaskResponse> => {
  const rpcPayload = {
    p_task_id: params.taskId ?? undefined,
    p_screen_id: params.screenId,
    p_data: params.data ?? {},
    p_state: params.state ?? "pendiente",
    p_status: params.status ?? "pendiente",
    p_start_date: params.startDate ?? null,
    p_end_date: params.endDate ?? null,
    p_location: params.location ?? null,
    p_location_metadata:
      params.locationMetadata ?? (params.location ? { manual_label: params.location } : {}),
    p_work_site_id: params.workSiteId ?? null,
    p_responsible_profile_id: params.responsibleProfileId ?? null,
    p_assigned_to: params.assignedTo ?? null,
    p_assigned_profiles: params.assignedProfiles ?? [],
    p_assigned_vehicles: params.assignedVehicles ?? [],
  };

  try {
    if (rpcAvailable !== false) {
      const { data, error } = await client.rpc("upsert_task", rpcPayload);
      if (error) {
        if (isFunctionMissingError(error)) {
          rpcAvailable = false;
          return upsertTaskDirect(client, params);
        }
        throw error;
      }
      rpcAvailable = true;
      const fallbackId = params.taskId ?? "";
      const fallbackAction = params.taskId ? "updated" : "created";
      return normalizeRpcResult(data, fallbackId, fallbackAction);
    }
    return upsertTaskDirect(client, params);
  } catch (error) {
    if (isFunctionMissingError(error)) {
      rpcAvailable = false;
      return upsertTaskDirect(client, params);
    }
    throw error;
  }
};
