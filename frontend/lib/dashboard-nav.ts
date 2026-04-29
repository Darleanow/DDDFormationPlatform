/**
 * Sidebar active state: one deterministic rule per BC area.
 * - `/dashboard` (profil tenant) matches only exactly — never every child route.
 * - Nested areas use `href` or `href/` only (avoids `/dashboard/catalog` matching a hypothetical `/dashboard/catalog-backup`).
 */
export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
