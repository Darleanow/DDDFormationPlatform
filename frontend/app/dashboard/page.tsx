"use client";

import { UserCircle2, Clock, Calendar, Briefcase, MapPin, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getTenant, getLearner, DEFAULT_TENANT_ID } from "@/lib/api";
import { useDemoLearnerId } from "@/hooks/useDemoLearnerId";

export default function TenantProfilePage() {
  const { learnerId } = useDemoLearnerId();
  const [tenant, setTenant] = useState<any>(null);
  const [learner, setLearner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const l = await getLearner(learnerId);
        setLearner(l);
        const tenantId = (l?.tenantId as string | undefined) ?? DEFAULT_TENANT_ID;
        try {
          setTenant(await getTenant(tenantId));
        } catch (tenantErr) {
          console.error("Tenant introuvable — id attendu depuis l’apprenant seed :", tenantId, tenantErr);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [learnerId]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profil Apprenant & Organisation</h1>
          <p className="text-muted-foreground mt-1">Données réelles chargées depuis le Backend (BC1 & BC6)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Config (BC6) */}
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Briefcase className="w-32 h-32" />
          </div>
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{tenant?.name || "Tenant Inconnu"}</h2>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-500">
                {tenant?.isActive ? "Tenant Actif" : "Inactif"}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Règles d'Organisation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground mb-1">Score Seuil Certification</div>
                <div className="text-xl font-semibold">{tenant?.rules?.scoreSeuil || 0}%</div>
              </div>
              <div className="bg-background/50 p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground mb-1">Tentatives Max</div>
                <div className="text-xl font-semibold">{tenant?.rules?.maxAttempts || 0}</div>
              </div>
            </div>
            <div className="bg-background/50 p-4 rounded-xl border border-border">
              <div className="text-xs text-muted-foreground mb-1">ID Technique (UUID)</div>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-secondary rounded text-secondary-foreground border border-border">{tenant?.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Learner Profile (BC1) */}
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <UserCircle2 className="w-32 h-32" />
          </div>
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center border border-border">
              <span className="text-xl font-bold">{learner?.firstName?.charAt(0)}{learner?.lastName?.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{learner?.firstName} {learner?.lastName}</h2>
              <p className="text-sm text-muted-foreground">{learner?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Statut Inscription</h3>
            
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
              <div className="font-medium text-primary mb-2">Connecté via l'Identity Controller</div>
              <div className="flex flex-col space-y-2 mt-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="font-medium text-foreground mr-1">Tenant ID:</span> {learner?.tenantId}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="font-medium text-foreground mr-1">Learner ID:</span> {learner?.id}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
