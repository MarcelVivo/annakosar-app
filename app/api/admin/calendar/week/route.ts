import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

async function requireAdmin(request: Request) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    throw new Error("Skipped during build");
  }

  const token = extractAccessToken(request);
  if (!token) {
    return { ok: false as const, status: 401, message: "Not authenticated." };
  }

  const supabase = createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(
    token
  );

  if (userError || !userData?.user) {
    return { ok: false as const, status: 401, message: "Invalid session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    return { ok: false as const, status: 403, message: "Admin role required." };
  }

  return { ok: true as const, userId: userData.user.id };
}

function isValidIsoDate(value: string | null): value is string {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export async function GET(request: Request) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }

  const adminCheck = await requireAdmin(request);
  if (!adminCheck.ok) {
    return new Response(
      JSON.stringify({ message: adminCheck.message }),
      { status: adminCheck.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");
  const weekEnd = searchParams.get("weekEnd");

  if (!isValidIsoDate(weekStart) || !isValidIsoDate(weekEnd)) {
    return new Response(
      JSON.stringify({ message: "weekStart and weekEnd must be valid ISO date strings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const startDate = new Date(weekStart);
  const endDate = new Date(weekEnd);

  if (startDate > endDate) {
    return new Response(
      JSON.stringify({ message: "weekStart must be before or equal to weekEnd." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("id, user_id, type, starts_at, status, created_at")
    .gte("starts_at", startDate.toISOString())
    .lte("starts_at", endDate.toISOString())
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

export async function POST() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }
  return new Response(
    JSON.stringify({ message: "Method not allowed." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
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
