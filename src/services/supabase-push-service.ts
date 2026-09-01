import { supabase } from "@/lib/supabase/client";

/** Da de alta la suscripción push del dispositivo actual para el equipo. */
export async function savePushSubscription(teamId: string, subscription: PushSubscription) {
  const json = subscription.toJSON();

  // getSession() lee la sesión ya guardada localmente (sin ida y vuelta al
  // servidor); getUser() la revalida contra el servidor y puede devolver
  // user null en condiciones de red inestables, lo que rompía el insert
  // (user_id undefined violaba la policy de RLS "user_id = auth.uid()").
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (sessionError || !userId) {
    throw new Error("No hay una sesión activa para guardar la suscripción.");
  }

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("El navegador no devolvió una suscripción push válida.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      team_id: teamId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) throw error;
}

/** Da de baja la suscripción del dispositivo actual (por endpoint, sea cual
 * sea el equipo bajo el que se haya guardado). */
export async function removePushSubscription(endpoint: string) {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
