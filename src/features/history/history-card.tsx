import Link from "next/link";
import { MatchLineup } from "@/types";
import { getFormationPreset } from "@/utils/formation-presets";
import { Badge } from "@/components/ui/badge";

export function HistoryCard({ lineup }: { lineup: MatchLineup }) {
  const formation = getFormationPreset(lineup.formationTemplateId);

  return (
    <Link
      href={`/history/${lineup.id}`}
      className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:border-primary"
    >
      <div className="min-w-0">
        <p className="font-medium">
          {lineup.opponent ? `vs ${lineup.opponent}` : "Formación"}
        </p>
        <p className="text-xs text-muted-foreground">
          {lineup.date}
          {lineup.kickoffTime ? ` · ${lineup.kickoffTime}` : ""} · {formation?.label}
        </p>
        {lineup.comments && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{lineup.comments}</p>
        )}
      </div>
      {lineup.result && <Badge variant="secondary">{lineup.result}</Badge>}
    </Link>
  );
}
