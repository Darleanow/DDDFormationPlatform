"use client";

import { BookOpen, FileText, ChevronRight, PlayCircle, Loader2 } from "lucide-react";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getModule, getLessonsForModule } from "@/lib/api";

export default function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const moduleId = resolvedParams.id;
  const [moduleData, setModuleData] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [mod, lcs] = await Promise.all([
          getModule(moduleId),
          getLessonsForModule(moduleId)
        ]);
        setModuleData(mod);
        setLessons(lcs);
      } catch (e) {
        console.error("Failed to load module data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [moduleId]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center text-sm text-muted-foreground mb-6 bg-background p-3 rounded-lg border border-border w-fit">
        <Link href="/dashboard/catalog" className="hover:text-foreground hover:underline flex items-center">
          <BookOpen className="w-4 h-4 mr-2" />
          Catalogue
        </Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="font-medium text-foreground">{moduleData?.nom || 'Module'}</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{moduleData?.nom}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{moduleData?.description || "Découvrez les leçons de ce module."}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-6">Contenu du Module</h2>

        <div className="space-y-3">
          {lessons.map((lesson: any, index: number) => (
            <Link key={lesson.id} href={`/dashboard/catalog/lesson/${lesson.id}`}>
              <div className="flex items-center justify-between p-4 rounded-xl bg-background border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{lesson.titre}</h3>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <FileText className="w-3 h-3 mr-1" />
                      {lesson.type}
                    </div>
                  </div>
                </div>
                <PlayCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors opacity-50 group-hover:opacity-100" />
              </div>
            </Link>
          ))}
          {lessons.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucune leçon trouvée pour ce module.</p>
          )}
        </div>
      </div>
    </div>
  );
}
