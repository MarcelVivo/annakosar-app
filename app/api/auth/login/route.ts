import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }

  const body: LoginBody | null = await request
    .json()
    .catch(() => null);

  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return new Response(
      JSON.stringify({ message: "Email and password are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      return new Response(
        JSON.stringify({ message: error?.message ?? "Invalid credentials." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = data.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ message: "Could not fetch user role." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!profile?.role) {
      return new Response(
        JSON.stringify({ message: "User role not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ id: userId, role: profile.role }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ message: "Unexpected server error." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
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
