import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(null, { status: 204 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return new Response(
        JSON.stringify({ message: "Logout failed." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
