"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore, TeamRole } from "@/hooks/use-auth";
import { ClaimOrRegisterPlayer } from "@/features/players/claim-or-register";
import { ArrowLeft } from "lucide-react";

type Step = "code" | "pick-player" | "done";

export default function LoginPage() {
  const router = useRouter();
  const { teamId, teamName, role, actualRole, playerId, loginWithCode } = useAuthStore();

  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (teamId && role === "dt") setStep("done");
    else if (teamId && playerId) setStep("done");
  }, [teamId, role, playerId]);

  async function handleSubmitCode() {
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const resolvedRole: TeamRole = await loginWithCode(code);
      setStep(resolvedRole === "dt" || resolvedRole === "admin" ? "done" : "pick-player");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar el código.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Ingresar con código de equipo</h1>
      </div>

      {step === "code" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pídele al capitán o al DT el código de tu equipo. Si eres el DT o
            capitán, usa tu propio código de administración.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="code">Código de equipo</Label>
            <Input
              id="code"
              autoCapitalize="characters"
              placeholder="Ej: CONDESFC-JUGADOR"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitCode()}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" size="lg" onClick={handleSubmitCode} disabled={submitting}>
            {submitting ? "Verificando..." : "Ingresar"}
          </Button>
        </motion.div>
      )}

      {step === "pick-player" && (
        <ClaimOrRegisterPlayer teamName={teamName} onDone={() => setStep("done")} />
      )}

      {step === "done" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Listo. Entraste a <span className="font-medium text-foreground">{teamName}</span>{" "}
            {actualRole === "admin"
              ? `como administrador (vista: ${role === "dt" ? "DT/Capitán" : "Jugador"}).`
              : role === "dt"
                ? "como DT/Capitán."
                : "como jugador."}
          </p>
          <Button className="w-full" size="lg" onClick={() => router.push("/")}>
            Ir al inicio
          </Button>
        </motion.div>
      )}
    </div>
  );
}
