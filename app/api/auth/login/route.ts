import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body: LoginBody | null = await request.json().catch(() => null);

  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Email and password are required.",
      }),
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
        JSON.stringify({
          success: false,
          message: error?.message ?? "Invalid credentials.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = data.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Could not fetch user profile.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: userId,
        email: data.user.email,
        role: profile?.role ?? null,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
      }),
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
  return new Response(
    JSON.stringify({ success: false, message: "Method not allowed." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}

