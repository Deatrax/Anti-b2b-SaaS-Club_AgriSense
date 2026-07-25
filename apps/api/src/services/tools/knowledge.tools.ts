// tools/knowledge.tools.ts — search_knowledge_base. Class: 'retrieval' (§C.6).
// Builds the query from FIELD STATE, not the raw utterance; returns chunks + source + similarity.
import { z } from 'zod';
import type { Provenance, ToolResult } from '@agrisense/shared';
import { register } from './registry';
import { FieldModel } from '../../models/field.model';
import { FarmModel } from '../../models/farm.model';
import { retrieve, type RetrieveResult } from '../rag/retrieve';

const searchKnowledgeBaseSchema = z.object({
  topic: z.string().min(1).describe('What to look up, e.g. "nitrogen management", "bacterial blight identification". The only thing the model supplies — crop, stage, soil, and AEZ come from the field record.'),
});

export function registerKnowledgeTools(): void {
  register({
    name: 'search_knowledge_base',
    description:
      "Retrieves cited agronomic guidance (why/how — never doses, dates, or prices, those come from the reference tables) grounded in this field's actual crop, stage, soil, and AEZ.",
    schema: searchKnowledgeBaseSchema,
    toolClass: 'retrieval',
    phases: ['GENERAL', 'PLANNING', 'MAINTAINING', 'ANALYSIS'],
    timeoutMs: 8000,
    handler: async (args, ctx): Promise<ToolResult<RetrieveResult>> => {
      let field;
      let farm;
      if (ctx.fieldId) {
        field = await FieldModel.getState(ctx.fieldId);
        farm = await FarmModel.get(field.identity.farmId);
      } else {
        farm = await FarmModel.get(ctx.farmId);
      }

      // Dynamic namespace string for vector search — forces exact subsetting. E.g.
      // "rice_stage:flowering_soil:loamy_aez:9"
      const filterSegments: string[] = [];
      if (field) {
        if (field.cropCycle?.crop) filterSegments.push(field.cropCycle.crop);
        if (field.cropCycle?.stage) filterSegments.push(`stage:${field.cropCycle.stage}`);
        if (field.identity.soilType) filterSegments.push(`soil:${field.identity.soilType}`);
      }
      if (farm?.aez) filterSegments.push(`aez:${farm.aez}`);

      const result = await retrieve({
        crop: field?.cropCycle?.crop ?? undefined,
        stage: field?.cropCycle?.stage ?? undefined,
        topic: args.topic,
        soilType: field?.identity.soilType ?? undefined,
        aez: farm?.aez ?? undefined,
      });

      const provenance: Provenance[] = result.hits.map((h) => ({
        source: h.source,
        reference: h.reference ?? undefined,
        method: 'rag',
        retrievedAt: new Date().toISOString(),
      }));

      return {
        data: result,
        provenance,
        assumptions:
          result.hits.length === 0
            ? ['No supporting document found above the similarity threshold — proceeding from the reference tables only.']
            : undefined,
      };
    },
    // embed() calls OpenAI live; the search itself hits Supabase — both are genuine
    // flaky-external-dependency cases (§1.5), not "impossible" ones.
    fallback: (): ToolResult<RetrieveResult> => ({
      data: { query: '', hits: [] },
      provenance: [],
      assumptions: ['⚠ Knowledge base search is unavailable right now — proceeding from the reference tables only.'],
    }),
  });
}
