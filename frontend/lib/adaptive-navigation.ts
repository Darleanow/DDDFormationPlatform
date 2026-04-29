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
    default:
      return "/dashboard/adaptive";
  }
}
