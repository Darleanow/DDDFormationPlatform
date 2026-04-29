"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import {
  competencyIdFromAdaptiveAssessmentActivity,
  generateAdaptiveAssessment,
  processAdaptiveAssessmentAttempt,
} from "@/lib/api";
import { useDemoLearnerId } from "@/hooks/useDemoLearnerId";

function AssessmentSessionContent() {
  const searchParams = useSearchParams();
  const rawContentId = searchParams.get("contentId");
  const { learnerId } = useDemoLearnerId();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [itemsPreview, setItemsPreview] = useState<{ id: string; difficulty: number }[]>(
    [],
  );

  useEffect(() => {
    async function load() {
      if (!rawContentId) {
        setError("Paramètre contentId manquant.");
        setLoading(false);
        return;
      }
      const competencyId = competencyIdFromAdaptiveAssessmentActivity(rawContentId);
      if (!competencyId) {
        setError(`contentId invalide pour une évaluation (attendu assessment:competence:…).`);
        setLoading(false);
        return;
      }
      try {
        const res = await generateAdaptiveAssessment({
          assessmentId: rawContentId,
          competencyId,
          estimatedLevel: "0.5",
          tenantId: "tenant-universite-lyon",
        });
        const items = res.items || [];
        if (items.length === 0) {
          setError(
            "Aucun item généré — vérifier CompetencyAssessmentsBootstrap (BC4) et le référentiel compétences.",
          );
          return;
        }
        setItemsPreview(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec génération");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [rawContentId, learnerId]);

  const handleSimulateSubmit = async () => {
    if (!rawContentId) return;
    const competencyId = competencyIdFromAdaptiveAssessmentActivity(rawContentId);
    if (!competencyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const attemptId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `attempt-${Date.now()}`;
      const itemResults = itemsPreview.map((it) => ({ itemId: it.id, isCorrect: true }));
      await processAdaptiveAssessmentAttempt(rawContentId, attemptId, {
        learnerId,
        questionCount: Math.max(itemsPreview.length, 1),
        durationSeconds: 120,
        itemResults,
        tenantId: "tenant-universite-lyon",
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec soumission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <Link
        href="/dashboard/catalog"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au catalogue
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Évaluation (BC4)
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Lien depuis le parcours adaptatif (BC3). Génération d&apos;items puis soumission simplifiée
          pour démo — les identifiants de contenu correspondent au registre Assessment.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && rawContentId ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-mono text-xs text-muted-foreground break-all">{rawContentId}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Items sélectionnés (difficulté adaptive) : {itemsPreview.length}
          </p>
          {!done ? (
            <button
              type="button"
              onClick={() => handleSimulateSubmit()}
              disabled={submitting}
              className="mt-6 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Soumission…" : "Soumettre (tout correct — démo)"}
            </button>
          ) : (
            <div className="mt-6 flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                Tentative enregistrée. Le parcours se met à jour automatiquement quand cette
                évaluation était bien l&apos;activité suivante (sinon terminez les leçons / exercices
                d&apos;abord).
              </span>
            </div>
          )}
          {done ? (
            <Link
              href="/dashboard/catalog"
              className="mt-6 inline-block text-primary underline-offset-4 hover:underline"
            >
              Continuer le parcours →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function AssessmentSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AssessmentSessionContent />
    </Suspense>
  );
}
