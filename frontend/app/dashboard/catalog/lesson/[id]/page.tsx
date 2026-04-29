"use client";

import { FileText, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { DEFAULT_LEARNER_ID, getLesson, getLearningPath, markActivityCompleted } from "@/lib/api";
import { activityDetailHref } from "@/lib/adaptive-navigation";

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const lessonId = resolvedParams.id;
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  /** Parcours adaptatif : définit une seule « prochaine » activité (leçon, remédiation, etc.) */
  const [nextStep, setNextStep] = useState<{
    contentId: string;
    type: string;
  } | null>(null);
  /** null = encore inconnu ou absent */
  const [pathLoaded, setPathLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setCompletionError(null);
        const [data, path] = await Promise.all([
          getLesson(lessonId),
          getLearningPath(DEFAULT_LEARNER_ID).catch(() => null),
        ]);
        setLesson(data);
        setPathLoaded(true);
        const done = path?.activities?.some(
          (a: { contentId: string; status: string }) =>
            a.contentId === lessonId && a.status === "COMPLETED",
        );
        if (done) setCompleted(true);
        const na = path?.nextActivity as
          | { contentId: string; type: string }
          | undefined
          | null;
        setNextStep(na ?? null);
      } catch (e) {
        console.error("Failed to load lesson data", e);
        setPathLoaded(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [lessonId]);

  /** On ne peut valider cette page que si c’est l’étape suivante du parcours (sinon erreur 400 côté API). */
  const isNextAdaptiveStep =
    nextStep !== null && nextStep.contentId === lessonId;
  const canMarkComplete =
    pathLoaded &&
    !completed &&
    nextStep !== null &&
    isNextAdaptiveStep;

  const handleComplete = async () => {
    setCompleting(true);
    setCompletionError(null);
    try {
      await markActivityCompleted(DEFAULT_LEARNER_ID, lessonId);
      setCompleted(true);
    } catch (e) {
      console.error("Failed to mark as completed", e);
      const msg = e instanceof Error ? e.message : "Impossible d'enregistrer la progression.";
      setCompletionError(msg);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex items-center text-sm text-muted-foreground mb-6 bg-background p-3 rounded-lg border border-border w-fit">
        <Link href={`/dashboard/catalog/module/${lesson?.moduleId}`} className="hover:text-foreground hover:underline flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au module
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 lg:p-12">
        <div className="flex items-center space-x-2 text-primary mb-4 text-sm font-medium">
          <FileText className="w-4 h-4" />
          <span className="uppercase tracking-wider">{lesson?.type}</span>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-8 leading-tight">
          {lesson?.titre}
        </h1>

        <div className="prose prose-invert prose-lg max-w-none prose-p:text-muted-foreground prose-headings:text-foreground">
          {lesson?.contenu ? (
            // A simple render since the mock is plain text or Markdown.
            <div dangerouslySetInnerHTML={{ __html: lesson.contenu.replace(/\n/g, '<br/>') }} />
          ) : (
            <p>Le contenu de cette leçon n'est pas encore disponible ou est en cours de création.</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end flex-col items-end gap-3 w-full">
        {completed ? null : pathLoaded &&
          nextStep &&
          !isNextAdaptiveStep ? (
          <div
            className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
            role="region"
          >
            <p className="font-medium text-amber-200 mb-2">
              Cette leçon n’est pas la prochaine étape de votre parcours adaptatif.
            </p>
            <p className="text-muted-foreground mb-3">
              Avant tout, poursuivez :{" "}
              <strong className="text-foreground">
                {nextStep.type === "REMEDIATION" ? "remédiation · " : ""}
              </strong>
              <code className="text-xs bg-muted px-1 rounded">{nextStep.contentId}</code>.
            </p>
            <Link
              href={activityDetailHref(nextStep)}
              className="inline-flex text-primary font-medium underline-offset-4 hover:underline"
            >
              Ouvrir la prochaine activité prévue →
            </Link>
          </div>
        ) : null}

        {!pathLoaded ? (
          <p className="text-sm text-muted-foreground">
            Chargement du parcours…
          </p>
        ) : pathLoaded && nextStep === null && !completed ? (
          <p className="text-sm text-muted-foreground text-right max-w-xl">
            Aucune progression à enregistrer sur ce parcours (parcours vide ou terminé).
          </p>
        ) : null}

        {completionError ? (
          <p className="text-sm text-destructive max-w-xl text-right" role="alert">
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
          {completed ? "Terminé !" : completing ? "En cours..." : "Marquer comme terminé"}
        </button>
      </div>
    </div>
  );
}
