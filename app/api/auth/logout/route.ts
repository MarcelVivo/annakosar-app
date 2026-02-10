import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(
      JSON.stringify({ success: true, message: "Skipped during build." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, message: "Logout failed." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: "Unexpected server error." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(
      JSON.stringify({ success: true, message: "Skipped during build." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({ success: false, message: "Method not allowed." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}
