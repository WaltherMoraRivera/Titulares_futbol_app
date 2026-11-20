import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, beforeEach, after, test } from "node:test";

// Motor temporal de pruebas, sin dependencias adicionales en la aplicacion.
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const team = "10000000-0000-0000-0000-000000000001";
const match = "20000000-0000-0000-0000-000000000001";
const player = "30000000-0000-0000-0000-000000000001";
const foreignPlayer = "30000000-0000-0000-0000-000000000002";

before(async () => {
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create table public.teams (id uuid primary key);
    create table public.matches (id uuid primary key, team_id uuid not null);
    create table public.players (id uuid primary key, team_id uuid not null);
    create function public.current_team_id() returns uuid language sql stable as $$ select '${team}'::uuid $$;
    create function public.current_role() returns text language sql stable as $$ select current_setting('test.role', true) $$;
    create function public.is_dt_or_admin() returns boolean language sql stable as $$ select public.current_role() in ('dt','admin') $$;
    grant usage on schema public, auth to authenticated;
    insert into public.teams values ('${team}'), ('10000000-0000-0000-0000-000000000002');
    insert into public.matches values ('${match}', '${team}'), ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002');
    insert into public.players values ('${player}', '${team}'), ('${foreignPlayer}','10000000-0000-0000-0000-000000000002');
  `);
  await db.exec(await readFile(new URL("../migrations/0005_match_results.sql", import.meta.url), "utf8"));
  const eventsMigration = await readFile(new URL("../migrations/0011_match_events.sql", import.meta.url), "utf8");
  await db.exec(eventsMigration.replace("alter publication supabase_realtime add table public.match_events;", ""));
  await db.exec(await readFile(new URL("../migrations/0014_flexible_match_results.sql", import.meta.url), "utf8"));
});

beforeEach(async () => {
  await db.exec("reset role; truncate public.match_events, public.match_results; set test.role = 'admin';");
});
after(async () => { await db.close(); });

async function snapshot() {
  const { rows } = await db.query("select id, side, minute, player, note from public.match_events where type = 'goal' and match_id = $1 order by id", [match]);
  return rows;
}

async function save(goals, expected = [], version = null, target = match) {
  return (await db.query("select r.*, r.updated_at::text as updated_at from public.save_flexible_match_result($1,$2::jsonb,$3::jsonb,$4::timestamptz,$5) r", [target, JSON.stringify(goals), JSON.stringify(expected), version, " Notas "])).rows[0];
}

test("guarda 3-2 sin goleadores ni minutos y permite asignar varios goles al mismo jugador", async () => {
  await db.exec("set role authenticated");
  const result = await save([...[1, 2, 3].map(() => ({ side: "own" })), ...[1, 2].map(() => ({ side: "rival" }))]);
  assert.equal(result.team_score, 3);
  assert.equal(result.opponent_score, 2);
  assert.equal(result.notes, "Notas");
  await db.exec("reset role");
  const expected = await snapshot();
  assert.ok(expected.every((goal) => goal.minute === null && goal.player === null));
  const goals = expected.map((goal) => ({ id: goal.id, side: goal.side, playerId: goal.side === "own" ? player : null }));
  const updated = await save(goals, expected, result.updated_at);
  assert.equal(updated.team_score, 3);
  assert.equal((await snapshot()).filter((goal) => goal.player?.playerId === player).length, 3);
});

test("conserva IDs, minutos, notas, rivales y eventos ajenos a los goles", async () => {
  await db.exec(`insert into public.match_events (match_id,team_id,side,type,minute,player,note) values
    ('${match}','${team}','own','goal',15,'{"playerId":"${player}"}','De cabeza'),
    ('${match}','${team}','rival','goal',25,'{"number":9,"name":"Rival"}',null),
    ('${match}','${team}','own','yellow_card',30,'{"playerId":"${player}"}','Tarjeta');`);
  const expected = await snapshot();
  await save(expected.map((goal) => ({ id: goal.id, side: goal.side, playerId: goal.player?.playerId })), expected);
  assert.deepEqual(await snapshot(), expected);
  assert.equal((await db.query("select count(*)::int n from public.match_events where type = 'yellow_card'")).rows[0].n, 1);
});

test("permite 0-0 y eliminar un gol elegido, sin duplicar los restantes", async () => {
  const result = await save([{ side: "own", playerId: player }, { side: "rival" }]);
  const expected = await snapshot();
  const next = await save(expected.filter((goal) => goal.side === "rival").map((goal) => ({ id: goal.id, side: goal.side })), expected, result.updated_at);
  assert.equal(next.team_score, 0);
  assert.equal(next.opponent_score, 1);
  const zero = await save([], await snapshot(), next.updated_at);
  assert.equal(zero.team_score, 0);
  assert.equal(zero.opponent_score, 0);
});

test("rechaza roles distintos de admin incluso llamando directamente a la RPC", async () => {
  await db.exec("set role authenticated");
  for (const role of ["dt", "player", "assistant", ""]) {
    await db.query("select set_config('test.role', $1, false)", [role]);
    await assert.rejects(save([]), /Solo el administrador/);
  }
  await db.exec("set role anon");
  await assert.rejects(save([]), /permission denied/);
});

test("rechaza otro equipo, jugadores ajenos, IDs duplicados y lados invalidos sin escrituras parciales", async () => {
  await assert.rejects(save([], [], null, "20000000-0000-0000-0000-000000000002"), /Partido no encontrado/);
  await assert.rejects(save([{ side: "own", playerId: foreignPlayer }]), /no corresponden/);
  await assert.rejects(save([{ side: "rival", playerId: player }]), /no corresponden/);
  await assert.rejects(save([{ side: "invalid" }]), /no corresponden/);
  const result = await save([{ side: "own", playerId: player }]);
  const expected = await snapshot();
  const goal = { id: expected[0].id, side: "own", playerId: player };
  await assert.rejects(save([goal, goal], expected, result.updated_at), /no corresponden/);
  assert.deepEqual(await snapshot(), expected);
});

test("rechaza snapshots desactualizados por cambios en goles o en las notas", async () => {
  const initial = await save([{ side: "own" }]);
  const expected = await snapshot();
  await db.exec(`update public.match_events set minute=10 where match_id='${match}'`);
  await assert.rejects(save([], expected, initial.updated_at), /Recarga la página/);
  const fresh = await snapshot();
  await db.exec(`update public.match_results set updated_at=updated_at + interval '1 second' where match_id='${match}'`);
  await assert.rejects(save([], fresh, initial.updated_at), /Recarga la página/);
  assert.deepEqual(await snapshot(), fresh);
  const version = (await db.query("select updated_at::text from public.match_results where match_id=$1", [match])).rows[0].updated_at;
  const updated = await save(fresh.map((goal) => ({ id: goal.id, side: goal.side })), fresh, version);
  assert.equal(updated.team_score, 1);
});

test("un fallo al guardar el resultado revierte tambien las modificaciones de goles", async () => {
  await db.exec("create function fail_result() returns trigger language plpgsql as $$ begin raise exception 'fallo simulado'; end; $$; create trigger fail_result before insert on public.match_results for each row execute function fail_result();");
  try {
    await assert.rejects(save([{ side: "own" }]), /fallo simulado/);
    assert.deepEqual(await snapshot(), []);
  } finally {
    await db.exec("drop trigger fail_result on public.match_results; drop function fail_result();");
  }
});

test("conserva goleadores eliminados de la plantilla, sin permitir nuevas asignaciones a ellos", async () => {
  const removedPlayer = "30000000-0000-0000-0000-000000000003";
  await db.exec(`insert into public.players values ('${removedPlayer}', '${team}');`);
  const result = await save([{ side: "own", playerId: removedPlayer }]);
  await db.exec(`delete from public.players where id = '${removedPlayer}';`);
  const expected = await snapshot();
  const historical = { id: expected[0].id, side: "own", playerId: removedPlayer };
  const updated = await save([historical, { side: "rival" }], expected, result.updated_at);
  assert.equal(updated.team_score, 1);
  assert.equal(updated.opponent_score, 1);
  const fresh = await snapshot();
  await assert.rejects(save([historical, { side: "own", playerId: removedPlayer }], fresh, updated.updated_at), /no corresponden/);
  assert.deepEqual(await snapshot(), fresh);
});
