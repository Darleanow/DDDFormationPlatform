"use client";

import {
  Loader2,
  ListChecks,
  AlertTriangle,
  ArrowRightCircle,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getLearningPath, DEFAULT_LEARNER_ID } from "@/lib/api";
import { activityDetailHref } from "@/lib/adaptive-navigation";

export default function AdaptiveEnginePage() {
  const [learningPath, setLearningPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdaptiveData() {
      try {
        const path = await getLearningPath(DEFAULT_LEARNER_ID).catch(() => null);
        setLearningPath(path);
      } catch (e) {
        console.error("Failed to load adaptive path", e);
      } finally {
        setLoading(false);
      }
    }
    loadAdaptiveData();
  }, []);

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

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Moteur adaptatif (BC3)
          </h1>
          <p className="mt-1 text-muted-foreground">
            GET <code className="text-xs">/adaptive/path/{DEFAULT_LEARNER_ID}</code> — même
            modèle que le parcours (nextActivity + activities).
          </p>
        </div>
      </div>

      {learningPath?.alertMessage ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <div className="font-medium">{learningPath.alertMessage}</div>
            {learningPath?.uncoveredCompetences?.length ? (
              <p className="mt-2 text-muted-foreground text-xs">
                Compétences encore à couvrir :{" "}
                {learningPath.uncoveredCompetences.join(", ")}
              </p>
            ) : null}
          </div>
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
              Pas de données — vérifiez que le backend a bien reçu{" "}
              <code className="text-xs">enrollment.confirmed</code> pour Alice /
              programme <code className="text-xs">p001</code>.
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
              <Link
                href={activityDetailHref({
                  type: nextActivity.type,
                  contentId: nextActivity.contentId,
                })}
                className="inline-flex rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Ouvrir cette activité
              </Link>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Couverture obligatoire</div>
          <div
            className={
              atRisk ? "font-medium text-amber-600" : "font-medium text-green-600"
            }
          >
            {atRisk ? "À risque" : "OK"}
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
          puis leçons, exercices, évaluation par module.
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
