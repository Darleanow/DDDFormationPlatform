/** Build the catalogue UI URL for an adaptive path step ([BC3] Activity → BC2 content). */
export function activityDetailHref(step: {
  type: string;
  contentId: string;
}): string {
  switch (step.type) {
    case "EXERCISE":
      return `/dashboard/catalog/exercise/${encodeURIComponent(step.contentId)}`;
    case "REMEDIATION":
    case "LESSON":
      return `/dashboard/catalog/lesson/${encodeURIComponent(step.contentId)}`;
    case "ASSESSMENT":
      return `/dashboard/assessment/session?contentId=${encodeURIComponent(step.contentId)}`;
    default:
      return "/dashboard/adaptive";
  }
}

/** Steps renvoyés par `program-modules` (BC2/BC3) — pas de valeur par défaut ambiguë. */
export function catalogBc2StepHref(step: { type: string; contentId: string }): string {
  switch (step.type) {
    case "EXERCISE":
      return `/dashboard/catalog/exercise/${encodeURIComponent(step.contentId)}`;
    case "LESSON":
      return `/dashboard/catalog/lesson/${encodeURIComponent(step.contentId)}`;
    case "REMEDIATION":
      return `/dashboard/catalog/lesson/${encodeURIComponent(step.contentId)}`;
    case "ASSESSMENT":
      return `/dashboard/assessment/session?contentId=${encodeURIComponent(step.contentId)}`;
    default:
      return "/dashboard/catalog";
  }
}
