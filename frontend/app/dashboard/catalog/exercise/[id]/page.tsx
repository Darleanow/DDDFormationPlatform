"use client";

import { FileText, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  DEFAULT_LEARNER_ID,
  getExercise,
  getLearningPath,
  getLesson,
  markActivityCompleted,
} from "@/lib/api";
import { activityDetailHref } from "@/lib/adaptive-navigation";

export default function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const exoId = resolvedParams.id;
  const [exo, setExo] = useState<any>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [nextStep, setNextStep] = useState<{
    contentId: string;
    type: string;
  } | null>(null);
  const [pathLoaded, setPathLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setCompletionError(null);
        const [data, path] = await Promise.all([
          getExercise(exoId),
          getLearningPath(DEFAULT_LEARNER_ID).catch(() => null),
        ]);
        setExo(data);

        if (data?.lessonId) {
          try {
            const linkedLesson = await getLesson(data.lessonId as string);
            setModuleId(linkedLesson.moduleId ?? null);
          } catch {
            setModuleId(null);
          }
        } else {
          setModuleId(null);
        }

        setPathLoaded(true);

        const done = path?.activities?.some(
          (a: { contentId: string; status: string }) =>
            a.contentId === exoId && a.status === "COMPLETED",
        );
        if (done) setCompleted(true);
        const na = path?.nextActivity as
          | { contentId: string; type: string }
          | undefined
          | null;
        setNextStep(na ?? null);
      } catch (e) {
        console.error("Failed to load exercise data", e);
        setPathLoaded(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [exoId]);

  const isNextAdaptiveStep =
    nextStep !== null && nextStep.contentId === exoId;
  const canMarkComplete =
    pathLoaded && !completed && nextStep !== null && isNextAdaptiveStep;

  const handleComplete = async () => {
    setCompleting(true);
    setCompletionError(null);
    try {
      await markActivityCompleted(DEFAULT_LEARNER_ID, exoId);
      setCompleted(true);
    } catch (e) {
      console.error("Failed to mark as completed", e);
      const msg =
        e instanceof Error ? e.message : "Impossible d'enregistrer la progression.";
      setCompletionError(msg);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const backHref = moduleId
    ? `/dashboard/catalog/module/${moduleId}`
    : "/dashboard/catalog";

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex items-center text-sm text-muted-foreground mb-6 bg-background p-3 rounded-lg border border-border w-fit">
        <Link
          href={backHref}
          className="hover:text-foreground hover:underline flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 lg:p-12">
        <div className="flex items-center space-x-2 text-primary mb-4 text-sm font-medium">
          <FileText className="w-4 h-4" />
          <span className="uppercase tracking-wider">EXERCICE</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-8 leading-tight">
          {exo?.titre ?? exoId}
        </h1>

        <div className="prose prose-invert prose-lg max-w-none prose-p:text-muted-foreground prose-headings:text-foreground">
          {exo?.enonce ?? exo?.description ? (
            <div
              dangerouslySetInnerHTML={{
                __html: String(exo.enonce ?? exo.description).replace(/\n/g, "<br/>"),
              }}
            />
          ) : (
            <p>Énoncé non disponible.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end flex-col items-end gap-3 w-full">
        {!completed && pathLoaded && nextStep && !isNextAdaptiveStep ? (
          <div
            className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
            role="region"
          >
            <p className="font-medium text-amber-200 mb-2">
              Ce n’est pas l’étape suivante de votre parcours adaptatif.
            </p>
            <Link
              href={activityDetailHref(nextStep)}
              className="inline-flex text-primary font-medium underline-offset-4 hover:underline"
            >
              Ouvrir la prochaine activité prévue →
            </Link>
          </div>
        ) : null}

        {completionError ? (
          <p
            className="text-sm text-destructive max-w-xl text-right"
            role="alert"
          >
            {completionError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing || completed || !canMarkComplete}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center ${
            completed
              ? "bg-green-500 text-white cursor-default"
              : canMarkComplete && !completing
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
          } ${completing ? "opacity-50 cursor-wait" : ""}`}
        >
          {completing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {completed && <CheckCircle2 className="w-4 h-4 mr-2" />}
          {completed
            ? "Terminé !"
            : completing
              ? "En cours..."
              : "Marquer comme terminé"}
        </button>
      </div>
    </div>
  );
}
