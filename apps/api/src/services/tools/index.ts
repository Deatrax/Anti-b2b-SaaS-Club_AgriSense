// tools/index.ts — the boot-time seam: nothing calls registerXTools() otherwise, so without
// this the registry stays empty and the agent has zero tools regardless of what's registered
// in each *.tools.ts file. Call registerAllTools() once at app startup (app.ts).
import { registerWeatherTools } from './weather.tools';
import { registerFieldTools } from './field.tools';
import { registerPlanningTools } from './planning.tools';
import { registerFinancialTools } from './financial.tools';
import { registerKnowledgeTools } from './knowledge.tools';
import { registerPaymentTools } from './payment.tools';
import { registerRiskTools } from './risk.tools';
import { registerMarketplaceTools } from './marketplace.tools';

let registered = false;

export function registerAllTools(): void {
  if (registered) return;
  registerWeatherTools();
  registerFieldTools();
  registerPlanningTools();
  registerFinancialTools();
  registerKnowledgeTools();
  registerPaymentTools();
  registerRiskTools();
  registerMarketplaceTools();
  registered = true;
}
