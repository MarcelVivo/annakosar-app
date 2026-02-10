import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RegisterBody = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
};

export async function POST(request: Request) {
  const body: RegisterBody | null = await request.json().catch(() => null);

  const email = body?.email?.trim();
  const password = body?.password?.trim();
  const first_name = body?.first_name?.trim();
  const last_name = body?.last_name?.trim();

  if (!email || !password || !first_name || !last_name) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "email, password, first_name and last_name are required.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (password.length < 6) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Password must be at least 6 characters long.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
        },
      },
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

    return new Response(
      JSON.stringify({
        success: true,
        id: data.user.id,
        email: data.user.email,
      }),
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
  return new Response(
    JSON.stringify({ success: false, message: "Method not allowed." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}

