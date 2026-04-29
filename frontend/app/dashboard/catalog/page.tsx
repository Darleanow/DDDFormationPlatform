"use client";

import {
  BookOpen,
  ChevronRight,
  FileText,
  LayoutList,
  CheckCircle2,
  Lock,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_LEARNER_ID,
  getProgrammes,
  getProgramModulesOverview,
  type ModuleOverviewRow,
} from "@/lib/api";

function moduleRowStatus(row: ModuleOverviewRow): "locked" | "in_progress" | "done" {
  if (!row.canAccess) return "locked";
  if (row.fullyDone) return "done";
  return "in_progress";
}

export default function CatalogPage() {
  const [programmeId, setProgrammeId] = useState<string | null>(null);
  const [programmeName, setProgrammeName] = useState<string>("");
  const [moduleRows, setModuleRows] = useState<ModuleOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setError(null);
        const progs = await getProgrammes();
        if (!progs?.length) {
          setLoading(false);
          return;
        }
        const first = progs[0];
        setProgrammeId(first.id);
        setProgrammeName(first.nom ?? first.id);

        const overview = await getProgramModulesOverview(DEFAULT_LEARNER_ID, first.id).catch(
          (e) => {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(
              `${msg} — vérifier que le parcours BC3 existe (enrollment / seed) pour ${DEFAULT_LEARNER_ID}.`,
            );
          },
        );
        setModuleRows(overview.modules ?? []);
      } catch (e) {
        console.error("Failed to load catalog", e);
        setError(e instanceof Error ? e.message : "Chargement impossible.");
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Catalogue d&apos;apprentissage</h1>
          <p className="text-muted-foreground mt-1">
            Prérequis modules (BC2) + état par rapport au parcours adaptatif (BC3) — même règle que{" "}
            <code className="text-xs">checkAccess</code> / activités complétées.
          </p>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground"
        >
          {error}
        </div>
      ) : null}

      <div className="bg-card border border-border rounded-2xl p-6">
        {programmeId && (
          <div className="flex items-center text-sm text-muted-foreground mb-6 bg-background p-3 rounded-lg border border-border w-fit">
            <BookOpen className="w-4 h-4 mr-2" />
            <span className="font-medium text-foreground">{programmeName}</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span>Modules (ordre topologique des prérequis)</span>
          </div>
        )}

        <div className="grid gap-4">
          {moduleRows.length === 0 && !error ? (
            <p className="text-muted-foreground text-sm">Aucun module pour ce programme.</p>
          ) : null}

          {moduleRows.map((row) => {
            const status = moduleRowStatus(row);

            return (
              <div
                key={row.moduleId}
                className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border ${
                  status === "locked"
                    ? "bg-background/50 border-border/50 opacity-80"
                    : "bg-background border-border hover:border-primary/50 transition-colors"
                }`}
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border ${
                      status === "done"
                        ? "bg-green-500/10 border-green-500/20 text-green-500"
                        : status === "locked"
                          ? "bg-muted border-border text-muted-foreground"
                          : "bg-primary/10 border-primary/20 text-primary"
                    }`}
                  >
                    {status === "done" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : status === "locked" ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <LayoutList className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{row.nom}</h3>
                    <div className="flex flex-wrap items-center text-xs text-muted-foreground mt-1 gap-x-3 gap-y-1">
                      <span className="flex items-center">
                        <FileText className="w-3 h-3 mr-1 shrink-0" />
                        {row.completedSteps}/{row.totalSteps || "—"} activités complétées
                      </span>
                      <span className="bg-secondary px-2 py-0.5 rounded text-secondary-foreground text-[10px] uppercase">
                        MODULE
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {status === "locked" && row.missingPrerequisites?.length ? (
                    <div className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20 flex flex-wrap items-center max-w-[280px] justify-end gap-1">
                      <Lock className="w-3 h-3 shrink-0" />
                      Prérequis :{" "}
                      {row.missingPrerequisites.map((p) => p.titre).join(", ")}
                    </div>
                  ) : null}

                  {status === "locked" && !row.missingPrerequisites?.length ? (
                    <div className="text-xs text-muted-foreground px-3 py-1.5">
                      Accès refusé (règle prérequis)
                    </div>
                  ) : null}

                  {status !== "locked" ? (
                    <Link
                      href={
                        programmeId
                          ? `/dashboard/catalog/module/${row.moduleId}?program=${encodeURIComponent(programmeId)}`
                          : `/dashboard/catalog/module/${row.moduleId}`
                      }
                    >
                      <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                        {status === "done" ? "Revoir le module" : "Ouvrir le module"}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Débloquez en validant au moins une compétence des modules prérequis
                      (parcours BC3).
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
