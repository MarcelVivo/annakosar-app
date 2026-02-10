'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPasswordError(null);
    setLoading(true);

    const endpoint =
      mode === "login" ? "/api/auth/login" : "/api/auth/signup";

    if (mode === "signup" && password !== passwordConfirm) {
      setPasswordError("Passwörter stimmen nicht überein.");
      setLoading(false);
      return;
    }

    const payload =
      mode === "login"
        ? { email, password }
        : { email, password, firstName, lastName };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/book");
        return;
      }

      const data = await response.json().catch(() => ({}));
      setError(
        typeof data?.message === "string"
          ? data.message
          : "Anmeldung fehlgeschlagen."
      );
    } catch (err) {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-gray-900">
      <div className="w-full max-w-md">
        <h1 className="mb-4 text-2xl font-semibold text-center">
          {mode === "login" ? "Login" : "Registrieren"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="password">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          {mode === "signup" && (
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium" htmlFor="passwordConfirm">
                  Passwort bestätigen
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600" role="alert">
                  {passwordError}
                </p>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium" htmlFor="firstName">
                  Vorname
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium" htmlFor="lastName">
                  Nachname
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-60"
          >
            {loading
              ? "Bitte warten..."
              : mode === "login"
              ? "Einloggen"
              : "Registrieren"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-blue-600 underline"
            >
              Noch kein Konto? Jetzt registrieren
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-blue-600 underline"
            >
              Bereits ein Konto? Zum Login
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
