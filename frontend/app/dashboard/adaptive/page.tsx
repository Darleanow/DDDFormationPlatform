"use client";

import {
  Loader2,
  ListChecks,
  AlertTriangle,
  ArrowRightCircle,
  BookOpen,
  Zap,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getLearningPath, markActivityCompleted } from "@/lib/api";
import { activityDetailHref } from "@/lib/adaptive-navigation";
import { useDemoLearnerId } from "@/hooks/useDemoLearnerId";

export default function AdaptiveEnginePage() {
  const { learnerId } = useDemoLearnerId();
  const [learningPath, setLearningPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const loadAdaptiveData = useCallback(async () => {
    try {
      const path = await getLearningPath(learnerId).catch(() => null);
      setLearningPath(path);
    } catch (e) {
      console.error("Failed to load adaptive path", e);
    } finally {
      setLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    setLoading(true);
    void loadAdaptiveData();

    const interval = window.setInterval(() => void loadAdaptiveData(), 4000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadAdaptiveData();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadAdaptiveData]);

  async function completeCurrentStepDemo() {
    const next = learningPath?.nextActivity;
    if (!next?.contentId) return;
    setCompleting(true);
    try {
      await markActivityCompleted(learnerId, next.contentId);
      await loadAdaptiveData();
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const nextActivity = learningPath?.nextActivity ?? null;
  const activities: any[] = learningPath?.activities ?? [];
  const atRisk = learningPath?.coverageAtRisk ?? false;
  const uncovered: string[] = learningPath?.uncoveredCompetences ?? [];
  const streakRaw =
    typeof learningPath?.accelerationAssessmentStreak === "number"
      ? learningPath.accelerationAssessmentStreak
      : 0;
  const streakClamped = Math.min(3, Math.max(0, streakRaw));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Moteur adaptatif (BC3)
          </h1>
          <p className="mt-1 text-muted-foreground">
            Parcours : prochaine activité, streak d&apos;accélération, liste ordonnée.
          </p>
        </div>
      </div>

      {learningPath?.alertMessage && atRisk ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <div className="font-medium">{learningPath.alertMessage}</div>
            {uncovered.length > 0 ? (
              <p className="mt-2 text-muted-foreground text-xs">
                Ces compétences sont encore présentes dans le référentiel obligatoire ; l’alerte
                porte surtout sur les délais versus la disponibilité hebdomadaire.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {learningPath && uncovered.length > 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            Obligatoires pas encore acquises dans le parcours (normal tant que vous progressez)
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
            {uncovered.join(", ")}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center text-xl font-semibold">
            <ArrowRightCircle className="mr-2 h-5 w-5 text-primary" />
            Prochaine activité
          </h2>

          {!learningPath ? (
            <p className="text-muted-foreground">
              Pas de données — vérifiez l&apos;inscription (seed programme{" "}
              <code className="text-xs">p001</code>) pour cet apprenant.
            </p>
          ) : null}

          {learningPath && !nextActivity ? (
            <p className="text-muted-foreground">Parcours terminé ou aucune activité pendante.</p>
          ) : null}

          {nextActivity ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
                {nextActivity.type}
              </div>
              <p className="mb-1 font-mono text-sm break-all text-foreground">{nextActivity.contentId}</p>
              <p className="mb-6 text-muted-foreground text-sm">
                Statut : {nextActivity.status ?? "—"}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={activityDetailHref({
                    type: nextActivity.type,
                    contentId: nextActivity.contentId,
                  })}
                  className="inline-flex rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Ouvrir cette activité
                </Link>
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => void completeCurrentStepDemo()}
                  className="inline-flex rounded-lg border border-border bg-background px-5 py-2.5 font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  {completing ? "…" : "Terminer cette étape (démo)"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Calendrier (charge vs disponibilité)</div>
            <div
              className={
                atRisk ? "mt-1 font-medium text-amber-600" : "mt-1 font-medium text-green-600"
              }
            >
              {atRisk ? "À risque — surcharge avant l’échéance" : "Planning cohérent"}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Accélération (après évaluations)
            </div>
            <div className="mt-3 flex gap-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-2.5 flex-1 rounded-full transition-colors ${i < streakClamped ? "bg-primary" : "bg-muted"
                    }`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Trois évaluations consécutives au-dessus de 90&nbsp;% : le moteur peut sauter des leçons
              ou exercices encore en attente (lignes <span className="text-sky-600 dark:text-sky-400">SKIPPED</span>).
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              streak API : {streakRaw} / 3
            </p>
          </div>

          <Link
            href="/dashboard/catalog"
            className="mt-4 inline-flex items-center text-primary text-sm hover:underline"
          >
            <BookOpen className="mr-2 h-4 w-4" /> Catalogue BC2 (prérequis modules)
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center font-semibold">
          <ListChecks className="mr-2 h-5 w-5 text-muted-foreground" />
          Liste des activités ({activities.length})
        </h3>
        <p className="mb-6 text-muted-foreground text-sm">
          Séquence construite depuis le catalogue après tri topologique des modules (prérequis),
          puis leçons, exercices, évaluation par module. Les lignes{" "}
          <span className="font-medium text-sky-600 dark:text-sky-400">SKIPPED</span> correspondent
          à une accélération (« saut » du contenu sur une compétence déjà très bien évaluée).
        </p>
        <div className="max-h-[480px] space-y-2 overflow-auto text-sm">
          {activities.length === 0 ? (
            <p className="text-muted-foreground">Aucune activité.</p>
          ) : (
            activities.slice(0, 80).map((a: any, i: number) => (
              <div
                key={`${a.contentId}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 font-mono text-xs"
              >
                <span className="text-muted-foreground">{i + 1}.</span>
                <span className="grow text-foreground truncate">{a.type}</span>
                <span className="truncate text-muted-foreground max-w-[200px]" title={a.contentId}>
                  {a.contentId}
                </span>
                <span
                  className={
                    a.status === "COMPLETED"
                      ? "text-green-500"
                      : a.status === "PENDING"
                        ? "text-amber-500"
                        : a.status === "SKIPPED"
                          ? "font-medium text-sky-600 dark:text-sky-400"
                          : "text-muted-foreground"
                  }
                >
                  {a.status ?? "?"}
                </span>
              </div>
            ))
          )}
          {activities.length > 80 ? (
            <p className="pt-4 text-muted-foreground text-xs">
              … et {activities.length - 80} activités suivantes (tronquées pour lisibilité)
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
