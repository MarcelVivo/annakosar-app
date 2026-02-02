'use client';

import { useEffect, useState, FormEvent } from "react";

type Appointment = {
  id: string;
  type: "free_intro" | "session";
  starts_at: string;
  status: string;
};

type FetchState = "idle" | "loading" | "error";

export default function BookPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [type, setType] = useState<Appointment["type"]>("free_intro");
  const [startsAt, setStartsAt] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadAppointments = async () => {
    setFetchState("loading");
    setFetchError(null);
    try {
      const res = await fetch("/api/appointments");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message ?? "Termine konnten nicht geladen werden."
        );
      }
      const data = await res.json();
      setAppointments(data.appointments ?? []);
      setFetchState("idle");
    } catch (err: any) {
      setFetchError(err?.message ?? "Unbekannter Fehler.");
      setFetchState("error");
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, startsAt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message ?? "Termin konnte nicht gebucht werden."
        );
      }

      setStartsAt("");
      await loadAppointments();
    } catch (err: any) {
      setSubmitError(err?.message ?? "Unbekannter Fehler.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAppointment = async (id: string) => {
    setCancelError(null);
    setCancellingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message ?? "Termin konnte nicht storniert werden."
        );
      }
      await loadAppointments();
    } catch (err: any) {
      setCancelError(err?.message ?? "Unbekannter Fehler.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <section>
          <h1 className="text-2xl font-semibold">Termin buchen</h1>
          <p className="text-sm text-gray-600">
            Wähle Terminart und Startzeit. Danach siehst du deine gebuchten
            Termine unten.
          </p>
        </section>

        <section className="rounded border p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="type">
                Terminart
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as Appointment["type"])}
                className="w-full rounded border px-3 py-2"
              >
                <option value="free_intro">Kennenlernen (15 Min)</option>
                <option value="session">Sitzung (regulär)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="startsAt">
                Startzeit (ISO oder lokales Datum/Zeit)
              </label>
              <input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="w-full rounded border px-3 py-2"
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {submitting ? "Buchen..." : "Termin buchen"}
            </button>
          </form>
        </section>

        <section className="rounded border p-4">
          <h2 className="text-lg font-semibold">Bevorstehende Termine</h2>
          {fetchState === "loading" && <p>Lade Termine...</p>}
          {fetchState === "error" && (
            <p className="text-red-600" role="alert">
              {fetchError}
            </p>
          )}
          {cancelError && (
            <p className="text-sm text-red-600" role="alert">
              {cancelError}
            </p>
          )}
          {fetchState === "idle" && appointments.length === 0 && (
            <p>Keine Termine geplant.</p>
          )}
          {fetchState === "idle" && appointments.length > 0 && (
            <ul className="divide-y">
              {appointments.map((appt) => {
                const start = new Date(appt.starts_at);
                const dateStr = start.toLocaleDateString();
                const timeStr = start.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const typeLabel =
                  appt.type === "free_intro" ? "Kennenlernen" : "Sitzung";
                return (
                  <li key={appt.id} className="py-3">
                    <div className="font-medium">
                      {dateStr} {timeStr}
                    </div>
                    <div className="text-sm text-gray-700">
                      {typeLabel} · Status: {appt.status}
                    </div>
                    {appt.status === "booked" && (
                      <button
                        className="mt-2 rounded bg-black px-3 py-1 text-white disabled:opacity-60"
                        onClick={() => cancelAppointment(appt.id)}
                        disabled={cancellingId === appt.id}
                      >
                        {cancellingId === appt.id
                          ? "Storniere..."
                          : "Termin stornieren"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
