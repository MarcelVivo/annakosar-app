'use client';

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Strength = { label: string; color: string };

function passwordStrength(password: string): Strength {
  const length = password.length;
  const hasLetters = /[A-Za-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (length === 0) return { label: "", color: "" };
  if (length < 6) return { label: "Zu kurz", color: "text-red-600" };
  if (length >= 10 && hasLetters && hasNumbers && hasSpecial) {
    return { label: "Sehr stark", color: "text-green-700" };
  }
  if (hasLetters && hasNumbers) {
    return { label: "Solide", color: "text-green-600" };
  }
  return { label: "Schwach", color: "text-orange-500" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        router.push("/login");
        return;
      }

      setError(
        typeof data?.message === "string"
          ? data.message
          : "Registrierung fehlgeschlagen."
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
          Registrieren
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
            {strength.label && (
              <p className={`text-sm ${strength.color}`}>
                Passwort-Stärke: {strength.label}
              </p>
            )}
          </div>

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
            {loading ? "Bitte warten..." : "Registrieren"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <a href="/login" className="text-blue-600 underline">
            Bereits ein Konto? Zum Login
          </a>
        </div>
      </div>
    </main>
  );
}

