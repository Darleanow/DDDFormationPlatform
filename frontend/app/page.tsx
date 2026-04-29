"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Network,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LEARNER_DEMO_ACCELERATION_ID,
  LEARNER_DEMO_CLASSIC_CURRICULUM_ID,
  setStoredDemoLearnerId,
  type DemoLearnerId,
} from "@/lib/demo-learner";
import { DEFAULT_TENANT_ID } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT_ID);
  const [learnerId, setLearnerId] = useState<DemoLearnerId>(
    LEARNER_DEMO_ACCELERATION_ID,
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredDemoLearnerId(learnerId);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("fp.demoTenantId", tenantId);
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <h1 className="text-2xl font-semibold text-center mb-2 tracking-tight">Formation Platform</h1>
          <p className="text-muted-foreground text-center text-sm mb-8">
            Domaine-Driven Design Architecture
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Tenant (organisation)
              </label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
              >
                <option value={DEFAULT_TENANT_ID}>Université Lyon (démo seed)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Apprenant (parcours BC3 séparés)
              </label>
              <select
                value={learnerId}
                onChange={(e) =>
                  setLearnerId(e.target.value as DemoLearnerId)
                }
                className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
              >
                <option value={LEARNER_DEMO_ACCELERATION_ID}>
                  Alice Dupont — parcours court (accélération / SKIPPED)
                </option>
                <option value={LEARNER_DEMO_CLASSIC_CURRICULUM_ID}>
                  Bruno Lemaire — catalogue complet (sans séquence courte)
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-medium rounded-lg px-4 py-3 mt-4 flex items-center justify-center hover:bg-primary/90 transition-colors group"
            >
              Accéder au Dashboard
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </motion.div>

        {/* BC Overview Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 grid grid-cols-3 gap-4 text-center opacity-60"
        >
          <div className="flex flex-col items-center">
            <BookOpen className="w-5 h-5 mb-2" />
            <span className="text-xs">Catalog</span>
          </div>
          <div className="flex flex-col items-center">
            <Network className="w-5 h-5 mb-2" />
            <span className="text-xs">Adaptive</span>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-5 h-5 mb-2" />
            <span className="text-xs">Certification</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
