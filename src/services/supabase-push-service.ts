import { supabase } from "@/lib/supabase/client";

/** Da de alta la suscripción push del dispositivo actual para el equipo.
 * `user_id` es implícito (auth.uid(), vía RLS) — no hace falta pasarlo. */
export async function savePushSubscription(teamId: string, subscription: PushSubscription) {
  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: (await supabase.auth.getUser()).data.user?.id,
      team_id: teamId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth_key: json.keys?.auth,
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
