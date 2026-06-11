export function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function commandsForPipeline(commands = [], pipelineKey) {
  return commands.filter((item) => (item.pipeline_keys || []).includes(pipelineKey));
}

export function commandNames(commands = []) {
  return unique(commands.map((item) => item.command));
}

function profileSortIndex(profileKey, profileOrder = []) {
  const index = profileOrder.indexOf(profileKey);
  return index === -1 ? profileOrder.length : index;
}

export function buildProfileAttention({
  profile,
  status = "unknown",
  recommendedCommands = [],
  nextJsonCommands = [],
  publicExposureGateCommands = [],
  serviceTouchingCommands = [],
  dashboardSafeCommands = [],
  profileOrder = []
} = {}) {
  const publicExposureGateCount = publicExposureGateCommands.length;
  const level = publicExposureGateCount > 0 || /safety[_-]?gate/i.test(status) ? "safety_gate" : "operational";
  const rankBase = level === "safety_gate" ? 100 - publicExposureGateCount * 10 : 200;
  const reasons = [];

  if (publicExposureGateCount > 0) {
    reasons.push(`${publicExposureGateCount} public exposure gate command(s)`);
  }
  if (/safety[_-]?gate/i.test(status)) {
    reasons.push(`status=${status}`);
  }
  if (serviceTouchingCommands.length > 0) {
    reasons.push(`${serviceTouchingCommands.length} service-touching command(s)`);
  }
  if (dashboardSafeCommands.length > 0) {
    reasons.push(`${dashboardSafeCommands.length} dashboard-safe command(s)`);
  }
  if (reasons.length === 0) {
    reasons.push("read-only operational metadata available");
  }

  return {
    level,
    rank: rankBase + profileSortIndex(profile?.key, profileOrder),
    primary_command: recommendedCommands[0] || null,
    primary_json_command: nextJsonCommands[0] || null,
    reasons
  };
}

export function buildAttentionInputs({ profile, summary, catalogCommands = [] } = {}) {
  const commands = commandsForPipeline(catalogCommands, profile?.pipeline_key);
  const dashboardSafe = commands.filter((item) => item.dashboard_safe === true);
  const publicExposure = commands.filter((item) => item.public_exposure_gate === true);
  const serviceTouching = commands.filter(
    (item) => item.starts_services === true || item.stops_services === true || item.calls_docker === true
  );

  return {
    recommendedCommands: summary?.next_commands || commandNames(commands),
    nextJsonCommands: summary?.next_json_commands || unique(commands.map((item) => item.json_command)),
    dashboardSafeCommands: commandNames(dashboardSafe),
    publicExposureGateCommands: commandNames(publicExposure),
    serviceTouchingCommands: commandNames(serviceTouching)
  };
}

export function recommendedProfileKeys(profileSummaries = []) {
  return [...profileSummaries].sort((left, right) => left.attention.rank - right.attention.rank).map((item) => item.key);
}
