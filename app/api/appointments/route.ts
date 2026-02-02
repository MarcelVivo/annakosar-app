import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AppointmentType = "free_intro" | "session";

type PostBody = {
  type?: AppointmentType;
  startsAt?: string;
};

function parseCookies(headerValue: string | null): Record<string, string> {
  if (!headerValue) return {};
  return headerValue.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    const key = rawKey.trim();
    const value = rest.join("=") ?? "";
    acc[key] = value;
    return acc;
  }, {});
}

function extractAccessToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  const allCookies = parseCookies(cookieHeader);

  if (allCookies["sb-access-token"]) {
    return allCookies["sb-access-token"];
  }

  const authCookieKey = Object.keys(allCookies).find(
    (name) => name.startsWith("sb-") && name.endsWith("-auth-token")
  );

  if (authCookieKey) {
    try {
      const parsed = JSON.parse(allCookies[authCookieKey]);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        return parsed[0];
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function getAuthenticatedUser(request: Request) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    throw new Error("Skipped during build");
  }

  const token = extractAccessToken(request);
  if (!token) {
    return { user: null, error: "Not authenticated" };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: "Invalid session" };
  }

  return { user: data.user, error: null };
}

export async function GET(request: Request) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }

  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(
      JSON.stringify({ message: authError }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("id, type, starts_at, status, created_at")
    .eq("user_id", user.id)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ message: "Could not load appointments." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ appointments: data ?? [] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(request: Request) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }

  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(
      JSON.stringify({ message: authError }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const body: PostBody | null = await request
    .json()
    .catch(() => null);

  const type = body?.type;
  const startsAt = body?.startsAt;

  if (!type || !["free_intro", "session"].includes(type)) {
    return new Response(
      JSON.stringify({ message: "Invalid type. Use 'free_intro' or 'session'." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!startsAt) {
    return new Response(
      JSON.stringify({ message: "startsAt is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const startsAtDate = new Date(startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    return new Response(
      JSON.stringify({ message: "startsAt must be a valid ISO timestamp." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createSupabaseServerClient();

  // Prevent double booking at the same start time
  const { data: existing, error: existingError } = await supabase
    .from("appointments")
    .select("id")
    .eq("starts_at", startsAt)
    .eq("status", "booked")
    .maybeSingle();

  if (existingError) {
    return new Response(
      JSON.stringify({ message: "Could not check availability." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (existing) {
    return new Response(
      JSON.stringify({ message: "This time slot is already booked." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: user.id,
      type,
      starts_at: startsAtDate.toISOString(),
      status: "booked",
    })
    .select("id, type, starts_at, status, created_at")
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ message: "Could not create appointment." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ appointment: data }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
}

export async function PUT() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }
  return new Response(
    JSON.stringify({ message: "Method not allowed." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}

export async function DELETE() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }
  return new Response(
    JSON.stringify({ message: "Method not allowed." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}
