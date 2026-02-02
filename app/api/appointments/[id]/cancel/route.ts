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
    return { user: null, error: "Not authenticated" };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: "Invalid session" };
  }

  return { user: data.user, error: null };
}

function isUuid(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json(
      { message: "Skipped during build" },
      { status: 200 }
    );
  }

  const { id: appointmentId } = await params;

  if (!appointmentId || !isUuid(appointmentId)) {
    return NextResponse.json(
      { message: "Invalid appointment id." },
      { status: 400 }
    );
  }

  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: authError }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("id, user_id, type, starts_at, status, created_at")
    .eq("id", appointmentId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { message: "Could not load appointment." },
      { status: 500 }
    );
  }

  if (!appointment || appointment.user_id !== user.id) {
    return NextResponse.json(
      { message: "You are not allowed to cancel this appointment." },
      { status: 403 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("user_id", user.id)
    .select("id, user_id, type, starts_at, status, created_at")
    .single();

  if (updateError) {
    return NextResponse.json(
      { message: "Could not cancel appointment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ appointment: updated }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
