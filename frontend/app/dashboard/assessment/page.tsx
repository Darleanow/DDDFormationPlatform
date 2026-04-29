import { Target, Activity, ShieldAlert, BarChart3, Clock } from "lucide-react";

export default function AssessmentPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Évaluations & Niveaux</h1>
          <p className="text-muted-foreground mt-1">Contexte Borné: Assessment (BC4)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Level Estimation */}
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <BarChart3 className="w-32 h-32" />
          </div>
          
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2 text-primary" />
            Niveaux Estimés Actuels
          </h3>

          <div className="space-y-6 relative z-10">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-foreground">C_THREAD_1 (Structures de base)</span>
                <span className="text-muted-foreground">0.85 / 1.0</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-foreground">C_ALGO_REC (Récursivité)</span>
                <span className="text-destructive font-medium">0.30 / 1.0</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-destructive rounded-full" style={{ width: '30%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Ce niveau a déclenché une remédiation dans le BC3.</p>
            </div>
          </div>
        </div>

        {/* Recent Attempts & Anomalies */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-primary" />
            Dernières Tentatives
          </h3>

          <div className="space-y-4">
            <div className="bg-background border border-border p-4 rounded-xl flex items-start justify-between">
              <div>
                <h4 className="font-medium text-sm">Évaluation Formative (Threads)</h4>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 mr-1" /> 12 mins • Score: 18/20
                </div>
              </div>
              <span className="bg-green-500/10 text-green-500 border border-green-500/20 text-xs px-2 py-1 rounded font-medium">
                Complété
              </span>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-sm">Évaluation Diagnostique (Algo)</h4>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3 mr-1" /> 45 sec • Score: 19/20
                  </div>
                </div>
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded font-medium flex items-center">
                  <ShieldAlert className="w-3 h-3 mr-1" /> Suspect
                </span>
              </div>
              <p className="text-xs text-muted-foreground bg-background p-2 rounded border border-border">
                <strong className="text-foreground">Anomalie Comportementale :</strong> Réponse à 20 questions en moins de 45 secondes. Tentative marquée comme suspecte, en attente de validation manuelle avant transmission au BC3.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
