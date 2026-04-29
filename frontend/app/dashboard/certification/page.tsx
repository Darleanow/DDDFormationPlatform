"use client";

import { Award, FileSignature, CheckCircle, XCircle, FileWarning, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getCertifications } from "@/lib/api";

export default function CertificationPage() {
  const [certifications, setCertifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCerts() {
      try {
        const certs = await getCertifications();
        setCertifications(certs);
      } catch (e) {
        console.error("Failed to load certs", e);
      } finally {
        setLoading(false);
      }
    }
    loadCerts();
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const cert = certifications[0]; // Assuming at least one is seeded, or we show empty state

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Certification</h1>
          <p className="text-muted-foreground mt-1">Données réelles chargées depuis le BC5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Certificate Eligibility */}
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Award className="w-32 h-32" />
          </div>
          
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <FileSignature className="w-5 h-5 mr-2 text-primary" />
            Éligibilité à la Délivrance
          </h3>

          {cert ? (
            <div className="space-y-4 relative z-10">
              {/* Condition 1: Global Score */}
              <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-background">
                <div>
                  <h4 className="font-medium text-sm">Score Global ({cert.titre})</h4>
                  <p className="text-xs text-muted-foreground mt-1">Seuil requis: {cert.regles?.scoreSeuil || 0}% (Règle Tenant)</p>
                </div>
                <div className="flex items-center text-green-500 bg-green-500/10 px-3 py-1 rounded font-medium text-sm border border-green-500/20">
                  <span className="mr-2">En attente d'évaluations</span>
                </div>
              </div>

              {/* Condition 2: Mandatory Competencies */}
              <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-background">
                <div>
                  <h4 className="font-medium text-sm">Compétences Obligatoires</h4>
                  <p className="text-xs text-muted-foreground mt-1">Toutes les compétences doivent être validées</p>
                </div>
                <div className="flex items-center text-amber-500 bg-amber-500/10 px-3 py-1 rounded font-medium text-sm border border-amber-500/20">
                  <span className="mr-2">0 / {cert.regles?.competencesObligatoires?.length || 0}</span>
                </div>
              </div>

              {/* Condition 3: Critical Failures */}
              <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-background">
                <div>
                  <h4 className="font-medium text-sm">Compétences Critiques</h4>
                  <p className="text-xs text-muted-foreground mt-1">Aucun échec toléré (Bloquant)</p>
                </div>
                <div className="flex items-center text-muted-foreground bg-background px-3 py-1 rounded font-medium text-sm border border-border">
                  <span className="mr-2">{cert.regles?.competencesCritiques?.length || 0} à surveiller</span>
                </div>
              </div>
            </div>
          ) : (
             <div className="bg-muted border border-border rounded-xl p-6 text-center text-muted-foreground">
              <p>Aucune certification configurée pour ce Tenant.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
