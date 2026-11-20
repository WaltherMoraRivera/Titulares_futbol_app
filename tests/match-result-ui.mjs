import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

const matchId = "20000000-0000-0000-0000-000000000001";
const playerId = "30000000-0000-0000-0000-000000000001";
const teamId = "10000000-0000-0000-0000-000000000001";
const timestamp = "2026-11-11T12:00:00.000Z";
const supabaseUrl = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)[1].trim().replace(/["']/g, "");
const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
const player = { id: playerId, team_id: teamId, name: "Jugador de prueba con nombre extenso", alias: "Apodo", number: 9, primary_position: "DEL", active: true, created_at: timestamp, updated_at: timestamp };
const match = { id: matchId, team_id: teamId, match_date: "2026-10-31", opponent: "Rival con nombre muy extenso", created_at: timestamp, updated_at: timestamp };

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const width of [375, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 568 }, serviceWorkers: "block" });
      const state = { events: [], result: null, role: "admin", calls: [], error: null, readError: false };
      const user = { id: "40000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: timestamp };
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = [Buffer.from('{"alg":"HS256"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: user.id, role: "authenticated", exp })).toString("base64url"), "test"].join(".");
      await context.addInitScript(({ storageKey, session }) => {
        localStorage.setItem(storageKey, JSON.stringify(session));
        localStorage.setItem("titulares:admin-preview-role", "dt");
      }, { storageKey, session: { access_token: token, refresh_token: "test", token_type: "bearer", expires_in: 3600, expires_at: exp, user } });
      await context.routeWebSocket(/supabase/, (socket) => socket.close());
      await context.route(`${supabaseUrl}/**`, async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const endpoint = url.pathname.split("/").pop();
        let data = [];
        let status = 200;
        if (endpoint === "get_my_team") data = [{ team_id: teamId, team_name: "Decom FC", role: state.role, player_id: playerId }];
        else if (endpoint === "players") data = [player];
        else if (endpoint === "matches") data = [match];
        else if (endpoint === "match_results") data = state.result ? [state.result] : [];
        else if (endpoint === "match_events") {
          data = state.events;
          if (state.readError) { status = 500; data = { message: "Fallo de lectura simulado" }; }
        } else if (endpoint === "save_flexible_match_result") {
          const input = request.postDataJSON();
          state.calls.push(input);
          if (state.error) {
            status = 400;
            data = state.error === "migration" ? { code: "PGRST202", message: "Missing function" } : { code: "40001", message: "El partido cambió mientras lo editabas. Recarga la página antes de volver a editar." };
          } else {
            state.events = input.p_goals.map((goal, index) => {
              const old = state.events.find((event) => event.id === goal.id);
              return { ...old, id: goal.id || `50000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`, match_id: matchId, side: goal.side, type: "goal", player: goal.playerId ? { playerId: goal.playerId } : null, minute: old?.minute ?? null, note: old?.note ?? null, created_at: old?.created_at ?? timestamp };
            });
            state.result = { match_id: matchId, team_id: teamId, team_score: state.events.filter((event) => event.side === "own").length, opponent_score: state.events.filter((event) => event.side === "rival").length, notes: input.p_notes, updated_at: new Date().toISOString() };
            data = [state.result];
          }
        } else if (!["match_attendance", "match_lineups", "user"].includes(endpoint)) {
          throw new Error(`Peticion no prevista: ${request.method()} ${url.pathname}`);
        }
        await route.fulfill({ status, json: data, headers: { "access-control-allow-origin": "*" } });
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(60000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const resultUrl = `${baseUrl}/matches/${matchId}/result`;
      const edit = () => page.getByRole("button", { name: "Editar resultado y goleadores", exact: true });
      const save = () => page.getByRole("button", { name: "Guardar resultado", exact: true });
      const checkOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `Desbordamiento a ${width}px en ${page.url()}`);
      await page.goto(resultUrl);
      await edit().waitFor();
      await edit().click();
      await page.locator("#score-own").fill("3");
      await page.locator("#score-rival").fill("2");
      await page.locator("#score-own").fill("-1");
      assert.equal(await save().isDisabled(), true);
      await page.locator("#score-own").fill("3");
      assert.equal(await page.getByRole("combobox").count(), 3);
      for (const index of [0, 1]) {
        await page.getByRole("combobox").nth(index).click();
        await page.getByRole("option", { name: /#9 Jugador de prueba/ }).click();
      }
      await checkOverflow();
      await fs.promises.mkdir(new URL("../.next/qa/", import.meta.url), { recursive: true });
      await page.screenshot({ path: fileURLToPath(new URL(`../.next/qa/resultado-${width}.png`, import.meta.url)), fullPage: true });
      await save().click();
      await edit().waitFor();
      assert.equal(state.calls[0].p_goals.length, 5);
      assert.equal(state.calls[0].p_goals.filter((goal) => goal.playerId === playerId).length, 2);
      assert.equal(state.calls[0].p_expected_goals.length, 0);
      await checkOverflow();

      state.events.filter((event) => event.player?.playerId === playerId).forEach((event, index) => {
        event.minute = index === 0 ? 10 : 55;
        event.note = index === 0 ? "De cabeza" : null;
      });
      await page.reload();
      await edit().click();
      await page.getByText("Gol 1 · 10'", { exact: true }).waitFor();
      await page.getByText("Gol 2 · 55'", { exact: true }).waitFor();
      await page.getByText("De cabeza", { exact: true }).waitFor();
      await page.locator("#score-own").fill("2");
      assert.equal(await page.getByRole("combobox").count(), 2);
      assert.equal(await save().isEnabled(), true);
      await page.locator("#score-own").fill("1");
      assert.equal(await save().isDisabled(), true);
      await page.getByText(/Elige 1 gol para quitar/).waitFor();
      await page.getByRole("button", { name: "Quitar este gol", exact: true }).first().click();
      assert.equal(await save().isEnabled(), true);
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      assert.equal(state.calls.length, 1);

      await page.goto(`${baseUrl}/stats`);
      await page.getByRole("heading", { name: "Estadísticas", exact: true }).waitFor();
      await page.getByRole("cell", { name: /Jugador de prueba/ }).waitFor();
      const cells = await page.getByRole("row").last().getByRole("cell").allTextContents();
      assert.equal(cells[3], "2");
      await checkOverflow();

      await page.goto(`${baseUrl}/matches/${matchId}`);
      await page.getByText("Goles sin minuto registrado", { exact: true }).waitFor();
      await checkOverflow();
      await page.goto(`${baseUrl}/matches`);
      await page.getByText("3 - 2", { exact: true }).waitFor();
      await checkOverflow();

      await page.goto(resultUrl);
      await edit().click();
      state.error = "migration";
      await save().click();
      await page.getByText(/Falta aplicar la migración 0014/).waitFor();
      assert.equal(await page.locator("#score-own").inputValue(), "3");
      state.error = "conflict";
      await save().click();
      await page.getByText(/El partido cambió mientras lo editabas. Recarga la página/).waitFor();
      state.error = null;
      await page.reload();
      await edit().click();
      await save().click();
      await edit().waitFor();
      await edit().click();
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();

      await page.getByRole("button", { name: "Jugador", exact: true }).click();
      assert.equal(await edit().count(), 0);
      await page.getByRole("button", { name: "DT/Capitán", exact: true }).click();
      await edit().waitFor();
      state.readError = true;
      await page.reload();
      await page.getByText(/No se pudo cargar la bitácora. Recarga/).waitFor();
      assert.equal(await edit().count(), 0);
      state.readError = false;
      for (const role of ["dt", "assistant", "player"]) {
        state.role = role;
        await page.reload();
        await page.getByText("Resultado final", { exact: true }).waitFor().catch(async (error) => {
          console.error(`Estado al fallar el rol ${role}:`, await page.locator("body").innerText());
          throw error;
        });
        assert.equal(await edit().count(), 0, role);
        await checkOverflow();
      }
      state.role = "admin";
      state.events = [];
      state.result = null;
      await page.reload();
      await edit().click();
      await save().click();
      await edit().waitFor();
      assert.equal(state.result.team_score, 0);
      assert.equal(state.result.opponent_score, 0);
      assert.deepEqual(state.calls.at(-1).p_goals, []);
      assert.deepEqual(errors, []);
      console.log(`UI ${width}px: guardado 3-2, goleadores, reducciones, cancelacion, lectores, permisos y errores OK`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
