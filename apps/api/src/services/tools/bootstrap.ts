// tools/bootstrap.ts — calls every tool-registration function once at boot, so the registry
// (an in-memory Map, registry.ts) is populated before the first chat request. Side-effect only:
// register() is idempotent (Map.set on the tool name), so calling this more than once is safe.
import { registerWeatherTools } from './weather.tools';
import { registerFieldTools } from './field.tools';
import { registerPlanningTools } from './planning.tools';
import { registerFinancialTools } from './financial.tools';
import { registerRiskTools } from './risk.tools';
import { registerKnowledgeTools } from './knowledge.tools';
import { registerPaymentTools } from './payment.tools';

export function registerAllTools(): void {
  registerWeatherTools();
  registerFieldTools();
  registerPlanningTools();
  registerFinancialTools();
  registerRiskTools();
  registerKnowledgeTools();
  registerPaymentTools();
}
