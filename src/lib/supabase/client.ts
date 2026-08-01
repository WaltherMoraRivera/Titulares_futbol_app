import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente de Supabase para el navegador. La app es enteramente "use client"
 * (sin server components que dependan de sesión), así que alcanza con el
 * cliente estándar de supabase-js, que persiste la sesión en localStorage.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
