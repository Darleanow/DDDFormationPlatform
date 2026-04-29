"use client";

import {
  BookOpen,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Dumbbell,
  ClipboardCheck,
} from "lucide-react";
import { Suspense, useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getModule,
  getProgrammes,
  getProgramModulesOverview,
  DEFAULT_LEARNER_ID,
  type ModuleOverviewRow,
} from "@/lib/api";
import { catalogBc2StepHref } from "@/lib/adaptive-navigation";

function stepBadge(type: string) {
  switch (type) {
    case "LESSON":
      return { Icon: CircleDot, label: "Leçon" };
    case "EXERCISE":
      return { Icon: Dumbbell, label: "Exercice" };
    case "ASSESSMENT":
      return { Icon: ClipboardCheck, label: "Évaluation" };
    default:
      return { Icon: CircleDot, label: type };
  }
}

function ModulePageContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const moduleId = resolvedParams.id;
  const searchParams = useSearchParams();
  const programQuery = searchParams.get("program");

  const [moduleData, setModuleData] = useState<any>(null);
  const [moduleRow, setModuleRow] = useState<ModuleOverviewRow | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        setOverviewError(null);
        const mod = await getModule(moduleId);
        if (!cancelled) setModuleData(mod);

        let programId = programQuery ?? null;
        if (!programId) {
          const progs = await getProgrammes();
          programId = progs?.[0]?.id ?? null;
        }
        if (!programId) {
          if (!cancelled) setOverviewError("Programme inconnu.");
          return;
        }

        const overview = await getProgramModulesOverview(DEFAULT_LEARNER_ID, programId).catch(
          (e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(msg);
          },
        );

        const row = overview.modules.find((m) => m.moduleId === moduleId) ?? null;
        if (!cancelled) {
          setModuleRow(row);
          if (!row) setOverviewError("Module absent du même programme que le parcours (vérifier l’URL).");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setOverviewError(e instanceof Error ? e.message : "Chargement parcours impossible.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [moduleId, programQuery]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const access = moduleRow
    ? { canAccess: moduleRow.canAccess, missingPrerequisites: moduleRow.missingPrerequisites }
    : null;
  const steps = moduleRow?.steps ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center text-sm text-muted-foreground mb-6 bg-background p-3 rounded-lg border border-border w-fit">
        <Link href="/dashboard/catalog" className="hover:text-foreground hover:underline flex items-center">
          <BookOpen className="w-4 h-4 mr-2" />
          Catalogue
        </Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="font-medium text-foreground">{moduleRow?.nom || moduleData?.nom || "Module"}</span>
      </div>

      {overviewError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground"
        >
          {overviewError}
        </div>
      ) : null}

      {access && !access.canAccess ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Prérequis non satisfaits pour ce module</p>
            <p className="mt-1 text-muted-foreground">
              Terminez d&apos;abord des activités dans les modules :{" "}
              {access.missingPrerequisites.map((p) => p.titre).join(", ") || "—"} (au moins une compétence
              par module prérequis validée via le parcours BC3).
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {moduleRow?.nom || moduleData?.nom}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          {moduleData?.description || "Contenu pour ce bloc (aligné parcours BC3)."}
        </p>
        {moduleRow ? (
          <p className="text-sm text-muted-foreground mt-3">
            Progression&nbsp;:{" "}
            <strong className="text-foreground">
              {moduleRow.completedSteps}/{moduleRow.totalSteps}
            </strong>{" "}
            étapes (leçons, exercices puis évaluations BC4 listées ci‑dessous).
          </p>
        ) : null}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-6">Parcours de ce module (BC2 + BC3)</h2>

        <div className="space-y-2">
          {steps.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune étape listée pour ce module.</p>
          ) : (
            steps.map((step, idx) => {
              const href = catalogBc2StepHref(step);
              const { Icon, label } = stepBadge(step.type);
              return (
                <Link key={`${step.type}-${step.contentId}-${idx}`} href={href}>
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <div className="flex gap-3 min-w-0">
                      <Icon className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {idx + 1}. {label}
                        </div>
                        <div className="font-medium text-foreground truncate">{step.label}</div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate mt-1">
                          {step.contentId}
                        </div>
                      </div>
                    </div>
                    {step.completed ? (
                      <span className="flex items-center shrink-0 gap-1 text-xs font-medium text-green-500">
                        <CheckCircle2 className="h-4 w-4" />
                        fait
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500/90 shrink-0">à faire</span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModulePage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ModulePageContent {...props} />
    </Suspense>
  );
}
