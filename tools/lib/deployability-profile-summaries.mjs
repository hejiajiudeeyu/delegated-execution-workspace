export function buildProfileSummaries({ profiles = [], pipelineSummaries = [] } = {}) {
  const summariesByPipeline = new Map(pipelineSummaries.map((item) => [item.key, item]));
  return profiles
    .map((profile) => {
      const summary = summariesByPipeline.get(profile.pipeline_key);
      if (!summary) return null;
      return {
        key: profile.key,
        aliases: profile.aliases || [],
        pipeline_key: profile.pipeline_key,
        purpose: profile.purpose,
        status: summary.status,
        command_count: summary.command_count,
        json_command_count: summary.json_command_count,
        catalog_command_count: summary.catalog_command_count,
        dashboard_safe_command_count: summary.dashboard_safe_command_count,
        ci_safe_command_count: summary.ci_safe_command_count,
        public_exposure_gate_count: summary.public_exposure_gate_count,
        next_commands: summary.next_commands || [],
        next_json_commands: summary.next_json_commands || [],
        safety_notes: summary.safety_notes || []
      };
    })
    .filter(Boolean);
}
