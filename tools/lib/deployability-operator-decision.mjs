export function commandProfileAlias(profile) {
  return (profile?.aliases || []).find((alias) => alias.includes("-")) || profile?.key?.replace(/_/g, "-") || null;
}

function publicStackDecision({ gates }) {
  const publicGate = gates?.gates?.find((item) => item.key === "public_stack_exposure") || null;
  return {
    key: "run_public_stack_safety_gate",
    status: "gate_required",
    profile_key: "public_stack",
    primary_command: "corepack pnpm run selfhost:security-review -- --profile public-stack",
    primary_json_command: "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json",
    detail_command: "corepack pnpm run deployability:exposure",
    detail_json_command: "corepack pnpm --silent run deployability:exposure -- --json",
    detail_payload: "public_exposure_review",
    expected_operator_next_action: "configure_public_stack_public_origin",
    reasons: [
      "public exposure is gated before edge routes, console access, or internet-ready claims",
      ...(publicGate?.remaining_work || [])
    ],
    guardrails: [
      "run the public-stack gate before starting or exposing public-stack services",
      "do not treat daily deployability as public production readiness",
      ...(publicGate?.guardrails || [])
    ],
    follow_up_commands: [
      "corepack pnpm run deployability:exposure",
      "corepack pnpm run deployability:recipe -- --profile public-stack",
      "corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>",
      "corepack pnpm run deployability:evidence -- --profile public-stack"
    ]
  };
}

function profileDecision({ profile, actionProfile }) {
  const alias = commandProfileAlias(profile);
  return {
    key: "continue_selected_profile",
    status: "ready_next_step",
    profile_key: profile.key,
    primary_command:
      actionProfile?.attention?.primary_command ||
      profile.attention?.primary_command ||
      actionProfile?.recommended_commands?.[0] ||
      profile.commands?.primary ||
      null,
    primary_json_command:
      actionProfile?.attention?.primary_json_command ||
      profile.attention?.primary_json_command ||
      actionProfile?.next_json_commands?.[0] ||
      profile.commands?.primary_json ||
      null,
    reasons: [
      `${profile.label || profile.key} is the selected deployment profile`,
      ...(actionProfile?.attention?.reasons || profile.attention?.reasons || [])
    ],
    guardrails: [
      "stay on the selected profile for dashboard, commands, and handoff",
      "run read-only readiness or doctor commands before lifecycle commands"
    ],
    follow_up_commands: [
      `corepack pnpm run deployability:dashboard -- --profile ${alias}`,
      `corepack pnpm run deployability:commands -- --profile ${alias}`,
      `corepack pnpm run deployability:handoff -- --profile ${alias}`
    ]
  };
}

export function buildOperatorDecision({ selectedProfile, actionPlan = null, gates = null }) {
  const actionProfile = actionPlan?.profiles?.find((item) => item.key === selectedProfile?.key) || null;
  if (selectedProfile?.key === "public_stack") return publicStackDecision({ gates });
  return profileDecision({ profile: selectedProfile, actionProfile });
}
