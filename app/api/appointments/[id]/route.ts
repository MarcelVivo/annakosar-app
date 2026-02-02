import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    return { user: null, error: "Not authenticated." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: "Invalid session." };
  }

  return { user: data.user, error: null };
}

function isUuid(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

export async function DELETE(
  request: Request,
  context: any
) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }

  const appointmentId = context?.params?.id;

  if (!appointmentId) {
    return new Response(
      JSON.stringify({ message: "Missing appointment id." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);

  if (error) {
    return new Response(
      JSON.stringify({ message: "Could not cancel appointment." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ message: "Appointment cancelled successfully." }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export async function GET() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }
  return new Response(
    JSON.stringify({ message: "Method not allowed." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
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
