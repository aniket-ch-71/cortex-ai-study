// Shared auth helpers for PARIKSHA edge functions.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export type AuthOk = { userId: string; admin: SupabaseClient; token: string };

export async function requireUser(req: Request): Promise<AuthOk | Response> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const PUBLISHABLE =
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !PUBLISHABLE) {
    return jsonError("Server misconfigured", 500);
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonError("Unauthorized", 401);

  // Validate JWT against Supabase (rejects the anon key and forged tokens).
  const userClient = createClient(SUPABASE_URL, PUBLISHABLE, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user?.id) return jsonError("Unauthorized", 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { userId: data.user.id, admin, token };
}

/**
 * Atomically check + increment a user's daily quota. Returns null on success,
 * or a 429 Response when the limit is reached.
 */
export async function enforceDailyQuota(
  admin: SupabaseClient,
  userId: string,
  kind: "doubts" | "tests",
  limit: number,
): Promise<Response | null> {
  const { data, error } = await admin.rpc("bump_daily_usage", {
    _user_id: userId,
    _kind: kind,
    _limit: limit,
  });
  if (error) {
    console.error("bump_daily_usage error:", error);
    return jsonError("Quota check failed", 500);
  }
  if (data === false) {
    return jsonError(`Daily limit reached (${limit}). Try again tomorrow.`, 429);
  }
  return null;
}
