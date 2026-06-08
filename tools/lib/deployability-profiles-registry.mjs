export const PROFILE_PIPELINES = [
  {
    key: "daily_dev",
    aliases: ["daily-dev", "daily_dev", "local-agent-loop", "local_agent_loop"],
    label: "Daily Development",
    pipeline_key: "local_agent_loop",
    purpose: "Start with the local caller-skill and MCP development loop."
  },
  {
    key: "all_in_one_demo",
    aliases: ["all-in-one", "all-in-one-demo", "all_in_one_demo"],
    label: "All-in-One Demo",
    pipeline_key: "all_in_one_demo",
    purpose: "Evaluate the full product shape on one machine before splitting components."
  },
  {
    key: "selfhost_platform",
    aliases: ["selfhost", "selfhost-platform", "selfhost_platform", "platform"],
    label: "Selfhost Platform",
    pipeline_key: "selfhost_platform",
    purpose: "Prepare and manage the private platform profile."
  },
  {
    key: "public_stack",
    aliases: ["public-stack", "public_stack"],
    label: "Public Stack",
    pipeline_key: "public_stack",
    purpose: "Review public exposure gates before opening edge routes."
  },
  {
    key: "recovery_evidence",
    aliases: ["recovery", "recovery-evidence", "recovery_evidence"],
    label: "Recovery & Evidence",
    pipeline_key: "recovery_evidence",
    purpose: "Prepare handoff, audit, backup, restore rehearsal, and rotation evidence."
  },
  {
    key: "operator_onboarding",
    aliases: ["operator-onboarding", "operator_onboarding", "onboarding"],
    label: "Operator Onboarding",
    pipeline_key: "operator_onboarding",
    purpose: "Follow the public-stack first-use operator path."
  },
  {
    key: "published_image",
    aliases: ["published-image", "published_image", "release-review", "release_review"],
    label: "Published Image",
    pipeline_key: "published_image",
    purpose: "Review published-image smoke metadata before running Docker."
  }
];

export function normalizeProfile(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

export function resolveProfileFilter(requested) {
  if (requested == null) {
    return {
      requested: null,
      resolved: null,
      pipeline: null
    };
  }
  const normalized = normalizeProfile(requested);
  const match = PROFILE_PIPELINES.find(
    (item) => normalizeProfile(item.key) === normalized || (item.aliases || []).some((alias) => normalizeProfile(alias) === normalized)
  );
  return {
    requested,
    resolved: match?.key || null,
    pipeline: match?.pipeline_key || null
  };
}

export function profileDirectory({ includeLabel = false } = {}) {
  return PROFILE_PIPELINES.map((profile) => ({
    key: profile.key,
    aliases: profile.aliases,
    ...(includeLabel ? { label: profile.label } : {}),
    pipeline_key: profile.pipeline_key,
    purpose: profile.purpose
  }));
}

export function profileOrder() {
  return PROFILE_PIPELINES.map((profile) => profile.key);
}
