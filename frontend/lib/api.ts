import {
  LEARNER_DEMO_ACCELERATION_ID,
  LEARNER_DEMO_CLASSIC_CURRICULUM_ID,
} from "./demo-learner";

export { LEARNER_DEMO_ACCELERATION_ID, LEARNER_DEMO_CLASSIC_CURRICULUM_ID };

export const API_BASE = "http://localhost:3000";

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const getTenant = (id: string) => fetchApi<any>(`/tenants/${id}`);
export const getLearner = (id: string) => fetchApi<any>(`/identity/learners/${id}`);
export const getProgrammes = () => fetchApi<any[]>('/catalog/programmes');
/** FR glossary: Programme → Program in code here */
export const getCoursesForProgram = (programId: string) =>
  fetchApi<any[]>(`/catalog/programmes/${programId}/course`);
/** @deprecated use getCoursesForProgram */
export const getCoursForProgram = getCoursesForProgram;
export const getModulesForCourse = (courseId: string) =>
  fetchApi<any[]>(`/catalog/course/${courseId}/modules`);
/** @deprecated use getModulesForCourse */
export const getModulesForCours = getModulesForCourse;

export const getModule = (moduleId: string) => fetchApi<any>(`/catalog/modules/${moduleId}`);
export const getLessonsForModule = (moduleId: string) =>
  fetchApi<any[]>(`/catalog/modules/${moduleId}/lessons`);
/** @deprecated use getLessonsForModule */
export const getLeconsForModule = getLessonsForModule;
export const getLesson = (lessonId: string) => fetchApi<any>(`/catalog/lessons/${lessonId}`);
/** @deprecated use getLesson */
export const getLecon = getLesson;

export const getLearningPath = (learnerId: string) => fetchApi<any>(`/adaptive/path/${learnerId}`);
/** BC2 modules in program order (prérequis) + avancement aligné sur BC3 — détail des étapes inclus */
export type ModuleCatalogStep = {
  type: "LESSON" | "EXERCISE" | "ASSESSMENT" | string;
  contentId: string;
  label: string;
  completed: boolean;
};

export type ModuleOverviewRow = {
  moduleId: string;
  nom: string;
  canAccess: boolean;
  missingPrerequisites: { id: string; titre: string }[];
  completedSteps: number;
  totalSteps: number;
  fullyDone: boolean;
  steps: ModuleCatalogStep[];
};

export function getProgramModulesOverview(learnerId: string, programId: string) {
  const q = encodeURIComponent(programId.trim());
  return fetchApi<{ learnerId: string; programId: string; modules: ModuleOverviewRow[] }>(
    `/adaptive/path/${encodeURIComponent(learnerId)}/program-modules?programId=${q}`,
  );
}

/** Compétences considérées comme validées côté BC2 pour les prérequis (activités parcours complétées). */
export function validatedCompetenceIdsFromPath(path: {
  activities?: { status: string; competencyIds?: string[] }[];
} | null): string[] {
  const ids: string[] = [];
  for (const a of path?.activities ?? []) {
    if (a.status === "COMPLETED" && a.competencyIds?.length) {
      ids.push(...a.competencyIds);
    }
  }
  return [...new Set(ids)];
}

export function checkCatalogModuleAccess(moduleId: string, validatedCompetenceIds: string[]) {
  const v = validatedCompetenceIds.length
    ? `?validatedCompetences=${validatedCompetenceIds.map(encodeURIComponent).join(",")}`
    : "";
  return fetchApi<{ canAccess: boolean; missingPrerequisites: { id: string; titre: string }[] }>(
    `/catalog/modules/${encodeURIComponent(moduleId)}/access${v}`,
  );
}
/** Ancien défaut Alice — préférez LEARNER_DEMO_* + sélecteur dashboard */
export const DEFAULT_LEARNER_ID = LEARNER_DEMO_ACCELERATION_ID;

/** Demo tenant seeded in SeedService (`tenant-universite-lyon`) — keep in sync with backend */
export const DEFAULT_TENANT_ID = 'tenant-universite-lyon';

/** Marks the **next** pending adaptive activity; `contentId` must match that activity (current lesson). */
export const markActivityCompleted = (learnerId: string, contentId: string) =>
  fetchApi<any>(`/adaptive/path/${learnerId}/complete-current`, {
    method: 'POST',
    body: JSON.stringify({ contentId }),
  });
export const getCertifications = () => fetchApi<any[]>('/certifications');
export const getExercise = (id: string) => fetchApi<any>(`/catalog/exercises/${id}`);
/** @deprecated use getExercise */
export const getExercice = getExercise;

/** BC4 — génération d'une évaluation (items filtrés par difficulté adaptative). */
export function generateAdaptiveAssessment(body: {
  assessmentId: string;
  competencyId: string;
  estimatedLevel: string;
  tenantId?: string;
}) {
  return fetchApi<{ assessmentId: string; items: { id: string; difficulty: number; weight: number }[] }>(
    '/assessments/generate',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

/** BC4 — après tentative : scoring + publication niveau estimé → BC3. */
export function processAdaptiveAssessmentAttempt(
  assessmentId: string,
  attemptId: string,
  body: {
    learnerId: string;
    questionCount: number;
    durationSeconds: number;
    itemResults: { itemId: string; isCorrect: boolean }[];
    tenantId?: string;
  },
) {
  const a = encodeURIComponent(assessmentId);
  const t = encodeURIComponent(attemptId);
  return fetchApi<Record<string, unknown>>(
    `/assessments/${a}/attempts/${t}/process`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

/** Stable ID Bridge BC3/BC4 : `assessment:competence:<competencyId>`. */
export function competencyIdFromAdaptiveAssessmentActivity(contentId: string): string | null {
  const prefix = 'assessment:competence:';
  if (!contentId.startsWith(prefix)) return null;
  return contentId.slice(prefix.length);
}
