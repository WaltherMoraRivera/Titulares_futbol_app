"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/hooks/use-auth";
import { Users, PlayCircle, History, KeyRound, LogOut, CalendarDays } from "lucide-react";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const { loaded, teamName, role, playerId, load, logout } = useAuthStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return (
    <motion.div
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.div variants={item} className="flex justify-center">
        <Image
          src="/logo.png"
          alt="Escudo de Las Condes FC"
          width={757}
          height={775}
          priority
          className="h-auto w-56 sm:w-64"
        />
      </motion.div>

      <motion.div variants={item} className="text-center">
        <h1 className="text-2xl font-bold">⚽ TITULARES ⚽</h1>
        <p className="text-sm text-muted-foreground">
          Arma la alineación del equipo en menos de un minuto.
        </p>
      </motion.div>

      <div className="flex flex-col gap-3">
        <motion.div variants={item}>
          <Link href="/attendance">
            <Button className="w-full justify-start" size="lg">
              <PlayCircle className="mr-2 h-5 w-5" />
              Nueva formación
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/matches">
            <Button className="w-full justify-start" size="lg" variant="outline">
              <CalendarDays className="mr-2 h-5 w-5" />
              Partidos
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/players">
            <Button className="w-full justify-start" size="lg" variant="outline">
              <Users className="mr-2 h-5 w-5" />
              Jugadores
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/history">
            <Button className="w-full justify-start" size="lg" variant="outline">
              <History className="mr-2 h-5 w-5" />
              Historial
            </Button>
          </Link>
        </motion.div>
      </div>

      <motion.div variants={item} className="text-center text-sm">
        {teamName ? (
          <p className="flex items-center justify-center gap-2 text-muted-foreground">
            Conectado a <span className="font-medium text-foreground">{teamName}</span> ·{" "}
            {role === "dt" ? "DT/Capitán" : playerId ? "Jugador" : "sin reclamar"}
            <button
              onClick={logout}
              className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
            >
              <LogOut className="h-3 w-3" /> Salir
            </button>
          </p>
        ) : (
          <Link href="/login" className="inline-flex items-center gap-1.5 text-primary hover:underline">
            <KeyRound className="h-3.5 w-3.5" />
            Ingresar con código de equipo
          </Link>
        )}
      </motion.div>
    </motion.div>
  );
}
