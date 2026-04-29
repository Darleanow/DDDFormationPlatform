"use client";

import { Network, FastForward, AlertTriangle, ArrowRightCircle, ListChecks, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getLearningPath } from "@/lib/api";

export default function AdaptiveEnginePage() {
  const [learningPath, setLearningPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdaptiveData() {
      try {
        // Our seeder doesn't create a learning path automatically yet, so this might be null.
        // The Adaptive module usually creates it upon first evaluation.
        const path = await getLearningPath("learner-alice").catch(() => null);
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
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Fallback to empty state if no path yet
  const recommendation = learningPath?.currentRecommendation || null;
  const modulesPlan = learningPath?.modulesPlan || [];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Moteur Adaptatif</h1>
          <p className="text-muted-foreground mt-1">Données réelles chargées depuis le BC3</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Next Recommendation */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Network className="w-48 h-48" />
          </div>
          
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <ArrowRightCircle className="w-5 h-5 mr-2 text-primary" /> 
            Prochaine Activité Recommandée
          </h2>

          {recommendation ? (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
                    {recommendation.isRemediation ? "Remédiation Déclenchée" : "Parcours Standard"}
                  </span>
                  <h3 className="text-2xl font-bold">{recommendation.moduleId || "Module inconnu"}</h3>
                </div>
              </div>
              <button className="bg-primary text-primary-foreground font-medium rounded-lg px-6 py-3 hover:bg-primary/90 transition-colors">
                Lancer l'activité
              </button>
            </div>
          ) : (
            <div className="bg-muted border border-border rounded-xl p-6 text-center text-muted-foreground">
              <p>Aucune recommandation disponible.</p>
              <p className="text-sm mt-2">Le moteur adaptatif nécessite une première évaluation pour générer un parcours.</p>
            </div>
          )}
        </div>

        {/* Status & Constraints */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <FastForward className="w-4 h-4 mr-2 text-accent-foreground" />
              Statut Adaptatif
            </h3>
            <div className="bg-secondary p-4 rounded-xl text-sm">
              <p className="text-secondary-foreground font-medium">Path ID: {learningPath?.id || "N/A"}</p>
              <p className="text-muted-foreground mt-1">Score Actuel: {learningPath?.globalScore || 0}</p>
            </div>
          </div>
        </div>

        {/* Path sequencing */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-6 flex items-center">
            <ListChecks className="w-5 h-5 mr-2 text-muted-foreground" />
            Séquençage du Parcours (Plan)
          </h3>
          
          {modulesPlan.length > 0 ? (
            <div className="relative border-l-2 border-border ml-3 space-y-8 pb-4">
              {modulesPlan.map((mp: any) => (
                <div key={mp.moduleId} className="relative pl-6">
                  <div className={`absolute w-4 h-4 rounded-full -left-[9px] top-1 border-4 border-card ${mp.status === 'completed' ? 'bg-green-500' : mp.status === 'in_progress' ? 'bg-primary' : 'bg-muted'}`} />
                  <div className={`text-sm font-medium ${mp.status === 'completed' ? 'text-green-500' : mp.status === 'in_progress' ? 'text-primary' : 'text-muted-foreground'}`}>
                    {mp.status}
                  </div>
                  <h4 className="font-semibold mt-1">{mp.moduleId}</h4>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun module planifié. Parcours vide.</p>
          )}
        </div>

      </div>
    </div>
  );
}
