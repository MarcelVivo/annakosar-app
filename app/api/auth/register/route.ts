import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email?.trim();
    const password = body?.password;
    const firstName = body?.firstName?.trim() ?? "";
    const lastName = body?.lastName?.trim() ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName ?? "",
          last_name: lastName ?? "",
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: data.user?.id ?? null,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("REGISTER ERROR:", message);
    return NextResponse.json(
      { error: `Registrierung fehlgeschlagen: ${message}` },
      { status: 500 }
    );
  }
}
