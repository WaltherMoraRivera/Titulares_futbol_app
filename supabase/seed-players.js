// Migración puntual / utilidad de siembra: carga una plantilla de jugadores
// a la tabla `players` de Supabase para un equipo dado.
//
// Uso:
//   node supabase/seed-players.js <codigo_de_equipo>
//
// Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en
// .env.local (se leen automáticamente). El código puede ser el de jugador
// o el de DT/capitán, cualquiera de los dos alcanza para poder insertar.

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const ROSTER = [
  { name: "Francisco Araneda", number: 1, primary_position: "POR", dominant_foot: "derecho", active: true },
  { name: "Mauricio Araneda", number: 2, primary_position: "LAT", secondary_position: "VOL", dominant_foot: "derecho", active: true },
  { name: "Lucas Rivas", number: 5, primary_position: "DFC", secondary_position: "MCD", dominant_foot: "derecho", active: true },
  { name: "JP Fontecilla", number: 7, primary_position: "MCD", dominant_foot: "derecho", active: true },
  { name: "Israel Torres", number: 9, primary_position: "MCD", dominant_foot: "derecho", active: true },
  { name: "Matias Camilo", number: 10, primary_position: "DEL", secondary_position: "MC", dominant_foot: "derecho", active: true },
  { name: "Hector Andahur", number: 11, primary_position: "DEL", secondary_position: "MP", dominant_foot: "derecho", active: true },
  { name: "Matias Rojas", number: 12, primary_position: "MCD", secondary_position: "DFC", dominant_foot: "derecho", active: true },
  { name: "Cristian Fernandez", number: 14, primary_position: "LAT", secondary_position: "VOL", dominant_foot: "izquierdo", active: true },
  { name: "Ignacio del Valle", number: 18, primary_position: "MC", dominant_foot: "derecho", active: true },
  { name: "Gustavo Valenzuela", number: 20, primary_position: "LAT", secondary_position: "VOL", active: true },
  { name: "Eugenio Valenzuela", number: 24, primary_position: "MC", dominant_foot: "derecho", active: true },
  { name: "Walther Mora", number: 25, primary_position: "LAT", secondary_position: "VOL", dominant_foot: "derecho", active: true },
  { name: "Agustín Rivas", number: 33, primary_position: "LAT", secondary_position: "VOL", dominant_foot: "derecho", active: true },
  { name: "Felipe del Curto", number: 55, primary_position: "MCD", secondary_position: "VOL", dominant_foot: "derecho", active: true },
  { name: "Fenomeno San Martin", number: 66, primary_position: "DEL", secondary_position: "MC", dominant_foot: "derecho", active: true },
];

async function main() {
  loadEnvLocal();
  const code = process.argv[2];
  if (!code) {
    console.error("Uso: node supabase/seed-players.js <codigo_de_equipo>");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { error: authError } = await supabase.auth.signInAnonymously();
  if (authError) throw new Error("Login anónimo falló: " + authError.message);

  const { data: claim, error: claimError } = await supabase.rpc("claim_team", { code });
  if (claimError) throw new Error("Código inválido: " + claimError.message);
  const teamId = claim[0].team_id;
  console.log(`Sembrando "${claim[0].team_name}" (${teamId}) con rol ${claim[0].role}...`);

  const rows = ROSTER.map((p) => ({ ...p, team_id: teamId }));
  const { data, error } = await supabase.from("players").insert(rows).select("id, number, name");
  if (error) throw new Error("Insert falló: " + error.message);

  console.log(`Insertados ${data.length} jugadores:`);
  for (const p of data.sort((a, b) => a.number - b.number)) {
    console.log(`  #${p.number} ${p.name}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
