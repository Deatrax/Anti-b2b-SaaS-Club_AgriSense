// The uniform tool-result envelope (§C.7). Explainability comes from this STRUCTURE,
// not from prompting — <WhyPanel> renders `provenance` + `assumptions` directly, so the
// model can never invent a citation.

export type ProvenanceMethod = 'api' | 'table' | 'rag' | 'computed' | 'memory';

export interface Provenance {
  /** e.g. "Open-Meteo (ECMWF)" | "BARC FRG-2018" | "costs_bd.json" */
  source: string;
  /** e.g. "p.47" | "Table 3.4" | "rice.aman.aez_11.medium" */
  reference?: string;
  method: ProvenanceMethod;
  /** ISO-8601 timestamp of when this value was produced/retrieved. */
  retrievedAt: string;
}

export interface ToolResult<T = unknown> {
  data: T;
  provenance: Provenance[];
  assumptions?: string[];
}

/** Tool classes drive the trace-panel colour coding (§C.7): what KIND of system this is. */
export type ToolClass =
  | 'field'         // reads/writes the field record
  | 'external'      // talks to the world (Open-Meteo)
  | 'retrieval'     // RAG
  | 'deterministic' // pure compute over data tables
  | 'gated';        // consequential — requires HITL approval (bdapps debit)

/** Agent phases are derived in CODE (§C.8 derivePhase), never chosen by the LLM. */
export type Phase = 'GENERAL' | 'GATHERING' | 'PLANNING' | 'MAINTAINING' | 'TRANSACTING';
