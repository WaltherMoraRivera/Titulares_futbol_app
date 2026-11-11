import assert from "node:assert/strict";
import { test } from "node:test";
import { resizeGoals } from "./match-result-draft.ts";

test("agrega goles sin goleador y conserva los del rival", () => {
  const rival = { id: "rival", side: "rival", player: null };
  const result = resizeGoals([rival], "own", 3);
  assert.equal(result.remainingRemovals, 0);
  assert.equal(result.goals.filter((g) => g.side === "own").length, 3);
  assert.ok(result.goals.filter((g) => g.side === "own").every((g) => g.id === null && g.player === null));
  assert.equal(result.goals[0], rival);
});

test("quita primero goles sin asignar, conservando goleadores e IDs", () => {
  const assigned = { id: "known", side: "own", player: { playerId: "player" } };
  const unknown = { id: "unknown", side: "own", player: null };
  assert.deepEqual(resizeGoals([assigned, unknown], "own", 1), {
    goals: [assigned], remainingRemovals: 0,
  });
});

test("no elige que goleador quitar cuando todos estan asignados", () => {
  const goals = ["a", "b", "c"].map((id) => ({ id, side: "own", player: { playerId: id } }));
  assert.deepEqual(resizeGoals(goals, "own", 2), { goals, remainingRemovals: 1 });
});

test("protege tambien a rivales conocidos por dorsal o nombre", () => {
  const goals = [
    { id: "a", side: "rival", player: { number: 0 } },
    { id: "b", side: "rival", player: { name: "Rival" } },
    { id: "c", side: "rival", player: null },
  ];
  const result = resizeGoals(goals, "rival", 0);
  assert.deepEqual(result.goals, goals.slice(0, 2));
  assert.equal(result.remainingRemovals, 2);
});

test("admite 0-0 y no modifica el borrador original", () => {
  const goals = [{ id: "a", side: "own", player: null }];
  assert.deepEqual(resizeGoals(goals, "own", 0).goals, []);
  assert.equal(goals.length, 1);
});

test("rechaza marcadores negativos, fraccionarios o no numericos", () => {
  for (const score of [-1, 1.5, NaN, Infinity, 100]) {
    assert.throws(() => resizeGoals([], "own", score), /entero/);
  }
});
