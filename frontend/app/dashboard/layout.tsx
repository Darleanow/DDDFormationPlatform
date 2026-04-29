"use client";

import { motion } from "framer-motion";
import { BookOpen, Network, ShieldCheck, UserCircle2, ClipboardList, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isDashboardNavActive } from "@/lib/dashboard-nav";
import { useDemoLearnerId } from "@/hooks/useDemoLearnerId";
import { LEARNER_DEMO_ACCELERATION_ID } from "@/lib/demo-learner";

/** PoC shell: BC2 content under Catalog; BC3 path under Adaptive; BC4 session under /assessment/session. Index pages Assessment & Certification are mock shells until BC4/BC5 APIs are wired end-to-end. */
const navItems = [
  { name: "Adaptive Engine", href: "/dashboard/adaptive", icon: Network },
  { name: "Learning Catalog", href: "/dashboard/catalog", icon: BookOpen },
  { name: "Assessment", href: "/dashboard/assessment", icon: ClipboardList },
  { name: "Certification", href: "/dashboard/certification", icon: ShieldCheck },
  { name: "Tenant Profile", href: "/dashboard", icon: UserCircle2 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { learnerId } = useDemoLearnerId();
  const isAlice = learnerId === LEARNER_DEMO_ACCELERATION_ID;
  const learnerLabel = isAlice ? "Alice Dupont" : "Bruno Lemaire";
  const learnerSubtitle = isAlice ? "Parcours compact (démo)" : "Catalogue complet";

  return (
    <div className="min-h-screen bg-black flex overflow-hidden">
      {/* Sidebar Navigation */}
      <motion.aside 
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 border-r border-border bg-card/30 backdrop-blur-md flex flex-col"
      >
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold tracking-tight text-primary">Formation<span className="text-primary/60">Platform</span></h2>
          <p className="text-xs text-muted-foreground mt-1">Université Lyon — démo catalogue</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = isDashboardNavActive(pathname, item.href);
            const Icon = item.icon;
            
            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            <span>Connexion — autre apprenant</span>
          </Link>
          <div className="flex items-center space-x-3 px-4 py-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {isAlice ? "AD" : "BL"}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{learnerLabel}</span>
              <span className="text-xs truncate">{learnerSubtitle}</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-black to-black -z-10" />
        <div className="p-8 max-w-6xl mx-auto min-h-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
