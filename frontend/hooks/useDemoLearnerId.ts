"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStoredDemoLearnerId,
  setStoredDemoLearnerId,
  type DemoLearnerId,
  LEARNER_DEMO_ACCELERATION_ID,
} from "@/lib/demo-learner";

/**
 * Choix démo Alice (accélération) vs Bruno (catalogue complet) — persistant navigateur (localStorage).
 */
export function useDemoLearnerId(): {
  learnerId: DemoLearnerId;
  setLearnerId: (id: DemoLearnerId) => void;
} {
  const [learnerId, setState] = useState<DemoLearnerId>(
    LEARNER_DEMO_ACCELERATION_ID,
  );

  useEffect(() => {
    setState(getStoredDemoLearnerId());
  }, []);

  const setLearnerId = useCallback((id: DemoLearnerId) => {
    setStoredDemoLearnerId(id);
    setState(id);
  }, []);

  return { learnerId, setLearnerId };
}
