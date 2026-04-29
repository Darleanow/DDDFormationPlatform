const STORAGE_KEY = "fp.demoLearnerId";

/** Séquence courte (3 évals puis leçons) — idéal pour montrer l’accélération / SKIPPED */
export const LEARNER_DEMO_ACCELERATION_ID = "learner-alice";

/** Même programme p001, même contraintes — catalogue complet (parcours « classique » long) */
export const LEARNER_DEMO_CLASSIC_CURRICULUM_ID = "learner-bob-classic";

export const DEMO_LEARNER_IDS = [
  LEARNER_DEMO_ACCELERATION_ID,
  LEARNER_DEMO_CLASSIC_CURRICULUM_ID,
] as const;

export type DemoLearnerId = (typeof DEMO_LEARNER_IDS)[number];

export function getStoredDemoLearnerId(): DemoLearnerId {
  if (typeof window === "undefined") return LEARNER_DEMO_ACCELERATION_ID;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return DEMO_LEARNER_IDS.includes(v as DemoLearnerId)
    ? (v as DemoLearnerId)
    : LEARNER_DEMO_ACCELERATION_ID;
}

export function setStoredDemoLearnerId(id: DemoLearnerId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}
