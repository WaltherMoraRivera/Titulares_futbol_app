import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

/** Envía la notificación de un partido a los dispositivos suscritos del
 * equipo cuyo jugador todavía no confirmó ni rechazó su asistencia — a
 * quien ya respondió no le manda otro recordatorio. Solo DT/Capitán/admin
 * pueden dispararla: la autorización se resuelve del lado de la base
 * (RLS), no acá — este endpoint solo actúa con el token de sesión de quien
 * lo llama. */
export async function POST(request: NextRequest) {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json(
      { error: "Las notificaciones push no están configuradas en este entorno." },
      { status: 501 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Falta la sesión." }, { status: 401 });
  }

  const { matchId } = await request.json();
  if (!matchId) {
    return NextResponse.json({ error: "Falta el partido." }, { status: 400 });
  }

  // Cliente atado al token del que llama: respeta RLS, así que un jugador
  // sin permisos de DT no puede leer las suscripciones de nadie.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, team_id, match_date, kickoff_time, opponent")
    .eq("id", matchId)
    .single();
  if (matchError || !match) {
    return NextResponse.json({ error: "No se encontró el partido." }, { status: 404 });
  }

  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key")
    .eq("team_id", match.team_id);
  if (subsError) {
    // Si la policy de RLS bloquea la lectura, es porque quien llama no es DT/admin.
    return NextResponse.json({ error: "No tienes permiso para notificar." }, { status: 403 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  // Solo avisar a quien todavía no confirmó ni rechazó su asistencia a este
  // partido — a quien ya respondió no le sirve otro recordatorio.
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, player_id")
    .eq("team_id", match.team_id);
  if (profilesError) {
    return NextResponse.json({ error: "No se pudo leer la plantilla." }, { status: 500 });
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from("match_attendance")
    .select("player_id, status")
    .eq("match_id", matchId);
  if (attendanceError) {
    return NextResponse.json({ error: "No se pudo leer la asistencia." }, { status: 500 });
  }

  const playerIdByUserId = new Map((profiles ?? []).map((p) => [p.id, p.player_id]));
  const respondedPlayerIds = new Set(
    (attendance ?? [])
      .filter((a) => a.status === "confirmed" || a.status === "declined")
      .map((a) => a.player_id)
  );

  const pendingSubscriptions = subscriptions.filter((sub) => {
    const playerId = playerIdByUserId.get(sub.user_id);
    return !!playerId && !respondedPlayerIds.has(playerId);
  });

  if (pendingSubscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const title = "Partido agendado";
  const bodyParts = [formatDate(match.match_date)];
  if (match.kickoff_time) bodyParts.push(match.kickoff_time.slice(0, 5));
  const body = `${bodyParts.join(" · ")}${match.opponent ? ` vs ${match.opponent}` : ""}. Confirma tu asistencia.`;
  const payload = JSON.stringify({ title, body, url: `/matches/${match.id}` });

  const staleIds: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    pendingSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
      }
    })
  );

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ sent, failed });
}
