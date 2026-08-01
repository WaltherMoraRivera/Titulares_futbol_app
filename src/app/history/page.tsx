"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useHistoryStore } from "@/hooks/use-history";
import { HistoryCard } from "@/features/history/history-card";
import { ArrowLeft } from "lucide-react";

export default function HistoryPage() {
  const { lineups, loaded, load } = useHistoryStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Historial</h1>
      </header>

      {lineups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay formaciones guardadas. Se guardan automáticamente cuando
          compartes una formación o armas una nueva.
        </p>
      ) : (
        <div className="space-y-2">
          {lineups.map((lineup) => (
            <HistoryCard key={lineup.id} lineup={lineup} />
          ))}
        </div>
      )}
    </div>
  );
}
