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
    phases: ['PLANNING', 'MAINTAINING'],
    timeoutMs: 8000,
    handler: async (args, ctx): Promise<ToolResult<RetrieveResult>> => {
      const field = await FieldModel.getState(ctx.fieldId);
      const farm = await FarmModel.get(field.identity.farmId);

      const result = await retrieve({
        crop: field.activeCycle?.crop ?? undefined,
        stage: field.activeCycle?.stage ?? undefined,
        topic: args.topic,
        soilType: field.identity.soilType ?? undefined,
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
