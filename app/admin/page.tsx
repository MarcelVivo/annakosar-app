'use client';

import { useEffect, useMemo, useState } from "react";

type Appointment = {
  id: string;
  user_id: string;
  type: "free_intro" | "session";
  starts_at: string;
  status: string;
  created_at: string;
};

type FetchStatus = "idle" | "loading" | "error" | "success";

function getCurrentWeekBounds() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday
  const diffToMonday = (day + 6) % 7;

  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function isoString(date: Date) {
  return date.toISOString();
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminWeeklyCalendarPage() {
  const { monday, sunday } = useMemo(() => getCurrentWeekBounds(), []);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const weekDays = useMemo(() => {
    const start = new Date(monday);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      day.setHours(0, 0, 0, 0);
      return day;
    });
  }, [monday]);

  useEffect(() => {
    const fetchAppointments = async () => {
      setStatus("loading");
      setError(null);
      setAccessDenied(false);

      const params = new URLSearchParams({
        weekStart: isoString(monday),
        weekEnd: isoString(sunday),
      });

      try {
        const res = await fetch(`/api/admin/calendar/week?${params.toString()}`, {
          credentials: "include",
        });

        if (res.status === 401 || res.status === 403) {
          setAccessDenied(true);
          setStatus("idle");
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.message ?? "Termine konnten nicht geladen werden."
          );
        }

        const data = await res.json();
        setAppointments(data.appointments ?? []);
        setStatus("success");
      } catch (err: any) {
        setError(err?.message ?? "Unbekannter Fehler.");
        setStatus("error");
      }
    };

    fetchAppointments();
  }, [monday, sunday]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    weekDays.forEach((day) => {
      const key = day.toDateString();
      map.set(key, []);
    });

    appointments.forEach((appt) => {
      const startDate = new Date(appt.starts_at);
      const key = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      ).toDateString();

      if (map.has(key)) {
        map.get(key)!.push(appt);
      }
    });

    // Sort each day's appointments by time
    map.forEach((list, key) => {
      list.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
    });

    return map;
  }, [appointments, weekDays]);

  if (accessDenied) {
    return (
      <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Admin – Wochenkalender
        </h1>
        <p>Access denied</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>
          Admin – Wochenkalender
        </h1>
        <p style={{ color: "#4b5563" }}>
          Aktuelle Woche: {formatDayLabel(monday)} – {formatDayLabel(sunday)}
        </p>
      </header>

      {status === "loading" && <p>Lade Termine...</p>}
      {status === "error" && (
        <p style={{ color: "#b91c1c" }} role="alert">
          {error}
        </p>
      )}

      {status !== "loading" && !accessDenied && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          {weekDays.map((day) => {
            const key = day.toDateString();
            const dayAppointments = appointmentsByDay.get(key) ?? [];
            return (
              <section
                key={key}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  background: "#fff",
                }}
              >
                <h2 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
                  {formatDayLabel(day)}
                </h2>

                {dayAppointments.length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                    Keine Termine
                  </p>
                ) : (
                  <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {dayAppointments.map((appt) => {
                      const startDate = new Date(appt.starts_at);
                      const typeLabel =
                        appt.type === "free_intro" ? "Kennenlernen" : "Session";
                      return (
                        <li
                          key={appt.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            padding: "0.5rem 0.6rem",
                            background: "#f9fafb",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {formatTime(startDate)} – {typeLabel}
                          </div>
                          <div style={{ color: "#4b5563", fontSize: "0.95rem" }}>
                            Status: {appt.status}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
