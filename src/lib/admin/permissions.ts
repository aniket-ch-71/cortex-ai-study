// Central permission matrix for the Enterprise CMS.
// Roles come from public.user_roles; enforcement server-side lives in RPCs.
// This module mirrors the matrix so the UI can hide controls users cannot use.

export type Role =
  | "super_admin"
  | "admin"
  | "content_manager"
  | "subject_expert"
  | "reviewer"
  | "moderator"
  | "translator"
  | "media_manager"
  | "qa_manager"
  | "viewer"
  | "content_creator"
  | "user";

export type WorkflowState =
  | "draft"
  | "ai_review"
  | "human_review"
  | "fact_check"
  | "approved"
  | "scheduled"
  | "published"
  | "archived"
  | "deprecated";

export const WORKFLOW_ORDER: WorkflowState[] = [
  "draft",
  "ai_review",
  "human_review",
  "fact_check",
  "approved",
  "scheduled",
  "published",
  "archived",
  "deprecated",
];

export type Permission =
  | "questions.read"
  | "questions.write"
  | "questions.assign"
  | "questions.transition"
  | "questions.publish"
  | "questions.schedule"
  | "questions.archive"
  | "questions.delete"
  | "review.submit"
  | "ai.review"
  | "comments.write"
  | "media.write"
  | "media.read"
  | "import.run"
  | "export.run"
  | "analytics.read"
  | "audit.read"
  | "roles.manage"
  | "quality.override";

const MATRIX: Record<Role, Permission[]> = {
  super_admin: [
    "questions.read","questions.write","questions.assign","questions.transition","questions.publish","questions.schedule","questions.archive","questions.delete",
    "review.submit","ai.review","comments.write","media.write","media.read","import.run","export.run","analytics.read","audit.read","roles.manage","quality.override",
  ],
  admin: [
    "questions.read","questions.write","questions.assign","questions.transition","questions.publish","questions.schedule","questions.archive","questions.delete",
    "review.submit","ai.review","comments.write","media.write","media.read","import.run","export.run","analytics.read","audit.read","quality.override",
  ],
  content_manager: [
    "questions.read","questions.write","questions.assign","questions.transition","questions.schedule",
    "comments.write","media.read","export.run","analytics.read",
  ],
  subject_expert: [
    "questions.read","questions.write","questions.transition","review.submit","comments.write","media.read","analytics.read",
  ],
  reviewer: [
    "questions.read","review.submit","questions.transition","comments.write","media.read","analytics.read",
  ],
  moderator: [
    "questions.read","questions.archive","comments.write","analytics.read","audit.read",
  ],
  translator: [
    "questions.read","questions.write","comments.write","media.read",
  ],
  media_manager: [
    "media.read","media.write",
  ],
  qa_manager: [
    "questions.read","ai.review","quality.override","comments.write","analytics.read","export.run",
  ],
  viewer: ["questions.read","analytics.read"],
  content_creator: [
    "questions.read","questions.write","comments.write","media.read",
  ],
  user: [],
};

export function permissionsFor(roles: Role[] | string[]): Set<Permission> {
  const out = new Set<Permission>();
  for (const r of roles as Role[]) {
    const perms = MATRIX[r];
    if (!perms) continue;
    for (const p of perms) out.add(p);
  }
  return out;
}

export function can(roles: Role[] | string[], perm: Permission): boolean {
  return permissionsFor(roles).has(perm);
}

// Allowed workflow transitions per role. Server RPC re-validates via is_staff().
const TRANSITIONS: Record<Role, Partial<Record<WorkflowState, WorkflowState[]>>> = {
  super_admin: { draft:["ai_review","human_review","approved","archived"], ai_review:["human_review","draft","archived"], human_review:["fact_check","approved","draft","archived"], fact_check:["approved","human_review","draft","archived"], approved:["scheduled","published","draft","archived"], scheduled:["published","approved","archived"], published:["archived","deprecated"], archived:["draft","deprecated"], deprecated:["archived"] },
  admin: { draft:["ai_review","human_review","approved","archived"], ai_review:["human_review","draft","archived"], human_review:["fact_check","approved","draft","archived"], fact_check:["approved","human_review","draft","archived"], approved:["scheduled","published","draft","archived"], scheduled:["published","approved","archived"], published:["archived","deprecated"], archived:["draft","deprecated"], deprecated:["archived"] },
  content_manager: { draft:["ai_review","human_review"], ai_review:["human_review","draft"], human_review:["fact_check","draft"], fact_check:["approved","draft"], approved:["scheduled"], scheduled:["approved"] },
  subject_expert: { draft:["human_review"], human_review:["fact_check","draft"], fact_check:["approved","draft"] },
  reviewer: { human_review:["approved","draft"], fact_check:["approved","draft"], ai_review:["human_review","draft"] },
  moderator: { published:["archived","deprecated"], approved:["archived"] },
  translator: {},
  media_manager: {},
  qa_manager: { draft:["ai_review"], human_review:["ai_review"] },
  viewer: {},
  content_creator: { draft:["ai_review"] },
  user: {},
};

export function allowedTransitions(roles: Role[] | string[], from: WorkflowState): WorkflowState[] {
  const set = new Set<WorkflowState>();
  for (const r of roles as Role[]) {
    for (const next of TRANSITIONS[r]?.[from] ?? []) set.add(next);
  }
  return Array.from(set);
}

export function verdictLabel(score: number | null | undefined): { label: string; tone: "green" | "amber" | "red" | "muted" } {
  if (score == null) return { label: "Not scored", tone: "muted" };
  if (score >= 85) return { label: "Excellent", tone: "green" };
  if (score >= 70) return { label: "Good", tone: "green" };
  if (score >= 50) return { label: "Needs review", tone: "amber" };
  return { label: "Critical", tone: "red" };
}
