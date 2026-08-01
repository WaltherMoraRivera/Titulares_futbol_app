"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Users, PlayCircle, History } from "lucide-react";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
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
    </motion.div>
  );
}
