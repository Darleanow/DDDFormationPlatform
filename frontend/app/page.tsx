"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, GraduationCap, Network, ShieldCheck, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app we'd validate and set session.
    // For this mockup, we'll just redirect to the dashboard.
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
              <label className="text-sm font-medium text-foreground">Tenant (Organisation)</label>
              <select className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none">
                <option value="tenant-1">Université Paris Saclay</option>
                <option value="tenant-2">Entreprise TechCorp</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Apprenant</label>
              <select className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none">
                <option value="alice">Alice Dupont (Étudiante)</option>
                <option value="bob">Bob Martin (Salarié)</option>
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
