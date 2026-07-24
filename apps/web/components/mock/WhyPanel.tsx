// Provenance/explainability disclosure — the mock's whyPanel(). Generalizes the exact
// TCLASS_STATUS_VARIANT mapping already inline in app/field/[id]/page.tsx so trace-class
// dots read the same everywhere in the app.
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { List, ListItem } from '@astryxdesign/core/List';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import type { ToolClass } from '@agrisense/shared';
import { useT } from '../../app/providers';

const TCLASS_STATUS_VARIANT: Record<ToolClass, 'success' | 'accent' | 'neutral' | 'warning'> = {
  field: 'success',
  external: 'accent',
  retrieval: 'neutral',
  deterministic: 'accent',
  gated: 'warning',
};

export interface WhyPanelItem {
  toolClass: ToolClass;
  label: string;
  description?: string;
}

export function WhyPanel({ items }: { items: WhyPanelItem[] }) {
  const { t } = useT();
  if (items.length === 0) return null;

  return (
    <Collapsible trigger={<Text type="supporting">{t('why_label')}</Text>}>
      <List hasDividers>
        {items.map((item, i) => (
          <ListItem
            key={i}
            label={item.label}
            description={item.description}
            startContent={<StatusDot variant={TCLASS_STATUS_VARIANT[item.toolClass]} label={t(`trace_class_${item.toolClass}`)} />}
          />
        ))}
      </List>
    </Collapsible>
  );
}
