"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerInput } from "@/types";
import {
  ImportRowResult,
  parseImportFile,
  validateImportDrafts,
} from "@/services/player-service";
import { CheckCircle2, XCircle, Upload } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNumbers: number[];
  onImport: (inputs: PlayerInput[]) => Promise<void>;
}

export function ImportDialog({
  open,
  onOpenChange,
  existingNumbers,
  onImport,
}: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRowResult[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    try {
      const content = await file.text();
      const drafts = parseImportFile(file.name, content);
      const results = validateImportDrafts(drafts, existingNumbers);
      setRows(results);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
      setRows([]);
    }
  }

  const validRows = rows.filter((r) => r.result.valid);
  const invalidRows = rows.filter((r) => !r.result.valid);

  async function handleConfirm() {
    setImporting(true);
    try {
      const inputs: PlayerInput[] = validRows.map((r) => ({
        ...r.result.normalized!,
      }));
      await onImport(inputs);
      reset();
      onOpenChange(false);
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setRows([]);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar jugadores</DialogTitle>
          <DialogDescription>
            Subí un archivo CSV o JSON. Columnas esperadas: name, number,
            primaryPosition, secondaryPosition, dominantFoot, active.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,application/json,text/csv"
            onChange={handleFileChange}
            className="w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
          />

          {fileError && <p className="text-sm text-destructive">{fileError}</p>}

          {rows.length > 0 && (
            <>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> {validRows.length} válidos
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" /> {invalidRows.length} con errores
                </span>
              </div>

              <ScrollArea className="h-56 rounded-md border p-2">
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div key={r.row} className="text-sm">
                      <span className="font-medium">
                        Fila {r.row}: {r.draft.name || "(sin nombre)"}
                      </span>
                      {!r.result.valid && (
                        <ul className="ml-4 list-disc text-destructive">
                          {r.result.errors.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={validRows.length === 0 || importing}
          >
            <Upload className="mr-1 h-4 w-4" />
            Importar {validRows.length > 0 ? `(${validRows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
