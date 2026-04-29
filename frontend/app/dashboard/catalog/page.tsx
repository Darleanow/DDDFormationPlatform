"use client";

import { BookOpen, ChevronRight, FileText, LayoutList, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProgrammes, getCoursForProgram, getModulesForCours } from "@/lib/api";

export default function CatalogPage() {
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [cours, setCours] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const progs = await getProgrammes();
        setProgrammes(progs);
        if (progs && progs.length > 0) {
          const c = await getCoursForProgram(progs[0].id);
          setCours(c);
          if (c && c.length > 0) {
             const mods = await getModulesForCours(c[0].id);
             setModules(mods);
          }
        }
      } catch (e) {
        console.error("Failed to load catalog", e);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const activeProg = programmes[0];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Catalogue d'Apprentissage</h1>
          <p className="text-muted-foreground mt-1">Données réelles chargées depuis le BC2</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {activeProg && (
          <div className="flex items-center text-sm text-muted-foreground mb-6 bg-background p-3 rounded-lg border border-border w-fit">
            <BookOpen className="w-4 h-4 mr-2" />
            <span className="font-medium text-foreground">{activeProg.nom}</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span>Modules de la première année</span>
          </div>
        )}

        <div className="grid gap-4">
          {modules.map((module: any, idx: number) => {
            const status = idx === 0 ? 'validated' : idx === 1 ? 'available' : 'locked';
            
            return (
              <div 
                key={module.id} 
                className={`flex items-center justify-between p-5 rounded-xl border ${
                  status === 'locked' ? 'bg-background/50 border-border/50 opacity-75' : 'bg-background border-border hover:border-primary/50 transition-colors'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                    status === 'validated' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                    status === 'locked' ? 'bg-muted border-border text-muted-foreground' :
                    'bg-primary/10 border-primary/20 text-primary'
                  }`}>
                    {status === 'validated' ? <CheckCircle2 className="w-5 h-5" /> : 
                     status === 'locked' ? <Lock className="w-5 h-5" /> : 
                     <LayoutList className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{module.nom}</h3>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-3">
                      <span className="flex items-center"><FileText className="w-3 h-3 mr-1" /> {module.lessons?.length || 0} lessons</span>
                      <span className="bg-secondary px-2 py-0.5 rounded text-secondary-foreground text-[10px] uppercase">MODULE</span>
                    </div>
                  </div>
                </div>

                {status === 'locked' && (
                  <div className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20 flex items-center">
                    <Lock className="w-3 h-3 mr-1.5" />
                    Prérequis non validés
                  </div>
                )}
                
                {status !== 'locked' && (
                  <Link href={`/dashboard/catalog/module/${module.id}`}>
                    <button className="text-sm font-medium text-primary hover:underline">
                      {status === 'validated' ? 'Revoir' : 'Commencer'}
                    </button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
