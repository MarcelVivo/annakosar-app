import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RegisterBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

export async function POST(request: Request) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return new Response(
      JSON.stringify({ success: true, message: "Skipped during build." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const body: RegisterBody | null = await request.json().catch(() => null);

  const email = body?.email?.trim();
  const password = body?.password;
  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim();

  if (!email || !password || !firstName || !lastName) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Email, password, first name and last name are required.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data?.user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error?.message ?? "Registration failed.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = data.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      role: "user",
    });

    if (profileError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Profile creation failed.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: userId, role: "user" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
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
