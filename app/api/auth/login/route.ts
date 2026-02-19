import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

type ProfileRow = {
  role: string | null;
  first_name: string | null;
  last_name: string | null;
};

function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body: LoginBody | null = await request.json().catch(() => null);

  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json(
      {
        success: false,
        message: "Email and password are required.",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user || !data?.session?.access_token) {
      return NextResponse.json(
        {
          success: false,
          message: error?.message ?? "Invalid credentials.",
        },
        { status: 401 }
      );
    }

    const userMetadata = (data.user.user_metadata ?? {}) as Record<
      string,
      unknown
    >;
    const firstName = normalizeName(userMetadata.first_name);
    const lastName = normalizeName(userMetadata.last_name);
    const userId = data.user.id;

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (existingProfileError) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not fetch user profile.",
        },
        { status: 500 }
      );
    }

    let profile = existingProfile;

    if (!profile) {
      const { data: insertedProfile, error: insertProfileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          role: "user",
          first_name: firstName,
          last_name: lastName,
        })
        .select("role, first_name, last_name")
        .single<ProfileRow>();

      if (insertProfileError) {
        return NextResponse.json(
          {
            success: false,
            message: "Could not create user profile.",
          },
          { status: 500 }
        );
      }

      profile = insertedProfile;
    }

    const response = NextResponse.json(
      {
        success: true,
        id: userId,
        email: data.user.email,
        role: profile?.role ?? null,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: "sb-access-token",
      value: data.session.access_token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: data.session.expires_in ?? 60 * 60,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Method not allowed." },
    { status: 405 }
  );
}
