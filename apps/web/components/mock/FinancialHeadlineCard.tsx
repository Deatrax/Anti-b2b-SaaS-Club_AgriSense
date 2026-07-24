// Solid financial summary panel — the mock's `.headline` card, the visual anchor of the
// Money screen. Astryx's Card has no solid-fill variant (only default/transparent/muted/
// soft-tinted, see components/astryx/Card/Card.tsx), so this is one of the plan's narrow,
// approved exceptions to the app's no-inline-style convention: style={} here references
// existing theme CSS vars only, never a literal hex. Per
// AGRISENSE_V2_DESIGN_ARCHITECTURE.md §6 ("Financial headline | Forest surface with white
// type"), this uses --color-accent/--color-on-accent — forest-accent, not positive-green.
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useT } from '../../app/providers';
import { bdt, percent } from '../../lib/format';
import type { FinancialResult } from '@agrisense/shared';

const onAccentStyle = { color: 'var(--color-on-accent)' };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <VStack gap={0.5}>
      <Text type="supporting" style={onAccentStyle}>
        {label}
      </Text>
      <Text type="label" weight="semibold" style={onAccentStyle}>
        {value}
      </Text>
    </VStack>
  );
}

export function FinancialHeadlineCard({ financials }: { financials: FinancialResult }) {
  const { t } = useT();

  return (
    <div
      style={{
        background: 'var(--color-accent)',
        borderRadius: 'var(--radius-container)',
        padding: '20px',
      }}
    >
      <VStack gap={2}>
        <Text type="label" style={onAccentStyle}>
          {t('money_net_profit')}
        </Text>
        <Text type="display-2" weight="semibold" style={onAccentStyle}>
          {bdt(financials.netProfit)}
        </Text>
        <HStack gap={4} wrap="wrap">
          <Stat label={t('money_roi')} value={percent(financials.roi)} />
          <Stat label={t('money_bcr')} value={financials.bcr.toFixed(2)} />
          <Stat label={t('money_breakeven')} value={`${(financials.breakEvenYieldKg / 1000).toFixed(2)} t`} />
        </HStack>
      </VStack>
    </div>
  );
}
