// replan/trigger.service.ts — the differentiator (§A.2, §C.8). A farmer write → SCOPED replan
// → cards patch → agent speaks unprompted. Scope it: a soil fix must NOT re-rank crops mid-season.

const SCOPES: Record<string, string[]> = {
  irrigation: ['get_weather', 'lookup_crop_rules', 'build_season_plan'],
  fertilizer: ['lookup_crop_rules', 'build_season_plan', 'compute_financials'],
  soil_change: ['lookup_crop_rules', 'compute_financials'],
  budget: ['compute_financials'],
  observation: ['assess_pest_risk', 'search_knowledge_base'],
};

export async function onFieldWrite(_fieldId: string, kind: string, _payload: unknown): Promise<unknown> {
  const tools = SCOPES[kind] ?? [];
  // TODO: run the scoped tool chain; applyPatch (optimistic card update FIRST); if the diff is
  //       significant, ConversationModel.postProactive(fieldId, narrate(diff)).
  void tools;
  throw new Error('onFieldWrite not implemented (§C.8)');
}
