export const KNOWN_ROLES = ["SUPER_ADMIN", "ADMIN", "LECTURER", "STUDENT"] as const;

export type UserRole = (typeof KNOWN_ROLES)[number];

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  LECTURER: "Lecturer",
  STUDENT: "Student",
};

const WORD_BOUNDARY = /_/g;

export function normalizeRoleValue(role?: string | null): string | null {
  if (!role) return null;
  const normalized = role.toString().trim().toUpperCase();
  return normalized.length ? normalized : null;
}

export function normalizeRole(role?: string | null): UserRole | null {
  const normalized = normalizeRoleValue(role);
  if (!normalized) return null;
  return KNOWN_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : null;
}

export function isAdminRole(role?: string | null): boolean {
  const normalized = normalizeRoleValue(role);
  return normalized === "ADMIN" || normalized === "SUPER_ADMIN";
}

export function formatRoleLabel(role?: string | null): string {
  const normalized = normalizeRoleValue(role);
  if (!normalized) return "-";
  if (normalized in ROLE_LABELS) {
    return ROLE_LABELS[normalized as UserRole];
  }
  return normalized
    .split(WORD_BOUNDARY)
    .filter(Boolean)
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ");
}

export function getRoleOptions(includeSuperAdmin: boolean): Array<{ value: UserRole; label: string }> {
  return KNOWN_ROLES.filter((role) => includeSuperAdmin || role !== "SUPER_ADMIN").map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));
}
