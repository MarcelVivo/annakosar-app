import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json(
      { message: "Skipped during build" },
      { status: 200 }
    );
  }

  const body: LoginBody | null = await request
    .json()
    .catch(() => null);

  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      return NextResponse.json(
        { message: error?.message ?? "Invalid credentials." },
        { status: 401 }
      );
    }

    const userId = data.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError) {
      return NextResponse.json(
        { message: "Could not fetch user role." },
        { status: 500 }
      );
    }

    if (!profile?.role) {
      return NextResponse.json(
        { message: "User role not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { id: userId, role: profile.role },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { message: "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
