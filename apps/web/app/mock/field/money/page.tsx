// Screen 07/14 of the /mock deck rebuild — finance tracker: editable cost ledger with a
// live area stepper. The one screen needing genuinely new logic: lib/mock-financials.ts's
// computeFieldFinancials() scales lib/mock-data.ts's ledgerEntries/financials
// proportionally (never the standalone HTML mock's own placeholder RATES table). Area
// control is a real minus/plus Stepper per AGRISENSE_V2_DESIGN_ARCHITECTURE.md §6's
// `.stepper` component, not a typed NumberInput.
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { useT } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { MockRail } from '../../../../components/mock/MockRail';
import { SeasonStageStrip } from '../../../../components/mock/SeasonStageStrip';
import { FieldTabsNav } from '../../../../components/mock/FieldTabsNav';
import { EditableLedgerTable } from '../../../../components/mock/EditableLedgerTable';
import { FinancialHeadlineCard } from '../../../../components/mock/FinancialHeadlineCard';
import { Stepper } from '../../../../components/mock/Stepper';
import { bdt } from '../../../../lib/format';
import { fieldState } from '../../../../lib/mock-data';
import { computeFieldFinancials, ORIGINAL_UREA_UNIT_COST_BDT } from '../../../../lib/mock-financials';

export default function MockFieldMoneyPage() {
  const { t } = useT();
  const { identity } = fieldState;
  const baseAreaHa = identity.areaHa ?? 0.5;

  const [areaHa, setAreaHa] = useState<number>(baseAreaHa);
  const [ureaOverride, setUreaOverride] = useState<number | null>(null);

  const result = computeFieldFinancials(areaHa, ureaOverride != null ? { ureaUnitCostBdt: ureaOverride } : {});
  const currentUreaUnitCost = ureaOverride ?? ORIGINAL_UREA_UNIT_COST_BDT;

  return (
    <AppShell height="fill" contentPadding={4} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={3}>
        <VStack gap={0}>
          <Text type="display-3">{t('field_finance_nav')}</Text>
          <Text type="supporting" color="secondary">
            {t('money_finance_desc')}
          </Text>
        </VStack>

        <MetadataList orientation="horizontal" columns="multi" title={identity.name ?? ''}>
          <MetadataListItem label={t('identity_area')}>
            {identity.areaHa} {t('unit_hectare')}
          </MetadataListItem>
        </MetadataList>

        <SeasonStageStrip compact />
        <FieldTabsNav active="money" />

        <Card padding={3}>
          <HStack justify="between" vAlign="center" wrap="wrap">
            <VStack gap={0}>
              <Text type="label" weight="semibold">
                {t('money_ledger_heading')}
              </Text>
              <MetadataList orientation="horizontal" columns="multi">
                <MetadataListItem label={t('money_total_cost')}>{bdt(result.totalCost)}</MetadataListItem>
                <MetadataListItem label={t('money_gross_revenue')}>{bdt(result.grossRevenue)}</MetadataListItem>
                <MetadataListItem label={t('money_expected_yield')}>{(result.expectedYieldKg / 1000).toFixed(2)} t</MetadataListItem>
              </MetadataList>
            </VStack>
            <VStack gap={1}>
              <Text type="supporting" color="secondary">
                {t('money_stepper_area_label')}
              </Text>
              <Stepper
                value={areaHa}
                onChange={setAreaHa}
                min={0.1}
                max={4}
                step={0.1}
                formatValue={(v) => `${v.toFixed(1)} ${t('unit_hectare')}`}
                decrementLabel={t('money_area_decrement')}
                incrementLabel={t('money_area_increment')}
              />
            </VStack>
          </HStack>
        </Card>

        <EditableLedgerTable
          lineItems={result.lineItems}
          editableItemId="l-3"
          originalUnitCost={ORIGINAL_UREA_UNIT_COST_BDT}
          currentUnitCost={currentUreaUnitCost}
          onEditUnitCost={setUreaOverride}
          onResetUnitCost={() => setUreaOverride(null)}
        />

        <FinancialHeadlineCard financials={result} />
      </VStack>
    </AppShell>
  );
}
