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
/** Demo learner seeded in dev — swap for auth-backed id when identities exist */
export const DEFAULT_LEARNER_ID = 'learner-alice';

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
