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

function isUuid(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

export async function DELETE(request: Request): Promise<Response | NextResponse> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(
      JSON.stringify({ message: "Skipped during build" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const adminCheck = await requireAdmin(request);
  if (!adminCheck.ok) {
    return new Response(
      JSON.stringify({ message: adminCheck.message }),
      {
        status: adminCheck.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const pathname = new URL(request.url).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const appointmentId = segments[segments.length - 1] ?? "";

  if (!appointmentId) {
    return NextResponse.json(
      { message: "Missing appointment id" },
      { status: 400 }
    );
  }

  if (!appointmentId || !isUuid(appointmentId)) {
    return new Response(
      JSON.stringify({ message: "Invalid appointment id." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return new Response(
        JSON.stringify({ message: "Appointment not found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({ message: "Could not load appointment." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!appointment) {
    return new Response(
      JSON.stringify({ message: "Appointment not found." }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { error: deleteError } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (deleteError) {
    return new Response(
      JSON.stringify({ message: "Could not delete appointment." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function GET() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
