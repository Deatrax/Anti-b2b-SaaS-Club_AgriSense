// HIGHEST-VALUE UI (§A.2, §C.7): inline, expandable, Claude-style tool-call block.
// Colour by toolClass; show params + raw return; NEVER a bare spinner — name the tool + input.
export function ToolCallBlock() {
  return <details>{/* TODO: collapsed row → expand → params + raw JSON + source */}</details>;
}
