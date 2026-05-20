import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
import type { IntakeResponse, IntakeSession } from "@/lib/types";

export async function getSessionByToken(
  token: string
): Promise<IntakeSession | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("intake_sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("getSessionByToken error:", error.message);
    return null;
  }
  return (data as IntakeSession) ?? null;
}

export async function getResponses(
  sessionId: string
): Promise<IntakeResponse[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("intake_responses")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    console.error("getResponses error:", error.message);
    return [];
  }
  return (data as IntakeResponse[]) ?? [];
}
